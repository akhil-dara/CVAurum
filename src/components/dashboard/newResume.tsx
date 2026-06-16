/**
 * Shared "create a resume" plumbing used by both the explainer homepage (/) and
 * the dashboard (/app): the create/import actions (which navigate straight into
 * the editor) and the Blank-vs-Example chooser modal.
 */
import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { FileText, FilePlus2, FileUp, X } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { createDocument } from '@/data/defaults'
import { applyTemplateToMetadata } from '@/lib/templateApply'
import { getTemplate } from '@/templates/registry'
import { saveDoc } from '@/lib/storage'
import { importDocumentFromFile } from '@/lib/io'
import { SAMPLES, type SamplePersona } from '@/data/samples'
import { PreviewThumb } from '@/components/preview/PreviewThumb'
import type { ResumeContent } from '@/types/document'

/** Create/import a resume and land the user in the editor. */
export function useResumeActions() {
  const navigate = useNavigate()
  const refreshLibrary = useAppStore((s) => s.refreshLibrary)
  const toast = useAppStore((s) => s.toast)

  const create = async (sample: boolean, templateId?: string, content?: ResumeContent) => {
    const doc = createDocument({ sample: sample || !!content, content })
    if (templateId) doc.metadata = applyTemplateToMetadata(doc.metadata, getTemplate(templateId).defaults)
    await saveDoc(doc)
    await refreshLibrary()
    navigate(`/resume/${doc.id}`)
  }

  const importFile = async (file?: File) => {
    if (!file) return
    try {
      const doc = await importDocumentFromFile(file)
      await saveDoc(doc)
      await refreshLibrary()
      toast('Resume imported', 'success')
      navigate(`/resume/${doc.id}`)
    } catch (e) {
      console.error(e)
      toast('Could not import that file. Expecting JSON Resume format.', 'error')
    }
  }

  return { create, importFile }
}

export function NewResumeModal({ onBlank, onExample, onImport, onClose }: { onBlank: () => void; onExample: () => void; onImport: () => void; onClose: () => void }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-float">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Create a resume</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-5 text-sm text-muted-foreground">Start from a clean slate, or from a filled-in example you can edit.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ChooserCard
            icon={<FilePlus2 className="h-6 w-6" />}
            title="Blank resume"
            body="A clean slate with the core sections ready to fill in."
            onClick={onBlank}
            primary
          />
          <ChooserCard
            icon={<FileText className="h-6 w-6" />}
            title="From an example"
            body="A complete sample resume — just swap in your details."
            onClick={onExample}
          />
        </div>
        <button
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2.5 text-sm text-muted-foreground transition hover:border-primary hover:text-primary"
          onClick={onImport}
        >
          <FileUp className="h-4 w-4" /> Import a JSON Resume file
        </button>
      </div>
    </div>,
    document.body,
  )
}

/**
 * Persona picker for "Start with an example" — shows a few believable, varied
 * resumes (engineer, marketing, new grad) rendered live in a flattering
 * template, so first-run users of any background see themselves and get ideas.
 */
export function SamplePicker({ onPick, onClose }: { onPick: (p: SamplePersona) => void; onClose: () => void }) {
  // Build a previewable doc per persona once (content + its flattering template).
  const docs = useMemo(
    () =>
      SAMPLES.map((s) => {
        const doc = createDocument({ sample: true, content: s.content, title: s.name })
        doc.metadata = applyTemplateToMetadata(doc.metadata, getTemplate(s.template).defaults)
        return { persona: s, doc }
      }),
    [],
  )
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[88vh] w-full max-w-3xl flex-col rounded-2xl border border-border bg-surface p-6 shadow-float">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Pick a starting example</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-5 text-sm text-muted-foreground">A complete, realistic resume to learn from — swap in your details, switch templates anytime.</p>
        <div className="grid grid-cols-1 gap-4 overflow-y-auto sm:grid-cols-3">
          {docs.map(({ persona, doc }) => (
            <button
              key={persona.id}
              onClick={() => onPick(persona)}
              className="group flex flex-col overflow-hidden rounded-xl border border-border bg-white text-left shadow-soft transition hover:-translate-y-0.5 hover:border-primary hover:shadow-card"
              title={`Start from the ${persona.role} example`}
            >
              <div className="aspect-[210/297] overflow-hidden border-b border-border bg-white">
                <PreviewThumb doc={doc} width={210} />
              </div>
              <div className="p-3">
                <div className="text-sm font-semibold text-foreground">{persona.role}</div>
                <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{persona.blurb}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}

function ChooserCard({ icon, title, body, onClick, primary }: { icon: React.ReactNode; title: string; body: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`group flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-soft ${primary ? 'border-primary/40 bg-primary/5 hover:border-primary' : 'border-border bg-surface hover:border-primary/60'}`}
    >
      <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${primary ? 'bg-primary text-white' : 'bg-muted text-foreground'}`}>{icon}</span>
      <span className="text-sm font-semibold">{title}</span>
      <span className="text-xs leading-relaxed text-muted-foreground">{body}</span>
    </button>
  )
}
