import { memo } from 'react'
import type { ResumeDocument } from '@/types/document'
import { PAGE_DIMENSIONS } from '@/types/metadata'
import { TemplateRenderer } from '@/templates/TemplateRenderer'

/** A scaled, non-interactive single-page thumbnail of a resume. */
export const PreviewThumb = memo(function PreviewThumb({
  doc,
  width = 150,
}: {
  doc: ResumeDocument
  width?: number
}) {
  const { w: pageW, h: pageH } = PAGE_DIMENSIONS[doc.metadata.page.format]
  const scale = width / pageW
  return (
    <div className="overflow-hidden bg-white" style={{ width, height: pageH * scale }} aria-hidden>
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
