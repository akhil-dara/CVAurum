import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Eye } from 'lucide-react'
import type { ResumeDocument } from '@/types/document'
import { useEditorStore } from '@/store/useEditorStore'
import { useResumeStore } from '@/store/useResumeStore'
import { useAppStore } from '@/store/useAppStore'
import { EditorTopBar } from './EditorTopBar'
import { EditorTour } from './EditorTour'
import { CommandPalette } from './CommandPalette'
import { ShareDialog } from './ShareDialog'
import { LeftRail } from './LeftRail'
import { ContentPanel } from './panels/ContentPanel'
import { DesignPanel } from './panels/DesignPanel'
import { AtsPanel } from './panels/AtsPanel'
import { TemplateGallery } from './TemplateGallery'
import { ResumePreview } from '@/components/preview/ResumePreview'

const PANEL_TITLES: Record<string, string> = {
  content: 'Content',
  design: 'Design',
  templates: 'Templates',
  ats: 'ATS & Tailoring',
}

export function Editor({ doc }: { doc: ResumeDocument }) {
  // Two narrow selectors, not the whole store: selecting the store object
  // re-rendered the entire editor - both artboard trees included - on EVERY
  // editor-store write, and ResumePreview writes onePageScale after each doc
  // change, so typing paid a second full-tree render for nothing.
  const leftTab = useEditorStore((s) => s.leftTab)
  const leftOpen = useEditorStore((s) => s.leftOpen)

  // Global undo/redo shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return
      // Let editable fields (inputs, textareas, TipTap) handle their own undo.
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.closest('.ProseMirror'))) return
      if (e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) useResumeStore.temporal.getState().redo()
        else useResumeStore.temporal.getState().undo()
      } else if (e.key.toLowerCase() === 'y') {
        e.preventDefault()
        useResumeStore.temporal.getState().redo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const setLeftOpen = useEditorStore((s) => s.setLeftOpen)

  // Fresh blank resume: open on Templates so "pick your design" is step one —
  // 52 live previews of THIS (empty) doc beat guessing at names.
  useEffect(() => {
    try {
      if (sessionStorage.getItem('cvaurum:pick-design') === doc.id) {
        sessionStorage.removeItem('cvaurum:pick-design')
        useEditorStore.getState().setLeftTab('templates')
        useEditorStore.getState().setLeftOpen(true)
        useAppStore.getState().toast('Start by picking a design — hover any card for a full-size preview. Your content will flow into whichever you choose.', 'info')
      }
    } catch {
      /* private mode */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <EditorTopBar doc={doc} />
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <LeftRail />
        <AnimatePresence initial={false}>
          {leftOpen && (
            <motion.aside
              key="panel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              // Mobile: full-width, fills the height (canvas is hidden). Desktop: a
              // fixed 392px column beside the canvas.
              data-tour="panel"
              className="order-1 flex min-h-0 w-full flex-1 flex-col overflow-hidden border-border bg-surface md:order-none md:w-[392px] md:flex-none md:border-r"
            >
              <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
                <h2 className="text-sm font-semibold">{PANEL_TITLES[leftTab]}</h2>
                {/* Not "Preview": the bottom bar already has a Preview that
                    means the exact-PDF view, and two buttons with one name
                    and two meanings read as a bug. This one just puts the
                    editable page on screen. */}
                <button className="btn-ghost btn-sm md:hidden" onClick={() => setLeftOpen(false)}>
                  <Eye className="h-4 w-4" /> View page
                </button>
              </div>
              <div className="panel-scroll w-full flex-1 p-4">
                {leftTab === 'content' && <ContentPanel doc={doc} />}
                {leftTab === 'design' && <DesignPanel doc={doc} />}
                {leftTab === 'templates' && <TemplateGallery doc={doc} />}
                {leftTab === 'ats' && <AtsPanel doc={doc} />}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
        <div data-tour="canvas" className={`order-2 min-h-0 min-w-0 flex-1 md:order-none ${leftOpen ? 'hidden md:block' : ''}`}>
          <ResumePreview doc={doc} />
        </div>
      </div>
      <EditorTour />
      <CommandPalette doc={doc} />
      <ShareDialog doc={doc} />
    </div>
  )
}
