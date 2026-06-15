import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  FileText,
  Plus,
  FileUp,
  Copy,
  Trash2,
  MoreVertical,
  KanbanSquare,
  DatabaseBackup,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { saveDoc, deleteDoc } from '@/lib/storage'
import { exportFullBackup, importFullBackup } from '@/lib/backup'
import { uid, timeAgo } from '@/lib/utils'
import type { ResumeDocument } from '@/types/document'
import { PreviewThumb } from '@/components/preview/PreviewThumb'
import { Logo } from '@/components/ui/Logo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useResumeActions, NewResumeModal } from '@/components/dashboard/newResume'
import { InstallButton } from '@/components/ui/InstallButton'
import { useTitle } from '@/lib/useTitle'

/** The resume library / dashboard (/app). The explainer homepage lives at /. */
export function Dashboard() {
  useTitle('Your Resumes · CVAurum')
  const navigate = useNavigate()
  const library = useAppStore((s) => s.library)
  const refreshLibrary = useAppStore((s) => s.refreshLibrary)
  const toast = useAppStore((s) => s.toast)
  const { create, importFile } = useResumeActions()
  const fileRef = useRef<HTMLInputElement>(null)
  const backupRef = useRef<HTMLInputElement>(null)
  const [backupMenu, setBackupMenu] = useState(false)
  const [chooser, setChooser] = useState(false)

  useEffect(() => {
    refreshLibrary()
  }, [refreshLibrary])

  const onBackup = async () => {
    setBackupMenu(false)
    try {
      const n = await exportFullBackup()
      toast(`Backed up ${n} resume${n === 1 ? '' : 's'} + settings`, 'success')
    } catch {
      toast('Could not create the backup', 'error')
    }
  }
  const onRestore = async (file?: File) => {
    if (!file) return
    try {
      const r = await importFullBackup(file, 'merge')
      await refreshLibrary()
      toast(`Restored ${r.resumes} resume${r.resumes === 1 ? '' : 's'}${r.tracker ? ` + ${r.tracker} application${r.tracker === 1 ? '' : 's'}` : ''}`, 'success')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not restore that backup', 'error')
    }
  }

  return (
    <div className="min-h-full bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Logo to="/" />
          <div className="flex items-center gap-2">
            <InstallButton />
            <Link className="btn-ghost btn-sm" to="/tracker">
              <KanbanSquare className="h-4 w-4" /> Job Tracker
            </Link>
            <div className="relative">
              <button className="btn-ghost btn-sm" onClick={() => setBackupMenu((o) => !o)} title="Back up or restore all your data">
                <DatabaseBackup className="h-4 w-4" /> Backup
              </button>
              {backupMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setBackupMenu(false)} />
                  <div className="card absolute right-0 z-20 mt-1 w-60 overflow-hidden p-1 shadow-float">
                    <button className="btn-ghost h-auto w-full flex-col items-start gap-0 py-1.5" onClick={onBackup}>
                      <span className="text-sm font-medium">Export backup</span>
                      <span className="text-[11px] font-normal text-muted-foreground">All resumes + settings + tracker, one file</span>
                    </button>
                    <button className="btn-ghost h-auto w-full flex-col items-start gap-0 py-1.5" onClick={() => { setBackupMenu(false); backupRef.current?.click() }}>
                      <span className="text-sm font-medium">Restore from backup</span>
                      <span className="text-[11px] font-normal text-muted-foreground">Import into this browser (keeps existing)</span>
                    </button>
                  </div>
                </>
              )}
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => importFile(e.target.files?.[0])} />
      <input ref={backupRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => onRestore(e.target.files?.[0])} />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Your resumes</h1>
            <p className="mt-1 text-sm text-muted-foreground">Private &amp; local — everything is saved in this browser. Nothing leaves your device.</p>
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost btn-sm" onClick={() => fileRef.current?.click()} title="Import a JSON Resume file (.json) — not a PDF or Word doc">
              <FileUp className="h-4 w-4" /> Import JSON
            </button>
            <button className="btn-outline btn-sm" onClick={() => create(true)} title="Create a resume pre-filled with example content">
              <FileText className="h-4 w-4" /> Example
            </button>
            <button className="btn-primary btn-sm" onClick={() => setChooser(true)}>
              <Plus className="h-4 w-4" /> New resume
            </button>
          </div>
        </div>

        {library.length === 0 ? (
          <EmptyState onNew={() => setChooser(true)} onExample={() => create(true)} onImport={() => fileRef.current?.click()} />
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            <NewCard onClick={() => setChooser(true)} />
            {library.map((doc) => (
              <ResumeCard key={doc.id} doc={doc} onOpen={() => navigate(`/resume/${doc.id}`)} onChanged={refreshLibrary} />
            ))}
          </div>
        )}
      </main>

      {chooser && (
        <NewResumeModal
          onBlank={() => { setChooser(false); create(false) }}
          onExample={() => { setChooser(false); create(true) }}
          onImport={() => { setChooser(false); fileRef.current?.click() }}
          onClose={() => setChooser(false)}
        />
      )}
    </div>
  )
}

