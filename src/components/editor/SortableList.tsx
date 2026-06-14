import type { ReactNode } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export interface DragHandle {
  attributes: Record<string, unknown>
  listeners: Record<string, unknown> | undefined
  isDragging: boolean
}

/** Vertical drag-to-reorder list. `renderItem` receives the item id and the
 * props to spread onto a drag handle element. */
export function SortableList({
  ids,
  onReorder,
  renderItem,
  className,
}: {
  ids: string[]
  onReorder: (ids: string[]) => void
  renderItem: (id: string, handle: DragHandle) => ReactNode
  className?: string
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIndex = ids.indexOf(String(active.id))
    const newIndex = ids.indexOf(String(over.id))
    if (oldIndex < 0 || newIndex < 0) return
    onReorder(arrayMove(ids, oldIndex, newIndex))
  }
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className={className}>
          {ids.map((id) => (
            <SortableRow key={id} id={id} renderItem={renderItem} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

export function SortableRow({ id, renderItem }: { id: string; renderItem: (id: string, h: DragHandle) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    position: 'relative' as const,
  }
  return (
    <div ref={setNodeRef} style={style}>
      {renderItem(id, { attributes: attributes as unknown as Record<string, unknown>, listeners: listeners as Record<string, unknown> | undefined, isDragging })}
    </div>
  )
}
