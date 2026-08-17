/**
 * Live preview. Renders the template on a page-width "sheet" and, once
 * content overflows one page with auto-fit off, overlays page-break chrome
 * (see the pagination effect below and PageChrome.tsx) computed with the
 * SAME algorithm and budget functions the native PDF export uses
 * (paginate.ts + extractPageBlocks, computeUsablePageHeightPx /
 * computeFirstPageUsablePageHeightPx from render.tsx), run against the SAME
 * print-mode DOM the export actually paginates (the hidden `measureRef`
 * portal below) — so the page COUNT and the choice of WHICH gap becomes a
 * cut are provably identical to the exported PDF's, not an estimate.
 *
 * FIX ROUND (native-multipage-pdf plan, task 5): the first version of this
 * overlay computed cuts directly on the EDITABLE canvas DOM instead, reading
 * self-consistently off `innerRef`. That was wrong: the editable canvas
 * (`mode="preview"`) renders real, on-screen inline-editing affordances
 * (delete buttons, "+ Add" rows, per-chip edit controls) that the print-mode
 * DOM never has — confirmed empirically to run 1.5-1.7x taller for ordinary
 * content, and to even change how many lines a bullet wraps to in some
 * sections — so a page count computed there could genuinely disagree with
 * the exported PDF's, undercutting the entire "WYSIWYG" premise. Pagination
 * now always runs on the print-mode DOM; the resulting cuts are then mapped
 * onto the editable canvas's own geometry by STRUCTURE (section key + entry
 * index — see pageChromeMap.ts), not by reusing the print-space y directly,
 * so the separators still land at the right visual spot in the canvas the
 * user is actually looking at.
 *
 * FIX ROUND 2 (task 5): a proportional-scale fallback for two-column docs
 * (`editRootHeight / printRootHeight` applied to the raw print-space cut)
 * turned out to compound error down the page badly enough that separators
 * landed inside bullet text and, on one case, two full entries past the
 * real page boundary — live-reproduced by review. Two-column docs now get
 * the SAME structural mapping single-column docs do, just attributed
 * against the MAIN column's own (pre-`combineColumns`) block list instead
 * of the merged one (see pageChromeMap.ts's top comment). The proportional
 * scale survives only as the BADGE-position fallback for a boundary whose
 * separator had to be suppressed — a slightly-off label is a cosmetic
 * nit; a line drawn through text is not, so separators are suppressed
 * outright rather than estimated (see PageChrome.tsx's own comment).
 * Auto-fit scales the page to the available width.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ResumeDocument } from '@/types/document'
import { PAGE_DIMENSIONS, MM_TO_PX } from '@/types/metadata'
import { ensureFontsReady } from '@/data/fonts'
import { useEditorStore } from '@/store/useEditorStore'
import { useResumeStore } from '@/store/useResumeStore'
import { clamp, uid } from '@/lib/utils'
import { BODY_SECTION_KEYS, customKey } from '@/lib/sections'
import { fitOnePageScale } from '@/lib/fitOnePage'
import { TemplateRenderer } from '@/templates/TemplateRenderer'
import { SectionGallery } from '@/components/editor/SectionGallery'
import { extractPageBlocks, extractMainColumnBlocks } from '@/lib/pdf/walk'
import { paginate, PaginationImpossibleError } from '@/lib/pdf/paginate'
import {
  computeUsablePageHeightPx,
  computeFirstPageUsablePageHeightPx,
  findMainColumnPaddingPx,
  exceedsOnePage,
} from '@/lib/pdf/render'
import { resolveForcedCutsPx } from '@/lib/pdf/pageBreaks'
import {
  collectSectionAnchors,
  collectSectionAnchorsByKey,
  mapCutToEditAnchor,
  mapCutToEditSpace,
} from './pageChromeMap'
import { PAGE_GAP_PX } from './PageChrome'
import { AtsSheet } from './AtsSheet'
import { SkimHeatmap, SkimPill } from './SkimHeatmap'
import { CanvasReorder } from './CanvasReorder'
import { PageChromeOverlay } from './PageChrome'

// Two animation frames, but never hang: if the editor tab is backgrounded, RAF
// is throttled to ~never, which would stall the fit loop and leave a stale page
// count. Fall back to a timer so the measurement always settles.
const raf2 = () =>
  new Promise<void>((r) => {
    let done = false
    const finish = () => {
      if (!done) {
        done = true
        r()
      }
    }
    requestAnimationFrame(() => requestAnimationFrame(finish))
    setTimeout(finish, 400)
  })

/**
 * One-time helper for a BLANK resume: teaches the three canvas moves.
 * Deliberately in NORMAL FLOW above the page (not a floating overlay) — as an
 * overlay it covered the résumé header and repainted badly while scrolling.
 */
