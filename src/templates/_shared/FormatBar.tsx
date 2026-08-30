/**
 * Floating format bar for rich canvas fields (2026-08-25).
 *
 * Browsers already apply bold and italic to a contentEditable on Ctrl+B/Ctrl+I,
 * so the capability was there - but nothing on the canvas SAID so, and the only
 * visible formatting controls lived in the side panel, away from the text they
 * act on. This puts them on the selection itself, which is where every other
 * editor of this kind puts them.
 *
 * Only rich fields get it. A plain field stores its value as text, so any
 * formatting applied to one would be silently dropped on the next commit -
 * offering a control that cannot keep its promise is worse than not offering it.
 */
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { linkTarget } from '@/lib/pdf/links'

/** Approximate bar height, used only to decide whether it fits above. */
const BAR_H = 40
/* A finger is not a cursor: on a coarse pointer the bar sits BELOW the
 * selection - Android's own copy menu owns the space above it, and the two
 * stacked was the "phone copy thing" covering ours - and every control grows
 * to a tappable size. */
const coarse = () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

type Cmd = 'bold' | 'italic' | 'underline' | 'strikeThrough' | 'removeFormat'

const BUTTONS: { cmd: Cmd; label: string; glyph: string; className?: string }[] = [
  { cmd: 'bold', label: 'Bold', glyph: 'B', className: 'font-bold' },
  { cmd: 'italic', label: 'Italic', glyph: 'I', className: 'italic font-serif' },
  { cmd: 'underline', label: 'Underline', glyph: 'U', className: 'underline' },
  { cmd: 'strikeThrough', label: 'Strikethrough', glyph: 'S', className: 'line-through' },
]

/** The selection, but only when it is a real range inside `host`. */
function selectionInside(host: HTMLElement | null): Range | null {
  if (!host) return null
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null
  const range = sel.getRangeAt(0)
  if (!host.contains(range.commonAncestorContainer)) return null
  return range
}

