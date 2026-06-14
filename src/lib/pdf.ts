import { resumeFileBase } from '@/lib/utils'
import type { ResumeDocument } from '@/types/document'

/**
 * Download the resume as a PDF via the browser's native "Save as PDF" of the
 * chrome-free print page (same DOM as the preview → crisp, vector, selectable/
 * ATS-readable text). Opens in a new tab so the save dialog uses the PRINT
 * page's own title (Name_Resume_<date>) — an iframe would inherit the editor
 * tab's title. The print page auto-prints, then closes itself (afterprint), so
 * there's no stray tab to get stranded on.
 */
export function openPrintWindow(id: string) {
  const w = window.open(`/print/${id}`, '_blank')
  if (!w) window.location.assign(`/print/${id}`)
}

export function pdfBaseName(doc: ResumeDocument): string {
  return resumeFileBase(doc.content.basics.name, doc.title)
}
