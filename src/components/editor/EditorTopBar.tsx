import { useEffect, useRef, useState } from 'react'
import { useStore } from 'zustand'
import { Check, ChevronDown, ClipboardCopy, Cloud, Command, Download, Eye, FileDown, FileJson, FileText, HelpCircle, Languages, Maximize, Moon, MoreVertical, PencilLine, Redo2, ScanText, Share2, ShieldAlert, Sun, Undo2, ZoomIn, ZoomOut } from 'lucide-react'
import type { ResumeDocument } from '@/types/document'
import { isPhoneLayout } from '@/lib/layoutMode'
import { useResumeStore } from '@/store/useResumeStore'
import { useEditorStore } from '@/store/useEditorStore'
import { useAppStore } from '@/store/useAppStore'
// Loaded on the export click: pdf-lib + fontkit are ~1.2MB the editor
// never needs until the moment a file is actually produced.
import { ExportDialog, type ExportFormat } from './ExportDialog'
import { runPdfExport } from '@/lib/pdf/exportFlow'
import { getDurabilityStatus, loadRawDocs, requestDurability, type DurabilityStatus } from '@/lib/storage'
import { exportFullBackup } from '@/lib/backup'
import { hasWorkToLose, readLastBackup, saveAtRisk } from '@/lib/saveSafety'
import { Logo } from '@/components/ui/Logo'
import { usePopoverA11y } from '@/templates/_shared/popoverA11y'
import { onMenuKeyDown } from '@/lib/menuKeys'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { LanguageToggle } from '@/components/ui/LanguageToggle'
import { useT } from '@/i18n'

