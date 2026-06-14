import '@/styles/artboard.css'
import './templates.css'
import { memo } from 'react'
import type { ResumeDocument } from '@/types/document'
import type { RenderMode } from '@/types/template'
import { getTemplate } from './registry'
import { Artboard } from './_shared/Artboard'
import type { EditFn, MetaEditFn } from './_shared/Editable'

/** Renders a resume document using its selected template. Passing `edit` turns
 * on inline (WYSIWYG) editing of text directly on the canvas; `editMeta` enables
 * the per-section settings gear. */
export const TemplateRenderer = memo(function TemplateRenderer({
  doc,
  mode = 'preview',
  edit,
  editMeta,
  fitScale = 1,
  onAddSection,
}: {
  doc: ResumeDocument
  mode?: RenderMode
  edit?: EditFn
  editMeta?: MetaEditFn
  fitScale?: number
  onAddSection?: () => void
}) {
  const config = getTemplate(doc.metadata.template)
  if (config.Component) {
    const Custom = config.Component
    return <Custom doc={doc} mode={mode} />
  }
  return <Artboard doc={doc} config={config} mode={mode} edit={edit} editMeta={editMeta} fitScale={fitScale} onAddSection={onAddSection} />
})