function EmptyState({ onNew, onExample, onImport }: { onNew: () => void; onExample: () => void; onImport: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <FileText className="h-7 w-7" />
      </div>
      <h2 className="mt-4 text-lg font-semibold">No resumes yet</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">Create your first résumé from a blank canvas or a ready-made example — it stays private to this browser.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button className="btn-primary btn-sm" onClick={onNew}>
          <Plus className="h-4 w-4" /> New resume
        </button>
        <button className="btn-outline btn-sm" onClick={onExample}>
          <FileText className="h-4 w-4" /> Start with an example
        </button>
        <button className="btn-ghost btn-sm" onClick={onImport} title="Import a JSON Resume file (.json) — not a PDF or Word doc">
          <FileUp className="h-4 w-4" /> Import JSON
        </button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground/70">Import takes a JSON Resume file — PDF and Word résumés can't be imported.</p>
    </div>
  )
}

function NewCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex aspect-[210/297] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
    >
      <Plus className="h-8 w-8" />
      <span className="text-sm font-medium">New resume</span>
    </button>
  )
}

function ResumeCard({ doc, onOpen, onChanged }: { doc: ResumeDocument; onOpen: () => void; onChanged: () => void }) {
  const [menu, setMenu] = useState(false)
  const toast = useAppStore((s) => s.toast)

  const duplicate = async () => {
    const copy: ResumeDocument = {
      ...structuredClone(doc),
      id: uid('res'),
      title: `${doc.title} (copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    await saveDoc(copy)
    await onChanged()
    setMenu(false)
    toast('Duplicated', 'success')
  }
  const remove = async () => {
    if (!confirm(`Delete "${doc.title}"? This can't be undone.`)) return
    await deleteDoc(doc.id)
    await onChanged()
    toast('Deleted')
  }

  return (
    <div className="group relative">
      <button
        onClick={onOpen}
        className="block w-full overflow-hidden rounded-xl border border-border bg-white shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card"
      >
        <div className="flex aspect-[210/297] justify-center overflow-hidden bg-white">
          <PreviewThumb doc={doc} width={210} />
        </div>
      </button>
      <div className="mt-2 flex items-start justify-between gap-2 px-0.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{doc.title}</p>
          <p className="text-xs text-muted-foreground">Edited {timeAgo(doc.updatedAt)}</p>
        </div>
        <div className="relative">
          <button className="btn-icon h-7 w-7" onClick={() => setMenu((m) => !m)} aria-label="Options">
            <MoreVertical className="h-4 w-4" />
          </button>
          {menu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
              <div className="card absolute right-0 z-20 mt-1 w-36 overflow-hidden p-1 shadow-float">
                <button className="btn-ghost w-full justify-start" onClick={duplicate}>
                  <Copy className="h-4 w-4" /> Duplicate
                </button>
                <button className="btn-ghost w-full justify-start text-danger hover:bg-danger/10" onClick={remove}>
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
