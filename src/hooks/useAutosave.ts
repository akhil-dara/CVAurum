import { useEffect } from 'react'
import { debounce } from '@/lib/utils'
import { saveDoc } from '@/lib/storage'
import { useResumeStore } from '@/store/useResumeStore'
import type { ResumeDocument } from '@/types/document'

/**
 * Debounced autosave: whenever the open document changes, persist it to
 * IndexedDB — autosave on every edit, entirely local. ~900ms debounce balances
 * safety and write volume.
 */
export function useAutosave() {
  useEffect(() => {
    let last: ResumeDocument | null = useResumeStore.getState().doc
    const save = debounce(async (doc: ResumeDocument) => {
      try {
        await saveDoc(doc)
        useResumeStore.getState().markSaved(doc.updatedAt)
      } catch (e) {
        console.error('Autosave failed', e)
      }
    }, 900)

    const unsub = useResumeStore.subscribe((state) => {
      const doc = state.doc
      if (doc && doc !== last) {
        last = doc
        save(doc)
      }
    })
    return () => {
      unsub()
      // Flush (not just cancel) so edits made within the debounce window right
      // before navigating away are still persisted.
      if (last) save.flush(last)
      else save.cancel()
    }
  }, [])
}
