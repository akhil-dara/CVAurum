import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Settings2, EyeOff, ArrowLeftRight } from 'lucide-react'
import type { ResumeDocument } from '@/types/document'
import type { MetaEditFn } from './Editable'

type ToggleField = 'showBullets' | 'showDates' | 'showLocation' | 'showSummary' | 'showKeywords'

const HAS_BULLETS = new Set(['work', 'projects', 'volunteer', 'custom'])
const HAS_DATES = new Set(['work', 'education', 'projects', 'volunteer', 'certificates', 'awards', 'publications', 'custom'])
const HAS_LOCATION = new Set(['work', 'education', 'custom'])
const HAS_SUMMARY = new Set(['work'])
const HAS_KEYWORDS = new Set(['projects'])

/**
 * Per-section "super customization" gear that appears on the canvas (edit mode).
 * Opens a popover to toggle that section's fields (bullets, dates, location…) and
 * to move/hide the section — writing straight to layout metadata.
 */
export function SectionGear({ sectionKey, doc, editMeta }: { sectionKey: string; doc: ResumeDocument; editMeta: MetaEditFn }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  const layout = doc.metadata.layout
  const base = sectionKey.startsWith('custom-') ? 'custom' : sectionKey
  const opts = layout.sectionSettings?.[sectionKey] ?? {}
  const twoCol = layout.columns === 2
  const inAside = layout.aside.includes(sectionKey)

  const toggle = (field: ToggleField) =>
    editMeta((m) => {
      if (!m.layout.sectionSettings) m.layout.sectionSettings = {}
      const cur = m.layout.sectionSettings[sectionKey] ?? {}
      const shown = cur[field] !== false
      m.layout.sectionSettings[sectionKey] = { ...cur, [field]: shown ? false : true }
    })

  const hide = () =>
    editMeta((m) => {
      if (!m.layout.hidden.includes(sectionKey)) m.layout.hidden.push(sectionKey)
    })

  const move = () =>
    editMeta((m) => {
      const from: 'main' | 'aside' = m.layout.main.includes(sectionKey) ? 'main' : 'aside'
      const to: 'main' | 'aside' = from === 'main' ? 'aside' : 'main'
      m.layout[from] = m.layout[from].filter((k) => k !== sectionKey)
      m.layout[to] = [...m.layout[to], sectionKey]
    })

  const openPopover = (e: React.MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setPos({ top: r.bottom + 6, left: Math.max(8, Math.min(r.right - 232, window.innerWidth - 240)) })
    setOpen(true)
  }

  const rows: { label: string; field: ToggleField }[] = []
  if (HAS_BULLETS.has(base)) rows.push({ label: 'Bullet points', field: 'showBullets' })
  if (HAS_DATES.has(base)) rows.push({ label: 'Dates', field: 'showDates' })
  if (HAS_LOCATION.has(base)) rows.push({ label: 'Location', field: 'showLocation' })
  if (HAS_SUMMARY.has(base)) rows.push({ label: 'Role summary', field: 'showSummary' })
  if (HAS_KEYWORDS.has(base)) rows.push({ label: 'Tech tags', field: 'showKeywords' })

  return (
    <>
      <button
        type="button"
        className="rm-section-gear no-print"
        contentEditable={false}
        onMouseDown={(e) => e.preventDefault()}
        onClick={openPopover}
        title="Section settings"
        aria-label="Section settings"
      >
        <Settings2 />
      </button>
      {open &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
            <div
              className="fixed z-[61] w-[15rem] rounded-xl border border-border bg-surface p-1.5 text-foreground shadow-float"
              style={{ top: pos.top, left: pos.left }}
            >
              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Section settings</div>
              {rows.length === 0 && <div className="px-2 py-1 text-xs text-muted-foreground">No field options for this section.</div>}
              {rows.map((r) => (
                <ToggleRow key={r.field} label={r.label} on={opts[r.field] !== false} onClick={() => toggle(r.field)} />
              ))}
              <div className="my-1 h-px bg-border" />
              {twoCol && (
                <button
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                  onClick={() => { move(); setOpen(false) }}
                >
                  <ArrowLeftRight className="h-4 w-4" /> Move to {inAside ? 'main column' : 'sidebar'}
                </button>
              )}
              <button
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-danger hover:bg-danger/10"
                onClick={() => { hide(); setOpen(false) }}
              >
                <EyeOff className="h-4 w-4" /> Hide section
              </button>
            </div>
          </>,
          document.body,
        )}
    </>
  )
}

function ToggleRow({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted">
      <span>{label}</span>
      <span className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${on ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
        <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all ${on ? 'left-[14px]' : 'left-0.5'}`} />
      </span>
    </button>
  )
}
