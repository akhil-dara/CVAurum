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
  applyTheme: () => void

  toast: (message: string, kind?: ToastKind) => void
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
    const [settings, library] = await Promise.all([loadSettings(), loadAllDocs()])
    set({ settings, settingsLoaded: true, library, libraryLoaded: true })
    get().applyTheme()
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
    get().applyTheme()
    await saveSettings(next)
  },

  applyTheme: () => {
    if (typeof document === 'undefined') return
    const { theme } = get().settings
    const dark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.classList.toggle('dark', dark)
  },

  toast: (message, kind = 'info') => {
    const id = `t${++toastSeq}`
    set((s) => ({ toasts: [...s.toasts, { id, kind, message }] }))
    setTimeout(() => get().dismissToast(id), kind === 'error' ? 6000 : 3500)
  },

  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
