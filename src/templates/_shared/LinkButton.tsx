import { useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { usePopoverA11y } from './popoverA11y'

/**
 * The link editor: a small chain button that opens a card naming the two
 * things a link actually has.
 *
 * A link is a DISPLAY TEXT and a DESTINATION, and conflating them is the
 * oldest bug in this area - typing a friendly name over a link used to
 * overwrite the link itself, because one field held both. The first version
 * of this card exposed a single unlabelled box reading "Paste or type a
 * link", which left the author guessing whether it wanted the words on the
 * page or the address behind them (reported 2026-08-25). Both are now
 * labelled, and the card says plainly whether the result will be clickable.
 *
 * It renders through a portal, like the entry-logo menu: the resume page
 * scales and clips, so a card laid out inline would either disturb the line
 * it sits on or be cut off at the sheet edge.
 */
export function LinkButton({
  href,
  onChange,
  label,
  text,
  onText,
  onRemove,
  extra,
  renderTrigger,
  clickable = true,
}: {
  href?: string
  onChange: (v: string) => void
  /** What this link is attached to, for screen readers. */
  label: string
  /** The words the reader sees, when this caller owns them. */
  text?: string
  /** Present only when the display text is this link's to change. */
  onText?: (v: string) => void
  /** What "remove" means for this caller, when clearing the address alone is
   *  not enough. A contact ROW exists in order to be a link, so removing its
   *  link removes the row - otherwise clearing the URL left "LinkedIn ·
   *  alexmorgan" sitting on the page, and the link looked like it had refused
   *  to go (reported 2026-08-25). */
  onRemove?: () => void
  /** Caller-supplied controls shown inside the card - the contact rows use it
   *  for the icon picker, which belongs with the link it decorates. */
  extra?: ReactNode
  /** Own the trigger instead of taking the chain button.
   *
   *  A row of named project links is read as WORDS - a chain glyph after each
   *  one would sit in the line's own flow, so the canvas line would be wider
   *  than the printed line and could wrap where print does not. Handing the
   *  caller the opener lets the word itself be the control: nothing is added
   *  to the line, and a tap lands on a whole word rather than a 12px glyph. */
  renderTrigger?: (open: (e: { currentTarget: EventTarget | null; preventDefault: () => void }) => void, linked: boolean) => ReactNode
  /** Whether links are live in the export (metadata.links.clickable). */
  clickable?: boolean
}) {
  const [at, setAt] = useState<{ top: number; left: number } | null>(null)
  const [draft, setDraft] = useState('')
  const [draftText, setDraftText] = useState('')
  const cardRef = useRef<HTMLDivElement>(null)
  usePopoverA11y(at != null, () => setAt(null), cardRef)
  const stop = (e: { preventDefault: () => void }) => e.preventDefault()

  const commit = () => {
    const url = draft.trim()
    // Emptying the field and applying means the same as pressing Remove -
    // erasing the address and finding the row still there is the exact
    // complaint this answers.
    if (!url && onRemove) {
      onRemove()
      setAt(null)
      return
    }
    onChange(url)
    if (onText) onText(draftText.trim())
    setAt(null)
  }
  const remove = () => {
    if (onRemove) onRemove()
    else onChange('')
    setAt(null)
  }

  const field = (name: string, value: string, set: (v: string) => void, placeholder: string, autoFocus = false) => (
    <label className="mb-1.5 block">
      <span className="mb-0.5 block text-[11px] font-medium text-muted-foreground">{name}</span>
      <input
        autoFocus={autoFocus}
        className="input h-7 w-full text-xs"
        value={value}
        placeholder={placeholder}
        onChange={(e) => set(e.target.value)}
        // The text around this card is editable and handles its own keys, so
        // the field keeps them to itself - otherwise Enter here means "new
        // paragraph" over there.
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
          }
          if (e.key === 'Escape') {
            e.preventDefault()
            setAt(null)
          }
        }}
        onKeyUp={(e) => e.stopPropagation()}
      />
    </label>
  )

  const open = (e: { currentTarget: EventTarget | null; preventDefault: () => void }) => {
    const r = (e.currentTarget as HTMLElement | null)?.getBoundingClientRect()
    setDraft(href || '')
    setDraftText(text || '')
    setAt({
      top: Math.min((r?.bottom ?? 0) + 6, window.innerHeight - 210),
      left: Math.max(8, Math.min(r?.left ?? 0, window.innerWidth - 268)),
    })
  }

  return (
    <>
      {renderTrigger ? (
        renderTrigger(open, Boolean(href))
      ) : (
        <button
          type="button"
          className={`rm-title-link-btn no-print${href ? ' is-linked' : ''}`}
          contentEditable={false}
          onMouseDown={stop}
          onClick={open}
          aria-label={href ? `Edit the link on ${label}` : `Add a link to ${label}`}
          title={href ? `Edit link: ${href}` : 'Add a link'}
        >
          &#128279;
        </button>
      )}
      {at &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setAt(null)} />
            <div
              ref={cardRef}
              role="dialog"
              aria-label={`Link on ${label}`}
              tabIndex={-1}
              className="fixed z-[61] w-64 rounded-lg border border-border bg-surface p-2 text-foreground shadow-float"
              style={{ top: at.top, left: at.left }}
              onMouseDown={stop}
            >
              {/* The two text fields stay together - they are the pair the
                  reader is comparing - and anything extra follows them. */}
              {onText ? field('Shown as', draftText, setDraftText, 'Words on the page', true) : null}
              {field('Goes to', draft, setDraft, 'https://example.com', !onText)}
              {extra}
              <p className="mb-2 text-[10px] leading-snug text-muted-foreground">
                {onText
                  ? 'Leave "Shown as" empty to print the address itself.'
                  : `Reads as "${text || label}" on the page - edit those words on the page itself.`}{' '}
                {clickable
                  ? 'Clickable in the exported PDF.'
                  : 'Not clickable in the export - turn links on under Design.'}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground"
                  onMouseDown={stop}
                  onClick={commit}
                >
                  Apply
                </button>
                {/* Offered whenever removal MEANS something here, not only when a link
                    is currently set. A contact row keeps its display text after
                    its URL is cleared - "Portfolio" with no address behind it -
                    and gating this on `href` left that row with no way off the
                    page at all. */}
                {href || onRemove ? (
                  <button
                    type="button"
                    className="rounded-md px-2 py-1 text-xs text-danger hover:bg-danger/10"
                    onMouseDown={stop}
                    onClick={remove}
                  >
                    {onRemove ? 'Remove' : 'Remove link'}
                  </button>
                ) : null}
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  )
}
