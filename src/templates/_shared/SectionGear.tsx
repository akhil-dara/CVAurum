import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Settings2, EyeOff, ArrowLeftRight, Copy, ClipboardPaste, Paintbrush, X } from 'lucide-react'
import { useEditorStore } from '@/store/useEditorStore'
import { usePopoverA11y } from './popoverA11y'
import type { ResumeDocument } from '@/types/document'
import type { Metadata } from '@/types/metadata'
import { sectionLabel } from '@/lib/sections'
import type { MetaEditFn } from './Editable'

type ToggleField = 'showBullets' | 'showDates' | 'showLocation' | 'showSummary' | 'showKeywords' | 'showBadges'

/** The visual-style fields the painter copies (NOT the show* content toggles). */
const STYLE_FIELDS = ['headingStyle', 'skillsStyle', 'entryLayout', 'scoreStyle', 'bulletStyle', 'meterStyle', 'badgeSize', 'badgeShape'] as const

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

/** Education score placements ('' = inline, the classic look). */
const SCORE_STYLES: { label: string; value: string }[] = [
  { label: 'Inline', value: '' },
  { label: 'Right', value: 'right' },
  { label: 'Pill', value: 'pill' },
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
    // score placements
    case 'g:':
      return (
        <span className="flex w-8 items-center gap-[3px]">
          <span className={`h-[3px] w-3 ${t}`} />
          <span className={`h-[3px] w-2 rounded-[1px] bg-primary/70`} />
        </span>
      )
    case 'g:right':
      return (
        <span className="flex w-8 items-center gap-[3px]">
          <span className={`h-[3px] w-3 ${t}`} />
          <span className="ml-auto h-[8px] w-px bg-foreground/40" />
          <span className={`h-[3px] w-2 rounded-[1px] bg-primary/70`} />
        </span>
      )
    case 'g:pill':
      return (
        <span className="flex w-8 items-center gap-[3px]">
          <span className={`h-[3px] w-3 ${t}`} />
          <span className="ml-auto h-[9px] w-3.5 rounded-full border border-primary/60 bg-primary/15" />
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

/** Per-section bullet markers (glyph chips — the marker itself is the preview). */
const BULLET_CHOICES: { v: string; label: string; title: string }[] = [
  { v: '', label: 'Auto', title: 'Use the resume-wide bullet style (Design panel)' },
  { v: 'disc', label: '•', title: 'Disc' },
  { v: 'circle', label: '○', title: 'Circle' },
  { v: 'square', label: '▪', title: 'Square' },
  { v: 'dash', label: '–', title: 'Dash' },
  { v: 'arrow', label: '›', title: 'Arrow' },
  { v: 'check', label: '✓', title: 'Check' },
  { v: 'diamond', label: '◆', title: 'Diamond' },
  { v: 'none', label: 'None', title: 'No bullet markers' },
]

/** Per-section proficiency meters (skills & languages). */
const METER_CHOICES: { v: string; label: string; title: string }[] = [
  { v: '', label: 'Auto', title: 'Use the resume-wide meter style (Design panel)' },
  { v: 'dots', label: '●●●○○', title: 'Dots' },
  { v: 'bars', label: '▰▰▰▱▱', title: 'Bars' },
  { v: 'stars', label: '★★★☆☆', title: 'Stars' },
  { v: 'text', label: 'Text', title: 'Written level (e.g. Native, Professional)' },
  { v: 'none', label: 'None', title: 'Hide proficiency' },
]
const HAS_METER = new Set(['skills', 'languages'])
const HAS_KEYWORDS = new Set(['projects'])

const POP_W = 308 // popover width (px) — must match w-[308px] below

/**
 * Per-section "super customization" gear that appears on the canvas (edit mode).
 * Opens a popover to toggle that section's fields (bullets, dates, location…),
 * restyle it live, and move/hide it — writing straight to layout metadata.
 * Desktop: a floating panel clamped fully on-screen with its own scroll area.
 * Phones: a bottom sheet (floating panels are unusable at that size).
 */
export function SectionGear({ sectionKey, doc, editMeta }: { sectionKey: string; doc: ResumeDocument; editMeta: MetaEditFn }) {
  const [open, setOpen] = useState(false)
  // sheet=true → phone bottom-sheet; otherwise a clamped floating panel.
  const [pos, setPos] = useState({ top: 0, left: 0, maxH: 600, sheet: false })
  const panelRef = useRef<HTMLDivElement>(null)
  // Escape closes; focus moves in on open and back to the gear on close.
  usePopoverA11y(open, () => setOpen(false), panelRef)

  const layout = doc.metadata.layout
  const base = sectionKey.startsWith('custom-') ? 'custom' : sectionKey
  const opts = layout.sectionSettings?.[sectionKey] ?? {}
  const twoCol = layout.columns === 2
  const inAside = layout.aside.includes(sectionKey)

  // Keep the panel usable if the window changes underneath it.
  useEffect(() => {
    if (!open) return
    const onResize = () => setOpen(false)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [open])

  const toggle = (field: ToggleField) =>
    editMeta((m) => {
      if (!m.layout.sectionSettings) m.layout.sectionSettings = {}
      const cur = m.layout.sectionSettings[sectionKey] ?? {}
      // showBadges is opt-IN (off by default); the rest are opt-OUT (shown by default).
      const shown = field === 'showBadges' ? cur.showBadges === true : cur[field] !== false
      m.layout.sectionSettings[sectionKey] = { ...cur, [field]: shown ? false : true }
    })

  // Per-section style overrides — applied live on the canvas as you click.
  const setStyle = (field: 'headingStyle' | 'skillsStyle' | 'entryLayout' | 'scoreStyle' | 'bulletStyle' | 'meterStyle' | 'badgeSize' | 'badgeShape', value?: string) =>
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

  // Style painter: copy this section's visual style, then paint it onto another
  // section (or all of them) — like Figma's paint-format. Only the visual-style
  // fields travel; each section keeps its own content-visibility toggles.
  const copiedStyle = useEditorStore((s) => s.copiedStyle)
  const setCopiedStyle = useEditorStore((s) => s.setCopiedStyle)
  const copyStyle = () => {
    const picked: Record<string, string> = {}
    for (const f of STYLE_FIELDS) {
      const v = (opts as Record<string, string | undefined>)[f]
      if (v) picked[f] = v
    }
    setCopiedStyle(picked)
  }
  const applyStyleTo = (m: Metadata, key: string) => {
    if (!m.layout.sectionSettings) m.layout.sectionSettings = {}
    const cur = { ...(m.layout.sectionSettings[key] ?? {}) } as Record<string, unknown>
    for (const f of STYLE_FIELDS) delete cur[f] // clear then apply, so Auto (unset) paints too
    Object.assign(cur, copiedStyle ?? {})
    m.layout.sectionSettings[key] = cur
  }
  const pasteStyle = () => editMeta((m) => applyStyleTo(m, sectionKey))
  const paintAll = () =>
    editMeta((m) => {
      for (const key of [...m.layout.main, ...m.layout.aside]) applyStyleTo(m, key)
    })

  const openPopover = (e: React.MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    // clientWidth excludes the page scrollbar — innerWidth would tuck the panel
    // underneath it on Windows (the clipping users saw).
    const vw = document.documentElement.clientWidth
    const vh = window.innerHeight
    if (vw < 640) {
      setPos({ top: 0, left: 0, maxH: Math.round(vh * 0.76), sheet: true })
      setOpen(true)
      return
    }
    const maxH = Math.min(620, vh - 16)
    // Sit in the page's right margin, level with the gear — the section stays
    // visible while its styles change live. Clamped fully on-screen.
    const left = Math.max(8, Math.min(r.right + 12, vw - POP_W - 8))
    const top = Math.max(8, Math.min(r.top - 4, vh - maxH - 8))
    setPos({ top, left, maxH, sheet: false })
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
        title="Style & settings for this section"
        aria-label="Section style and settings"
      >
        <Settings2 /> Style
      </button>
      {open &&
        createPortal(
          <>
            <div className={`fixed inset-0 z-[60] ${pos.sheet ? 'bg-black/35' : ''}`} onClick={() => setOpen(false)} />
            <div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              tabIndex={-1}
              aria-label={`${sectionLabel(sectionKey, doc)} style and settings`}
              className={
                pos.sheet
                  ? 'fixed inset-x-0 bottom-0 z-[61] flex flex-col rounded-t-2xl border-t border-border bg-surface text-foreground shadow-float'
                  : 'fixed z-[61] flex w-[308px] flex-col rounded-xl border border-border bg-surface text-foreground shadow-float'
              }
              style={pos.sheet ? { maxHeight: pos.maxH } : { top: pos.top, left: pos.left, maxHeight: pos.maxH }}
            >
              {/* Header — stays put while the controls scroll underneath. */}
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold leading-tight">{sectionLabel(sectionKey, doc)}</div>
                  <div className="text-[10.5px] uppercase tracking-wide text-muted-foreground">Style &amp; settings</div>
                </div>
                <button className="btn-icon h-7 w-7 shrink-0" onClick={() => setOpen(false)} aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Scrollable body — vertical only; sideways clipping can never happen. */}
              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-2">
                {rows.length > 0 && (
                  <Group label="Show">
                    {rows.map((r) => (
                      <ToggleRow
                        key={r.field}
                        label={r.label}
                        on={r.field === 'showBadges' ? opts.showBadges === true : opts[r.field] !== false}
                        onClick={() => toggle(r.field)}
                      />
                    ))}
                  </Group>
                )}

                {/* Bullet marker — per-section override of the global bullet style */}
                {HAS_BULLETS.has(base) && opts.showBullets !== false && (
                  <Group label="Bullet style">
                    <div className="grid grid-cols-5 gap-1">
                      {BULLET_CHOICES.map((b) => (
                        <ChipBtn key={b.v || 'auto'} label={b.label} title={b.title} on={(opts.bulletStyle ?? '') === b.v} onClick={() => setStyle('bulletStyle', b.v)} />
                      ))}
                    </div>
                  </Group>
                )}

                {/* Proficiency meter — skills & languages only */}
                {HAS_METER.has(base) && (
                  <Group label="Meter style">
                    <div className="grid grid-cols-3 gap-1">
                      {METER_CHOICES.map((b) => (
                        <ChipBtn key={b.v || 'auto'} label={b.label} title={b.title} on={(opts.meterStyle ?? '') === b.v} onClick={() => setStyle('meterStyle', b.v)} />
                      ))}
                    </div>
                  </Group>
                )}

                {/* Logo / badge size + shape — sections with entry marks */}
                {!NO_BADGES.has(base) && (
                  <>
                    <Group label="Logo & badge size">
                      <div className="grid grid-cols-4 gap-1">
                        {[
                          { v: '', label: 'Auto' },
                          { v: 's', label: 'S' },
                          { v: 'm', label: 'M' },
                          { v: 'l', label: 'L' },
                        ].map((b) => (
                          <ChipBtn key={b.v || 'auto'} label={b.label} on={(opts.badgeSize ?? '') === b.v} onClick={() => setStyle('badgeSize', b.v)} />
                        ))}
                      </div>
                    </Group>
                    <Group label="Logo & badge shape">
                      <div className="grid grid-cols-4 gap-1">
                        {[
                          { v: '', label: 'Auto', title: 'Template default shape' },
                          { v: 'rounded', label: '▢', title: 'Rounded corners' },
                          { v: 'circle', label: '◯', title: 'Circle' },
                          { v: 'square', label: '□', title: 'Square' },
                        ].map((b) => (
                          <ChipBtn key={b.v || 'auto'} label={b.label} title={b.title} on={(opts.badgeShape ?? '') === b.v} onClick={() => setStyle('badgeShape', b.v)} />
                        ))}
                      </div>
                    </Group>
                  </>
                )}

                {/* Heading style — live restyle of THIS section's heading */}
                <Group label="Heading style">
                  <div className="grid grid-cols-3 gap-1">
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
                </Group>

                {/* Entry layout — how this section's entries flow on the page */}
                {!NO_ENTRY_LAYOUT.has(base) && (
                  <Group label="Entries layout">
                    <div className="grid grid-cols-3 gap-1">
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
                  </Group>
                )}

                {/* Score placement — education only */}
                {sectionKey === 'education' && (
                  <Group label="Score (GPA) placement">
                    <div className="grid grid-cols-3 gap-1">
                      {SCORE_STYLES.map((s) => (
                        <StyleChip
                          key={s.value || 'inline'}
                          label={s.label}
                          kind={`g:${s.value}`}
                          on={(opts.scoreStyle ?? '') === s.value}
                          onClick={() => setStyle('scoreStyle', s.value || undefined)}
                        />
                      ))}
                    </div>
                  </Group>
                )}

                {/* Skills display — only for the skills section */}
                {sectionKey === 'skills' && (
                  <Group label="Skills as">
                    <div className="grid grid-cols-3 gap-1">
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
                  </Group>
                )}

                <div className="my-1.5 h-px bg-border" />
                <div className="flex items-center gap-1 px-1 pb-1">
                  <button
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-xs font-medium hover:border-primary/50 hover:text-primary"
                    onClick={copyStyle}
                    title="Copy this section's style"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy style
                  </button>
                  {copiedStyle && (
                    <>
                      <button
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-xs font-medium hover:border-primary/50 hover:text-primary"
                        onClick={pasteStyle}
                        title="Paste the copied style onto this section"
                      >
                        <ClipboardPaste className="h-3.5 w-3.5" /> Paste
                      </button>
                      <button
                        className="flex items-center justify-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2 py-1.5 text-xs font-medium text-primary hover:bg-primary/15"
                        onClick={() => { paintAll(); setOpen(false) }}
                        title="Paint the copied style onto every section"
                      >
                        <Paintbrush className="h-3.5 w-3.5" /> All
                      </button>
                    </>
                  )}
                </div>
                <div className="my-1.5 h-px bg-border" />
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
            </div>
          </>,
          document.body,
        )}
    </>
  )
}

/** A labeled cluster of controls — consistent rhythm instead of one long list. */
function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-1 pb-2 pt-1">
      <div className="mb-1 px-1 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      {children}
    </div>
  )
}

/** A compact text/glyph option chip (bullet marker, meter, size, shape). */
function ChipBtn({ label, title, on, onClick }: { label: string; title?: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      title={title || label}
      aria-pressed={on}
      onClick={onClick}
      className={`min-w-0 truncate rounded-md border px-1 py-1.5 text-xs font-medium transition ${
        on ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
      }`}
    >
      {label}
    </button>
  )
}

/** A style option: a small visual mock of the style + its name underneath. */
function StyleChip({ label, kind, on, onClick }: { label: string; kind: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-pressed={on}
      className={`flex min-w-0 flex-col items-center gap-1 rounded-lg border p-1.5 transition ${
        on ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-border bg-surface hover:border-primary/50'
      }`}
    >
      <span className="flex h-5 w-full items-center justify-center">
        <Mini kind={kind} />
      </span>
      <span className={`w-full truncate text-center text-[9px] font-medium leading-none ${on ? 'text-primary' : 'text-muted-foreground'}`}>{label}</span>
    </button>
  )
}

function ToggleRow({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onClick} className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted">
      <span className="truncate">{label}</span>
      <span className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${on ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
        <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all ${on ? 'left-[14px]' : 'left-0.5'}`} />
      </span>
    </button>
  )
}
