import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Download } from 'lucide-react'
import type { ResumeDocument } from '@/types/document'
import { useResumeStore } from '@/store/useResumeStore'
import { useAppStore } from '@/store/useAppStore'
import { resumeFileBase } from '@/lib/utils'
import { exportDocumentJson } from '@/lib/io'

/** Formats that download silently (PDF uses the browser's Save-as-PDF directly). */
export type ExportFormat = 'docx' | 'json'

const META: Record<ExportFormat, { label: string; ext: string; hint: string }> = {
  docx: { label: 'Download Word', ext: 'docx', hint: 'An editable, ATS-friendly .docx that mirrors your template.' },
  json: { label: 'Export JSON Resume', ext: 'json', hint: 'Portable data you can re-import anytime (JSON Resume schema).' },
}

/**
 * Filename-first export popup for the silent downloads (Word, JSON): shows the
 * suggested name (Name_Resume_<date>), lets the user edit it, then downloads on
 * confirm — so exports never just fire without a chance to name the file.
 */
export function ExportDialog({ fmt, doc, onClose }: { fmt: ExportFormat; doc: ResumeDocument; onClose: () => void }) {
  const toast = useAppStore((s) => s.toast)
  const [name, setName] = useState(resumeFileBase(doc.content.basics.name, doc.title))
  const [busy, setBusy] = useState(false)
  const meta = META[fmt]
  const fileName = `${name.trim() || 'resume'}.${meta.ext}`

  const download = async () => {
    if (busy) return
    setBusy(true)
    try {
      const d = useResumeStore.getState().doc ?? doc
      if (fmt === 'json') {
        exportDocumentJson(d, fileName)
      } else {
        const { exportDocumentDocx } = await import('@/lib/docx')
        await exportDocumentDocx(d, fileName)
      }
      toast(`Downloaded ${fileName}`, 'success')
      onClose()
    } catch {
      toast('Could not export — please try again.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !busy && onClose()} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-float">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-base font-semibold">{meta.label}</h2>
          <button className="btn-icon" onClick={onClose} disabled={busy} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-xs leading-relaxed text-muted-foreground">{meta.hint}</p>

        <label className="label" htmlFor="export-filename">
          File name
        </label>
        <div className="flex items-stretch overflow-hidden rounded-lg border border-input focus-within:ring-2 focus-within:ring-ring/40">
          <input
            id="export-filename"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && download()}
            className="min-w-0 flex-1 bg-surface px-3 py-2 text-sm outline-none"
            spellCheck={false}
          />
          <span className="flex select-none items-center bg-muted px-2.5 text-sm text-muted-foreground">.{meta.ext}</span>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">Saves to your browser's Downloads folder.</p>

        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-outline btn-sm" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn-primary btn-sm" onClick={download} disabled={busy}>
            <Download className="h-4 w-4" /> {busy ? 'Preparing…' : 'Download'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
