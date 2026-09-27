import { findItem, insertItem, removeItem } from '@/lib/sections'
import { breakUndoBurst, useResumeStore } from './useResumeStore'
import { useAppStore } from './useAppStore'

type AnyItem = Record<string, unknown>

/** What a person calls an entry: its title, else its organisation. */
export function itemName(item: AnyItem): string {
  for (const k of ['position', 'name', 'title', 'studyType', 'institution', 'organization', 'language', 'reference']) {
    const v = item[k]
    if (typeof v === 'string' && v.trim()) return v.trim().slice(0, 60)
  }
  return 'item'
}

/**
 * Delete one entry, and say so with an Undo right there.
 *
 * One tap on a trash icon used to remove a whole job and its bullets with no
 * message, and the only way back was an Undo in a menu that needed pressing
 * twice (usability test, 2026-09-26). The delete is its own undo step
 * (breakUndoBurst), so it never takes the typing before it along; the
 * message's Undo reverses that step when nothing has changed since, and
 * otherwise puts the entry back where it was without touching later edits.
 */
export function deleteItem(sectionKey: string, id: string): void {
  const store = useResumeStore.getState()
  const doc = store.doc
  if (!doc) return
  const found = findItem(doc.content, sectionKey, id)
  if (!found) return
  breakUndoBurst()
  store.updateContent((c) => removeItem(c, sectionKey, id))
  breakUndoBurst()
  const after = useResumeStore.getState().doc
  const { item, index } = found
  useAppStore.getState().toast(`Deleted “${itemName(item)}”`, 'info', {
    label: 'Undo',
    run: () => {
      if (useResumeStore.getState().doc === after) useResumeStore.temporal.getState().undo()
      else useResumeStore.getState().updateContent((c) => insertItem(c, sectionKey, item, index))
    },
  })
}
