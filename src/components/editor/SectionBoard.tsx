import { useState, type ReactNode } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { cn } from '@/lib/utils'
import type { SectionPlace } from '@/lib/sections'
import { SortableRow, type DragHandle } from './SortableList'

/**
 * Drag-to-reorder board for the section organizer. Unlike isolated
 * SortableLists, this lifts a SINGLE DndContext over every zone so a card can
 * be dragged WITHIN a zone and ACROSS zones (main, sidebar, footer strip).
 * All moves are committed in one `onChange` so layout.main/aside/footer stay
 * consistent. The footer strip zone is always there, whatever the column
 * count: the strip is a place on every template, the sidebar only on two
 * columns.
 */
export function SectionBoard({
  main,
  aside,
  footer,
  twoCol,
  onChange,
  renderCard,
}: {
  main: string[]
  aside: string[]
  footer: string[]
  twoCol: boolean
  onChange: (main: string[], aside: string[], footer: string[]) => void
  renderCard: (id: string, handle: DragHandle) => ReactNode
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const lists: Record<SectionPlace, string[]> = { main, aside, footer }
  const columns: { id: SectionPlace; label: string; ids: string[] }[] = twoCol
    ? [
        { id: 'main', label: 'Main column', ids: main },
        { id: 'aside', label: 'Sidebar', ids: aside },
        { id: 'footer', label: 'Footer strip', ids: footer },
      ]
    : [
        { id: 'main', label: '', ids: main },
        { id: 'footer', label: 'Footer strip', ids: footer },
      ]

  const columnOf = (id: string): SectionPlace | null => {
    for (const col of columns) {
      if (id === `col:${col.id}` || col.ids.includes(id)) return col.id
    }
    return null
  }

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = e
    if (!over) return
    const a = String(active.id)
    const o = String(over.id)
    const from = columnOf(a)
    const to = columnOf(o)
    if (!from || !to) return

    const next: Record<SectionPlace, string[]> = { main: [...main], aside: [...aside], footer: [...footer] }
    const src = next[from]
    const fromIdx = src.indexOf(a)
    if (fromIdx < 0) return

    if (from === to) {
      let overIdx = src.indexOf(o)
      if (overIdx < 0) overIdx = src.length - 1
      next[from] = arrayMove(src, fromIdx, overIdx)
    } else {
      src.splice(fromIdx, 1)
      const dst = next[to]
      let insertIdx = dst.indexOf(o)
      if (insertIdx < 0) insertIdx = dst.length
      dst.splice(insertIdx, 0, a)
    }

    const changed = (['main', 'aside', 'footer'] as const).some((k) => next[k].join('|') !== lists[k].join('|'))
    if (changed) onChange(next.main, next.aside, next.footer)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="space-y-4">
        {columns.map((col) => (
          <DroppableColumn key={col.id} id={col.id} label={col.label} ids={col.ids} renderCard={renderCard} />
        ))}
      </div>
      <DragOverlay>
        {activeId ? (
          <div className="opacity-95">{renderCard(activeId, { attributes: {}, listeners: undefined, isDragging: true })}</div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function DroppableColumn({
  id,
  label,
  ids,
  renderCard,
}: {
  id: string
  label: string
  ids: string[]
  renderCard: (id: string, handle: DragHandle) => ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${id}` })
  return (
    <div>
      {label && <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>}
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            'space-y-2 rounded-lg transition-colors',
            isOver && 'bg-primary/5 ring-1 ring-primary/30',
            ids.length === 0 && 'flex min-h-[52px] items-center justify-center border border-dashed border-border text-xs text-muted-foreground/70',
          )}
        >
          {ids.map((sid) => (
            <SortableRow key={sid} id={sid} renderItem={renderCard} />
          ))}
          {ids.length === 0 && 'Drag a section here'}
        </div>
      </SortableContext>
    </div>
  )
}
