/**
 * Cmd/Ctrl+K command palette — every editor action, fuzzy-searchable, keyboard
 * first. Dispatches the SAME store actions the panels use, so anything you can
 * click you can now type: switch templates, fonts, accent colors, add sections,
 * change canvas mode, export, toggle focus mode…
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Command, CornerDownLeft } from 'lucide-react'
import type { ResumeDocument } from '@/types/document'
import { TEMPLATES } from '@/templates/registry'
import { FONTS } from '@/data/fonts'
import { BODY_SECTION_KEYS, DEFAULT_LABELS } from '@/lib/sections'
import { useResumeStore } from '@/store/useResumeStore'
import { useEditorStore } from '@/store/useEditorStore'
import { useAppStore } from '@/store/useAppStore'
import { saveDoc } from '@/lib/storage'
import { openPrintWindow } from '@/lib/pdf'

interface Cmd {
  id: string
  group: string
  label: string
  hint?: string
  run: () => void
}

/** Curated accent palette — same set as the header design kit. */
const ACCENTS: { name: string; hex: string }[] = [
  { name: 'Blue', hex: '#2563eb' },
  { name: 'Teal', hex: '#0f766e' },
  { name: 'Violet', hex: '#7c3aed' },
  { name: 'Crimson', hex: '#b91c1c' },
  { name: 'Gold', hex: '#d4982f' },
  { name: 'Bronze', hex: '#a16207' },
  { name: 'Pink', hex: '#db2777' },
  { name: 'Green', hex: '#15803d' },
  { name: 'Slate', hex: '#475569' },
  { name: 'Ink', hex: '#0f172a' },
]

/** Subsequence fuzzy score: smaller is better; null = no match. Gaps between
 *  matched letters cost 4× a late start, so a CONTIGUOUS "skim" deep in a label
 *  always beats scattered s…k…i…m letters near the front. */
function fuzzy(query: string, target: string): number | null {
  const q = query.toLowerCase().replace(/\s+/g, '')
  const t = target.toLowerCase()
  if (!q) return t.length
  let qi = 0
  let score = 0
  let last = -1
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      score += last >= 0 ? (ti - last - 1) * 4 : ti // gap cost ≫ late-start cost
      last = ti
      qi++
    }
  }
  return qi === q.length ? score : null
}

