/**
 * Inline (WYSIWYG) editing on the resume canvas itself — click any text on the
 * preview and type. Writes straight back to the resume store (so undo/redo,
 * autosave, and the form panel all stay in sync). Only active in the editable
 * preview; print and thumbnail render plain, non-editable text.
 *
 * The element is intentionally UNCONTROLLED while focused (we never let React
 * rewrite the DOM during typing, which would lose the caret); external changes
 * are synced in only when the element is not focused.
 *
 * Rich fields (bullets, summary) also get the same "/" quick-insert menu as
 * the panel editor — type "/" at a word start for verbs, metric templates, etc.
 */
import { Fragment, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FormatBar } from './FormatBar'
import type { ResumeContent } from '@/types/document'
import type { Metadata } from '@/types/metadata'
import { sanitizeHtml } from '@/lib/sanitize'
import { filterSlash, type Slash } from '@/lib/slashCommands'
import { RichText } from './atoms'
import { keywordChunks } from '@/lib/keywordChunks'

export type EditFn = (recipe: (c: ResumeContent) => void) => void
/** Mutate document metadata (layout/typography/theme) from the canvas. */
export type MetaEditFn = (recipe: (m: Metadata) => void) => void

type Tag = 'span' | 'div' | 'p' | 'li' | 'h1' | 'h2'

interface EditableProps {
  value: string
  onChange: (v: string) => void
  rich?: boolean
  /** rich block field: Enter = new paragraph, Shift+Enter = soft line break */
  multiline?: boolean
  /** single-entry field (a bullet): Enter commits and fires onEnter (e.g. add next bullet) */
  onEnter?: () => void
  as?: Tag
  className?: string
  placeholder?: string
  /** Off for short tag/keyword fields (skills, tech tags, interests) — the browser's
   *  spellchecker flags most tech terms and proper nouns, drawing a squiggly underline
   *  under nearly every chip. On (default) everywhere else, prose benefits from it. */
  spellCheck?: boolean
}

interface SlashMenu {
  items: Slash[]
  index: number
  top: number
  left: number
  /** the "/query" being replaced, located in the current text node */
  node: Text
  start: number
  end: number
}

/** Inspect the caret: if the text before it looks like "/query", describe it. */
function detectSlash(root: HTMLElement): Omit<SlashMenu, 'items' | 'index'> & { query: string } | null {
  const sel = window.getSelection()
  if (!sel || !sel.isCollapsed || sel.rangeCount === 0) return null
  const node = sel.anchorNode
  if (!node || node.nodeType !== Node.TEXT_NODE || !root.contains(node)) return null
  const before = (node.textContent || '').slice(0, sel.anchorOffset)
  const m = before.match(/(?:^|\s)(\/[\w-]*)$/)
  if (!m) return null
  const start = before.length - m[1].length
  const range = document.createRange()
  range.setStart(node, start)
  range.setEnd(node, sel.anchorOffset)
  const r = range.getBoundingClientRect()
  return {
    query: m[1].slice(1),
    node: node as Text,
    start,
    end: sel.anchorOffset,
    top: Math.min(r.bottom + 6, window.innerHeight - 240),
    left: Math.max(8, Math.min(r.left, document.documentElement.clientWidth - 268)),
  }
}

