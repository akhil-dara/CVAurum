import { createPortal } from 'react-dom'
import { useState, useEffect } from 'react'
import { ChevronUp,
  GripVertical,
  Eye,
  EyeOff,
  ChevronDown,
  Plus,
  Trash2,
  MoreHorizontal,
  ArrowLeftRight,
  PanelBottom,
  Check,
  type LucideIcon,
} from 'lucide-react'
import type { ResumeDocument } from '@/types/document'
import { useResumeStore } from '@/store/useResumeStore'
import { SectionGear } from '@/templates/_shared/SectionGear'
import { uid, cn } from '@/lib/utils'
import {
  BODY_SECTION_KEYS,
  DEFAULT_LABELS,
  customKey,
  moveSection,
  moveSectionTo,
  nextSectionPlace,
  sectionLabel,
  type SectionPlace,
} from '@/lib/sections'
import { sectionIconFor } from '@/components/icons/sectionIcons'
import { SectionBoard } from './SectionBoard'
import { SectionItemsEditor } from './SectionItemEditors'
import { SectionGallery } from './SectionGallery'

const iconFor = sectionIconFor

function countItems(doc: ResumeDocument, key: string): number {
  if (key === 'summary') return doc.content.basics.summary ? 1 : 0
  if (key.startsWith('custom-')) {
    const id = key.slice('custom-'.length)
    return doc.content.custom.find((c) => c.id === id)?.items.length ?? 0
  }
  return ((doc.content as unknown as Record<string, unknown[]>)[key] ?? []).length
}

export function SectionsOrganizer({ doc }: { doc: ResumeDocument }) {
  const updateMetadata = useResumeStore((s) => s.updateMetadata)
  const updateDoc = useResumeStore((s) => s.updateDoc)
  const [expanded, setExpanded] = useState<string | null>(null)

  // The tour's restyle step talks about the Style button; expanding the first
  // section card is what puts one on screen for a phone to look at.
  useEffect(() => {
    const onShow = () => {
      const first = doc.metadata.layout.main[0] ?? doc.metadata.layout.aside[0]
      if (!first) return
      setExpanded(first)
      // The expanded card's Style row is usually below the fold - the whole
      // point is for it to be LOOKED at, so bring it to the middle.
      setTimeout(() => {
        document.querySelector('.rm-panel-gear .rm-section-gear')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }, 200)
    }
    window.addEventListener('cvaurum:tour-show-style', onShow)
    return () => window.removeEventListener('cvaurum:tour-show-style', onShow)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.metadata.layout.main, doc.metadata.layout.aside])
  const [addOpen, setAddOpen] = useState(false)

  const layout = doc.metadata.layout
  const twoCol = layout.columns === 2

  const setColumns = (main: string[], aside: string[], footer: string[]) =>
    updateMetadata((m) => {
      m.layout.main = main
      m.layout.aside = aside
      m.layout.footer = footer
    })
  const toggleHidden = (key: string) =>
    updateMetadata((m) => {
      const set = new Set(m.layout.hidden)
      set.has(key) ? set.delete(key) : set.add(key)
      m.layout.hidden = [...set]
    })
  // The move menu cycles the places a section can live: main, sidebar,
  // footer strip and back on two columns; main, footer strip and back on
  // one. The same helper the canvas gear and its drag use, so a move here
  // takes the key out of every other place in the same step.
  const moveColumn = (key: string) =>
    updateMetadata((m) => {
      const to = nextSectionPlace(m.layout, key, m.layout.columns === 2)
      moveSectionTo(m.layout, key, to, m.layout[to].length)
    })
  const removeSection = (key: string) => {
    if (key.startsWith('custom-')) {
      const id = key.slice('custom-'.length)
      updateDoc((d) => {
        d.content.custom = d.content.custom.filter((c) => c.id !== id)
        strip(d.metadata.layout, key)
      })
    } else {
      // Standard sections auto-populate back into the layout whenever they're
      // absent but have content (that's how new sections reach old docs) — so
      // "removed" must land in `hidden`, or the section reappears on the very
      // next render. It leaves the board and returns via "Add a section".
      updateMetadata((m) => {
        strip(m.layout, key)
        m.layout.hidden.push(key)
      })
    }
  }
  const renameSection = (key: string, label: string) => {
    if (key.startsWith('custom-')) {
      const id = key.slice('custom-'.length)
      updateDoc((d) => {
        const sec = d.content.custom.find((c) => c.id === id)
        if (sec) sec.name = label || 'Custom Section'
      })
    } else {
      updateMetadata((m) => {
        if (label.trim() && label !== DEFAULT_LABELS[key]) m.layout.headings[key] = label
        else delete m.layout.headings[key]
      })
    }
  }
  const addStandard = (key: string) => {
    updateMetadata((m) => {
      // A section the footer strip already holds stays there.
      if (!m.layout.main.includes(key) && !m.layout.aside.includes(key) && !m.layout.footer.includes(key))
        m.layout.main.push(key)
      m.layout.hidden = m.layout.hidden.filter((k) => k !== key)
    })
    setExpanded(key)
    setAddOpen(false)
  }
  const addCustom = (name?: string) => {
    const id = uid()
    updateDoc((d) => {
      d.content.custom.push({ id, name: name || 'Custom Section', items: [] })
      d.metadata.layout.main.push(customKey(id))
    })
    setExpanded(customKey(id))
    setAddOpen(false)
  }

  // Buttons as well as drag - the grip is unusable on a phone, where the
  // browser claims the gesture for scrolling, and this panel is the ONLY
  // place a phone can reorder sections at all.
  const shiftSection = (key: string, dir: -1 | 1) => updateMetadata((m) => moveSection(m.layout, key, dir))

  const renderCard = (key: string, handle: { attributes: Record<string, unknown>; listeners: Record<string, unknown> | undefined }) => (
    <SectionCard
      doc={doc}
      sectionKey={key}
      handle={handle}
      movePlace={nextSectionPlace(layout, key, twoCol)}
      hidden={layout.hidden.includes(key)}
      open={expanded === key}
      onToggle={() => setExpanded((e) => (e === key ? null : key))}
      onHide={() => toggleHidden(key)}
      onShift={(dir) => shiftSection(key, dir)}
      onMove={() => moveColumn(key)}
      onRemove={() => removeSection(key)}
      onRename={(l) => renameSection(key, l)}
    />
  )

  const available = BODY_SECTION_KEYS.filter(
    (k) => !layout.main.includes(k) && !layout.aside.includes(k) && !layout.footer.includes(k)
  )

  return (
    <div className="space-y-4">
      <SectionBoard
        main={layout.main}
        aside={layout.aside}
        footer={layout.footer}
        twoCol={twoCol}
        onChange={setColumns}
        renderCard={renderCard}
      />
      <p className="text-[11px] text-muted-foreground/80">
        {twoCol
          ? 'Drag a section across the zones to move it between the main flow, the sidebar and the footer strip.'
          : 'Drag a section into the footer strip to print it as a compact band at the foot of the page.'}
      </p>

      <button className="btn-outline btn-sm w-full border-dashed" onClick={() => setAddOpen(true)}>
        <Plus className="h-4 w-4" /> Add section
      </button>

      {addOpen && (
        <SectionGallery
          doc={doc}
          available={available}
          onAdd={addStandard}
          onAddCustom={addCustom}
          onClose={() => setAddOpen(false)}
        />
      )}
    </div>
  )
}