export function EditorTopBar({ doc }: { doc: ResumeDocument }) {
  const setTitle = useResumeStore((s) => s.setTitle)
  const dirty = useResumeStore((s) => s.dirty)
  const { zoom, autoFit, zoomIn, zoomOut, setAutoFit, atsView, setAtsView, previewExact, setPreviewExact, pdfExporting } =
    useEditorStore()

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
  // Both menus: focus goes in on open, arrows move, Escape closes and hands
  // focus back to the button (it left the menu open behind its backdrop,
  // which then swallowed the next click - 2026-10-24).
  const exportPanel = useRef<HTMLDivElement>(null)
  const morePanel = useRef<HTMLDivElement>(null)
  usePopoverA11y(exportOpen, () => setExportOpen(false), exportPanel)
  usePopoverA11y(moreOpen, () => setMoreOpen(false), morePanel)
  useEffect(() => {
    const panel = exportOpen ? exportPanel.current : moreOpen ? morePanel.current : null
    panel?.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')?.focus()
  }, [exportOpen, moreOpen])
  const theme = useAppStore((s) => s.settings.theme)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const toast = useAppStore((s) => s.toast)
  const t = useT()
  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches)

  const chooseExport = (fmt: ExportFormat) => {
    setExportOpen(false)
    setExportFmt(fmt)
  }

  /**
   * The resume as running text, on the clipboard.
   *
   * Copying from the PDF gives a line per line of the PAGE, because that is
   * what a page is - paste it into an application form and every sentence
   * arrives broken. The same document reflowed into paragraphs is something
   * this app already computes for the ATS panel, and which now matches the
   * exported file word for word, so it is the same resume either way.
   *
   * Falls back to a hidden textarea and execCommand where the async clipboard
   * is refused: a permission prompt is not worth a copy button.
   */
  const copyPlainText = async () => {
    setExportOpen(false)
    const d = useResumeStore.getState().doc ?? doc
    const { resumeToAtsText } = await import('@/lib/atsText')
    const text = resumeToAtsText(d)
    try {
      await navigator.clipboard.writeText(text)
      toast(t('top.copied'))
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.cssText = 'position:fixed;top:0;left:-9999px'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      ta.remove()
      toast(ok ? t('top.copied') : t('top.clipboardBlocked'), ok ? 'info' : 'error')
    }
  }
  // PDF is generated in-app by the native renderer (crisp, selectable, exact -
  // same DOM/CSS as the preview), multi-page included. It is the ONLY engine:
  // there is no print fallback behind it, so a failure is reported as one.
  // runPdfExport owns the in-flight guard, the visible generating state
  // (PdfExportStatus) and the outcome toast, shared with the command palette.
  const exportPdf = () => {
    setExportOpen(false)
    void runPdfExport(useResumeStore.getState().doc ?? doc)
  }

  return (
    // Its own stacking level, above the canvas: the Export and More menus sat
    // at z-20 against the whole page, and the Preview banner - also z-20 and
    // later in the page - covered "Download PDF", so a click on it went to
    // "Back to editing" instead (usability test, 2026-09-26).
    <header className="relative z-30 flex h-14 shrink-0 items-center gap-1.5 border-b border-border bg-surface px-2 sm:gap-3 sm:px-3">
      <Logo compact />
      <div className="mx-1 hidden h-6 w-px bg-border sm:block" />

      {/* The title yields space so Export never leaves the screen, but it
          keeps a readable minimum: in a 768px bar it used to shrink to 20px,
          a slit that could not be read or edited (2026-09-08). On a phone it
          takes whatever the bar has left - capped at a fifth of the screen it
          showed 46px of a title ("My Res") beside empty room - and a title
          longer than that ends in an ellipsis, not mid-letter. */}
      <input
        value={doc.title}
        onChange={(e) => setTitle(e.target.value)}
        className="min-w-[4rem] flex-1 text-ellipsis sm:w-44 sm:max-w-[40vw] sm:flex-initial rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-medium hover:border-border focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label={t('top.resumeTitle')}
      />

      <SaveStatus dirty={dirty} content={doc.content} />

      <div className="ms-auto flex items-center gap-1">
        {/* undo / redo + zoom: needs a desktop layout AND a bar with room.
            Under 768px there is none (a half-width laptop window is 683px):
            the More menu carries undo/redo and the canvas its own zoom pill. */}
        <div className="hidden items-center gap-1 md:desk:flex">
          <button className="btn-icon" onClick={() => undo()} disabled={past === 0} title={t('top.undoHint')}>
            <Undo2 className="flip-rtl h-[18px] w-[18px]" />
          </button>
          <button className="btn-icon" onClick={() => redo()} disabled={future === 0} title={t('top.redoHint')}>
            <Redo2 className="flip-rtl h-[18px] w-[18px]" />
          </button>

          <div className="mx-1 h-6 w-px bg-border" />

          {/* zoom */}
          <div className="flex items-center rounded-lg bg-muted p-0.5">
            <button className="btn-icon h-7 w-7" onClick={zoomOut} aria-label={t('top.zoomOut')} title={t('top.zoomOut')}>
              <ZoomOut className="h-4 w-4" />
            </button>
            {/* the readout and Fit yield between md and lg so the title keeps
                its width in a 768px bar */}
            <span className="hidden w-12 text-center text-xs tabular-nums text-muted-foreground lg:inline">
              {autoFit ? t('top.fit') : `${Math.round(zoom * 100)}%`}
            </span>
            <button className="btn-icon h-7 w-7" onClick={zoomIn} aria-label={t('top.zoomIn')} title={t('top.zoomIn')}>
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              className="btn-icon hidden h-7 w-7 lg:flex"
              data-active={autoFit}
              onClick={() => setAutoFit(!autoFit)}
              aria-label={t('top.fitToWidth')}
              aria-pressed={autoFit}
              title={t('top.fitToWidth')}
            >
              <Maximize className="h-4 w-4" />
            </button>
          </div>

          <div className="mx-1 h-6 w-px bg-border" />

        </div>

        {/* canvas mode — ALWAYS visible: exact-PDF preview and the ATS view
            matter just as much on a phone (icon-only there to stay compact) */}
        <div data-tour="modes" className="flex items-center rounded-lg bg-muted p-0.5" role="tablist" aria-label={t('top.canvasMode')}>
          {(
            [
              { key: 'edit', label: 'top.edit', icon: <PencilLine className="h-3.5 w-3.5" />, title: 'top.editHint' },
              { key: 'preview', label: 'top.preview', icon: <Eye className="h-3.5 w-3.5" />, title: 'top.previewHint' },
              { key: 'ats', label: 'top.ats', icon: <ScanText className="h-3.5 w-3.5" />, title: 'top.atsHint' },
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
                  if (isPhoneLayout()) useEditorStore.getState().setLeftOpen(m.key === 'edit')
                }}
                title={t(m.title)}
              >
                {/* Icon-only until lg. The three labels cost about 150px, which
                    is what pushed Export off the right edge at tablet width;
                    each button keeps its `title`, so it still has a name. */}
                {m.icon} <span className="hidden lg:inline">{t(m.label)}</span>
              </button>
            )
          })}
        </div>

        {/* share — moves into the ⋮ menu on the narrowest screens */}
        <button
          data-tour="share"
          className="btn-icon hidden sm:flex"
          onClick={() => window.dispatchEvent(new Event('cvaurum:open-share'))}
          title={t('top.share')}
          aria-label={t('top.shareHint')}
        >
          <Share2 className="h-[18px] w-[18px]" />
        </button>

        {/* command palette (Ctrl/Cmd+K) */}
        <button
          data-tour="palette"
          className="btn-icon hidden sm:flex"
          onClick={() => window.dispatchEvent(new Event('cvaurum:open-palette'))}
          title={t('top.palette')}
          aria-label={t('top.paletteHint')}
        >
          <Command className="h-[18px] w-[18px]" />
        </button>

        {/* re-open the guided tour — in the ⋮ menu below lg. It used to appear
            at md, which is exactly the width where the bar overflowed: the
            extra controls arrived before there was room for them, and Export
            was pushed 94px off the right edge. */}
        <button
          className="btn-icon hidden lg:flex"
          onClick={() => window.dispatchEvent(new Event('cvaurum:open-tour'))}
          title={t('top.tour')}
          aria-label={t('top.tour')}
        >
          <HelpCircle className="h-[18px] w-[18px]" />
        </button>

        {/* export */}
        <div className="relative">
          <button data-tour="export" className="btn-primary btn-sm" onClick={() => setExportOpen((o) => !o)} aria-label={t('top.export')} aria-haspopup="menu" aria-expanded={exportOpen}>
            <Download className="h-4 w-4" /> <span className="hidden sm:inline">{t('top.export')}</span> <ChevronDown className="h-3.5 w-3.5 opacity-70" />
          </button>
          {exportOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
              <div
                ref={exportPanel}
                role="menu"
                aria-label={t('top.export')}
                tabIndex={-1}
                onKeyDown={onMenuKeyDown}
                // `end-0`: the menu aligns to the button's inline-end edge,
                // which is the left in a right-to-left interface.
                className="card absolute end-0 z-20 mt-1 w-80 max-w-[calc(100vw-1.5rem)] overflow-hidden p-1.5 shadow-float focus:outline-none"
              >
                <button role="menuitem"
                  className="btn-ghost h-auto w-full flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-start"
                  onClick={exportPdf}
                  disabled={pdfExporting}
                  aria-busy={pdfExporting}
                >
                  <span className="flex items-center gap-2 font-medium"><FileDown className="h-4 w-4 shrink-0 text-primary" /> {pdfExporting ? t('top.generating') : t('top.downloadPdf')}</span>
                  <span className="ps-6 text-xs font-normal leading-snug text-muted-foreground whitespace-normal">{t('top.downloadPdfNote')}</span>
                </button>
                <button role="menuitem" className="btn-ghost h-auto w-full flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-start" onClick={() => chooseExport('docx')}>
                  <span className="flex items-center gap-2 font-medium"><FileText className="h-4 w-4 shrink-0 text-primary" /> {t('top.downloadDocx')}</span>
                  <span className="ps-6 text-xs font-normal leading-snug text-muted-foreground whitespace-normal">{t('top.downloadDocxNote')}</span>
                </button>
                <button role="menuitem" className="btn-ghost h-auto w-full flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-start" onClick={copyPlainText}>
                  <span className="flex items-center gap-2 font-medium"><ClipboardCopy className="h-4 w-4 shrink-0 text-primary" /> {t('top.copyText')}</span>
                  <span className="ps-6 text-xs font-normal leading-snug text-muted-foreground whitespace-normal">{t('top.copyTextNote')}</span>
                </button>
                <button role="menuitem" className="btn-ghost h-auto w-full flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-start" onClick={() => chooseExport('json')}>
                  <span className="flex items-center gap-2 font-medium"><FileJson className="h-4 w-4 shrink-0 text-primary" /> {t('top.exportJson')}</span>
                  <span className="ps-6 text-xs font-normal leading-snug text-muted-foreground whitespace-normal">{t('top.exportJsonNote')}</span>
                </button>
              </div>
            </>
          )}
        </div>

        <div className="hidden items-center gap-1 lg:flex">
          <LanguageToggle />
          <ThemeToggle />
        </div>

        {/* overflow menu — everything that left the bar stays reachable */}
        {/* Stays until the controls it holds reappear at lg - otherwise there
            is a band between md and lg where they are hidden from the bar AND
            from the menu, so the tour and the theme toggle cannot be reached
            at all. */}
        <div className="relative lg:hidden">
          <button className="btn-icon" onClick={() => setMoreOpen((o) => !o)} title={t('common.more')} aria-label={t('common.moreOptions')} aria-haspopup="menu" aria-expanded={moreOpen}>
            <MoreVertical className="h-[18px] w-[18px]" />
          </button>
          {moreOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMoreOpen(false)} />
              <div
                ref={morePanel}
                role="menu"
                aria-label={t('common.moreOptions')}
                tabIndex={-1}
                onKeyDown={onMenuKeyDown}
                className="card absolute end-0 z-20 mt-1 w-56 overflow-hidden p-1.5 shadow-float focus:outline-none"
              >
                {/* Undo / redo. The bar's own pair is hidden below md and a
                    phone has no Ctrl+Z, so a mis-tapped Remove (section ⋯
                    menu, entry trash) or a template switch could not be taken
                    back at all. The menu stays open on these two so several
                    steps can be undone in a row. Only below md — above it the
                    bar already carries them. */}
                <div className="flex items-center gap-1 md:hidden">
                  <button role="menuitem"
                    className="btn-ghost flex h-10 flex-1 items-center justify-start gap-2 rounded-lg px-2.5 text-sm"
                    onClick={() => undo()}
                    disabled={past === 0}
                    title={t('common.undo')}
                  >
                    <Undo2 className="flip-rtl h-4 w-4 text-primary" /> {t('common.undo')}
                  </button>
                  <button role="menuitem"
                    className="btn-ghost flex h-10 flex-1 items-center justify-start gap-2 rounded-lg px-2.5 text-sm"
                    onClick={() => redo()}
                    disabled={future === 0}
                    title={t('common.redo')}
                  >
                    <Redo2 className="flip-rtl h-4 w-4 text-primary" /> {t('common.redo')}
                  </button>
                </div>
                <div className="my-1 h-px bg-border md:hidden" />
                {/* The palette is the ONLY way to reach focus mode, the skim
                    heatmap and search-by-name for templates / fonts / accents.
                    Its bar button starts at sm and Ctrl+K needs a keyboard, so
                    below sm this menu item is the only door in. */}
                <button role="menuitem"
                  className="btn-ghost flex h-auto min-h-[40px] w-full items-center justify-start gap-2 rounded-lg px-2.5 py-2 text-sm sm:hidden"
                  onClick={() => { setMoreOpen(false); window.dispatchEvent(new Event('cvaurum:open-palette')) }}
                >
                  <Command className="h-4 w-4 text-primary" /> {t('top.paletteHint')}
                </button>
                <button role="menuitem"
                  className="btn-ghost flex h-auto min-h-[40px] w-full items-center justify-start gap-2 rounded-lg px-2.5 py-2 text-sm sm:hidden"
                  onClick={() => { setMoreOpen(false); window.dispatchEvent(new Event('cvaurum:open-share')) }}
                >
                  <Share2 className="h-4 w-4 text-primary" /> {t('top.share')}
                </button>
                <button role="menuitem"
                  className="btn-ghost flex h-auto min-h-[40px] w-full items-center justify-start gap-2 rounded-lg px-2.5 py-2 text-sm"
                  onClick={() => { setMoreOpen(false); window.dispatchEvent(new Event('cvaurum:open-tour')) }}
                >
                  <HelpCircle className="h-4 w-4 text-primary" /> {t('top.tour')}
                </button>
                <button role="menuitem"
                  className="btn-ghost flex h-auto min-h-[40px] w-full items-center justify-start gap-2 rounded-lg px-2.5 py-2 text-sm"
                  onClick={() => { setMoreOpen(false); updateSettings({ theme: isDark ? 'light' : 'dark' }) }}
                >
                  {isDark ? <Sun className="h-4 w-4 text-primary" /> : <Moon className="h-4 w-4 text-primary" />}
                  {t(isDark ? 'ui.lightModeRow' : 'ui.darkModeRow')}
                </button>
                {/* The bar's own language chip starts at lg; below that this
                    row is the only way to switch. */}
                <button role="menuitem"
                  className="btn-ghost flex h-auto min-h-[40px] w-full items-center justify-start gap-2 rounded-lg px-2.5 py-2 text-sm lg:hidden"
                  onClick={() => {
                    setMoreOpen(false)
                    updateSettings({ locale: useAppStore.getState().settings.locale === 'fa' ? 'en' : 'fa' })
                  }}
                >
                  <Languages className="h-4 w-4 text-primary" />
                  {t('ui.language')}
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

