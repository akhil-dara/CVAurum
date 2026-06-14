import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Plus } from 'lucide-react'
import type { ResumeDocument } from '@/types/document'
import { getTemplate } from '@/templates/registry'
import { SectionPreview } from '@/templates/_shared/Artboard'
import { DEFAULT_LABELS } from '@/lib/sections'
import { PREVIEW_CONTENT } from '@/data/previewSections'

/**
 * The "Add a section" gallery. Each card renders a live preview of the
 * section in the user's *current* template (theme, fonts, heading style), so you
 * see exactly how it will look before adding it.
 */
export function SectionGallery({
  doc,
  available,
  onAdd,
  onAddCustom,
  onClose,
}: {
  doc: ResumeDocument
  available: string[]
  onAdd: (key: string) => void
  onAddCustom: () => void
  onClose: () => void
}) {
  const config = getTemplate(doc.metadata.template)
  const previewDoc: ResumeDocument = {
    ...doc,
    content: PREVIEW_CONTENT,
    metadata: { ...doc.metadata, layout: { ...doc.metadata.layout, columns: 1, hidden: [] } },
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const PlusBadge = (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition group-hover:bg-primary group-hover:text-white">
      <Plus className="h-4 w-4" />
    </span>
  )

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-float">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div>
            <h2 className="text-base font-semibold">Add a section</h2>
            <p className="text-xs text-muted-foreground">Click to add — each preview uses your current template.</p>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3.5 overflow-auto p-5 sm:grid-cols-2 lg:grid-cols-3">
          {available.map((key) => (
            <button
              key={key}
              className="group flex flex-col overflow-hidden rounded-xl border border-border bg-white text-left transition hover:-translate-y-0.5 hover:border-primary hover:shadow-soft"
              onClick={() => onAdd(key)}
            >
              <div className="relative h-[152px] overflow-hidden border-b border-border bg-white px-3.5 pt-3.5">
                <div className="pointer-events-none select-none" style={{ zoom: 0.72 } as React.CSSProperties}>
                  <SectionPreview doc={previewDoc} config={config} sectionKey={key} />
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white to-transparent" />
              </div>
              <div className="flex items-center justify-between gap-2 px-3.5 py-2.5">
                <span className="truncate text-sm font-semibold text-foreground">{DEFAULT_LABELS[key] ?? key}</span>
                {PlusBadge}
              </div>
            </button>
          ))}

          <button
            className="group flex flex-col overflow-hidden rounded-xl border border-dashed border-border bg-white text-left transition hover:-translate-y-0.5 hover:border-primary hover:shadow-soft"
            onClick={onAddCustom}
          >
            <div className="flex h-[152px] flex-col items-center justify-center gap-2 border-b border-border bg-muted/30 text-muted-foreground">
              <Plus className="h-7 w-7" />
              <span className="text-xs">Your own heading & items</span>
            </div>
            <div className="flex items-center justify-between gap-2 px-3.5 py-2.5">
              <span className="truncate text-sm font-semibold text-foreground">Custom section</span>
              {PlusBadge}
            </div>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
