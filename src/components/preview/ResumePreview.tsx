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
import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Maximize, ZoomIn, ZoomOut } from 'lucide-react'
import type { ResumeDocument } from '@/types/document'
import { PAGE_DIMENSIONS, MM_TO_PX } from '@/types/metadata'
import { ensureFontsReady } from '@/data/fonts'
import { useEditorStore } from '@/store/useEditorStore'
import { useResumeStore } from '@/store/useResumeStore'
import { useIsPhone, useMediaQuery } from '@/hooks/useIsPhone'
import { clamp, uid } from '@/lib/utils'
import { BODY_SECTION_KEYS, customKey } from '@/lib/sections'
import { fitToPages } from '@/lib/fitOnePage'
import type { FitVector } from '@/lib/fitOnePage'
import { fitRulesOf } from '@/lib/fitReadout'

const AS_SET: FitVector = { type: 1, space: 1 }
import { TemplateRenderer } from '@/templates/TemplateRenderer'
import { SectionGallery } from '@/components/editor/SectionGallery'
import { extractPageBlocks, extractMainColumnBlocks } from '@/lib/pdf/walk'
import { paginate, PaginationImpossibleError } from '@/lib/pdf/paginate'
import {
  computeUsablePageHeightPx,
  computeFirstPageUsablePageHeightPx,
  findMainColumnPaddingPx,
  exceedsOnePage,
} from '@/lib/pdf/metrics'
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
import { ColumnBalanceHint } from './ColumnBalanceHint'
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

/**
 * Moves an interpolated page-separator up until it clears content.
 *
 * A separator that cannot be anchored to an element is placed proportionally,
 * and a proportional guess lands wherever it lands - measured, one came to
 * rest 1px inside a skills chip, so the 4px rule was painted across the pill
 * and the page looked as though it had cut the chip in half. The PDF had
 * done nothing of the sort.
 */
function snapClearOfInk(y: number, root: HTMLElement, scale: number): number | null {
  const rootTop = root.getBoundingClientRect().top
  const boxes = Array.from(
    root.querySelectorAll<HTMLElement>(
      '.rm-chip, .rm-chip-edit, .rm-kw-edit, .rm-item-head, .rm-item-sub, .rm-section-title, li, p'
    )
  )
    .map((n) => n.getBoundingClientRect())
    .filter((r) => r.height > 0)
    .map((r) => ({ top: (r.top - rootTop) / scale, bottom: (r.bottom - rootTop) / scale }))
    .sort((p1, p2) => p1.top - p2.top)
  if (!boxes.length) return y

  // The rule is ~3px thick with a shadow, so it needs a hair of clearance -
  // but only a hair. Demanding more than a wrapped chip row's own gap (~5px)
  // means no gap ever qualifies, and the line then climbs out of the whole
  // list: measured, an early attempt moved it 255px and pointed at the wrong
  // place entirely. A separator in the wrong place is as bad as one drawn
  // through a pill.
  // Exactly half the rule's own 3px height (PageChrome draws it at y-1.5,
  // height 3). Asking for more than that disqualifies the ~3.4px gap between
  // two wrapped chip rows, and the search then leaps to the next section
  // break: measured, 255px in one direction and 514px in the other. A
  // separator pointing at the wrong page is no better than one drawn through
  // a pill.
  const HALF = 1.5

  // Merge the boxes into occupied bands, then take the GAP between bands that
  // sits closest to where the break really is.
  const bands: { top: number; bottom: number }[] = []
  for (const b2 of boxes) {
    const last = bands[bands.length - 1]
    if (last && b2.top <= last.bottom) last.bottom = Math.max(last.bottom, b2.bottom)
    else bands.push({ top: b2.top, bottom: b2.bottom })
  }
  const inside = bands.find((b2) => y > b2.top - HALF && y < b2.bottom + HALF)
  if (!inside) return y

  // Only a SMALL correction is honest. Past this the nearest clear gap is in
  // another part of the page, and a separator drawn there says the page ends
  // somewhere it does not - which is no better than one drawn through a pill.
  // This module already suppresses a separator it cannot place; the same
  // judgement applies here, and the "Page k / N" chip still marks the page.
  const MAX_NUDGE = 14
  let best: number | null = null
  let bestDist = Infinity
  for (let i = 0; i < bands.length; i++) {
    const gapTop = bands[i].bottom
    const gapBottom = i + 1 < bands.length ? bands[i + 1].top : gapTop + 1000
    if (gapBottom - gapTop < HALF * 2) continue
    const candidate = Math.min(Math.max(y, gapTop + HALF), gapBottom - HALF)
    const dist = Math.abs(candidate - y)
    if (dist < bestDist) {
      bestDist = dist
      best = candidate
    }
  }
  return bestDist <= MAX_NUDGE ? best : null
}

