/**
 * On-canvas gear for the HEADER — restyle the name/contacts composition right
 * where you see it (mirrors the per-section gear). Pinned to the viewport's
 * right edge so the header stays visible while it changes live.
 */
import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Settings2 } from 'lucide-react'
import type { ResumeDocument } from '@/types/document'
import type { Metadata } from '@/types/metadata'
import type { MetaEditFn } from './Editable'
import { HEADER_STYLES, HeaderMini } from './headerStyles'
import { FONTS } from '@/data/fonts'
import { usePopoverA11y } from './popoverA11y'

/** Curated accent palette — enough range for any industry, all print-safe. */
const ACCENTS = [
  '#2563eb',
  '#0f766e',
  '#7c3aed',
  '#b91c1c',
  '#d4982f',
  '#a16207',
  '#db2777',
  '#15803d',
  '#475569',
  '#0f172a',
]

/**
 * The contact line: how the details are arranged, what sits between them, and
 * whether they carry icons.
 *
 * Templates used to decide all three, so an author who wanted their details
 * stacked in a narrow sidebar, or dots between them, had to change TEMPLATE to
 * get it. These are presentation choices, not template identity.
 */
function ContactLinePicker({ doc, editMeta }: { doc: ResumeDocument; editMeta: MetaEditFn }) {
  const { contactStyle, contactSeparator, icons } = doc.metadata.layout
  const row = <T extends string>(
    name: string,
    value: T,
    options: { v: T; label: string; title?: string }[],
    set: (v: T) => void
  ) => (
    <div className="mb-1 flex items-center gap-1.5">
      <span className="w-14 shrink-0 text-[10px] text-muted-foreground">{name}</span>
      <div className="flex flex-1 gap-1" role="radiogroup" aria-label={name}>
        {options.map((o) => (
          <button
            key={o.v}
            type="button"
            role="radio"
            aria-checked={value === o.v}
            title={o.title || o.label}
            onClick={() => set(o.v)}
            className={`min-w-0 flex-1 truncate rounded-md border px-1 py-1 text-[11px] font-medium transition ${
              value === o.v
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:border-primary/50'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
  return (
    <div className="px-2 pb-1.5">
      {row<'inline' | 'stacked'>(
        'Arrange',
        contactStyle ?? 'inline',
        [
          { v: 'inline', label: 'Inline', title: 'All on one wrapping line' },
          { v: 'stacked', label: 'Stacked', title: 'One detail per row - reads better in a narrow sidebar' },
        ],
        (v) =>
          editMeta((m) => {
            m.layout.contactStyle = v
          })
      )}
      {row<'none' | 'dot' | 'pipe' | 'slash' | 'dash'>(
        'Between',
        contactSeparator ?? 'none',
        [
          { v: 'none', label: 'Space', title: 'Spacing only' },
          { v: 'dot', label: '·', title: 'Middle dot' },
          { v: 'pipe', label: '|', title: 'Vertical bar' },
          { v: 'slash', label: '/', title: 'Slash' },
          { v: 'dash', label: '–', title: 'En dash' },
        ],
        (v) =>
          editMeta((m) => {
            m.layout.contactSeparator = v
          })
      )}
      {row<'on' | 'off'>(
        'Icons',
        icons === false ? 'off' : 'on',
        [
          { v: 'on', label: 'Show' },
          { v: 'off', label: 'Hide' },
        ],
        (v) =>
          editMeta((m) => {
            m.layout.icons = v === 'on'
          })
      )}
      {contactStyle === 'stacked' ? (
        <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">Stacked rows never take a separator.</p>
      ) : null}
    </div>
  )
}

/** Identity mark: exactly ONE of none / monogram / photo — never a placeholder. */
function IdentityMarkPicker({ doc, editMeta }: { doc: ResumeDocument; editMeta: MetaEditFn }) {
  const { monogram, showPhoto } = doc.metadata.layout
  const hasImage = !!doc.content.basics.image
  const current: 'none' | 'monogram' | 'photo' =
    showPhoto && hasImage ? 'photo' : monogram ? 'monogram' : showPhoto ? 'photo' : 'none'
  const pick = (v: 'none' | 'monogram' | 'photo') =>
    editMeta((m) => {
      m.layout.monogram = v === 'monogram'
      m.layout.showPhoto = v === 'photo'
    })
  const OPTIONS: { v: 'none' | 'monogram' | 'photo'; label: string }[] = [
    { v: 'none', label: 'None' },
    { v: 'monogram', label: 'Monogram' },
    { v: 'photo', label: 'Photo' },
  ]
  return (
    <div className="px-2 pb-1.5">
      <div className="flex gap-1" role="radiogroup" aria-label="Identity mark">
        {OPTIONS.map((o) => (
          <button
            key={o.v}
            type="button"
            role="radio"
            aria-checked={current === o.v}
            onClick={() => pick(o.v)}
            className={`flex-1 rounded-md border px-1.5 py-1 text-[11px] font-medium transition ${current === o.v ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {current === 'photo' && !hasImage && (
        <p className="mt-1 text-[10px] leading-snug text-amber-600 dark:text-amber-400">
          No photo uploaded yet — add one under Content → Personal details. Nothing prints until you do (no placeholder,
          ever).
        </p>
      )}
    </div>
  )
}

export function HeaderGear({ doc, editMeta }: { doc: ResumeDocument; editMeta: MetaEditFn }) {
  const [open, setOpen] = useState(false)
  const [top, setTop] = useState(0)
  const [sheet, setSheet] = useState(false)
  const current = doc.metadata.layout.headerStyle ?? ''
  const panelRef = useRef<HTMLDivElement>(null)
  // Escape closes; focus moves in on open and back to the gear on close.
  usePopoverA11y(open, () => setOpen(false), panelRef)

  const openPopover = (e: React.MouseEvent) => {
    // Phones get a bottom sheet, exactly like the section style sheet. As a
    // floating panel this opened level with the header - mid-screen on a
    // phone - so most of its height hung below the viewport and the reader
    // saw a cut-off card that would not scroll (reported from a phone,
    // 2026-08-30; the panel itself scrolled, but only within the sliver
    // that was actually on screen).
    if (document.documentElement.clientWidth < 640) {
      setSheet(true)
      setOpen(true)
      return
    }
    setSheet(false)
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setTop(Math.max(8, Math.min(r.top - 4, window.innerHeight - 420)))
    setOpen(true)
  }
  const pick = (value: string) =>
    editMeta((m) => {
      m.layout.headerStyle = (value || undefined) as Metadata['layout']['headerStyle']
    })

  return (
    <>
      <button
        type="button"
        className="rm-section-gear no-print"
        contentEditable={false}
        onMouseDown={(e) => e.preventDefault()}
        onClick={openPopover}
        title="Header style"
        aria-label="Header style"
      >
        <Settings2 /> Style
      </button>
      {open &&
        createPortal(
          <>
            <div className={`fixed inset-0 z-[60] ${sheet ? 'bg-black/35' : ''}`} onClick={() => setOpen(false)} />
            <div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              tabIndex={-1}
              aria-label="Header style and layout"
              className={
                sheet
                  ? 'fixed inset-x-0 bottom-0 z-[61] overflow-y-auto overflow-x-hidden overscroll-contain rounded-t-2xl border-t border-border bg-surface p-1.5 pb-4 text-foreground shadow-float'
                  : 'fixed z-[61] max-h-[calc(100vh-16px)] w-[19rem] overflow-y-auto overflow-x-hidden overscroll-contain rounded-xl border border-border bg-surface p-1.5 text-foreground shadow-float'
              }
              style={sheet ? { maxHeight: Math.round(window.innerHeight * 0.8) } : { top, left: Math.max(8, document.documentElement.clientWidth - 304 - 12) }}
            >
              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Header <span className="font-normal normal-case">— layout</span>
              </div>
              <div className="flex flex-wrap gap-1.5 px-2 pb-1.5 pt-0.5">
                {HEADER_STYLES.map((h) => {
                  const on = current === h.value
                  return (
                    <button
                      key={h.value || 'auto'}
                      type="button"
                      title={h.label}
                      onClick={() => pick(h.value)}
                      className={`flex w-[64px] flex-col items-center gap-1 rounded-lg border p-1.5 transition ${on ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-border bg-surface hover:border-primary/50'}`}
                    >
                      <span className="flex h-8 w-full items-center justify-center overflow-hidden rounded-[3px] border border-border/70 bg-white p-1">
                        <HeaderMini kind={h.value} />
                      </span>
                      <span
                        className={`text-[9px] font-medium leading-none ${on ? 'text-primary' : 'text-muted-foreground'}`}
                      >
                        {h.label}
                      </span>
                    </button>
                  )
                })}
              </div>
              <div className="mx-2 my-1 border-t border-border" />
              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Identity mark
              </div>
              <IdentityMarkPicker doc={doc} editMeta={editMeta} />
              <div className="mx-2 my-1 border-t border-border" />
              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Contact line
              </div>
              <ContactLinePicker doc={doc} editMeta={editMeta} />
              <div className="mx-2 my-1 border-t border-border" />
              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Accent color
              </div>
              <div className="flex flex-wrap gap-1.5 px-2 pb-1.5" role="radiogroup" aria-label="Accent color">
                {ACCENTS.map((c) => {
                  const on = doc.metadata.theme.primary.toLowerCase() === c.toLowerCase()
                  return (
                    <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      title={c}
                      onClick={() =>
                        editMeta((m) => {
                          m.theme.primary = c
                        })
                      }
                      className={`h-6 w-6 rounded-full border transition ${on ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface border-transparent' : 'border-black/10 hover:scale-110'}`}
                      style={{ background: c }}
                    />
                  )
                })}
              </div>
              <div className="flex items-center gap-2 px-2 pb-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Font</span>
                <select
                  className="input h-7 min-w-0 flex-1 px-1.5 text-xs"
                  value={doc.metadata.typography.fontFamily}
                  onChange={(e) =>
                    editMeta((m) => {
                      m.typography.fontFamily = e.target.value
                    })
                  }
                  aria-label="Body font"
                >
                  {FONTS.filter((f) => f.category === 'sans' || f.category === 'serif').map((f) => (
                    <option key={f.name} value={f.name}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <p className="px-2 pb-1 text-[10px] leading-snug text-muted-foreground">
                Changes apply live — Auto uses the template's own header. Full controls live in the Design panel.
              </p>
            </div>
          </>,
          document.body
        )}
    </>
  )
}
