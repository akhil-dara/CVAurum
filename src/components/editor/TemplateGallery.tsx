import { useMemo } from 'react'
import { Check, ShieldCheck } from 'lucide-react'
import type { ResumeDocument } from '@/types/document'
import { TEMPLATES } from '@/templates/registry'
import { applyTemplateToMetadata } from '@/lib/templateApply'
import { useResumeStore } from '@/store/useResumeStore'
import { useAppStore } from '@/store/useAppStore'
import { PreviewThumb } from '@/components/preview/PreviewThumb'
import { cn } from '@/lib/utils'

export function TemplateGallery({ doc }: { doc: ResumeDocument }) {
  const applyTemplate = useResumeStore((s) => s.applyTemplate)
  const toast = useAppStore((s) => s.toast)
  const current = doc.metadata.template

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {TEMPLATES.length} templates. Your content flows into every one — switch any time.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {TEMPLATES.map((tpl) => (
          <TemplateCard
            key={tpl.id}
            tpl={tpl}
            doc={doc}
            active={current === tpl.id}
            onPick={() => {
              applyTemplate(tpl.defaults)
              toast(`Switched to ${tpl.name}`, 'success')
            }}
          />
        ))}
      </div>
    </div>
  )
}

function TemplateCard({
  tpl,
  doc,
  active,
  onPick,
}: {
  tpl: (typeof TEMPLATES)[number]
  doc: ResumeDocument
  active: boolean
  onPick: () => void
}) {
  // Render the thumbnail with the user's content but this template's look.
  const previewDoc = useMemo<ResumeDocument>(
    () => ({ ...doc, metadata: applyTemplateToMetadata(doc.metadata, tpl.defaults) }),
    [doc, tpl.defaults]
  )

  return (
    <button
      onClick={onPick}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-lg border bg-surface text-left transition-all hover:shadow-card',
        active ? 'border-primary ring-2 ring-primary/40' : 'border-border hover:border-primary/40'
      )}
      title={tpl.description}
    >
      <div className="relative flex justify-center overflow-hidden border-b border-border bg-white p-2">
        <PreviewThumb doc={previewDoc} width={150} />
        {active && (
          <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="h-3.5 w-3.5" />
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-1 px-2.5 py-2">
        <span className="text-[13px] font-medium text-foreground">{tpl.name}</span>
        {tpl.atsSafe && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-success" title="Parses cleanly in ATS">
            <ShieldCheck className="h-3 w-3" />
            ATS
          </span>
        )}
      </div>
    </button>
  )
}
