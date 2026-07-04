import { memo, useLayoutEffect, useRef, useState } from 'react'
import type { ResumeDocument } from '@/types/document'
import { PAGE_DIMENSIONS } from '@/types/metadata'
import { TemplateRenderer } from '@/templates/TemplateRenderer'

/** A scaled, non-interactive single-page thumbnail of a resume.
 *  It sizes itself to its parent's CONTENT box (ResizeObserver), so responsive
 *  grid cells never crop the page — `width` is only the pre-measure fallback. */
export const PreviewThumb = memo(function PreviewThumb({
  doc,
  width = 150,
}: {
  doc: ResumeDocument
  width?: number
}) {
  const { w: pageW, h: pageH } = PAGE_DIMENSIONS[doc.metadata.page.format]
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(width)
  useLayoutEffect(() => {
    const parent = ref.current?.parentElement
    if (!parent || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((entries) => {
      const cw = entries[0]?.contentRect.width
      if (cw) setW((prev) => (Math.abs(cw - prev) > 0.5 ? cw : prev))
    })
    ro.observe(parent)
    return () => ro.disconnect()
  }, [])
  const scale = w / pageW
  return (
    <div ref={ref} className="overflow-hidden bg-white" style={{ width: w, height: pageH * scale }} aria-hidden>
      <div
        style={{
          width: pageW,
          height: pageH,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          pointerEvents: 'none',
        }}
      >
        <div style={{ width: pageW, minHeight: pageH }}>
          <TemplateRenderer doc={doc} mode="thumbnail" />
        </div>
      </div>
    </div>
  )
})
