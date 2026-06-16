import { useState } from 'react'
import { useStore } from 'zustand'
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize,
  Download,
  FileJson,
  FileDown,
  FileText,
  Check,
  Cloud,
  ChevronDown,
  HelpCircle,
} from 'lucide-react'
import type { ResumeDocument } from '@/types/document'
import { useResumeStore } from '@/store/useResumeStore'
import { useEditorStore } from '@/store/useEditorStore'
import { saveDoc } from '@/lib/storage'
import { openPrintWindow } from '@/lib/pdf'
import { ExportDialog, type ExportFormat } from './ExportDialog'
import { Logo } from '@/components/ui/Logo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

export function EditorTopBar({ doc }: { doc: ResumeDocument }) {
  const setTitle = useResumeStore((s) => s.setTitle)
  const dirty = useResumeStore((s) => s.dirty)
  const { zoom, autoFit, zoomIn, zoomOut, setAutoFit } = useEditorStore()

  const past = useStore(useResumeStore.temporal, (s) => s.pastStates.length)
  const future = useStore(useResumeStore.temporal, (s) => s.futureStates.length)
  const { undo, redo } = useResumeStore.temporal.getState()

  const [exportOpen, setExportOpen] = useState(false)
  const [exportFmt, setExportFmt] = useState<ExportFormat | null>(null)

  const chooseExport = (fmt: ExportFormat) => {
    setExportOpen(false)
    setExportFmt(fmt)
  }
  // PDF is the browser's vector Save-as-PDF (crisp, selectable, identical to the
  // preview). No in-app filename popup needed — the save dialog names it.
  const exportPdf = async () => {
    setExportOpen(false)
    await saveDoc(useResumeStore.getState().doc ?? doc)
    openPrintWindow(doc.id)
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-3">
      <Logo compact />
      <div className="mx-1 h-6 w-px bg-border" />

      <input
        value={doc.title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-44 max-w-[40vw] rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-medium hover:border-border focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
        aria-label="Resume title"
      />

      <span className="flex items-center gap-1 text-xs text-muted-foreground" title={dirty ? 'Saving…' : 'All changes saved locally'}>
        {dirty ? <Cloud className="h-3.5 w-3.5 animate-pulse" /> : <Check className="h-3.5 w-3.5 text-success" />}
        <span className="hidden sm:inline">{dirty ? 'Saving…' : 'Saved'}</span>
      </span>

      <div className="ml-auto flex items-center gap-1">
        {/* undo / redo + zoom — hidden on phones to keep the bar uncluttered */}
        <div className="hidden items-center gap-1 md:flex">
          <button className="btn-icon" onClick={() => undo()} disabled={past === 0} title="Undo (Ctrl+Z)">
            <Undo2 className="h-[18px] w-[18px]" />
          </button>
          <button className="btn-icon" onClick={() => redo()} disabled={future === 0} title="Redo (Ctrl+Shift+Z)">
            <Redo2 className="h-[18px] w-[18px]" />
          </button>

          <div className="mx-1 h-6 w-px bg-border" />

          {/* zoom */}
          <div className="flex items-center rounded-lg bg-muted p-0.5">
            <button className="btn-icon h-7 w-7" onClick={zoomOut} title="Zoom out">
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="w-12 text-center text-xs tabular-nums text-muted-foreground">
              {autoFit ? 'Fit' : `${Math.round(zoom * 100)}%`}
            </span>
            <button className="btn-icon h-7 w-7" onClick={zoomIn} title="Zoom in">
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              className="btn-icon h-7 w-7"
              data-active={autoFit}
              onClick={() => setAutoFit(!autoFit)}
              title="Fit to width"
            >
              <Maximize className="h-4 w-4" />
            </button>
          </div>

          <div className="mx-1 h-6 w-px bg-border" />
        </div>

        {/* re-open the guided tour */}
        <button
          className="btn-icon"
          onClick={() => window.dispatchEvent(new Event('cvaurum:open-tour'))}
          title="Show the quick tour"
          aria-label="Show the quick tour"
        >
          <HelpCircle className="h-[18px] w-[18px]" />
        </button>

        {/* export */}
        <div className="relative">
          <button data-tour="export" className="btn-primary btn-sm" onClick={() => setExportOpen((o) => !o)}>
            <Download className="h-4 w-4" /> Export <ChevronDown className="h-3.5 w-3.5 opacity-70" />
          </button>
          {exportOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
              <div className="card absolute right-0 z-20 mt-1 w-80 max-w-[calc(100vw-1.5rem)] overflow-hidden p-1.5 shadow-float">
                <button className="btn-ghost h-auto w-full flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-left" onClick={exportPdf}>
                  <span className="flex items-center gap-2 font-medium"><FileDown className="h-4 w-4 shrink-0 text-primary" /> Download PDF</span>
                  <span className="pl-6 text-xs font-normal leading-snug text-muted-foreground whitespace-normal">Crisp &amp; selectable — exact, via Save&nbsp;as&nbsp;PDF</span>
                </button>
                <button className="btn-ghost h-auto w-full flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-left" onClick={() => chooseExport('docx')}>
                  <span className="flex items-center gap-2 font-medium"><FileText className="h-4 w-4 shrink-0 text-primary" /> Download Word (.docx)</span>
                  <span className="pl-6 text-xs font-normal leading-snug text-muted-foreground whitespace-normal">Editable, ATS-friendly text that mirrors your template</span>
                </button>
                <button className="btn-ghost h-auto w-full flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-left" onClick={() => chooseExport('json')}>
                  <span className="flex items-center gap-2 font-medium"><FileJson className="h-4 w-4 shrink-0 text-primary" /> Export JSON Resume</span>
                  <span className="pl-6 text-xs font-normal leading-snug text-muted-foreground whitespace-normal">Portable data — re-import here or anywhere, anytime</span>
                </button>
              </div>
            </>
          )}
        </div>

        <ThemeToggle />
      </div>

      {exportFmt && <ExportDialog fmt={exportFmt} doc={doc} onClose={() => setExportFmt(null)} />}
    </header>
  )
}
