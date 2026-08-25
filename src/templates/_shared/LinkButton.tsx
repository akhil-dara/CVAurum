import { useState } from 'react'

/**
 * The link popup: a small chain button that opens a URL field in place.
 *
 * Display text and destination are separate concerns - the text around this
 * button is edited directly, while the address lives only in here. That is
 * the whole point: typing a friendly name over a link used to overwrite the
 * link itself, because one field held both.
 *
 * It started life on entry titles and now serves contact rows too, which is
 * why it lives in its own module rather than inside sections.tsx.
 */
export function LinkButton({ href, onChange, label }: { href?: string; onChange: (v: string) => void; label: string }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const stop = (e: { preventDefault: () => void }) => e.preventDefault()
  if (!open) {
    return (
      <button
        type="button"
        className={`rm-title-link-btn no-print${href ? ' is-linked' : ''}`}
        contentEditable={false}
        onMouseDown={stop}
        onClick={() => {
          setDraft(href || '')
          setOpen(true)
        }}
        aria-label={href ? `Edit the link on ${label}` : `Add a link to ${label}`}
        title={href ? `Edit link: ${href}` : 'Add a link'}
      >
        &#128279;
      </button>
    )
  }
  const commit = (v: string) => {
    onChange(v.trim())
    setOpen(false)
  }
  return (
    <span className="rm-title-link-edit no-print" contentEditable={false} onMouseDown={stop}>
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        // The heading around this is editable and handles its own keys, so the
        // field keeps them to itself - otherwise Enter here means "new
        // paragraph" over there.
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === 'Enter') {
            e.preventDefault()
            commit(draft)
          }
          if (e.key === 'Escape') {
            e.preventDefault()
            setOpen(false)
          }
        }}
        onKeyUp={(e) => e.stopPropagation()}
        placeholder="Paste or type a link"
        aria-label={`Link for ${label}`}
      />
      <button type="button" onMouseDown={stop} onClick={() => commit(draft)}>
        Apply
      </button>
      {href ? (
        <button type="button" onMouseDown={stop} onClick={() => commit('')} aria-label="Remove the link">
          Remove
        </button>
      ) : null}
    </span>
  )
}
