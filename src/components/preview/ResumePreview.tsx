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
 * user is actually looking at. Auto-fit scales the page to the available
 * width.
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
import { extractPageBlocks } from '@/lib/pdf/walk'
import { paginate, PaginationImpossibleError } from '@/lib/pdf/paginate'
import { computeUsablePageHeightPx, computeFirstPageUsablePageHeightPx, findMainColumnPaddingPx } from '@/lib/pdf/render'
import { collectSectionAnchors, collectSectionAnchorsByKey, mapCutToEditSpace } from './pageChromeMap'
import { AtsSheet } from './AtsSheet'
import { SkimHeatmap, SkimPill } from './SkimHeatmap'
import { PageChromeOverlay } from './PageChrome'

// Two animation frames, but never hang: if the editor tab is backgrounded, RAF
// is throttled to ~never, which would stall the fit loop and leave a stale page
// count. Fall back to a timer so the measurement always settles.
const raf2 = () =>
  new Promise<void>((r) => {
    let done = false
    const finish = () => { if (!done) { done = true; r() } }
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
  const blank = !c.basics.name && !c.basics.summary && !c.work.some((w) => w.position || w.name) && !c.education.some((e) => e.institution || e.area)
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
          Click any <strong>gray hint</strong> on the page to type there — only what you fill in prints. Type <kbd className="rounded border border-border bg-muted px-1 font-mono text-[10px]">/</kbd> inside a bullet for quick inserts, and hover a section for its <strong>Style</strong> button.
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
    () => BODY_SECTION_KEYS.filter((k) => !doc.metadata.layout.main.includes(k) && !(doc.metadata.layout.aside ?? []).includes(k)),
    [doc.metadata.layout.main, doc.metadata.layout.aside],
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
  const measureRef = useRef<HTMLDivElement>(null)
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

  // Track available width for fit-to-width zoom.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    setContainerW(el.clientWidth)
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setContainerW(e.contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
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

  // Keep the hidden print-measure node fully non-interactive (never
  // focusable, never in the accessibility tree) now that it is no longer
  // `visibility: hidden` (fix round, task 5 — see the portal's own JSX
  // comment for why that had to change). `inert` isn't yet in this
  // project's React 18 / @types/react typings, hence setting it
  // imperatively rather than as a JSX prop; the DOM property itself is
  // real and widely supported. The node is a stable ref across re-renders
  // (same portal position every render), so this only needs to run once.
  useEffect(() => {
    const el = measureRef.current as (HTMLDivElement & { inert?: boolean }) | null
    if (el) el.inert = true
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
      await ensureFontsReady([doc.metadata.typography.fontFamily, doc.metadata.typography.headingFamily, doc.metadata.typography.nameFamily])
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

  // Paginated WYSIWYG preview (native-multipage-pdf plan, task 5; fix round:
  // print-geometry pagination with block mapping). Pagination — cuts AND
  // page count — always runs on the hidden print-mode `measureRef` portal
  // below (the SAME DOM shape `renderResumePdf` paginates: `mode="print"`,
  // no edit chrome, no empty-section placeholders), using the export's own
  // budget functions, so `pagePageCount` here is provably the export's page
  // count, not an estimate. The resulting print-space cuts are then mapped
  // onto the EDITABLE canvas's own geometry by structure (pageChromeMap.ts:
  // section `data-section` key + entry index, matched between the two
  // trees) so the separators still land at the right visual spot in the
  // canvas the user is actually editing — precise for single-column docs;
  // two-column docs (`.rm-col-aside` present) fall back to a proportional
  // scale (`editRootHeight / printRootHeight`) for the few cases structural
  // mapping can't resolve, since `combineColumns`' merged gap sequence
  // doesn't name a single section the simple way a single-column sequence
  // does (see pageChromeMap.ts's own top comment).
  //
  // Only ever active when auto-fit is off (auto-fit always targets one
  // page, spec 3) and not in the "Exact PDF preview" toggle (that canvas IS
  // the print DOM the gate screenshots — see PageChrome.tsx's own comment on
  // why the overlay must never coexist with it). Debounced with the SAME
  // cancellation-token + 200ms pattern the auto-fit effect above uses — the
  // measure portal already re-renders on every content edit (it serves
  // auto-fit's own measurement), so `printH`/`contentH` settling is the same
  // signal this effect waits on too.
  const [pageCuts, setPageCuts] = useState<number[]>([])
  const [pagePageCount, setPagePageCount] = useState(1)
  useEffect(() => {
    if (autoFit || previewExact) {
      setPageCuts((prev) => (prev.length ? [] : prev))
      setPagePageCount((prev) => (prev !== 1 ? 1 : prev))
      return
    }
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
      if (contentHeightPx <= firstPageUsablePageHeightPx) {
        setPageCuts((prev) => (prev.length ? [] : prev))
        setPagePageCount((prev) => (prev !== 1 ? 1 : prev))
        return
      }
      try {
        const blocks = extractPageBlocks(printRoot)
        const result = paginate({ blocks, contentHeightPx, usablePageHeightPx, firstPageUsablePageHeightPx })
        if (result.cutsPx.length === 0) {
          setPageCuts([])
          setPagePageCount(result.pageCount)
          return
        }

        const twoColumn = !!printRoot.querySelector('.rm-col-aside')
        const editRootHeightPx = editRoot.getBoundingClientRect().height
        const scale = contentHeightPx > 0 ? editRootHeightPx / contentHeightPx : 1
        let mappedCuts: number[]
        if (twoColumn) {
          // See this effect's own top comment / pageChromeMap.ts: combined
          // main+aside gaps don't name one section the simple way a single
          // column's gaps do, so map by proportional scale instead.
          mappedCuts = result.cutsPx.map((y) => y * scale)
        } else {
          const printAnchors = collectSectionAnchors(printRoot)
          const editAnchorsByKey = collectSectionAnchorsByKey(editRoot)
          mappedCuts = result.cutsPx.map((y) => {
            const mapped = mapCutToEditSpace(blocks, y, printRoot, printAnchors, editRoot, editAnchorsByKey)
            // Structural mapping failed for this one cut (should not happen
            // for a consistent same-render snapshot -- defensive only): the
            // proportional scale is a reasonable single-cut fallback rather
            // than dropping the whole overlay over one bad cut.
            return mapped ?? y * scale
          })
        }
        setPageCuts(mappedCuts)
        setPagePageCount(result.pageCount)
      } catch (e) {
        if (e instanceof PaginationImpossibleError) {
          // Same "can't legally paginate" signal export.ts falls back to
          // print for — the preview just shows no page chrome rather than
          // crashing the canvas.
          setPageCuts((prev) => (prev.length ? [] : prev))
          setPagePageCount((prev) => (prev !== 1 ? 1 : prev))
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
    if (fitToWidth && containerW > 0) return clamp((containerW - 56) / pageW, 0.4, 1.5)
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
        blocks. `inert` (set imperatively below — not yet in this project's
        React 18 / @types/react typings) gives the same "never focusable,
        never in the accessibility tree" guarantee `visibility: hidden` did,
        without touching the `visibility` computed style the walker reads;
        `aria-hidden` + `pointer-events: none` (both already here) are
        defense-in-depth for browsers without `inert` support. */}
    {createPortal(
      <div
        ref={measureRef}
        aria-hidden
        data-role="pdf-measure"
        style={{ position: 'fixed', top: 0, left: -100000, width: pageW, pointerEvents: 'none', zIndex: -1 }}
      >
        <TemplateRenderer doc={doc} mode="print" fitScale={measureScale} />
      </div>,
      document.body,
    )}
    <div ref={scrollRef} className={`canvas-bg relative h-full w-full overflow-auto${focusMode && !previewExact ? ' focus-mode' : ''}`}>
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
                <TemplateRenderer doc={doc} mode="preview" edit={updateContent} editMeta={updateMetadata} fitScale={fitScale} onAddSection={() => setAddOpen(true)} />
              )}
            </div>

            {/* recruiter skim heat — measured off the live canvas, updates as you type */}
            {skimView && <SkimHeatmap rootRef={innerRef} zoom={effectiveZoom} pageH={pageH} docKey={doc} />}

            {/* Paginated WYSIWYG preview chrome: page-gap separators + "Page k / N"
                badges, siblings of `.rm-root` (never inside it — see PageChrome.tsx's
                own comment). Not rendered in "Exact PDF preview" mode (that canvas
                IS the print DOM the gate screenshots for exact-preview parity). */}
            {!previewExact && <PageChromeOverlay cutsPx={pageCuts} pageCount={pagePageCount} />}
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
