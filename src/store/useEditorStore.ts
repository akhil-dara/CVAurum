/** Editor-only UI state (not persisted with the document). */
import { create } from 'zustand'

/** The per-section visual style fields the style painter copies. */
export type CopiedStyle = Record<string, string>

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
  /** the live auto-fit-to-one-page scale the preview/PDF settled on (1 = none).
   *  Mirrored here so silent exports (Word) can shrink to the same page count. */
  onePageScale: number
  /** show the resume as the plain text an ATS parser reads (instead of the canvas) */
  atsView: boolean
  /** render the canvas exactly as the exported PDF (no edit chrome/placeholders) */
  previewExact: boolean
  /** dim everything except the section under the cursor (zen editing) */
  focusMode: boolean
  /** style painter clipboard — a section's visual style, ready to paint */
  copiedStyle: CopiedStyle | null
  /** recruiter skim heatmap overlay on the canvas */
  skimView: boolean
  /** true while a "Download PDF" export is in flight (top bar menu or the
   *  command palette both go through this) — guards against a second click
   *  firing a duplicate exportResumePdf/download while the first is still
   *  running. */
  pdfExporting: boolean

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
  setOnePageScale: (v: number) => void
  setAtsView: (v: boolean) => void
  setPreviewExact: (v: boolean) => void
  setFocusMode: (v: boolean) => void
  setCopiedStyle: (v: CopiedStyle | null) => void
  setSkimView: (v: boolean) => void
  setPdfExporting: (v: boolean) => void
}

export const useEditorStore = create<EditorState>((set, get) => ({
  leftTab: 'content',
  activeSection: 'basics',
  zoom: 1,
  autoFit: true,
  leftOpen: true,
  highlightKeywords: false,
  focusItem: null,
  onePageScale: 1,
  atsView: false,
  copiedStyle: null,
  skimView: false,
  previewExact: false,
  focusMode: false,
  pdfExporting: false,

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
  setOnePageScale: (onePageScale) => set({ onePageScale }),
  setAtsView: (atsView) => set({ atsView }),
  setPreviewExact: (previewExact) => set({ previewExact }),
  setFocusMode: (focusMode) => set({ focusMode }),
  setCopiedStyle: (copiedStyle) => set({ copiedStyle }),
  setSkimView: (skimView) => set({ skimView }),
  setPdfExporting: (pdfExporting) => set({ pdfExporting }),
}))
