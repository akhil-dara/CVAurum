import { GripVertical, Trash2, Plus } from 'lucide-react'
import { SortableList } from '../SortableList'
import { RichTextLazy as RichTextEditor } from './RichTextLazy'
import { Labeled } from './Inputs'
import { htmlEscape } from '@/lib/utils'

export function BulletsEditor({
  label,
  items,
  onChange,
  placeholder,
}: {
  label?: string
  items: string[]
  onChange: (items: string[]) => void
  placeholder?: string
}) {
  const ids = items.map((_, i) => String(i))
  return (
    <Labeled label={label}>
      {items.length > 0 && (
        <SortableList
          ids={ids}
          onReorder={(order) => onChange(order.map((i) => items[Number(i)]))}
          className="space-y-2"
          renderItem={(id, h) => {
            const i = Number(id)
            return (
              <div className="flex items-start gap-1.5">
                <button
                  type="button"
                  className="mt-2 cursor-grab text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
                  {...h.attributes}
                  {...h.listeners}
                  aria-label="Drag to reorder"
                >
                  <GripVertical className="h-4 w-4" />
                </button>
                <div className="flex-1">
                  <RichTextEditor
                    value={items[i]}
                    onChange={(v) => onChange(items.map((x, j) => (j === i ? v : x)))}
                    withLists={false}
                    minHeight={38}
                    placeholder={placeholder ?? 'Describe an achievement, ideally with a metric…'}
                    // A list pasted into one field becomes one bullet per
                    // line: they follow the bullet the paste hit, or take its
                    // place when that bullet was still empty. Escaped, so
                    // pasted text can never smuggle markup into the field.
                    onPasteLines={(lines) => {
                      const empty = items[i].replace(/<[^>]+>/g, '').trim().length === 0
                      const safe = lines.map(htmlEscape)
                      onChange([...items.slice(0, empty ? i : i + 1), ...safe, ...items.slice(i + 1)])
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="mt-1.5 flex h-7 w-7 items-center justify-center rounded text-muted-foreground/60 hover:bg-danger/10 hover:text-danger"
                  onClick={() => onChange(items.filter((_, j) => j !== i))}
                  aria-label="Remove bullet"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )
          }}
        />
      )}
      <button type="button" className="btn-ghost btn-sm mt-2 text-primary hover:bg-primary/10" onClick={() => onChange([...items, ''])}>
        <Plus className="h-4 w-4" /> Add bullet
      </button>
    </Labeled>
  )
}