export function FormatBar({ hostRef, onCommit }: { hostRef: { current: HTMLElement | null }; onCommit: () => void }) {
  const [at, setAt] = useState<{ top: number; left: number; below: boolean } | null>(null)
  const [linking, setLinking] = useState(false)
  const [href, setHref] = useState('')
  const saved = useRef<Range | null>(null)

  useEffect(() => {
    const sync = () => {
      // Read the ref at event time: it is always current, where a captured
      // host value is whatever the mount render happened to see (null).
      const range = selectionInside(hostRef.current)
      if (!range) {
        // Keep the bar open while the user is typing into its own URL box -
        // focusing that input necessarily drops the selection in the field.
        if (!linking) setAt(null)
        return
      }
      saved.current = range.cloneRange()
      // The FIRST line box, not the union: a selection spanning three lines has
      // a bounding rect as tall as all of them, and anchoring to that puts the
      // bar in the middle of the user's own text.
      const rects = range.getClientRects()
      const r = rects.length ? rects[0] : range.getBoundingClientRect()
      if (!r.width && !r.height) return
      // Above the selection unless there is no room - or unless the pointer
      // is a finger, whose platform menu already claims the space above.
      const below = coarse() || r.top < BAR_H + 12
      setAt({ top: below ? r.bottom + (coarse() ? 14 : 8) : r.top - 8, left: r.left + r.width / 2, below })
    }
    // Focusing a field reveals its editing affordances ("+ bullet", the drag
    // rail), which reflows the canvas AFTER the selection event fires -
    // measured at 62px of drift, enough to leave the bar over unrelated text.
    // So every trigger re-measures on the next two frames as well, once the
    // new layout exists.
    const syncSoon = () => requestAnimationFrame(() => requestAnimationFrame(sync))
    const onSelect = () => { sync(); syncSoon() }
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(sync) : null
    if (hostRef.current && ro) ro.observe(hostRef.current)
    document.addEventListener('selectionchange', onSelect)
    // The bar is position:fixed, so its coordinates are viewport-relative and
    // go stale the moment anything scrolls - including the canvas's own inner
    // scroller, which is why this listens in the CAPTURE phase rather than
    // only on window.
    window.addEventListener('scroll', sync, true)
    window.addEventListener('resize', sync)
    return () => {
      ro?.disconnect()
      document.removeEventListener('selectionchange', onSelect)
      window.removeEventListener('scroll', sync, true)
      window.removeEventListener('resize', sync)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linking])

  if (!at) return null

  /** Re-select what was highlighted before the click moved focus to the bar. */
  const restore = () => {
    const sel = window.getSelection()
    if (!saved.current || !sel) return
    sel.removeAllRanges()
    sel.addRange(saved.current)
  }

  const run = (cmd: Cmd) => {
    restore()
    document.execCommand(cmd)
    onCommit()
  }

  /**
   * Pull the selection in off any whitespace at its ends.
   *
   * Selecting a word by double-click takes the space after it too, and a link
   * that swallows its trailing space underlines a gap and makes the next word
   * hard to reach - reported from a real resume, where "from " was linked
   * including the space.
   */
  const trimSelection = () => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const r = sel.getRangeAt(0)
    const startText = r.startContainer as Text
    while (
      startText.nodeType === Node.TEXT_NODE &&
      r.startOffset < startText.length &&
      /\s/.test(startText.data[r.startOffset])
    ) {
      r.setStart(startText, r.startOffset + 1)
    }
    const endText = r.endContainer as Text
    while (endText.nodeType === Node.TEXT_NODE && r.endOffset > 0 && /\s/.test(endText.data[r.endOffset - 1])) {
      r.setEnd(endText, r.endOffset - 1)
    }
  }

  const applyLink = () => {
    const url = linkTarget(href)
    // execCommand acts on the FOCUSED editable, and focusing the URL box took
    // focus away from it - without this the command lands nowhere.
    hostRef.current?.focus()
    restore()
    trimSelection()
    // An unusable URL removes the link rather than writing a broken one.
    if (url) document.execCommand('createLink', false, url)
    else document.execCommand('unlink')
    setLinking(false)
    setHref('')
    onCommit()
  }

  return createPortal(
    <div
      role="toolbar"
      aria-label="Text formatting"
      className="fixed z-[80] rounded-lg border border-border bg-surface p-1 shadow-float"
      // Positioned with an inline transform rather than utility classes: the
      // bar must sit exactly on the selection, and a missing utility fails
      // silently by leaving it over the text it is meant to sit above.
      style={{
        top: at.top,
        left: at.left,
        transform: `translate(-50%, ${at.below ? '0' : '-100%'})`,
        maxWidth: 'calc(100vw - 16px)',
      }}
      // Never let a click here steal the selection the commands act on.
      onMouseDown={(e) => e.preventDefault()}
    >
      {linking ? (
        <div className="flex items-center gap-1">
          <input
            autoFocus
            value={href}
            onChange={(e) => setHref(e.target.value)}
            onKeyDown={(e) => {
              // This box is a PORTAL, and React bubbles events through the
              // component tree rather than the DOM one - so every key pressed
              // here also reached the editable that owns the bar. Enter there
              // means "new paragraph": it deleted the selected text and split
              // the paragraph in two, and no link was ever made.
              e.stopPropagation()
              if (e.key === 'Enter') {
                e.preventDefault()
                applyLink()
              }
              if (e.key === 'Escape') {
                e.preventDefault()
                setLinking(false)
                setHref('')
              }
            }}
            onKeyUp={(e) => e.stopPropagation()}
            onInput={(e) => e.stopPropagation()}
            placeholder="Paste or type a link"
            aria-label="Link address"
            className="h-7 w-56 rounded border border-border bg-surface-muted px-2 text-xs text-foreground outline-none focus:border-primary"
          />
          <button type="button" onClick={applyLink} className="h-7 rounded px-2 text-xs font-medium hover:bg-surface-muted">
            Apply
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-0.5">
          {BUTTONS.map((b) => (
            <button
              key={b.cmd}
              type="button"
              title={b.label}
              aria-label={b.label}
              onClick={() => run(b.cmd)}
              className={`${coarse() ? 'h-10 w-10 text-base' : 'h-7 w-7 text-sm'} rounded text-foreground hover:bg-surface-muted ${b.className ?? ''}`}
            >
              {b.glyph}
            </button>
          ))}
          <span className="mx-0.5 h-4 w-px bg-border" aria-hidden="true" />
          <button
            type="button"
            title="Link"
            aria-label="Link"
            onClick={() => setLinking(true)}
            className="h-7 w-7 rounded text-sm text-foreground hover:bg-surface-muted"
          >
            🔗
          </button>
          <button
            type="button"
            title="Clear formatting"
            aria-label="Clear formatting"
            onClick={() => run('removeFormat')}
            className={`${coarse() ? 'h-10 w-10 text-sm' : 'h-7 w-7 text-xs'} rounded text-muted-foreground hover:bg-surface-muted`}
          >
            ✕
          </button>
        </div>
      )}
    </div>,
    document.body
  )
}
