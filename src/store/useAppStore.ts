/**
 * App-level store: settings, theme, and the resume library (the dashboard
 * list). Persisted to IndexedDB.
 */
import { create } from 'zustand'
import {
  DEFAULT_SETTINGS,
  loadAllDocs,
  loadSettings,
  saveSettings,
  type AppSettings,
} from '@/lib/storage'
import type { ResumeDocument } from '@/types/document'

type ToastKind = 'info' | 'success' | 'error'
export interface Toast {
  id: string
  kind: ToastKind
  message: string
  /** One button on the message, e.g. Undo after a delete. */
  action?: { label: string; run: () => void }
}

interface AppState {
  settings: AppSettings
  settingsLoaded: boolean
  library: ResumeDocument[]
  libraryLoaded: boolean
  toasts: Toast[]

  init: () => Promise<void>
  refreshLibrary: () => Promise<void>
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>
  applyAppearance: () => void

  toast: (message: string, kind?: ToastKind, action?: Toast['action']) => void
  dismissToast: (id: string) => void
}

let toastSeq = 0

export const useAppStore = create<AppState>((set, get) => ({
  settings: { ...DEFAULT_SETTINGS },
  settingsLoaded: false,
  library: [],
  libraryLoaded: false,
  toasts: [],

  init: async () => {
    // Settings gate the first paint (the theme must be right before anything
    // shows); the LIBRARY does not. Loading every stored resume in full -
    // photos included - used to block the splash on every route, including
    // the landing page (needs zero documents) and the editor (loads its own
    // one by id). It fills in behind the first paint now, and the two
    // consumers (dashboard, landing) key on libraryLoaded.
    const settings = await loadSettings()
    set({ settings, settingsLoaded: true })
    get().applyAppearance()
    void loadAllDocs().then((library) => set({ library, libraryLoaded: true }))
  },

  refreshLibrary: async () => {
    const library = await loadAllDocs()
    set({ library, libraryLoaded: true })
  },

  updateSettings: async (patch) => {
    const next: AppSettings = {
      ...get().settings,
      ...patch,
    }
    set({ settings: next })
    get().applyAppearance()
    await saveSettings(next)
  },

  /** Push the saved appearance onto the document: the dark class, and the
   *  interface's language with the direction that follows from it.
   *
   *  Persian is right-to-left, and `dir` on <html> is the ONLY switch this
   *  needs: every logical utility in the codebase (ms/me, ps/pe, start/end,
   *  text-start) and every flex row follows it. A RESUME's own direction stays
   *  its own property (metadata.layout.rtl → the mirrored canvas), so a Persian
   *  interface can still hold an English resume. */
  applyAppearance: () => {
    if (typeof document === 'undefined') return
    const { theme, locale } = get().settings
    const dark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.classList.toggle('dark', dark)
    const language = locale === 'fa' ? 'fa' : 'en'
    document.documentElement.lang = language
    document.documentElement.dir = language === 'fa' ? 'rtl' : 'ltr'
    // index.css keys the Persian face off this, so it must be set before the
    // first paint of a Persian session (init() runs applyAppearance).
    document.documentElement.dataset.locale = language
  },

  toast: (message, kind = 'info', action) => {
    const id = `t${++toastSeq}`
    set((s) => ({ toasts: [...s.toasts, { id, kind, message, ...(action ? { action } : {}) }] }))
    // A message with a button stays long enough to reach the button.
    setTimeout(() => get().dismissToast(id), action ? 8000 : kind === 'error' ? 6000 : 3500)
  },

  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
