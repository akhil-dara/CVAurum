/**
 * The active-resume document store. Holds exactly one open ResumeDocument and
 * exposes ergonomic updaters. Wrapped with zundo's `temporal` middleware for
 * collaboration-free undo/redo (zundo over a Zustand store).
 *
 * History capture is debounced so a burst of keystrokes collapses into a single
 * undo step.
 */
import { create } from 'zustand'
import { temporal } from 'zundo'
import { throttle } from '@/lib/utils'
import type { ResumeContent, ResumeDocument } from '@/types/document'
import type { Metadata } from '@/types/metadata'
import type { TemplateDefaults } from '@/types/template'
import { applyTemplateToMetadata } from '@/lib/templateApply'

interface ResumeState {
  doc: ResumeDocument | null
  dirty: boolean
  lastSavedAt: number | null

  load: (doc: ResumeDocument) => void
  close: () => void
  markSaved: (ts: number) => void

  /** Mutate resume content via an immer-style recipe (operates on a clone). */
  updateContent: (recipe: (c: ResumeContent) => void) => void
  /** Mutate metadata via a recipe. */
  updateMetadata: (recipe: (m: Metadata) => void) => void
  /** Mutate the whole document (content + metadata together) in one history step. */
  updateDoc: (recipe: (d: ResumeDocument) => void) => void

  setTitle: (title: string) => void
  setJobDescription: (jd: string) => void

  /** Switch template, merging the template's shipped defaults. */
  applyTemplate: (defaults: TemplateDefaults) => void
  /** Replace the whole document (import). */
  replaceDoc: (doc: ResumeDocument) => void
}

function touch(doc: ResumeDocument): ResumeDocument {
  return { ...doc, updatedAt: Date.now() }
}

export const useResumeStore = create<ResumeState>()(
  temporal(
    (set, get) => ({
      doc: null,
      dirty: false,
      lastSavedAt: null,

      load: (doc) => set({ doc, dirty: false, lastSavedAt: doc.updatedAt }),
      close: () => set({ doc: null, dirty: false, lastSavedAt: null }),
      markSaved: (ts) => set({ dirty: false, lastSavedAt: ts }),

      updateContent: (recipe) => {
        const cur = get().doc
        if (!cur) return
        const next = structuredClone(cur)
        recipe(next.content)
        set({ doc: touch(next), dirty: true })
      },

      updateMetadata: (recipe) => {
        const cur = get().doc
        if (!cur) return
        const next = structuredClone(cur)
        recipe(next.metadata)
        set({ doc: touch(next), dirty: true })
      },

      updateDoc: (recipe) => {
        const cur = get().doc
        if (!cur) return
        const next = structuredClone(cur)
        recipe(next)
        set({ doc: touch(next), dirty: true })
      },

      setTitle: (title) => {
        const cur = get().doc
        if (!cur) return
        set({ doc: touch({ ...cur, title }), dirty: true })
      },

      setJobDescription: (jd) => {
        const cur = get().doc
        if (!cur) return
        set({ doc: touch({ ...cur, jobDescription: jd }), dirty: true })
      },

      applyTemplate: (defaults) => {
        const cur = get().doc
        if (!cur) return
        const merged = applyTemplateToMetadata(cur.metadata, defaults)
        set({ doc: touch({ ...cur, metadata: merged }), dirty: true })
      },

      replaceDoc: (doc) => set({ doc: touch(doc), dirty: true }),
    }),
    {
      limit: 100,
      // Only track the document for undo/redo (not dirty/lastSavedAt flags).
      partialize: (state) => ({ doc: state.doc }),
      // Leading-edge throttle: a burst of keystrokes records ONE history entry
      // whose baseline is the state before the burst, so a single undo reverts
      // the whole burst (a trailing debounce would record the wrong baseline).
      // Each updater produces a fresh structuredClone'd doc, so reference
      // inequality is sufficient — no custom equality needed.
      handleSet: (handleSet) => throttle((state) => handleSet(state), 400) as typeof handleSet,
    }
  )
)

/** Convenience hook for undo/redo controls. */
export const useTemporalStore = () => useResumeStore.temporal
