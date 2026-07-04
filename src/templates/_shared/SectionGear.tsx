import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Settings2, EyeOff, ArrowLeftRight } from 'lucide-react'
import type { ResumeDocument } from '@/types/document'
import { sectionLabel } from '@/lib/sections'
import type { MetaEditFn } from './Editable'

type ToggleField = 'showBullets' | 'showDates' | 'showLocation' | 'showSummary' | 'showKeywords' | 'showBadges'

/** Per-section heading treatments ('' = the template's own default). */
const HEADING_STYLES: { label: string; value: string }[] = [
  { label: 'Auto', value: '' },
  { label: 'Underline', value: 'underline' },
  { label: 'Rule', value: 'rule-after' },
  { label: 'On-line', value: 'strike' },
  { label: 'Bar', value: 'bar' },
  { label: 'Filled', value: 'boxed' },
  { label: 'Lead', value: 'lead-rule' },
  { label: 'Badge', value: 'badge' },
  { label: 'Plain', value: 'plain' },
]

/** Skills display styles ('' = the template's own default). */
const SKILL_STYLES: { label: string; value: string }[] = [
  { label: 'Auto', value: '' },
  { label: 'Pills', value: 'chips' },
  { label: 'Tags', value: 'tags' },
  { label: 'Inline', value: 'inline' },
  { label: 'Grid', value: 'grid' },
]

/** Entry-flow layouts ('' = the template's own default). */
const ENTRY_LAYOUTS: { label: string; value: string }[] = [
  { label: 'Auto', value: '' },
  { label: 'Timeline', value: 'timeline' },
  { label: 'Cards', value: 'cards' },
  { label: 'Grid', value: 'grid' },
  { label: 'Divided', value: 'divided' },
]