export function ResumePreview({ doc }: { doc: ResumeDocument }) {
  const zoom = useEditorStore((s) => s.zoom)
  const fitToWidth = useEditorStore((s) => s.autoFit)
  const atsView = useEditorStore((s) => s.atsView)
  const previewExact = useEditorStore((s) => s.previewExact)
  const isPhone = useIsPhone()
  // The top bar carries its zoom cluster only from `md` up (EditorTopBar);
  // narrower than that the canvas carries its own pill, mouse or finger.
  const barHasZoom = useMediaQuery('(min-width: 768px)')
  // The page is editable on every screen, a phone included: that is the
  // product's design (the owner's call, 2026-09-08). A morning change had
  // swapped the phone's canvas for the print render because its controls
  // were mouse-sized at fit zoom; the answer to that is the finger-sized hit
  // areas artboard.css gives every control on a coarse pointer and a zoom
  // that reaches 300%, not a page that cannot be touched. Only the Preview
  // mode shows the print render, on any device.
  const exactCanvas = previewExact
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
  const [fit, setFit] = useState<FitVector>(AS_SET)
  const fitRef = useRef<FitVector>(AS_SET)
  fitRef.current = fit
  // The hidden print-measure render is driven by its OWN scales so the
  // search can probe trial vectors without flickering the visible canvas.
  const [measureFit, setMeasureFit] = useState<FitVector>(AS_SET)
  const fitReq = useRef(0)
  const autoFit = doc.metadata.page.autoFit
  // Publish the settled one-page scale so silent exports (Word) can shrink to
  // the same page count the preview/PDF lands on.
  const setOnePageScale = useEditorStore((s) => s.setOnePageScale)
  const setFitResult = useEditorStore((s) => s.setFitResult)
  const measureDoc = useDeferredValue(doc)
  // A fresh closure here defeated TemplateRenderer's memo, so every
  // incidental state change in this component re-rendered the whole canvas.
  const openAddSection = useCallback(() => setAddOpen(true), [])

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
  /* Refit pending: from the moment the doc changes until the fit effect's
   * one state update snaps the canvas, the visible page is stable-OLD - a
   * window the grow search stretched past what height-stability polling can
   * detect, and one the deferred measure doc stretches further. Armed here
   * on the IMMEDIATE doc, cleared by the (deferred) fit effect below, so
   * harnesses can wait on it instead of guessing. */
  useEffect(() => {
    if (import.meta.env.DEV) window.__cvaFitBusy = autoFit
  }, [doc, autoFit, pageH])

  useEffect(() => {
    if (!autoFit) {
      setMeasureFit(AS_SET)
      if (fitRef.current.type !== 1 || fitRef.current.space !== 1) setFit(AS_SET)
      setOnePageScale(1)
      if (import.meta.env.DEV) window.__cvaFitBusy = false
      return
    }
    let cancelled = false
    const id = setTimeout(async () => {
      const myReq = ++fitReq.current
      if (import.meta.env.DEV) window.__cvaFitTrace = []
      await ensureFontsReady([
        measureDoc.metadata.typography.fontFamily,
        measureDoc.metadata.typography.headingFamily,
        measureDoc.metadata.typography.nameFamily,
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
      const result = await fitToPages(
        {
          pageH,
          measure: async (f) => {
            if (cancelled || myReq !== fitReq.current || !measureRef.current) return Number.POSITIVE_INFINITY
            setMeasureFit(f)
            await raf2()
            const h = measureRef.current?.scrollHeight ?? Number.POSITIVE_INFINITY
            if (import.meta.env.DEV) (window.__cvaFitTrace ??= []).push({ fit: f, h, fs: measureRef.current?.querySelector<HTMLElement>('.rm-root') ? getComputedStyle(measureRef.current.querySelector<HTMLElement>('.rm-root')!).getPropertyValue('--rm-fs') : '' })
            return h
          },
          subsequentPageH: pageH - measureDoc.metadata.page.margin * MM_TO_PX * 2,
        // The TRUE page count at the scale just rendered, from the same
        // print-measure portal and budgets the export uses. Without this the
        // preview would pick its scale from a height estimate while the
        // export picks from real pagination, and the two would disagree on
        // the page count for exactly the documents auto-fit cannot fit.
          countPages: async () => {
            const printRoot = measureRef.current?.querySelector<HTMLElement>('.rm-root')
            if (!printRoot) return Number.POSITIVE_INFINITY
            try {
              const pad = findMainColumnPaddingPx(printRoot)
              const n = paginate({
                blocks: extractPageBlocks(printRoot, computeUsablePageHeightPx(pageH, pad)),
                contentHeightPx: printRoot.getBoundingClientRect().height,
                usablePageHeightPx: computeUsablePageHeightPx(pageH, pad),
                firstPageUsablePageHeightPx: computeFirstPageUsablePageHeightPx(pageH, pad),
                maxPageHeightPx: pageH,
              }).pageCount
              if (import.meta.env.DEV) { const t = window.__cvaFitTrace; if (t && t.length) t[t.length - 1].pages = n }
              return n
            } catch {
              return Number.POSITIVE_INFINITY
            }
          },
          // Seed from the previous answer: an edit rarely moves the fit far,
          // and the grid search lands on the identical answer either way -
          // the hint only trims probes (the exporter searches cold and agrees).
          hint: fitRef.current,
        },
        fitRulesOf(measureDoc.metadata)
      )
      if (cancelled || myReq !== fitReq.current) return
      setMeasureFit(result)
      setFit(result)
      // The Word export shrinks by the type scale (what its page count follows).
      setOnePageScale(result.type)
      if (import.meta.env.DEV) {
        window.__cvaFitBusy = false
        window.__cvaPreviewFitScale = result.type
        window.__cvaPreviewFit = result
      }
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(id)
    }
    // Keyed on the DEFERRED doc - the same value the measure portal renders -
    // so every measurement reads the tree it thinks it is reading. (Keying on
    // `doc` measured mid-deferral: a stale portal, a scale chosen for the
    // wrong document, and no later re-run to correct it.)
  }, [measureDoc, autoFit, pageH])

  // Keep the editable-canvas height current after a fit change (sizes the sheet).
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      if (innerRef.current) setContentH(innerRef.current.scrollHeight)
    })
    return () => cancelAnimationFrame(raf)
  }, [fit])

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
        setFitResult({ fit: fitRef.current, pages: 1, lastPageFill: contentHeightPx / firstPageUsablePageHeightPx })
        return
      }
      try {
        // The page height goes in because the keep rules are bounded by it
        // (walk.ts / sectionKeep.ts): without it this overlay would draw cuts
        // inside sections and entries the export holds whole.
        const combinedBlocks = extractPageBlocks(printRoot, usablePageHeightPx)
        const result = paginate({
          blocks: combinedBlocks,
          contentHeightPx,
          usablePageHeightPx,
          firstPageUsablePageHeightPx,
          // The paper's real height: a cut is never placed past it, because
          // the export would paint that overflow off the sheet (paginate.ts).
          maxPageHeightPx: pageH,
          // Pins resolve on the SAME portal geometry the export resolves its
          // sheet with — parity by construction. Auto-fit ON ignores pins
          // (spec 1b), matching render.tsx exactly.
          forcedCutsPx: autoFit ? [] : resolveForcedCutsPx(printRoot, doc.metadata.page.breaks),
        })
        // The readout's numbers: the fit the portal is drawn at, the true page
        // count, and how much of the last page the content reaches.
        setFitResult({
          fit: fitRef.current,
          pages: result.pageCount,
          lastPageFill:
            result.cutsPx.length === 0
              ? contentHeightPx / firstPageUsablePageHeightPx
              : (contentHeightPx - result.cutsPx[result.cutsPx.length - 1]) / usablePageHeightPx,
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
        if (exactCanvas) {
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
                // Interpolated, so it can land in the MIDDLE of a chip or a
                // line, and drawn there it reads as though the page break
                // sliced that pill in half - reported against a skills chip
                // whose exported PDF was in fact perfectly intact. Snapping up
                // to the top of whatever it would cross keeps the page end
                // visible without ever crossing ink, which is the same
                // judgement this module already makes when it suppresses a
                // separator it cannot place.
                const snapped = snapClearOfInk(fallbackYs[i]!, editRoot, scaleNow)
                // The badge marks the page whether or not a rule can be drawn.
                if (snapped !== null) separators.push({ y: snapped, thin: true })
                badgeTops.push(snapped ?? fallbackYs[i]!)
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
  }, [doc, autoFit, exactCanvas, pageH, contentH, printH])

  const fitZoom = useMemo(
    () => (containerW > 0 ? clamp((containerW - 56) / pageW, 0.35, 1.5) : 1),
    [containerW, pageW]
  )
  const effectiveZoom = useMemo(() => {
    // Fit-to-width — the default — scales the sheet to the container, so a
    // narrow window or a phone never paints the 794px sheet unscaled and
    // forces sideways panning.
    //
    // An EXPLICIT zoom always wins, at every width. Every zoom control turns
    // fit off, so `fitToWidth === false` means the user asked for this scale.
    // It used to lose to an extra "the container is narrower than the sheet,
    // so fit anyway" rule, which on a tablet (canvas column ~704px, forever
    // under 794+56) pinned the canvas to the fitted scale for good: the top
    // bar's Zoom in / Zoom out moved the readout and nothing else, so the one
    // remedy for a too-small canvas silently did nothing. Zoomed past fit the
    // canvas row is `w-max` (see below), so a wider sheet simply scrolls.
    if (fitToWidth && containerW > 0) return fitZoom
    return zoom
  }, [fitToWidth, containerW, zoom, fitZoom])

  // Publish what the canvas is ACTUALLY painting at, so the top bar's zoom
  // steps from the size on screen instead of from the store's untouched
  // `zoom`. Fitted at 0.82, stepping from 1 made the first "Zoom out" tap
  // (1 -> 0.9) grow the sheet.
  const setCanvasZoom = useEditorStore((s) => s.setCanvasZoom)
  useEffect(() => {
    setCanvasZoom(effectiveZoom)
  }, [effectiveZoom, setCanvasZoom])

  // Page count from the PRINTABLE height (what the PDF paginates), NOT the
  // chrome-inflated editable canvas — so the editor and the export always agree.
  // Use the SAME bottom-margin tolerance the print route uses to clamp a
  // hair-over-one-page resume to a single sheet, or the editor would draw a
  // "Page 2" guide while the exported PDF stays one page.
  const padPx = doc.metadata.page.margin * MM_TO_PX
  const fitted = autoFit && (fit.type < 0.999 || fit.space < 0.999)
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
          {/* The DEFERRED doc: this offscreen tree re-rendered in the same
              commit as the visible canvas on every store write - two full
              artboards before a typed character could paint - while every
              reader of it (auto-fit, pagination, the height observer) waits
              at least 200ms anyway. React renders it when the urgent work is
              done; nothing that consumes it can tell the difference. */}
          <TemplateRenderer doc={measureDoc} mode="print" fit={measureFit} />
        </div>,
        document.body
      )}
      <div
        ref={scrollRef}
        className={`canvas-bg relative h-full w-full overflow-auto${focusMode && !exactCanvas ? ' focus-mode' : ''}`}
      >
        {/* skim-heat status pill — floats over the canvas while the heat is on */}
        {skimView && <SkimPill />}
        {/* first-time hint on a blank resume — the canvas interactions aren't
          guessable ("what do I click? what do I type where?") */}
        {!exactCanvas && <BlankCanvasTip doc={doc} />}
        {/* Unmistakable mode flag — floating over the canvas while previewing;
            "Back to editing" returns to the editable page on every device. */}
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
        {/* `w-max min-w-full`, not `w-full`: a centered flex row that is exactly
          the scrollport's width pushes a wider child out BOTH sides, and the
          left overflow of a centered box cannot be scrolled to — zoomed past
          fit, the résumé's left margin (the name, the whole left column) was
          simply unreachable. Sized to its content instead, the row scrolls to
          either edge, and `min-w-full` keeps the sheet centered whenever the
          canvas is the wider one. */}
        <div className="flex min-h-full w-max min-w-full justify-center px-6 py-8">
          {/* reserves scaled space */}
          <div style={{ width: pageW * effectiveZoom, height: sheetH * effectiveZoom }}>
            <div
              className="relative rounded-[2px] bg-white shadow-page"
              style={{
                width: pageW,
                height: sheetH,
                transform: `scale(${effectiveZoom})`,
                transformOrigin: 'top left',
                // read by artboard.css to size a finger's hit areas in
                // screen pixels, whatever the zoom
                ['--rm-zoom' as string]: effectiveZoom,
              }}
            >
              <div ref={innerRef} style={{ width: pageW }}>
                {exactCanvas ? (
                  // Exact-PDF mode: the print render — no edit chrome, placeholders,
                  // hover rings, or empty sections. What you see here is the export.
                  <TemplateRenderer doc={doc} mode="print" fit={fit} />
                ) : (
                  <TemplateRenderer
                    doc={doc}
                    mode="preview"
                    edit={updateContent}
                    editMeta={updateMetadata}
                    fit={fit}
                    onAddSection={openAddSection}
                  />
                )}
              </div>

              {/* recruiter skim heat — measured off the live canvas, updates as you type */}
              {skimView && <SkimHeatmap rootRef={innerRef} zoom={effectiveZoom} pageH={pageH} docKey={doc} />}

              {/* canvas inline reordering — entry hover cluster + drag sessions
                for the section/entry grips (edit chrome, portals to body). */}
              {!exactCanvas && <CanvasReorder rootRef={innerRef} />}

              {/* Paginated WYSIWYG preview chrome: page-gap separators + "Page k / N"
                badges, siblings of `.rm-root` (never inside it — see PageChrome.tsx's
                own comment; the gate screenshots `.rm-root` itself, so siblings are
                invisible to it in every mode). Exact mode uses the hairline variant:
                its canvas is CONTINUOUS print geometry, so the editor's tall paper
                band would cover content near tight cuts (2026-08-17 spec 2). */}
              {/* Two-column waste: the sidebar often runs out of content well
                  before the main column, leaving an empty stripe (a whole
                  column per page once the resume paginates). Edit chrome
                  that points at it and moves a section across on click. */}
              {!exactCanvas && <ColumnBalanceHint rootRef={innerRef} doc={doc} />}

              <PageChromeOverlay
                separatorYs={pageSeparators}
                badgeTops={pageBadgeTops}
                pageCount={pagePageCount}
                variant={exactCanvas ? 'hairline' : 'band'}
              />
            </div>
          </div>
        </div>
        {/* The canvas's own zoom, at the foot of the scrollport: a finger-driven
            screen has no bar cluster, and neither does a bar under 768px. It
            used to sit top-right, where it covered the page's header contacts
            at fit zoom and, on a phone, the Export menu's "Download PDF" row. */}
        {(isPhone || !barHasZoom) && <CanvasZoom effectiveZoom={effectiveZoom} fitZoom={fitZoom} />}
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