/**
 * Where the work is, said plainly. "Saved" alone over-promised: the only copy
 * of a resume lives in this browser, and a browser that has not granted
 * durable storage may clear it (a real incident wiped a phone's library). It
 * says "Saved in this browser", and only when the work is really at risk -
 * storage not guaranteed and no recent backup - does it turn amber and offer
 * the backup on the spot.
 */
function SaveStatus({ dirty, content }: { dirty: boolean; content: ResumeDocument['content'] }) {
  const toast = useAppStore((s) => s.toast)
  const t = useT()
  const [durability, setDurability] = useState<DurabilityStatus>(getDurabilityStatus())
  const [lastBackup, setLastBackup] = useState(readLastBackup)
  const [cardOpen, setCardOpen] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  usePopoverA11y(cardOpen, () => setCardOpen(false), cardRef)
  // how many resumes this browser holds: a blank one alone has nothing to lose
  const [stored, setStored] = useState(1)
  useEffect(() => {
    let alive = true
    void requestDurability().then((d) => alive && setDurability(d))
    void loadRawDocs()
      .then((all) => alive && setStored(all.length))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])
  if (dirty) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground" role="status">
        <Cloud className="h-3.5 w-3.5 animate-pulse" />
        <span className="hidden sm:inline">{t('save.saving')}</span>
      </span>
    )
  }
  if (saveAtRisk(durability, lastBackup, Date.now(), hasWorkToLose(content, stored))) {
    const backUp = async () => {
      setCardOpen(false)
      try {
        const n = await exportFullBackup()
        setLastBackup(Date.now())
        toast(t(n === 1 ? 'save.backupDone' : 'save.backupDonePlural', { n }), 'success')
      } catch {
        toast(t('save.backupFailed'), 'error')
      }
    }
    return (
      <div className="relative shrink-0">
        {/* Phone: a warning, not a second download arrow. Beside Export's
            arrow the backup's tray-and-arrow read as "download" too, and a tap
            downloaded a file with no word of why (2026-10-24). The tap now
            says what is at risk and offers the backup by name. */}
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-full border border-warning/40 bg-warning/10 text-amber-800 hover:bg-warning/20 dark:text-amber-300 sm:hidden"
          aria-label={t('save.notBackedUp')}
          aria-haspopup="dialog"
          aria-expanded={cardOpen}
          onClick={() => setCardOpen((o) => !o)}
        >
          <ShieldAlert className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          className="hidden items-center gap-1.5 whitespace-nowrap rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-xs font-medium text-foreground hover:bg-warning/20 sm:flex"
          title={t('save.backupTitle')}
          onClick={backUp}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden />
          {/* the full sentence where the bar has room; the action from sm up */}
          <span className="hidden xl:inline">{t('save.atRisk')}</span>{t('save.backUp')}
        </button>
        {cardOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setCardOpen(false)} />
            <div
              ref={cardRef}
              role="dialog"
              aria-label={t('save.notBackedUpTitle')}
              tabIndex={-1}
              className="card fixed inset-x-2 top-14 z-20 p-4 shadow-float focus:outline-none"
            >
              <p className="flex items-center gap-2 text-sm font-semibold">
                <ShieldAlert className="h-4 w-4 text-amber-700 dark:text-amber-400" aria-hidden /> {t('save.onlyHere')}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t('save.riskBody')}</p>
              <button type="button" className="btn-primary btn-sm mt-3 w-full" onClick={backUp}>
                {t('save.downloadBackup')}
              </button>
            </div>
          </>
        )}
      </div>
    )
  }
  return (
    <span
      className="flex items-center gap-1 text-xs text-muted-foreground"
      role="status"
      title={t('save.savedTitle')}
    >
      <Check className="h-3.5 w-3.5 text-success" />
      <span className="hidden whitespace-nowrap lg:inline">{t('save.savedHere')}</span>
    </span>
  )
}
