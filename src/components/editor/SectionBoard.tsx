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
import { SortableRow, type DragHandle } from './SortableList'

/**
 * Drag-to-reorder board for the section organizer. Unlike two isolated
 * SortableLists, this lifts a SINGLE DndContext over both columns so a card can
 * be dragged WITHIN a column and ACROSS columns (main ↔ sidebar). All moves are
 * committed in one `onChange` so layout.main/aside stay consistent.
 */
export function SectionBoard({
  main,
  aside,
  twoCol,
  onChange,
  renderCard,
}: {
  main: string[]
  aside: string[]
  twoCol: boolean
  onChange: (main: string[], aside: string[]) => void
  renderCard: (id: string, handle: DragHandle) => ReactNode
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const columns = twoCol
    ? [
        { id: 'main', label: 'Main column', ids: main },
        { id: 'aside', label: 'Sidebar', ids: aside },
      ]
    : [{ id: 'main', label: '', ids: main }]

  const columnOf = (id: string): 'main' | 'aside' | null => {
    if (main.includes(id) || id === 'col:main') return 'main'
    if (aside.includes(id) || id === 'col:aside') return 'aside'
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

    let M = [...main]
    let A = [...aside]
    const src = from === 'main' ? M : A
    const fromIdx = src.indexOf(a)
    if (fromIdx < 0) return

    if (from === to) {
      let overIdx = src.indexOf(o)
      if (overIdx < 0) overIdx = src.length - 1
      const reordered = arrayMove(src, fromIdx, overIdx)
      if (from === 'main') M = reordered
      else A = reordered
    } else {
      src.splice(fromIdx, 1)
      const dst = to === 'main' ? M : A
      let insertIdx = dst.indexOf(o)
      if (insertIdx < 0) insertIdx = dst.length
      dst.splice(insertIdx, 0, a)
    }

    if (M.join('|') !== main.join('|') || A.join('|') !== aside.join('|')) onChange(M, A)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className={twoCol ? 'space-y-4' : ''}>
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
