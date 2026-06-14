/** Editor-only UI state (not persisted with the document). */
import { create } from 'zustand'

export type LeftTab = 'content' | 'design' | 'templates' | 'ats'

interface EditorState {
  leftTab: LeftTab
  /** section currently expanded/being edited */
  activeSection: string | null
  /** preview zoom (1 = 100%) */
  zoom: number
  autoFit: boolean
  /** show the left panel (collapsible) */
  leftOpen: boolean
  /** highlight ATS missing keywords in the preview */
  highlightKeywords: boolean
  /** currently focused item id (for scroll-to in preview) */
  focusItem: string | null

  setLeftTab: (t: LeftTab) => void
  setActiveSection: (s: string | null) => void
  setZoom: (z: number) => void
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
  setAutoFit: (v: boolean) => void
  toggleLeft: () => void
  setLeftOpen: (v: boolean) => void
  setHighlightKeywords: (v: boolean) => void
  setFocusItem: (id: string | null) => void
}

export const useEditorStore = create<EditorState>((set, get) => ({
  leftTab: 'content',
  activeSection: 'basics',
  zoom: 1,
  autoFit: true,
  leftOpen: true,
  highlightKeywords: false,
  focusItem: null,

  setLeftTab: (leftTab) => set({ leftTab }),
  setActiveSection: (activeSection) => set({ activeSection }),
  setZoom: (zoom) => set({ zoom: Math.min(2, Math.max(0.4, zoom)), autoFit: false }),
  zoomIn: () => set({ zoom: Math.min(2, get().zoom + 0.1), autoFit: false }),
  zoomOut: () => set({ zoom: Math.max(0.4, get().zoom - 0.1), autoFit: false }),
  resetZoom: () => set({ zoom: 1, autoFit: false }),
  setAutoFit: (autoFit) => set({ autoFit }),
  toggleLeft: () => set({ leftOpen: !get().leftOpen }),
  setLeftOpen: (leftOpen) => set({ leftOpen }),
  setHighlightKeywords: (highlightKeywords) => set({ highlightKeywords }),
  setFocusItem: (focusItem) => set({ focusItem }),
}))