function BlankCanvasTip({ doc }: { doc: ResumeDocument }) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return !!localStorage.getItem('cvaurum:canvas-tip')
    } catch {
      return false
    }
  })
  const c = doc.content
  const blank =
    !c.basics.name &&
    !c.basics.summary &&
    !c.work.some((w) => w.position || w.name) &&
    !c.education.some((e) => e.institution || e.area)
  if (dismissed || !blank) return null
  const close = () => {
    setDismissed(true)
    try {
      localStorage.setItem('cvaurum:canvas-tip', '1')
    } catch {
      /* private mode */
    }
  }
  return (
    <div className="flex justify-center px-6 pt-5">
      <div className="flex w-full max-w-[210mm] items-start gap-2.5 rounded-xl border border-primary/25 bg-primary/5 px-3.5 py-2.5 text-xs leading-relaxed text-foreground">
        <span aria-hidden>✍️</span>
        <span className="min-w-0">
          Click any <strong>gray hint</strong> on the page to type there — only what you fill in prints. Type{' '}
          <kbd className="rounded border border-border bg-muted px-1 font-mono text-[10px]">/</kbd> inside a bullet for
          quick inserts, and hover a section for its <strong>Style</strong> button.
        </span>
        <button className="btn-icon h-6 w-6 shrink-0" onClick={close} aria-label="Dismiss tip" title="Got it">
          ✕
        </button>
      </div>
    </div>
  )
}

