import { removeItem } from '@/lib/sections'
import type { ResumeContent } from '@/types/document'

/**
 * How the canvas deletes an entry. Templates render in the editor, in the
 * PDF exporter and in static pages, so they must not reach into the app's
 * stores themselves; the editor registers the delete it wants - one that
 * names what went and offers Undo (store/deleteItem.ts) - and anywhere else
 * a plain removal through the canvas's own edit function stands in.
 */
type DeleteFn = (sectionKey: string, id: string) => void
let registered: DeleteFn | null = null

export function setItemDelete(fn: DeleteFn | null): void {
  registered = fn
}

export function runItemDelete(edit: (recipe: (c: ResumeContent) => void) => void, sectionKey: string, id: string): void {
  if (registered) registered(sectionKey, id)
  else edit((c) => removeItem(c, sectionKey, id))
}