function strip(layout: ResumeDocument['metadata']['layout'], key: string) {
  layout.main = layout.main.filter((k) => k !== key)
  layout.aside = layout.aside.filter((k) => k !== key)
  layout.footer = layout.footer.filter((k) => k !== key)
  layout.hidden = layout.hidden.filter((k) => k !== key)
  delete layout.headings[key]
}

/** The move menu's row for the place a section goes next. */
const MOVE_ROWS: Record<SectionPlace, { label: string; Icon: LucideIcon }> = {
  main: { label: 'Move to main', Icon: ArrowLeftRight },
  aside: { label: 'Move to sidebar', Icon: ArrowLeftRight },
  footer: { label: 'Move to footer', Icon: PanelBottom },
}

function SectionCard({
  doc,
  sectionKey,
  handle,
  movePlace,
  hidden,
  open,
  onToggle,
  onHide,
  onShift,
  onMove,
  onRemove,
  onRename,
}: {
  doc: ResumeDocument
  sectionKey: string
  handle: { attributes: Record<string, unknown>; listeners: Record<string, unknown> | undefined }
  /** Where the move row takes this section (nextSectionPlace). */
  movePlace: SectionPlace
  hidden: boolean
  open: boolean
  onToggle: () => void
  onHide: () => void
  onShift: (dir: -1 | 1) => void
  onMove: () => void
  onRemove: () => void
  onRename: (label: string) => void
}) {
  const updateMeta = useResumeStore((st) => st.updateMetadata)
  const [menu, setMenu] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const [renaming, setRenaming] = useState(false)
  const Icon = iconFor(sectionKey)
  const label = sectionLabel(sectionKey, doc)
  const count = countItems(doc, sectionKey)
  const isCustom = sectionKey.startsWith('custom-')
  const moveRow = MOVE_ROWS[movePlace]

  return (
    <div className={cn('rounded-lg border bg-surface', hidden ? 'border-dashed border-border opacity-60' : 'border-border', open && 'shadow-soft')}>
      <div className="flex items-center gap-1 px-1.5 py-1.5">
        <button
          type="button"
          className="cursor-grab touch-none text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
          {...handle.attributes}
          {...handle.listeners}
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        {renaming ? (
          <input
            autoFocus
            defaultValue={label}
            className="h-7 flex-1 rounded border border-input bg-surface px-2 text-sm"
            onBlur={(e) => {
              onRename(e.target.value)
              setRenaming(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            }}
          />
        ) : (
          <button type="button" className="flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-1 text-left hover:bg-muted/50" onClick={onToggle}>
            <span className="truncate text-sm font-medium">{label}</span>
            {count > 0 && <span className="rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">{count}</span>}
          </button>
        )}
        <button type="button" className="btn-icon h-9 w-9 md:h-7 md:w-7" onClick={onHide} title={hidden ? 'Show section' : 'Hide section'}>
          {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        <div className="relative">
          <button
            type="button"
            className="btn-icon h-9 w-9 md:h-7 md:w-7"
            onClick={(e) => {
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
              setMenuPos({ top: r.bottom + 4, left: Math.max(8, Math.min(r.right - 160, window.innerWidth - 168)) })
              setMenu((m) => !m)
            }}
            aria-label="Section options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {/* Portaled to <body>: inside a sortable row the menu is trapped in the
              row's stacking context — sibling rows paint over it and its backdrop
              can't cover the other rows' buttons (menus could stack/overlap). */}
          {menu &&
            createPortal(
              <>
                <div className="fixed inset-0 z-[60]" onClick={() => setMenu(false)} />
                <div className="card fixed z-[61] w-40 overflow-hidden p-1 shadow-float" style={{ top: menuPos.top, left: menuPos.left }}>
                  <button className="btn-ghost w-full justify-start" onClick={() => { setRenaming(true); setMenu(false) }}>
                    <Check className="h-4 w-4" /> Rename
                  </button>
                  <button className="btn-ghost w-full justify-start" onClick={() => { onShift(-1); setMenu(false) }}>
                    <ChevronUp className="h-4 w-4" /> Move up
                  </button>
                  <button className="btn-ghost w-full justify-start" onClick={() => { onShift(1); setMenu(false) }}>
                    <ChevronDown className="h-4 w-4" /> Move down
                  </button>
                  {/* The phone's way between the main flow, the sidebar and
                      the footer strip: the grip is unusable there. */}
                  <button className="btn-ghost w-full justify-start" onClick={() => { onMove(); setMenu(false) }}>
                    <moveRow.Icon className="h-4 w-4" /> {moveRow.label}
                  </button>
                  <button className="btn-ghost w-full justify-start text-danger hover:bg-danger/10" onClick={() => { onRemove(); setMenu(false) }}>
                    <Trash2 className="h-4 w-4" /> {isCustom ? 'Delete' : 'Remove'}
                  </button>
                </div>
              </>,
              document.body,
            )}
        </div>
        <button type="button" className="btn-icon h-9 w-9 md:h-7 md:w-7" onClick={onToggle} aria-label={open ? 'Collapse' : 'Expand'}>
          <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
        </button>
      </div>
      {open && (
        <div className="space-y-3 border-t border-border p-3">
          {/* A heading's own address. It could be set from the canvas gear
              alone, and a phone never shows the canvas in edit mode, so this
              was one more thing a reader on a phone simply could not do. */}
          <div>
            <label className="label" htmlFor={`sec-url-${sectionKey}`}>
              Heading link
            </label>
            <input
              id={`sec-url-${sectionKey}`}
              className="input w-full"
              value={doc.metadata.layout.sectionSettings?.[sectionKey]?.url ?? ''}
              placeholder="Leave empty for no link"
              onChange={(e) => {
                const v = e.target.value
                useResumeStore.getState().updateMetadata((m) => {
                  const bag = ((m.layout.sectionSettings ??= {})[sectionKey] ??= {}) as Record<string, unknown>
                  if (v.trim()) bag.url = v
                  else delete bag.url
                })
              }}
            />
          </div>
          {/* The very same Style popover the canvas offers. It already knows
              how to present itself as a bottom sheet on a phone; it simply had
              no way in from here, so every section style - skills layout,
              badge size and shape, bullet style - was unreachable without a
              canvas, which a phone never shows in edit mode. */}
          <div className="rm-panel-gear flex items-center justify-between gap-2">
            <span className="text-[12px] text-muted-foreground">Section style</span>
            <SectionGear sectionKey={sectionKey} doc={doc} editMeta={updateMeta} variant="panel" />
          </div>
          <SectionItemsEditor doc={doc} sectionKey={sectionKey} />
        </div>
      )}
    </div>
  )
}
