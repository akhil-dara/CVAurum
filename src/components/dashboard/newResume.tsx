/**
 * Shared "create a resume" plumbing used by both the explainer homepage (/) and
 * the dashboard (/app): the create/import actions (which navigate straight into
 * the editor) and the Blank-vs-Example chooser modal.
 */
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { FileText, FilePlus2, FileUp, X } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { createDocument } from '@/data/defaults'
import { applyTemplateToMetadata } from '@/lib/templateApply'
import { getTemplate } from '@/templates/registry'
import { saveDoc } from '@/lib/storage'
import { importDocumentFromFile } from '@/lib/io'

/** Create/import a resume and land the user in the editor. */
export function useResumeActions() {
  const navigate = useNavigate()
  const refreshLibrary = useAppStore((s) => s.refreshLibrary)
  const toast = useAppStore((s) => s.toast)

  const create = async (sample: boolean, templateId?: string) => {
    const doc = createDocument({ sample })
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
