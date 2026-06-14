/**
 * Inline (WYSIWYG) editing on the resume canvas itself — click any text on the
 * preview and type. Writes straight back to the resume store (so undo/redo,
 * autosave, and the form panel all stay in sync). Only active in the editable
 * preview; print and thumbnail render plain, non-editable text.
 *
 * The element is intentionally UNCONTROLLED while focused (we never let React
 * rewrite the DOM during typing, which would lose the caret); external changes
 * are synced in only when the element is not focused.
 */
import { useEffect, useRef } from 'react'
import type { ResumeContent } from '@/types/document'
import type { Metadata } from '@/types/metadata'
import { sanitizeHtml } from '@/lib/sanitize'
import { RichText } from './atoms'

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
}

function Editable({ value, onChange, rich, multiline, onEnter, as = 'span', className, placeholder }: EditableProps) {
  const ref = useRef<HTMLElement | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

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
  const onInput = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(commit, 300)
  }
  const onBlur = () => {
    if (timer.current) clearTimeout(timer.current)
    commit()
  }
  const onKeyDown = (e: React.KeyboardEvent) => {
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
    // Plain single-line fields: Enter commits & blurs.
    if (!rich) {
      e.preventDefault()
      ;(e.target as HTMLElement).blur()
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Comp: any = as
  return (
    <Comp
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      spellCheck
      data-placeholder={placeholder}
      onInput={onInput}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      className={`rm-editable${rich ? ' rm-rich' : ''}${className ? ' ' + className : ''}`}
    />
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
}) {
  if (!edit) {
    if (rich) return <RichText html={value} className={className} />
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
      onChange={(v) => edit((c) => apply(c, v))}
    />
  )
}