/* Tiny visual mock of each style so users SEE what they're picking. */
function Mini({ kind }: { kind: string }) {
  const t = 'rounded-[1px] bg-foreground/55' // fake text bar
  const a = 'bg-primary' // accent
  switch (kind) {
    // heading styles
    case 'h:':
      return <span className="h-[10px] w-6 rounded-[3px] border border-dashed border-muted-foreground/60" />
    case 'h:underline':
      return (
        <span className="flex w-8 flex-col gap-[3px]">
          <span className={`h-[3px] w-4 ${t}`} />
          <span className="h-px w-full bg-foreground/50" />
        </span>
      )
    case 'h:rule-after':
      return (
        <span className="flex w-8 items-center gap-[3px]">
          <span className={`h-[3px] w-3 ${t}`} />
          <span className="h-px flex-1 bg-foreground/40" />
        </span>
      )
    case 'h:strike':
      return (
        <span className="relative flex w-8 items-center">
          <span className="absolute left-0 right-0 top-1/2 h-px bg-foreground/40" />
          <span className={`relative h-[3px] w-3.5 ${t} ring-2 ring-surface`} />
        </span>
      )
    case 'h:bar':
      return (
        <span className="flex w-8 items-center gap-[3px]">
          <span className={`h-[9px] w-[3px] ${a}`} />
          <span className={`h-[3px] w-4 ${t}`} />
        </span>
      )
    case 'h:boxed':
      return (
        <span className={`flex h-[11px] w-7 items-center justify-center rounded-[3px] ${a}`}>
          <span className="h-[3px] w-4 rounded-[1px] bg-white/90" />
        </span>
      )
    case 'h:lead-rule':
      return (
        <span className="flex w-8 items-center gap-[3px]">
          <span className={`h-[2.5px] w-2 rounded ${a}`} />
          <span className={`h-[3px] w-4 ${t}`} />
        </span>
      )
    case 'h:badge':
      return (
        <span className="flex w-8 items-center gap-[4px]">
          <span className={`h-[7px] w-[7px] rotate-45 rounded-[1.5px] ${a}`} />
          <span className={`h-[3px] w-4 ${t}`} />
        </span>
      )
    case 'h:plain':
      return <span className={`h-[3px] w-5 ${t}`} />
    // skills styles
    case 's:':
      return <span className="h-[10px] w-6 rounded-[3px] border border-dashed border-muted-foreground/60" />
    case 's:chips':
      return (
        <span className="flex w-8 gap-[3px]">
          <span className="h-[8px] w-3.5 rounded-full border border-primary/60 bg-primary/15" />
          <span className="h-[8px] w-3 rounded-full border border-primary/60 bg-primary/15" />
        </span>
      )
    case 's:tags':
      return (
        <span className="flex w-8 gap-[4px]">
          <span className="flex flex-col gap-[2px]"><span className={`h-[3px] w-3 ${t}`} /><span className="h-px w-full bg-foreground/50" /></span>
          <span className="flex flex-col gap-[2px]"><span className={`h-[3px] w-2.5 ${t}`} /><span className="h-px w-full bg-foreground/50" /></span>
        </span>
      )
    case 's:inline':
      return (
        <span className="flex w-8 items-center gap-[3px]">
          <span className={`h-[3px] w-2.5 ${t}`} />
          <span className="h-[3px] w-[3px] rounded-full bg-foreground/45" />
          <span className={`h-[3px] w-2.5 ${t}`} />
        </span>
      )
    case 's:grid':
      return (
        <span className="grid w-8 grid-cols-2 gap-[3px]">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="flex items-center gap-[2px]">
              <span className={`h-[4px] w-[4px] rotate-45 ${a}`} />
              <span className={`h-[2.5px] flex-1 ${t}`} />
            </span>
          ))}
        </span>
      )
    // entry layouts
    case 'e:':
      return <span className="h-[10px] w-6 rounded-[3px] border border-dashed border-muted-foreground/60" />
    case 'e:timeline':
      return (
        <span className="flex w-8 gap-[4px]">
          <span className="relative w-[7px]">
            <span className="absolute left-[2.5px] top-0 bottom-0 w-px bg-primary/40" />
            <span className={`absolute left-0 top-[1px] h-[6px] w-[6px] rounded-full ${a}`} />
            <span className={`absolute left-0 top-[12px] h-[6px] w-[6px] rounded-full ${a}`} />
          </span>
          <span className="flex flex-1 flex-col gap-[5px] pt-[1px]">
            <span className={`h-[3px] w-full ${t}`} />
            <span className={`h-[3px] w-4/5 ${t}`} />
          </span>
        </span>
      )
    case 'e:cards':
      return (
        <span className="flex w-8 flex-col gap-[3px]">
          <span className="flex h-[8px] items-center rounded-[2px] border border-foreground/30 px-[3px]"><span className={`h-[2.5px] w-3 ${t}`} /></span>
          <span className="flex h-[8px] items-center rounded-[2px] border border-foreground/30 px-[3px]"><span className={`h-[2.5px] w-2.5 ${t}`} /></span>
        </span>
      )
    case 'e:grid':
      return (
        <span className="grid w-8 grid-cols-2 gap-[3px]">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`h-[5px] rounded-[1px] bg-foreground/25`} />
          ))}
        </span>
      )
    case 'e:divided':
      return (
        <span className="flex w-8 flex-col gap-[3px]">
          <span className={`h-[3px] w-full ${t}`} />
          <span className="h-0 w-full border-t border-dotted border-foreground/50" />
          <span className={`h-[3px] w-4/5 ${t}`} />
        </span>
      )
    default:
      return null
  }
}