function Editable({ value, onChange, rich, multiline, onEnter, as = 'span', className, placeholder, spellCheck = true }: EditableProps) {
  const ref = useRef<HTMLElement | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  // "/" quick-insert menu (rich fields only). Kept in a ref too so the keydown
  // handler always sees the current state without re-binding.
  const [menu, setMenu] = useState<SlashMenu | null>(null)
  const menuRef = useRef<SlashMenu | null>(null)
  menuRef.current = menu

  // Sync external value into the DOM, but never while the user is editing it.
  useEffect(() => {
    const el = ref.current
    if (!el || document.activeElement === el) return
    if (rich) {
      const html = sanitizeHtml(value || '')
      if (el.innerHTML !== html) el.innerHTML = html
    } else if (el.textContent !== (value || '')) {
      el.textContent = value || ''
    }
  }, [value, rich])

  const read = () => {
    const el = ref.current
    if (!el) return value
    return rich ? sanitizeHtml(el.innerHTML) : el.textContent || ''
  }
  const commit = () => {
    const v = read()
    if (v !== value) onChange(v)
  }
  const scheduleCommit = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(commit, 300)
  }

  const updateSlash = () => {
    if (!rich || !ref.current) return
    const hit = detectSlash(ref.current)
    if (!hit) {
      if (menuRef.current) setMenu(null)
      return
    }
    const items = filterSlash(hit.query)
    if (!items.length) {
      setMenu(null)
      return
    }
    setMenu({ items, index: 0, top: hit.top, left: hit.left, node: hit.node, start: hit.start, end: hit.end })
  }

  const applySlash = (item: Slash) => {
    const m = menuRef.current
    const el = ref.current
    setMenu(null)
    if (!m || !el) return
    // Replace the "/query" text with the snippet; `¦` marks the caret landing.
    const range = document.createRange()
    range.setStart(m.node, m.start)
    range.setEnd(m.node, Math.min(m.end, m.node.length))
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
    const caretAt = item.insert.indexOf('¦')
    const text = item.insert.replace('¦', '')
    document.execCommand('insertText', false, text)
    if (caretAt >= 0 && sel?.anchorNode?.nodeType === Node.TEXT_NODE) {
      // walk the caret back to the ¦ position
      const back = text.length - caretAt
      const n = sel.anchorNode as Text
      const pos = Math.max(0, sel.anchorOffset - back)
      const r2 = document.createRange()
      r2.setStart(n, pos)
      r2.collapse(true)
      sel.removeAllRanges()
      sel.addRange(r2)
    }
    scheduleCommit()
  }

  const onInput = () => {
    scheduleCommit()
    updateSlash()
  }
  const onBlur = () => {
    if (timer.current) clearTimeout(timer.current)
    commit()
    // let a menu click land before the blur tears the menu down
    setTimeout(() => setMenu(null), 120)
  }
  const onKeyDown = (e: React.KeyboardEvent) => {
    // While the "/" menu is open it owns the navigation keys.
    const m = menuRef.current
    if (m) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMenu({ ...m, index: (m.index + 1) % m.items.length }); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMenu({ ...m, index: (m.index - 1 + m.items.length) % m.items.length }); return }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); applySlash(m.items[m.index]); return }
      if (e.key === 'Escape') { e.preventDefault(); setMenu(null); return }
    }
    // Escape commits and leaves the field (keyboard users need a way out).
    if (e.key === 'Escape') {
      e.preventDefault()
      ;(e.target as HTMLElement).blur()
      return
    }
    if (e.key !== 'Enter') return
    // Bullet-style entries: Enter commits this entry and adds the next one.
    if (onEnter && !e.shiftKey) {
      e.preventDefault()
      commit()
      onEnter()
      return
    }
    // Rich multi-line fields: Enter = new paragraph, Shift+Enter = soft break.
    // execCommand keeps the produced markup deterministic across browsers.
    if (rich && multiline) {
      e.preventDefault()
      document.execCommand(e.shiftKey ? 'insertLineBreak' : 'insertParagraph')
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(commit, 300)
      return
    }
    // Single-line fields - plain or rich - commit and leave on Enter. A rich
    // one-liner used to fall through to the browser default, which split a
    // one-line value into two paragraphs.
    if (!rich || !multiline) {
      e.preventDefault()
      ;(e.target as HTMLElement).blur()
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Comp: any = as
  return (
    <>
      <Comp
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        spellCheck={spellCheck}
        role="textbox"
        tabIndex={0}
        aria-label={placeholder || 'Editable field'}
        aria-multiline={rich && multiline ? true : undefined}
        data-placeholder={placeholder}
        onInput={onInput}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        className={`rm-editable${rich ? ' rm-rich' : ''}${className ? ' ' + className : ''}`}
      />
      {/* Rich fields only: a plain field stores text, so formatting applied to
          one would be dropped on the next commit. */}
      {rich && <FormatBar host={ref.current} onCommit={scheduleCommit} />}
      {menu &&
        createPortal(
          <div
            className="fixed z-[70] w-64 overflow-hidden rounded-lg border border-border bg-surface p-1 text-foreground shadow-float"
            style={{ top: menu.top, left: menu.left }}
            role="listbox"
            aria-label="Quick inserts"
          >
            {menu.items.map((it, i) => (
              <button
                key={it.title}
                type="button"
                role="option"
                aria-selected={i === menu.index}
                className={`flex w-full items-baseline justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs ${i === menu.index ? 'bg-primary/10 text-foreground' : 'text-foreground hover:bg-muted/60'}`}
                onMouseDown={(e) => { e.preventDefault(); applySlash(it) }}
                onMouseMove={() => setMenu((cur) => (cur ? { ...cur, index: i } : cur))}
              >
                <span className="font-medium">{it.title}</span>
                <span className="shrink-0 text-[10px] text-muted-foreground">{it.hint}</span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  )
}

/** Render `value` as editable text when an `edit` fn is supplied, else plain. */
export function Ed({
  edit,
  value,
  apply,
  rich,
  multiline,
  onEnter,
  as,
  className,
  placeholder,
  spellCheck,
  chunk,
}: {
  edit?: EditFn
  value: string
  apply: (c: ResumeContent, v: string) => void
  rich?: boolean
  multiline?: boolean
  onEnter?: () => void
  as?: Tag
  className?: string
  placeholder?: string
  spellCheck?: boolean
  /** Render the value in break-safe pieces when not editing (keywordChunks). */
  chunk?: boolean
}) {
  if (!edit) {
    if (rich) return <RichText html={value} className={className} />
    // `chunk` splits the value where a line may break, so a lone connector
    // never holds a line by itself - "BI, Reporting & Visualisation" wrapped
    // with "&" alone in a narrow sidebar. Only outside edit mode: the editable
    // branch is a contenteditable and must stay one plain text node.
    if (chunk && value) {
      const pieces = keywordChunks(value, '')
      const inner = pieces.map((piece, i) => (
        <Fragment key={i}>
          {i > 0 ? ' ' : null}
          {piece.includes(' ') ? <span className="rm-kw-tail">{piece}</span> : piece}
        </Fragment>
      ))
      return className ? <span className={className}>{inner}</span> : <>{inner}</>
    }
    return className ? <span className={className}>{value}</span> : <>{value || ''}</>
  }
  return (
    <Editable
      as={as}
      className={className}
      value={value || ''}
      rich={rich}
      multiline={multiline}
      onEnter={onEnter}
      placeholder={placeholder}
      spellCheck={spellCheck}
      onChange={(v) => edit((c) => apply(c, v))}
    />
  )
}
