import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Plus } from 'lucide-react'
import type { ResumeDocument } from '@/types/document'
import { getTemplate } from '@/templates/registry'
import { SectionPreview } from '@/templates/_shared/Artboard'
import { sectionLabel } from '@/lib/sections'
import { PREVIEW_CONTENT } from '@/data/previewSections'
import { useLabel } from '@/i18n/labels'
import { useT } from '@/i18n'

/** Ready-made custom-section ideas — one click creates a pre-named section.
 *  The name becomes the section's own heading, so it is written in the
 *  interface's language: a Persian shelf should not put "Key Achievements"
 *  on a Persian resume. */
const CUSTOM_STARTERS = [
  'gallery.starter.achievements',
  'gallery.starter.strengths',
  'gallery.starter.courses',
  'gallery.starter.conferences',
  'gallery.starter.extracurriculars',
  'gallery.starter.portfolio',
] as const

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
  onAddCustom: (name?: string) => void
  onClose: () => void
}) {
  const t = useT()
  const L = useLabel()
  const config = getTemplate(doc.metadata.template)
  const pageBg = doc.metadata.theme.background || '#ffffff'
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
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-float">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div>
            <h2 className="text-base font-semibold">{t('gallery.addSection')}</h2>
            <p className="text-xs text-muted-foreground">{t('gallery.addBody')}</p>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label={t('ui.close')}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="grid grid-cols-1 gap-3.5 p-5 pb-8 sm:grid-cols-2 lg:grid-cols-3">
          {available.map((key) => (
            <button
              key={key}
              className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface text-start transition hover:-translate-y-0.5 hover:border-primary hover:shadow-soft"
              onClick={() => onAdd(key)}
            >
              <div className="relative h-[152px] overflow-hidden border-b border-border px-3.5 pt-3.5" style={{ background: pageBg }}>
                <div className="pointer-events-none select-none" style={{ zoom: 0.72 } as React.CSSProperties}>
                  <SectionPreview doc={previewDoc} config={config} sectionKey={key} />
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12" style={{ background: `linear-gradient(to top, ${pageBg}, transparent)` }} />
              </div>
              <div className="flex items-center justify-between gap-2 px-3.5 py-2.5">
                <span className="truncate text-sm font-semibold text-foreground">{L(sectionLabel(key, doc))}</span>
                {PlusBadge}
              </div>
            </button>
          ))}

          <div className="group flex flex-col overflow-hidden rounded-xl border border-dashed border-border bg-surface text-start">
            <div className="flex h-[152px] flex-col justify-center gap-2 border-b border-border bg-muted/30 px-3.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('gallery.popular')}</span>
              <div className="flex flex-wrap gap-1.5">
                {CUSTOM_STARTERS.map((n) => (
                  <button
                    key={n}
                    className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground transition hover:border-primary hover:bg-primary hover:text-white"
                    onClick={() => onAddCustom(t(n))}
                  >
                    {t(n)}
                  </button>
                ))}
              </div>
            </div>
            <button className="flex items-center justify-between gap-2 px-3.5 py-2.5 transition hover:bg-muted/40" onClick={() => onAddCustom()}>
              <span className="truncate text-sm font-semibold text-foreground">{t('gallery.customSection')}</span>
              {PlusBadge}
            </button>
          </div>
        </div>
        {/* sticky scroll hint: fades the cut row so "there's more below" is obvious */}
        <div className="pointer-events-none sticky bottom-0 -mt-8 h-8 bg-gradient-to-t from-surface to-transparent" />
        </div>
      </div>
    </div>,
    document.body,
  )
}
