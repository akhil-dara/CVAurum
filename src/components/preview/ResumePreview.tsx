/**
 * Live preview. Renders the template on a page-width "sheet" and overlays
 * page-break guides computed from the measured content height (after fonts are
 * ready). The same DOM is what the print route paginates, so the exported PDF
 * matches exactly. Auto-fit scales the page to the available width.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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

const raf2 = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))

export function ResumePreview({ doc }: { doc: ResumeDocument }) {
  const zoom = useEditorStore((s) => s.zoom)
  const fitToWidth = useEditorStore((s) => s.autoFit)
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
  const addCustom = () => {
    const id = uid()
    updateDoc((d) => {
      d.content.custom.push({ id, name: 'Custom Section', items: [] })
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

  return (
    <>
    {/* Hidden, off-screen print-mode render — measured to drive fit + page count
        so they match the exported PDF exactly. No edit chrome, empty sections
        excluded (resolveOrder), same fitScale as the visible canvas. */}
    <div ref={measureRef} aria-hidden style={{ position: 'fixed', top: 0, left: -99999, width: pageW, visibility: 'hidden', pointerEvents: 'none', zIndex: -1 }}>
      <TemplateRenderer doc={doc} mode="print" fitScale={measureScale} />
    </div>
    <div ref={scrollRef} className="canvas-bg relative h-full w-full overflow-auto">
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
              <TemplateRenderer doc={doc} mode="preview" edit={updateContent} editMeta={updateMetadata} fitScale={fitScale} onAddSection={() => setAddOpen(true)} />
            </div>

            {/* page-break guides */}
            {Array.from({ length: pages - 1 }).map((_, i) => {
              const top = (i + 1) * pageH
              return (
                <div key={i} className="pointer-events-none absolute left-0 right-0" style={{ top }}>
                  <div className="border-t border-dashed border-rose-400/60" />
                  <div className="absolute right-1 -top-5 rounded bg-rose-500/90 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    Page {i + 2}
                  </div>
                </div>
              )
            })}
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
