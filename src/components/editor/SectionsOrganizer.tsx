import { useState } from 'react'
import {
  GripVertical,
  Eye,
  EyeOff,
  ChevronDown,
  Plus,
  Trash2,
  MoreHorizontal,
  ArrowLeftRight,
  Check,
  type LucideIcon,
} from 'lucide-react'
import type { ResumeDocument } from '@/types/document'
import { useResumeStore } from '@/store/useResumeStore'
import { uid, cn } from '@/lib/utils'
import { BODY_SECTION_KEYS, DEFAULT_LABELS, customKey, sectionLabel } from '@/lib/sections'
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
  const [addOpen, setAddOpen] = useState(false)

  const layout = doc.metadata.layout
  const twoCol = layout.columns === 2

  const setColumns = (main: string[], aside: string[]) =>
    updateMetadata((m) => {
      m.layout.main = main
      m.layout.aside = aside
    })
  const toggleHidden = (key: string) =>
    updateMetadata((m) => {
      const set = new Set(m.layout.hidden)
      set.has(key) ? set.delete(key) : set.add(key)
      m.layout.hidden = [...set]
    })
  const moveColumn = (key: string) =>
    updateMetadata((m) => {
      const inMain = m.layout.main.includes(key)
      const from = inMain ? 'main' : 'aside'
      const to = inMain ? 'aside' : 'main'
      m.layout[from] = m.layout[from].filter((k) => k !== key)
      m.layout[to] = [...m.layout[to], key]
    })
  const removeSection = (key: string) => {
    if (key.startsWith('custom-')) {
      const id = key.slice('custom-'.length)
      updateDoc((d) => {
        d.content.custom = d.content.custom.filter((c) => c.id !== id)
        strip(d.metadata.layout, key)
      })
    } else {
      updateMetadata((m) => strip(m.layout, key))
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
      if (!m.layout.main.includes(key) && !m.layout.aside.includes(key)) m.layout.main.push(key)
      m.layout.hidden = m.layout.hidden.filter((k) => k !== key)
    })
    setExpanded(key)
    setAddOpen(false)
  }
  const addCustom = () => {
    const id = uid()
    updateDoc((d) => {
      d.content.custom.push({ id, name: 'Custom Section', items: [] })
      d.metadata.layout.main.push(customKey(id))
    })
    setExpanded(customKey(id))
    setAddOpen(false)
  }

  const renderCard = (key: string, handle: { attributes: Record<string, unknown>; listeners: Record<string, unknown> | undefined }) => (
    <SectionCard
      doc={doc}
      sectionKey={key}
      handle={handle}
      twoCol={twoCol}
      hidden={layout.hidden.includes(key)}
      open={expanded === key}
      onToggle={() => setExpanded((e) => (e === key ? null : key))}
      onHide={() => toggleHidden(key)}
      onMove={() => moveColumn(key)}
      onRemove={() => removeSection(key)}
      onRename={(l) => renameSection(key, l)}
    />
  )

  const available = BODY_SECTION_KEYS.filter((k) => !layout.main.includes(k) && !layout.aside.includes(k))

  return (
    <div className="space-y-4">
      <SectionBoard
        main={layout.main}
        aside={layout.aside}
        twoCol={twoCol}
        onChange={setColumns}
        renderCard={renderCard}
      />
      {twoCol && (
        <p className="text-[11px] text-muted-foreground/80">Drag a section across columns to move it between the main flow and the sidebar.</p>
      )}

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
  layout.hidden = layout.hidden.filter((k) => k !== key)
  delete layout.headings[key]
}

function SectionCard({
  doc,
  sectionKey,
  handle,
  twoCol,
  hidden,
  open,
  onToggle,
  onHide,
  onMove,
  onRemove,
  onRename,
}: {
  doc: ResumeDocument
  sectionKey: string
  handle: { attributes: Record<string, unknown>; listeners: Record<string, unknown> | undefined }
  twoCol: boolean
  hidden: boolean
  open: boolean
  onToggle: () => void
  onHide: () => void
  onMove: () => void
  onRemove: () => void
  onRename: (label: string) => void
}) {
  const [menu, setMenu] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const Icon = iconFor(sectionKey)
  const label = sectionLabel(sectionKey, doc)
  const count = countItems(doc, sectionKey)
  const isCustom = sectionKey.startsWith('custom-')

  return (
    <div className={cn('rounded-lg border bg-surface', hidden ? 'border-dashed border-border opacity-60' : 'border-border', open && 'shadow-soft')}>
      <div className="flex items-center gap-1 px-1.5 py-1.5">
        <button
          type="button"
          className="cursor-grab text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
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
        <button type="button" className="btn-icon h-7 w-7" onClick={onHide} title={hidden ? 'Show section' : 'Hide section'}>
          {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        <div className="relative">
          <button type="button" className="btn-icon h-7 w-7" onClick={() => setMenu((m) => !m)} aria-label="Section options">
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
              <div className="card absolute right-0 z-20 mt-1 w-40 overflow-hidden p-1 shadow-float">
                <button className="btn-ghost w-full justify-start" onClick={() => { setRenaming(true); setMenu(false) }}>
                  <Check className="h-4 w-4" /> Rename
                </button>
                {twoCol && (
                  <button className="btn-ghost w-full justify-start" onClick={() => { onMove(); setMenu(false) }}>
                    <ArrowLeftRight className="h-4 w-4" /> Switch column
                  </button>
                )}
                <button className="btn-ghost w-full justify-start text-danger hover:bg-danger/10" onClick={() => { onRemove(); setMenu(false) }}>
                  <Trash2 className="h-4 w-4" /> {isCustom ? 'Delete' : 'Remove'}
                </button>
              </div>
            </>
          )}
        </div>
        <button type="button" className="btn-icon h-7 w-7" onClick={onToggle} aria-label={open ? 'Collapse' : 'Expand'}>
          <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
        </button>
      </div>
      {open && (
        <div className="border-t border-border p-3">
          <SectionItemsEditor doc={doc} sectionKey={sectionKey} />
        </div>
      )}
    </div>
  )
}