export function ResumePreview({ doc }: { doc: ResumeDocument }) {
  const zoom = useEditorStore((s) => s.zoom)
  const fitToWidth = useEditorStore((s) => s.autoFit)
  const atsView = useEditorStore((s) => s.atsView)
  const previewExact = useEditorStore((s) => s.previewExact)
  const focusMode = useEditorStore((s) => s.focusMode)
  const skimView = useEditorStore((s) => s.skimView)
  const updateContent = useResumeStore((s) => s.updateContent)
  const updateMetadata = useResumeStore((s) => s.updateMetadata)
  const updateDoc = useResumeStore((s) => s.updateDoc)

  // "Add section" gallery, opened from the inline "+ Add section" control on the
  // canvas. Reuses the exact same flow as the left-panel section organizer.
  const [addOpen, setAddOpen] = useState(false)
  const available = useMemo(
    () =>
      BODY_SECTION_KEYS.filter(
        (k) => !doc.metadata.layout.main.includes(k) && !(doc.metadata.layout.aside ?? []).includes(k)
      ),
    [doc.metadata.layout.main, doc.metadata.layout.aside]
  )
  const addStandard = (key: string) => {
    updateMetadata((m) => {
      if (!m.layout.main.includes(key) && !m.layout.aside.includes(key)) m.layout.main.push(key)
      m.layout.hidden = m.layout.hidden.filter((k) => k !== key)
    })
    setAddOpen(false)
  }
  const addCustom = (name?: string) => {
    const id = uid()
    updateDoc((d) => {
      d.content.custom.push({ id, name: name || 'Custom Section', items: [] })
      d.metadata.layout.main.push(customKey(id))
    })
    setAddOpen(false)
  }

  const scrollRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  // Off-screen print-mode render (NO edit chrome, empty sections excluded) — its
  // height is the TRUE printable height the PDF paginates, so fit + page count
  // match the export instead of the chrome-inflated editable canvas.
  // `HTMLDivElement | null` (not just `HTMLDivElement`) so this stays a
  // MutableRefObject -- the callback ref below (fix round 2) assigns
  // `.current` itself on every attach, which a plain `RefObject`'s
  // read-only `.current` would reject at the type level.
  const measureRef = useRef<HTMLDivElement | null>(null)
  const [containerW, setContainerW] = useState(0)
  const [contentH, setContentH] = useState(0)
  const [printH, setPrintH] = useState(0)

  const fmt = doc.metadata.page.format
  const { w: pageW, h: pageH } = PAGE_DIMENSIONS[fmt]

  // Auto-fit-to-one-page: shrink type/spacing so a resume that's just over a
  // page collapses to a single page. Genuinely long content
  // (needing < 0.78 scale) is left full size and paginates normally.
  const [fitScale, setFitScale] = useState(1)
  const fitScaleRef = useRef(1)
  fitScaleRef.current = fitScale
  // The hidden print-measure render is driven by its OWN scale so the binary
  // search can probe trial scales without flickering the visible canvas.
  const [measureScale, setMeasureScale] = useState(1)
  const fitReq = useRef(0)
  const autoFit = doc.metadata.page.autoFit
  // Publish the settled one-page scale so silent exports (Word) can shrink to
  // the same page count the preview/PDF lands on.
  const setOnePageScale = useEditorStore((s) => s.setOnePageScale)

  // Track available width for fit-to-width zoom. THREE signals, not one
  // (2026-08-17, mobile fix): on phones the canvas mounts inside a
  // display:none tab panel — measured live, ResizeObserver alone left
  // `containerW` stuck at 0 after the panel became visible (fiber-verified),
  // so the sheet rendered 794px wide in a 375px viewport with no scaling.
  // IntersectionObserver fires exactly on the hidden->rendered transition,
  // and window resize covers orientation changes; all three funnel into one
  // idempotent measure.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const measure = () => setContainerW(el.clientWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    const io = new IntersectionObserver(measure)
    io.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      io.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  // Measure the EDITABLE canvas height (incl. edit-only chrome) — used only to
  // size the white sheet so the "+ Add" controls never spill onto the gray.
  useLayoutEffect(() => {
    const el = innerRef.current
    if (!el) return
    const measure = () => setContentH(el.scrollHeight)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Measure the PRINTABLE height from the hidden print-mode render — this drives
  // the auto-fit and the page count, so the editor agrees with the exported PDF.
  useLayoutEffect(() => {
    const el = measureRef.current
    if (!el) return
    const measure = () => setPrintH(el.scrollHeight)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Re-measure once fonts for the chosen families have actually loaded.
  useEffect(() => {
    ensureFontsReady([
      doc.metadata.typography.fontFamily,
      doc.metadata.typography.headingFamily,
      doc.metadata.typography.nameFamily,
    ]).then(() => {
      if (innerRef.current) setContentH(innerRef.current.scrollHeight)
      if (measureRef.current) setPrintH(measureRef.current.scrollHeight)
    })
  }, [doc.metadata.typography.fontFamily, doc.metadata.typography.headingFamily, doc.metadata.typography.nameFamily])

  // Auto-fit using the SAME binary search as the print/PDF page (fitOnePage.ts),
  // run on the HIDDEN print-measure render so the visible canvas never flickers
  // through trial scales. Re-runs (debounced) on any content or design change.
  // Because both the editor and the export use this identical routine on the
  // identical print-mode content, the on-screen page count ALWAYS matches the PDF.
  useEffect(() => {
    if (!autoFit) {
      setMeasureScale(1)
      if (fitScaleRef.current !== 1) setFitScale(1)
      setOnePageScale(1)
      return
    }
    let cancelled = false
    const id = setTimeout(async () => {
      const myReq = ++fitReq.current
      await ensureFontsReady([
        doc.metadata.typography.fontFamily,
        doc.metadata.typography.headingFamily,
        doc.metadata.typography.nameFamily,
      ])
      // Wait for the photo in the measure render to load too — an unsized image
      // makes the header (and thus the fit) measure short, diverging from the PDF.
      const img = measureRef.current?.querySelector('img.rm-photo') as HTMLImageElement | null
      if (img && !img.complete) {
        await new Promise<void>((r) => {
          img.onload = () => r()
          img.onerror = () => r()
          setTimeout(r, 1500)
        })
      }
      if (cancelled || myReq !== fitReq.current) return
      const result = await fitOnePageScale(pageH, async (sc) => {
        if (cancelled || myReq !== fitReq.current || !measureRef.current) return Number.POSITIVE_INFINITY
        setMeasureScale(sc)
        await raf2()
        return measureRef.current?.scrollHeight ?? Number.POSITIVE_INFINITY
      })
      if (cancelled || myReq !== fitReq.current) return
      setMeasureScale(result)
      setFitScale(result)
      setOnePageScale(result)
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(id)
    }
    // `doc` changes on every edit → debounced re-fit; pageH covers page-size changes.
  }, [doc, autoFit, pageH])

  // Keep the editable-canvas height current after a fit change (sizes the sheet).
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      if (innerRef.current) setContentH(innerRef.current.scrollHeight)
    })
    return () => cancelAnimationFrame(raf)
  }, [fitScale])

  // Paginated WYSIWYG preview (native-multipage-pdf plan, task 5; fix rounds
  // 1-2). Pagination — cuts AND page count — always runs on the hidden
  // print-mode `measureRef` portal below (the SAME DOM shape
  // `renderResumePdf` paginates: `mode="print"`, no edit chrome, no
  // empty-section placeholders), using the export's own budget functions,
  // so `pagePageCount` here is provably the export's page count, not an
  // estimate. The resulting print-space cuts are then mapped onto the
  // EDITABLE canvas's own geometry by structure (pageChromeMap.ts: section
  // `data-section` key + entry index, matched between the two trees) so
  // the separators still land at the right visual spot in the canvas the
  // user is actually editing — single-column docs map against the full
  // (combined) block list; two-column docs map each cut against the MAIN
  // column's own pre-merge block list instead (`extractMainColumnBlocks`,
  // walk.ts) since a combined main+aside gap doesn't name one section the
  // simple way a single column's gap does (see pageChromeMap.ts's top
  // comment for why, and PageChrome.tsx's for why a cut that still can't
  // be mapped gets its SEPARATOR suppressed rather than estimated — a
  // missing line beats a wrong line — while its badge keeps a coarser
  // proportional-scale fallback position, since page count itself is never
  // in question).
  //
  // Only ever active when auto-fit is off (auto-fit always targets one
  // page, spec 3) and not in the "Exact PDF preview" toggle (that canvas IS
  // the print DOM the gate screenshots — see PageChrome.tsx's own comment on
  // why the overlay must never coexist with it). Debounced with the SAME
  // cancellation-token + 200ms pattern the auto-fit effect above uses — the
  // measure portal already re-renders on every content edit (it serves
  // auto-fit's own measurement), so `printH`/`contentH` settling is the same
  // signal this effect waits on too.
  const [pageSeparators, setPageSeparators] = useState<{ y: number; thin?: boolean }[]>([])
  const [pageBadgeTops, setPageBadgeTops] = useState<number[]>([])
  const [pagePageCount, setPagePageCount] = useState(1)
  useEffect(() => {
    const clearOverlay = () => {
      setPageSeparators((prev) => (prev.length ? [] : prev))
      setPageBadgeTops((prev) => (prev.length ? [] : prev))
      setPagePageCount((prev) => (prev !== 1 ? 1 : prev))
      // close any real page gaps the last run opened
      innerRef.current?.querySelectorAll('[data-page-start]').forEach((el) => el.removeAttribute('data-page-start'))
    }
    // 2026-08-17 spec 1b/2: the overlay now renders in EVERY canvas state
    // that genuinely paginates — auto-fit docs whose fit FAILED (fitScale
    // restored to 1, content still over a page: the export paginates them
    // natively now, so the preview must show it), and the Exact PDF preview
    // (hairline variant — its geometry IS print geometry, cuts apply with
    // no mapping). Auto-fit docs that DID fit clear below via the shared
    // exceedsOnePage check (their portal renders fitted and fits).
    let cancelled = false
    const id = setTimeout(() => {
      if (cancelled) return
      const printRoot = measureRef.current?.querySelector<HTMLElement>('.rm-root')
      const editRoot = innerRef.current?.querySelector<HTMLElement>('.rm-root')
      if (!printRoot || !editRoot) return
      const padding = findMainColumnPaddingPx(printRoot)
      const usablePageHeightPx = computeUsablePageHeightPx(pageH, padding)
      const firstPageUsablePageHeightPx = computeFirstPageUsablePageHeightPx(pageH, padding)
      const contentHeightPx = printRoot.getBoundingClientRect().height
      // Task-6b final-fix (finding F1): this used to gate on `contentHeightPx
      // <= firstPageUsablePageHeightPx` -- a BUDGET (pageH - bottomPad), not
      // the export's own OVERFLOW tolerance (pageH + marginPx) -- so a
      // document landing in the ~2-margin gap between those two thresholds
      // drew page-break chrome here while the export produced a single page.
      // `exceedsOnePage` is the export's own gate (render.tsx), shared here
      // so the two can never independently re-derive (and diverge on) this
      // arithmetic again.
      if (!exceedsOnePage(contentHeightPx, pageH, doc.metadata.page.margin)) {
        clearOverlay()
        return
      }
      try {
        const combinedBlocks = extractPageBlocks(printRoot)
        const result = paginate({
          blocks: combinedBlocks,
          contentHeightPx,
          usablePageHeightPx,
          firstPageUsablePageHeightPx,
          // Pins resolve on the SAME portal geometry the export resolves its
          // sheet with — parity by construction. Auto-fit ON ignores pins
          // (spec 1b), matching render.tsx exactly.
          forcedCutsPx: autoFit ? [] : resolveForcedCutsPx(printRoot, doc.metadata.page.breaks),
        })
        if (result.cutsPx.length === 0) {
          setPageSeparators([])
          setPageBadgeTops([0])
          setPagePageCount(result.pageCount)
          return
        }

        // Exact PDF preview: its canvas renders the SAME print DOM at the
        // SAME scale the portal measures (fitScale === measureScale in every
        // settled state), so portal-space cuts ARE canvas-space ys — no
        // structural mapping, no suppression, every boundary drawn.
        if (previewExact) {
          setPageSeparators(result.cutsPx.map((y) => ({ y })))
          setPageBadgeTops([0, ...result.cutsPx])
          setPagePageCount(result.pageCount)
          return
        }

        // Two-column: attribute each cut against the MAIN column's own
        // pre-merge block list (never the combined one — see this effect's
        // own top comment). Single-column: the combined list IS the (only)
        // column's list already.
        const mainOnlyBlocks = extractMainColumnBlocks(printRoot)
        const mappingBlocks = mainOnlyBlocks ?? combinedBlocks
        const printAnchorRoot = mainOnlyBlocks
          ? (printRoot.querySelector<HTMLElement>('.rm-col-main') ?? printRoot)
          : printRoot
        const editAnchorRoot = mainOnlyBlocks
          ? (editRoot.querySelector<HTMLElement>('.rm-col-main') ?? editRoot)
          : editRoot
        const printAnchors = collectSectionAnchors(printAnchorRoot)
        const editAnchorsByKey = collectSectionAnchorsByKey(editAnchorRoot)

        const editRootHeightPx = editRoot.getBoundingClientRect().height
        const badgeScale = contentHeightPx > 0 ? editRootHeightPx / contentHeightPx : 1

        // REAL PAGE GAPS (2026-08-17 spec 2): each cut maps to the EDIT
        // element that STARTS the next page; tagging it `data-page-start`
        // opens a real margin gap (artboard.css, edit canvas only) so the
        // page band renders inside CREATED empty space and can never cover
        // content — the old cover-band hid up to ~15px of real content near
        // tight cuts (user report). Mid-entry / low-confidence cuts keep
        // the midpoint treatment as a THIN line (suppression rules
        // unchanged: a missing line still beats a wrong one); badges keep
        // the proportional fallback since page count is never in question.
        const anchors = result.cutsPx.map((y) => mapCutToEditAnchor(mappingBlocks, y, printAnchors, editAnchorsByKey))
        const fallbackYs = result.cutsPx.map((y, i) =>
          anchors[i] ? null : mapCutToEditSpace(mappingBlocks, y, printRoot, printAnchors, editRoot, editAnchorsByKey)
        )
        for (const el of editRoot.querySelectorAll('[data-page-start]')) el.removeAttribute('data-page-start')
        for (const el of anchors) el?.setAttribute('data-page-start', '')
        // Two frames so the margin gaps are laid out before measuring.
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            if (cancelled) return
            const rootRect = editRoot.getBoundingClientRect()
            // Normalize visual px back to layout px — the canvas renders
            // inside the zoom scale() wrapper (same double-scale trap
            // pageChromeMap's rootRelativeRect documents).
            const scaleNow = editRoot.offsetWidth > 0 ? rootRect.width / editRoot.offsetWidth : 1
            const separators: { y: number; thin?: boolean }[] = []
            const badgeTops: number[] = [0]
            for (let i = 0; i < result.cutsPx.length; i++) {
              const el = anchors[i]
              if (el) {
                const top = (el.getBoundingClientRect().top - rootRect.top) / scaleNow
                separators.push({ y: top - PAGE_GAP_PX / 2 })
                badgeTops.push(top)
              } else if (fallbackYs[i] != null) {
                separators.push({ y: fallbackYs[i]!, thin: true })
                badgeTops.push(fallbackYs[i]!)
              } else {
                badgeTops.push(result.cutsPx[i] * badgeScale)
              }
            }
            setPageSeparators(separators)
            setPageBadgeTops(badgeTops)
            setPagePageCount(result.pageCount)
            // The margin gaps grew the canvas — keep the white sheet sized.
            if (innerRef.current) setContentH(innerRef.current.scrollHeight)
          })
        )
      } catch (e) {
        if (e instanceof PaginationImpossibleError) {
          // Same "can't legally paginate" signal export.ts falls back to
          // print for — the preview just shows no page chrome rather than
          // crashing the canvas.
          clearOverlay()
        } else {
          throw e
        }
      }
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(id)
    }
    // `doc` re-runs this on every edit (same trigger the auto-fit effect
    // above uses); `contentH`/`printH` additionally cover reflows caused
    // without a `doc` change (fit-scale settling, async font/photo loads)
    // on either tree, so a stale layout is never walked on either side of
    // the mapping.
  }, [doc, autoFit, previewExact, pageH, contentH, printH])

  const effectiveZoom = useMemo(() => {
    // Auto fit-to-width whenever the container is NARROWER than the sheet
    // (2026-08-17 spec 2, mobile): the phone Preview used to render the
    // 794px sheet unscaled in a 375px viewport, forcing sideways panning.
    // Wide containers keep honoring the user's explicit Fit toggle/zoom.
    const mustFit = containerW > 0 && containerW < pageW + 56
    if ((fitToWidth || mustFit) && containerW > 0) return clamp((containerW - 56) / pageW, 0.35, 1.5)
    return zoom
  }, [fitToWidth, containerW, pageW, zoom])

  // Page count from the PRINTABLE height (what the PDF paginates), NOT the
  // chrome-inflated editable canvas — so the editor and the export always agree.
  // Use the SAME bottom-margin tolerance the print route uses to clamp a
  // hair-over-one-page resume to a single sheet, or the editor would draw a
  // "Page 2" guide while the exported PDF stays one page.
  const padPx = doc.metadata.page.margin * MM_TO_PX
  const fitted = autoFit && fitScale < 0.999
  const pages = fitted ? 1 : Math.max(1, Math.ceil(((printH || contentH) - padPx) / pageH))
  // The white sheet must be tall enough to hold the edit-only "+ Add" chrome too,
  // so it never spills onto the gray — but page breaks are drawn at PDF boundaries.
  const sheetH = Math.max(pages * pageH, contentH)

  // "What ATS sees": swap the designed canvas for the parser's-eye plain text.
  // (After all hooks, so the canvas machinery keeps its state while toggled.)
  if (atsView) return <AtsSheet doc={doc} />

  return (
    <>
      {/* Hidden, off-screen print-mode render — measured to drive fit + page count
        so they match the exported PDF exactly, and (fix round, task 5) is
        ALSO the pagination effect's own source DOM for cuts/page count, for
        the same reason: it is the one live DOM that genuinely mirrors what
        `renderResumePdf` paginates. No edit chrome, empty sections
        excluded (resolveOrder), same fitScale as the visible canvas.
        Portaled to <body> so it's NEVER inside a display:none ancestor — on
        mobile the canvas is hidden while the edit panel is open, and a hidden
        node measures height 0, which made the fit wrongly conclude "fits at
        full size" (→ phantom 2nd page + an unshrunk Word export). In <body> it
        always lays out, so the fit is correct regardless of panel state.
        Off-screen via position only (`left: -100000px`, matching render.tsx's
        own real export container) — deliberately NOT `visibility: hidden`
        (fix round: walk.ts's `extractPageBlocks`/`isSkippedElement` treats an
        INHERITED `visibility: hidden` as "not real content", by design (the
        same guard that correctly excludes genuinely hidden/no-print
        elements) — so with it, this node always measured zero page-break
        blocks. `inert` (set via the CALLBACK ref below — not yet in this
        project's React 18 / @types/react typings, hence imperative) gives
        the same "never focusable, never in the accessibility tree"
        guarantee `visibility: hidden` did, without touching the
        `visibility` computed style the walker reads.
        FIX ROUND 2 (task 5): a plain `ref={measureRef}` + a mount-once
        `useEffect` only ever set `.inert` on the FIRST DOM node this portal
        ever produced — toggling ATS view unmounts this whole subtree
        (`if (atsView) return <AtsSheet .../>` above, short-circuiting
        before this JSX), and remounting it afterward creates a BRAND NEW
        div that the once-only effect never revisits, leaving it
        interactive again (reproduced live: a contact `<a href>` inside
        this aria-hidden subtree became tab-focusable after one ATS-view
        round trip). A callback ref re-runs on every attach, including
        remounts, so `inert` is reapplied every time.
        `aria-hidden` + `pointer-events: none` (both already here) stay as
        defense-in-depth for browsers without `inert` support. */}
      {createPortal(
        <div
          ref={(el) => {
            if (el) (el as HTMLDivElement & { inert?: boolean }).inert = true
            measureRef.current = el
          }}
          aria-hidden
          data-role="pdf-measure"
          style={{ position: 'fixed', top: 0, left: -100000, width: pageW, pointerEvents: 'none', zIndex: -1 }}
        >
          <TemplateRenderer doc={doc} mode="print" fitScale={measureScale} />
        </div>,
        document.body
      )}
      <div
        ref={scrollRef}
        className={`canvas-bg relative h-full w-full overflow-auto${focusMode && !previewExact ? ' focus-mode' : ''}`}
      >
        {/* skim-heat status pill — floats over the canvas while the heat is on */}
        {skimView && <SkimPill />}
        {/* first-time hint on a blank resume — the canvas interactions aren't
          guessable ("what do I click? what do I type where?") */}
        {!previewExact && <BlankCanvasTip doc={doc} />}
        {/* unmistakable mode flag — floating over the canvas while previewing */}
        {previewExact && (
          <div className="pointer-events-none sticky top-3 z-20 flex h-0 justify-center overflow-visible">
            <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-primary/30 bg-surface/95 py-1 pl-3 pr-1 text-xs font-medium text-foreground shadow-float backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
              <span className="whitespace-nowrap">
                Exact PDF preview<span className="hidden sm:inline"> — this is precisely what exports</span>
              </span>
              <button
                className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-primary-foreground transition hover:brightness-110"
                onClick={() => useEditorStore.getState().setPreviewExact(false)}
              >
                Back to editing
              </button>
            </div>
          </div>
        )}
        <div className="flex min-h-full w-full justify-center px-6 py-8">
          {/* reserves scaled space */}
          <div style={{ width: pageW * effectiveZoom, height: sheetH * effectiveZoom }}>
            <div
              className="relative rounded-[2px] bg-white shadow-page"
              style={{
                width: pageW,
                height: sheetH,
                transform: `scale(${effectiveZoom})`,
                transformOrigin: 'top left',
              }}
            >
              <div ref={innerRef} style={{ width: pageW }}>
                {previewExact ? (
                  // Exact-PDF mode: the print render — no edit chrome, placeholders,
                  // hover rings, or empty sections. What you see here is the export.
                  <TemplateRenderer doc={doc} mode="print" fitScale={fitScale} />
                ) : (
                  <TemplateRenderer
                    doc={doc}
                    mode="preview"
                    edit={updateContent}
                    editMeta={updateMetadata}
                    fitScale={fitScale}
                    onAddSection={() => setAddOpen(true)}
                  />
                )}
              </div>

              {/* recruiter skim heat — measured off the live canvas, updates as you type */}
              {skimView && <SkimHeatmap rootRef={innerRef} zoom={effectiveZoom} pageH={pageH} docKey={doc} />}

              {/* canvas inline reordering — entry hover cluster + drag sessions
                for the section/entry grips (edit chrome, portals to body). */}
              {!previewExact && <CanvasReorder rootRef={innerRef} />}

              {/* Paginated WYSIWYG preview chrome: page-gap separators + "Page k / N"
                badges, siblings of `.rm-root` (never inside it — see PageChrome.tsx's
                own comment; the gate screenshots `.rm-root` itself, so siblings are
                invisible to it in every mode). Exact mode uses the hairline variant:
                its canvas is CONTINUOUS print geometry, so the editor's tall paper
                band would cover content near tight cuts (2026-08-17 spec 2). */}
              <PageChromeOverlay
                separatorYs={pageSeparators}
                badgeTops={pageBadgeTops}
                pageCount={pagePageCount}
                variant={previewExact ? 'hairline' : 'band'}
              />
            </div>
          </div>
        </div>
      </div>
      {addOpen && (
        <SectionGallery
          doc={doc}
          available={available}
          onAdd={addStandard}
          onAddCustom={addCustom}
          onClose={() => setAddOpen(false)}
        />
      )}
    </>
  )
}
