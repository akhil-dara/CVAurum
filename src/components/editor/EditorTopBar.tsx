import { useEffect, useState } from 'react'
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
  ScanText,
  Eye,
  PencilLine,
  Command,
  Share2,
  MoreVertical,
  Moon,
  Sun,
} from 'lucide-react'
import type { ResumeDocument } from '@/types/document'
import { useResumeStore } from '@/store/useResumeStore'
import { useEditorStore } from '@/store/useEditorStore'
import { useAppStore } from '@/store/useAppStore'
import { saveDoc } from '@/lib/storage'
import { openPrintWindow } from '@/lib/pdf'
import { ExportDialog, type ExportFormat } from './ExportDialog'
import { Logo } from '@/components/ui/Logo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

export function EditorTopBar({ doc }: { doc: ResumeDocument }) {
  const setTitle = useResumeStore((s) => s.setTitle)
  const dirty = useResumeStore((s) => s.dirty)
  const { zoom, autoFit, zoomIn, zoomOut, setAutoFit, atsView, setAtsView, previewExact, setPreviewExact } = useEditorStore()

  const past = useStore(useResumeStore.temporal, (s) => s.pastStates.length)
  const future = useStore(useResumeStore.temporal, (s) => s.futureStates.length)
  const { undo, redo } = useResumeStore.temporal.getState()

  const [exportOpen, setExportOpen] = useState(false)
  // the command palette can open the export menu
  useEffect(() => {
    const onOpen = () => setExportOpen(true)
    window.addEventListener('cvaurum:open-export', onOpen)
    return () => window.removeEventListener('cvaurum:open-export', onOpen)
  }, [])
  const [exportFmt, setExportFmt] = useState<ExportFormat | null>(null)
  // phone overflow ("⋮") menu — holds the controls that don't fit at <768px
  const [moreOpen, setMoreOpen] = useState(false)
  const theme = useAppStore((s) => s.settings.theme)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches)

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
    <header className="flex h-14 shrink-0 items-center gap-1.5 border-b border-border bg-surface px-2 sm:gap-3 sm:px-3">
      <Logo compact />
      <div className="mx-1 hidden h-6 w-px bg-border sm:block" />

      {/* On phones the title yields space — Export must NEVER leave the screen. */}
      <input
        value={doc.title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-24 min-w-0 max-w-[20vw] rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-medium hover:border-border focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40 sm:w-44 sm:max-w-[40vw]"
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

        {/* canvas mode — ALWAYS visible: exact-PDF preview and the ATS view
            matter just as much on a phone (icon-only there to stay compact) */}
        <div data-tour="modes" className="flex items-center rounded-lg bg-muted p-0.5" role="tablist" aria-label="Canvas mode">
          {(
            [
              { key: 'edit', label: 'Edit', icon: <PencilLine className="h-3.5 w-3.5" />, title: 'Edit right on the page' },
              { key: 'preview', label: 'Preview', icon: <Eye className="h-3.5 w-3.5" />, title: 'Exactly what exports — no editing hints or empty sections' },
              { key: 'ats', label: 'ATS', icon: <ScanText className="h-3.5 w-3.5" />, title: 'The plain text an ATS parser reads' },
            ] as const
          ).map((m) => {
            const active = m.key === 'ats' ? atsView : m.key === 'preview' ? previewExact && !atsView : !previewExact && !atsView
            return (
              <button
                key={m.key}
                role="tab"
                aria-selected={active}
                className={`flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition sm:px-2.5 ${active ? 'bg-primary text-primary-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => {
                  setPreviewExact(m.key === 'preview')
                  setAtsView(m.key === 'ats')
                  // phones: the edit panel covers the canvas — close it to preview,
                  // and bring it back when the user returns to Edit
                  if (window.innerWidth < 768) useEditorStore.getState().setLeftOpen(m.key === 'edit')
                }}
                title={m.title}
              >
                {m.icon} <span className="hidden sm:inline">{m.label}</span>
              </button>
            )
          })}
        </div>

        {/* share — moves into the ⋮ menu on the narrowest screens */}
        <button
          data-tour="share"
          className="btn-icon hidden sm:flex"
          onClick={() => window.dispatchEvent(new Event('cvaurum:open-share'))}
          title="Share privately"
          aria-label="Share résumé privately"
        >
          <Share2 className="h-[18px] w-[18px]" />
        </button>

        {/* command palette (Ctrl/Cmd+K) */}
        <button
          data-tour="palette"
          className="btn-icon hidden sm:flex"
          onClick={() => window.dispatchEvent(new Event('cvaurum:open-palette'))}
          title="Command palette (Ctrl+K)"
          aria-label="Open command palette"
        >
          <Command className="h-[18px] w-[18px]" />
        </button>

        {/* re-open the guided tour — in the ⋮ menu below md */}
        <button
          className="btn-icon hidden md:flex"
          onClick={() => window.dispatchEvent(new Event('cvaurum:open-tour'))}
          title="Show the quick tour"
          aria-label="Show the quick tour"
        >
          <HelpCircle className="h-[18px] w-[18px]" />
        </button>

        {/* export */}
        <div className="relative">
          <button data-tour="export" className="btn-primary btn-sm" onClick={() => setExportOpen((o) => !o)} aria-label="Export">
            <Download className="h-4 w-4" /> <span className="hidden sm:inline">Export</span> <ChevronDown className="h-3.5 w-3.5 opacity-70" />
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

        <div className="hidden md:block">
          <ThemeToggle />
        </div>

        {/* phone overflow menu — everything that left the bar stays reachable */}
        <div className="relative md:hidden">
          <button className="btn-icon" onClick={() => setMoreOpen((o) => !o)} title="More" aria-label="More options" aria-expanded={moreOpen}>
            <MoreVertical className="h-[18px] w-[18px]" />
          </button>
          {moreOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMoreOpen(false)} />
              <div className="card absolute right-0 z-20 mt-1 w-56 overflow-hidden p-1.5 shadow-float">
                <button
                  className="btn-ghost flex h-auto w-full items-center justify-start gap-2 rounded-lg px-2.5 py-2 text-sm sm:hidden"
                  onClick={() => { setMoreOpen(false); window.dispatchEvent(new Event('cvaurum:open-share')) }}
                >
                  <Share2 className="h-4 w-4 text-primary" /> Share privately
                </button>
                <button
                  className="btn-ghost flex h-auto w-full items-center justify-start gap-2 rounded-lg px-2.5 py-2 text-sm"
                  onClick={() => { setMoreOpen(false); window.dispatchEvent(new Event('cvaurum:open-tour')) }}
                >
                  <HelpCircle className="h-4 w-4 text-primary" /> Show the quick tour
                </button>
                <button
                  className="btn-ghost flex h-auto w-full items-center justify-start gap-2 rounded-lg px-2.5 py-2 text-sm"
                  onClick={() => { setMoreOpen(false); updateSettings({ theme: isDark ? 'light' : 'dark' }) }}
                >
                  {isDark ? <Sun className="h-4 w-4 text-primary" /> : <Moon className="h-4 w-4 text-primary" />}
                  {isDark ? 'Light mode' : 'Dark mode'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {exportFmt && <ExportDialog fmt={exportFmt} doc={doc} onClose={() => setExportFmt(null)} />}
    </header>
  )
}