/** Sections whose bodies aren't entry lists (entry-layout doesn't apply). */
const NO_ENTRY_LAYOUT = new Set(['summary', 'skills', 'languages'])
/** Badge = org/name initial; only meaningful on title-led entry sections. */
const NO_BADGES = new Set(['certificates', 'awards', 'publications', 'interests', 'references'])

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
      // showBadges is opt-IN (off by default); the rest are opt-OUT (shown by default).
      const shown = field === 'showBadges' ? cur.showBadges === true : cur[field] !== false
      m.layout.sectionSettings[sectionKey] = { ...cur, [field]: shown ? false : true }
    })

  // Per-section style overrides — applied live on the canvas as you click.
  const setStyle = (field: 'headingStyle' | 'skillsStyle' | 'entryLayout', value?: string) =>
    editMeta((m) => {
      if (!m.layout.sectionSettings) m.layout.sectionSettings = {}
      const cur = { ...(m.layout.sectionSettings[sectionKey] ?? {}) }
      if (value) (cur as Record<string, unknown>)[field] = value
      else delete (cur as Record<string, unknown>)[field]
      m.layout.sectionSettings[sectionKey] = cur
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
    const W = 304
    // Pin to the viewport's right edge, level with the gear: the popover sits in
    // the page margin (or over the dates column at worst), so the section stays
    // visible while its styles change live.
    setPos({
      top: Math.max(8, Math.min(r.top - 4, window.innerHeight - 560)),
      left: Math.max(8, window.innerWidth - W - 12),
    })
    setOpen(true)
  }

  const rows: { label: string; field: ToggleField }[] = []
  if (HAS_BULLETS.has(base)) rows.push({ label: 'Bullet points', field: 'showBullets' })
  if (HAS_DATES.has(base)) rows.push({ label: 'Dates', field: 'showDates' })
  if (HAS_LOCATION.has(base)) rows.push({ label: 'Location', field: 'showLocation' })
  if (HAS_SUMMARY.has(base)) rows.push({ label: 'Role summary', field: 'showSummary' })
  if (HAS_KEYWORDS.has(base)) rows.push({ label: 'Tech tags', field: 'showKeywords' })
  if (!NO_ENTRY_LAYOUT.has(base) && !NO_BADGES.has(base)) rows.push({ label: 'Entry badges (initial)', field: 'showBadges' })

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
              className="fixed z-[61] max-h-[85vh] w-[19rem] overflow-y-auto rounded-xl border border-border bg-surface p-1.5 text-foreground shadow-float"
              style={{ top: pos.top, left: pos.left }}
            >
              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {sectionLabel(sectionKey, doc)} <span className="font-normal normal-case">— style &amp; settings</span>
              </div>
              {rows.map((r) => (
                <ToggleRow
                  key={r.field}
                  label={r.label}
                  on={r.field === 'showBadges' ? opts.showBadges === true : opts[r.field] !== false}
                  onClick={() => toggle(r.field)}
                />
              ))}
              {rows.length > 0 && <div className="my-1 h-px bg-border" />}

              {/* Heading style — live restyle of THIS section's heading */}
              <div className="px-2 pb-1 pt-0.5">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Heading style</div>
                <div className="flex flex-wrap gap-1">
                  {HEADING_STYLES.map((s) => (
                    <StyleChip
                      key={s.value || 'auto'}
                      label={s.label}
                      kind={`h:${s.value}`}
                      on={(opts.headingStyle ?? '') === s.value}
                      onClick={() => setStyle('headingStyle', s.value || undefined)}
                    />
                  ))}
                </div>
              </div>

              {/* Entry layout — how this section's entries flow on the page */}
              {!NO_ENTRY_LAYOUT.has(base) && (
                <div className="px-2 pb-1 pt-0.5">
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Entries layout</div>
                  <div className="flex flex-wrap gap-1">
                    {ENTRY_LAYOUTS.map((s) => (
                      <StyleChip
                        key={s.value || 'auto'}
                        label={s.label}
                        kind={`e:${s.value}`}
                        on={(opts.entryLayout ?? '') === s.value}
                        onClick={() => setStyle('entryLayout', s.value || undefined)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Skills display — only for the skills section */}
              {sectionKey === 'skills' && (
                <div className="px-2 pb-1 pt-0.5">
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Skills as</div>
                  <div className="flex flex-wrap gap-1">
                    {SKILL_STYLES.map((s) => (
                      <StyleChip
                        key={s.value || 'auto'}
                        label={s.label}
                        kind={`s:${s.value}`}
                        on={(opts.skillsStyle ?? '') === s.value}
                        onClick={() => setStyle('skillsStyle', s.value || undefined)}
                      />
                    ))}
                  </div>
                </div>
              )}
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

/** A style option: a small visual mock of the style + its name underneath. */
function StyleChip({ label, kind, on, onClick }: { label: string; kind: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`flex w-[52px] flex-col items-center gap-1 rounded-lg border p-1.5 transition ${
        on ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-border bg-surface hover:border-primary/50'
      }`}
    >
      <span className="flex h-5 w-full items-center justify-center">
        <Mini kind={kind} />
      </span>
      <span className={`text-[9px] font-medium leading-none ${on ? 'text-primary' : 'text-muted-foreground'}`}>{label}</span>
    </button>
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
