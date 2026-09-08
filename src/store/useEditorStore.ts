/** Editor-only UI state (not persisted with the document). */
import { create } from 'zustand'

/** The per-section visual style fields the style painter copies. */
export type CopiedStyle = Record<string, string>

export type LeftTab = 'content' | 'design' | 'templates' | 'ats'

/** Keep a stepped zoom at two decimals — a fitted scale is a long fraction
 *  (0.816429…), and 81.6429% would render as a jittery readout. */
const round2 = (n: number) => Math.round(n * 100) / 100

interface EditorState {
  leftTab: LeftTab
  /** section currently expanded/being edited */
  activeSection: string | null
  /** preview zoom (1 = 100%) */
  zoom: number
  autoFit: boolean
  /** the zoom the canvas is actually PAINTING at — `zoom`, or the fitted scale
   *  while fit-to-width is on. Published by ResumePreview so the zoom controls
   *  step from the size on screen rather than from an untouched `zoom`. */
  canvasZoom: number
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
  setCanvasZoom: (v: number) => void
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
  canvasZoom: 1,
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
  setCanvasZoom: (canvasZoom) => {
    if (get().canvasZoom !== canvasZoom) set({ canvasZoom })
  },
  // Step from what is ON SCREEN, not from `zoom`: fit-to-width leaves `zoom`
  // at its untouched 1 while the canvas paints at (say) 0.82, so stepping
  // from `zoom` made the first "Zoom out" tap grow the sheet — and the first
  // "Zoom in" jump straight to 110%.
  zoomIn: () => set({ zoom: Math.min(2, round2(get().canvasZoom + 0.1)), autoFit: false }),
  zoomOut: () => set({ zoom: Math.max(0.4, round2(get().canvasZoom - 0.1)), autoFit: false }),
  resetZoom: () => set({ zoom: 1, autoFit: false }),
  setAutoFit: (autoFit) => set({ autoFit }),
  toggleLeft: () => set({ leftOpen: !get().leftOpen }),
  setLeftOpen: (leftOpen) => set({ leftOpen }),
  setHighlightKeywords: (highlightKeywords) => set({ highlightKeywords }),
  setFocusItem: (focusItem) => set({ focusItem }),
  // Written after every doc change by the auto-fit effect; when the value
  // has not moved (almost always), writing it anyway told every subscriber
  // something happened. Skip the no-op.
  setOnePageScale: (onePageScale) => {
    if (get().onePageScale !== onePageScale) set({ onePageScale })
  },
  setAtsView: (atsView) => set({ atsView }),
  setPreviewExact: (previewExact) => set({ previewExact }),
  setFocusMode: (focusMode) => set({ focusMode }),
  setCopiedStyle: (copiedStyle) => set({ copiedStyle }),
  setSkimView: (skimView) => set({ skimView }),
  setPdfExporting: (pdfExporting) => set({ pdfExporting }),
}))
