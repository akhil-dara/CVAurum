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

/** A pause this long ends one undo step; typing faster than this is one step. */
const UNDO_PAUSE_MS = 700
let burstBroken = false
/** The next change starts a new undo step, however soon it follows the last:
 *  a delete must never merge into the typing before it, or its Undo would
 *  take the typing back too. */
export function breakUndoBurst() {
  burstBroken = true
}

function touch(doc: ResumeDocument): ResumeDocument {
  return { ...doc, updatedAt: Date.now() }
}

/** Did an update change anything but the clock? One that did not is not an
 *  undo step and does not make the document dirty. */
function changed(a: ResumeDocument, b: ResumeDocument): boolean {
  return JSON.stringify({ ...a, updatedAt: 0 }) !== JSON.stringify({ ...b, updatedAt: 0 })
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
        if (!changed(cur, next)) return
        set({ doc: touch(next), dirty: true })
      },

      updateMetadata: (recipe) => {
        const cur = get().doc
        if (!cur) return
        const next = structuredClone(cur)
        recipe(next.metadata)
        if (!changed(cur, next)) return
        set({ doc: touch(next), dirty: true })
      },

      updateDoc: (recipe) => {
        const cur = get().doc
        if (!cur) return
        const next = structuredClone(cur)
        recipe(next)
        if (!changed(cur, next)) return
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
      // A step is a change of DOCUMENT. `partialize` builds `{ doc }` anew on
      // every update, so without this, saving - which touches only `dirty`
      // and `lastSavedAt` - recorded a step whose document was the same one,
      // and the first Undo after an edit reversed nothing visible
      // (usability test, 2026-09-26).
      equality: (a, b) => a.doc === b.doc,
      // A burst of edits is one step: the state before its first change is
      // recorded, and nothing more until the author pauses. The fixed 400ms
      // slices this replaces cut one sentence of typing into several steps
      // (six edits took ten presses to undo), and their clock also ran on
      // saves, so an edit landing just after one was never recorded at all.
      handleSet: (handleSet) => {
        let lastChange = -Infinity
        return ((...args: Parameters<typeof handleSet>) => {
          const now = Date.now()
          const startsBurst = burstBroken || now - lastChange >= UNDO_PAUSE_MS
          burstBroken = false
          lastChange = now
          if (startsBurst) handleSet(...args)
        }) as typeof handleSet
      },
    }
  )
)

/** Convenience hook for undo/redo controls. */
export const useTemporalStore = () => useResumeStore.temporal