/**
 * Zoom for a canvas whose top bar carries no zoom cluster: a phone, and any
 * bar under 768px (the cluster is `hidden md:desk:flex`). Without it those
 * buttons exist at 0x0 and cannot be used, no panel carries an equivalent,
 * and the preview is frozen at fit-to-width. Measured on a 375px phone: the
 * sheet fits at 0.40, so 10.24px body copy paints at 4.1px.
 *
 * Sticks to the FOOT of the scrollport, centred (placed after the page in
 * the scroller, so it also paints above it without a stacking trick): the
 * top-right corner covered the header's contact line at fit zoom and, under
 * the top bar's menus, the Export menu's "Download PDF" row and the More
 * menu's Redo. Always visible rather than revealed on hover; 40px targets.
 */
function CanvasZoom({ effectiveZoom, fitZoom }: { effectiveZoom: number; fitZoom: number }) {
  const autoFit = useEditorStore((s) => s.autoFit)
  const setZoom = useEditorStore((s) => s.setZoom)
  const setAutoFit = useEditorStore((s) => s.setAutoFit)
  const fitted = autoFit || Math.abs(effectiveZoom - fitZoom) < 0.005
  // Step from what is ON SCREEN, not from the store's `zoom`: fitted at 0.40
  // the store still reads 1, so the plain `zoomIn` would jump the first tap to
  // 110% and the first `zoomOut` would jump to 90%.
  const step = (dir: 1 | -1) => setZoom(Math.round((effectiveZoom + dir * 0.15) * 100) / 100)
  const btn =
    'flex h-10 w-10 items-center justify-center rounded-full text-foreground transition active:bg-muted disabled:opacity-35'
  // `items-start` matters: the row is `h-0` so it takes no space in the scroll
  // flow, and a stretched flex child inherits that zero height — the pill's
  // background collapsed to a 10px bar with the icons hanging out of it.
  return (
    <div className="pointer-events-none sticky bottom-3 z-10 flex h-0 items-end justify-center overflow-visible">
      <div
        data-testid="canvas-zoom"
        className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-border bg-surface/95 p-1 shadow-float backdrop-blur"
      >
        <button className={btn} onClick={() => step(-1)} disabled={effectiveZoom <= 0.401} aria-label="Zoom out" title="Zoom out">
          <ZoomOut className="h-[18px] w-[18px]" />
        </button>
        <button
          className="flex h-10 min-w-[46px] items-center justify-center rounded-full px-1 text-xs font-semibold tabular-nums text-foreground transition active:bg-muted"
          onClick={() => setAutoFit(true)}
          aria-label="Fit to width"
          title="Fit to width"
        >
          {fitted ? <Maximize className="h-[18px] w-[18px]" /> : `${Math.round(effectiveZoom * 100)}%`}
        </button>
        <button className={btn} onClick={() => step(1)} disabled={effectiveZoom >= 2.999} aria-label="Zoom in" title="Zoom in">
          <ZoomIn className="h-[18px] w-[18px]" />
        </button>
      </div>
    </div>
  )
}