export function CommandPalette({ doc }: { doc: ResumeDocument }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [sel, setSel] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Global keybind (and a custom event so buttons can open it too).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
        setQuery('')
        setSel(0)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    const onOpen = () => {
      setOpen(true)
      setQuery('')
      setSel(0)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('cvaurum:open-palette', onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('cvaurum:open-palette', onOpen)
    }
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30)
  }, [open])

  const commands = useMemo<Cmd[]>(() => {
    const applyTemplate = useResumeStore.getState().applyTemplate
    const updateMetadata = useResumeStore.getState().updateMetadata
    const ed = useEditorStore.getState()
    const toast = useAppStore.getState().toast
    const cmds: Cmd[] = []

    // canvas modes
    cmds.push(
      { id: 'mode-edit', group: 'View', label: 'Edit on the page', hint: 'canvas mode', run: () => { ed.setPreviewExact(false); ed.setAtsView(false) } },
      { id: 'mode-preview', group: 'View', label: 'Exact PDF preview', hint: 'canvas mode', run: () => { ed.setPreviewExact(true); ed.setAtsView(false) } },
      { id: 'mode-ats', group: 'View', label: 'What the ATS sees', hint: 'canvas mode', run: () => { ed.setAtsView(true); ed.setPreviewExact(false) } },
      { id: 'focus', group: 'View', label: 'Toggle focus mode', hint: 'dim everything but the section under your cursor', run: () => { useEditorStore.getState().setFocusMode(!useEditorStore.getState().focusMode) } },
      { id: 'skim', group: 'View', label: 'Toggle recruiter skim heatmap', hint: 'where a 7-second skim lands — deterministic, on-device', run: () => { useEditorStore.getState().setSkimView(!useEditorStore.getState().skimView) } },
      { id: 'panel-content', group: 'View', label: 'Open Content panel', run: () => { ed.setLeftTab('content'); ed.setLeftOpen(true) } },
      { id: 'panel-design', group: 'View', label: 'Open Design panel', run: () => { ed.setLeftTab('design'); ed.setLeftOpen(true) } },
      { id: 'panel-templates', group: 'View', label: 'Open Templates panel', run: () => { ed.setLeftTab('templates'); ed.setLeftOpen(true) } },
      { id: 'panel-ats', group: 'View', label: 'Open ATS & Tailoring panel', run: () => { ed.setLeftTab('ats'); ed.setLeftOpen(true) } },
      { id: 'tour', group: 'View', label: 'Show the quick tour', run: () => window.dispatchEvent(new Event('cvaurum:open-tour')) },
    )

    // export
    cmds.push(
      {
        id: 'export-pdf',
        group: 'Export',
        label: 'Download PDF',
        hint: 'crisp & selectable',
        run: async () => {
          const d = useResumeStore.getState().doc ?? doc
          await saveDoc(d)
          openPrintWindow(d.id)
        },
      },
      { id: 'export-menu', group: 'Export', label: 'Open export menu…', hint: 'Word, JSON Resume, PDF', run: () => window.dispatchEvent(new Event('cvaurum:open-export')) },
      { id: 'share', group: 'Export', label: 'Share privately…', hint: 'private link or encrypted file', run: () => window.dispatchEvent(new Event('cvaurum:open-share')) },
    )

    // undo / redo
    cmds.push(
      { id: 'undo', group: 'Edit', label: 'Undo', hint: 'Ctrl+Z', run: () => useResumeStore.temporal.getState().undo() },
      { id: 'redo', group: 'Edit', label: 'Redo', hint: 'Ctrl+Shift+Z', run: () => useResumeStore.temporal.getState().redo() },
    )

    // templates
    for (const tpl of TEMPLATES) {
      cmds.push({
        id: `tpl-${tpl.id}`,
        group: 'Template',
        label: `Template: ${tpl.name}`,
        hint: tpl.description,
        run: () => {
          applyTemplate(tpl.defaults)
          toast(`Switched to ${tpl.name}`, 'success')
        },
      })
    }

    // fonts
    for (const f of FONTS.filter((f) => f.category === 'sans' || f.category === 'serif')) {
      cmds.push({
        id: `font-${f.name}`,
        group: 'Font',
        label: `Font: ${f.name}`,
        hint: f.category,
        run: () => updateMetadata((m) => { m.typography.fontFamily = f.name }),
      })
    }

    // accent colors
    for (const a of ACCENTS) {
      cmds.push({
        id: `accent-${a.name}`,
        group: 'Accent',
        label: `Accent: ${a.name}`,
        hint: a.hex,
        run: () => updateMetadata((m) => { m.theme.primary = a.hex }),
      })
    }

    // add sections (only ones not already on the resume)
    const present = new Set([...doc.metadata.layout.main, ...doc.metadata.layout.aside])
    for (const key of BODY_SECTION_KEYS.filter((k) => !present.has(k))) {
      cmds.push({
        id: `add-${key}`,
        group: 'Add section',
        label: `Add section: ${DEFAULT_LABELS[key] ?? key}`,
        run: () => {
          updateMetadata((m) => {
            if (!m.layout.main.includes(key) && !m.layout.aside.includes(key)) m.layout.main.push(key)
            m.layout.hidden = m.layout.hidden.filter((k) => k !== key)
          })
          toast(`${DEFAULT_LABELS[key] ?? key} added`, 'success')
        },
      })
    }

    // theme
    cmds.push({
      id: 'theme',
      group: 'App',
      label: 'Toggle light / dark mode',
      run: () => {
        const app = useAppStore.getState()
        const next = app.settings.theme === 'dark' ? 'light' : 'dark'
        app.updateSettings({ theme: next })
      },
    })

    return cmds
  }, [doc])

  const results = useMemo(() => {
    const scored = commands
      .map((c) => ({ c, s: fuzzy(query, c.label + ' ' + (c.hint ?? '')) }))
      .filter((x): x is { c: Cmd; s: number } => x.s !== null)
      .sort((a, b) => a.s - b.s)
    return scored.slice(0, 12).map((x) => x.c)
  }, [commands, query])

  useEffect(() => setSel(0), [query])

  const runSel = (i: number) => {
    const cmd = results[i]
    if (!cmd) return
    setOpen(false)
    cmd.run()
  }

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[85]" role="dialog" aria-modal="true" aria-label="Command palette">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
      <div className="absolute left-1/2 top-[12vh] w-[min(38rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-surface shadow-float">
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Command className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)) }
              if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)) }
              if (e.key === 'Enter') { e.preventDefault(); runSel(sel) }
            }}
            placeholder="Type a command — template, font, accent, section, export…"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Search commands"
          />
          <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">Esc</kbd>
        </div>
        <div ref={listRef} className="max-h-[46vh] overflow-y-auto overscroll-contain p-1.5">
          {results.length === 0 && <div className="px-3 py-6 text-center text-sm text-muted-foreground">No matching command.</div>}
          {results.map((c, i) => (
            <button
              key={c.id}
              className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${i === sel ? 'bg-primary/10 text-foreground' : 'text-foreground hover:bg-muted/60'}`}
              // mouseMOVE, not mouseenter: when the list re-renders under a
              // stationary cursor, mouseenter fires and silently steals the
              // selection from the keyboard — Enter then runs the wrong command.
              onMouseMove={() => setSel(i)}
              onClick={() => runSel(i)}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{c.group}</span>
                <span className="truncate">{c.label}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {c.hint && <span className="max-w-[12rem] truncate text-xs text-muted-foreground">{c.hint}</span>}
                {i === sel && <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" />}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}
