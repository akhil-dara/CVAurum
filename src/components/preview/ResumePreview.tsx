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
import { TemplateRenderer } from '@/templates/TemplateRenderer'
import { SectionGallery } from '@/components/editor/SectionGallery'

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
  const [containerW, setContainerW] = useState(0)
  const [contentH, setContentH] = useState(0)

  const fmt = doc.metadata.page.format
  const { w: pageW, h: pageH } = PAGE_DIMENSIONS[fmt]

  // Auto-fit-to-one-page: shrink type/spacing so a resume that's just over a
  // page collapses to a single page. Genuinely long content
  // (needing < 0.78 scale) is left full size and paginates normally.
  const [fitScale, setFitScale] = useState(1)
  const fitScaleRef = useRef(1)
  fitScaleRef.current = fitScale
  const fitDone = useRef(false)
  const correctTries = useRef(0)
  const autoFit = doc.metadata.page.autoFit
  const pad2 = 2 * doc.metadata.page.margin * MM_TO_PX

  // Re-fit from a clean natural measurement ONLY when a design-affecting setting
  // changes (template, page size/margins, columns, auto-fit). Content edits do NOT
  // reset here — that was causing a full-size↔fitted scale jump on every keystroke.
  const fitKey = `${doc.metadata.template}|${doc.metadata.page.format}|${doc.metadata.page.margin}|${doc.metadata.layout.columns}|${doc.metadata.layout.sidebar}|${autoFit}`
  useEffect(() => {
    fitDone.current = false
    correctTries.current = 0
    setFitScale(1)
  }, [fitKey])

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

  // Measure content height. The observer is set up ONCE and fires whenever the
  // rendered height changes (typing, scale, fonts) — no per-edit effect churn.
  useLayoutEffect(() => {
    const el = innerRef.current
    if (!el) return
    const measure = () => setContentH(el.scrollHeight)
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
    })
  }, [doc.metadata.typography.fontFamily, doc.metadata.typography.headingFamily, doc.metadata.typography.nameFamily])

  // Drive the fit scale from the measured content height (closed-form, converges
  // in ~1 step because (contentH - margins) / fitScale recovers the natural height).
  // One-shot auto-fit: computed ONCE per document change, from the natural
  // (scale-1) measurement only (the `cur !== 1` guard prevents any feedback
  // loop). Approximates the scalable height as (content − margins), which slightly
  // OVER-estimates it, so the result errs toward fitting comfortably under a page.
  useEffect(() => {
    if (!autoFit) {
      if (fitScaleRef.current !== 1) setFitScale(1)
      return
    }
    if (!contentH || fitDone.current) return
    if (fitScaleRef.current !== 1) return // only compute from the natural-size measurement
    fitDone.current = true
    // Aim a touch under the page: the model slightly under-estimates shrink
    // (a few residual fixed px), so a 0.93 target lands content cleanly on one page.
    const targetH = pageH * 0.93
    if (contentH <= targetH) return // already fits at full size
    const textH = contentH - pad2
    if (textH < 40) return
    const s = clamp((targetH - pad2) / textH, 0.6, 1)
    if (s < 0.66) return // would be too cramped — leave full size and paginate
    setFitScale(Number(s.toFixed(4)))
  }, [contentH, autoFit, pad2, pageH])

  // Smooth re-fit while editing: 700ms AFTER content stops changing, recompute the
  // scale from the CURRENT scale (no reset-to-1 flash). Threshold prevents churn.
  useEffect(() => {
    if (!autoFit || !contentH) return
    const id = setTimeout(() => {
      const el = innerRef.current
      if (!el) return
      const cur = fitScaleRef.current
      const naturalTextH = (el.scrollHeight - pad2) / cur
      if (naturalTextH < 40) return
      const targetH = pageH * 0.93
      let s = clamp((targetH - pad2) / naturalTextH, 0.6, 1)
      s = s < 0.66 ? 1 : Number(s.toFixed(3))
      if (Math.abs(s - cur) > 0.02) setFitScale(s)
    }, 700)
    return () => clearTimeout(id)
  }, [contentH, autoFit, pad2, pageH])

  // After the fit scale changes, re-measure on the next frame so the page count
  // reflects the final scaled height (bounded: fitScale only changes a capped
  // number of times per document).
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const el = innerRef.current
      if (!el) return
      const h = el.scrollHeight
      setContentH(h)
      // Verify-and-correct: if a fitted page still overflows by a hair (e.g. a
      // photo header whose height doesn't scale linearly with the type), nudge the
      // scale down so it truly lands on ONE page — matching the printed/exported PDF.
      if (autoFit && fitScaleRef.current < 0.999 && h > pageH && correctTries.current < 2) {
        correctTries.current += 1
        const next = Number((fitScaleRef.current * (pageH / h) * 0.99).toFixed(4))
        if (next >= 0.55 && next < fitScaleRef.current) setFitScale(next)
      }
    })
    return () => cancelAnimationFrame(raf)
  }, [fitScale, autoFit, pageH])

  const effectiveZoom = useMemo(() => {
    if (fitToWidth && containerW > 0) return clamp((containerW - 56) / pageW, 0.4, 1.5)
    return zoom
  }, [fitToWidth, containerW, pageW, zoom])

  // When auto-fit applied a shrink, the content is one page by construction, so
  // trust that rather than a possibly-lagging measurement.
  const fitted = autoFit && fitScale < 0.999
  const pages = fitted ? 1 : Math.max(1, Math.ceil((contentH - 24) / pageH))
  const sheetH = pages * pageH

  return (
    <>
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
