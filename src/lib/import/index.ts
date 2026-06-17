/**
 * Local PDF resume import — public API. 100% in-browser: the file is read with
 * FileReader/ArrayBuffer and parsed with pdf.js; nothing is uploaded. This whole
 * module (and pdf.js) is lazy-loaded, so it only downloads when a user actually
 * imports a résumé.
 *
 * Roadmap: v1 (here) = layout-graph geometry + deterministic extraction for
 * single/standard-column PDFs. v2 = font-normalization + tesseract.js OCR
 * fallback (routed by `meta.lowText`) + masked XY-cut multi-column ordering.
 * v3 = round-trip geometric self-verification + confidence-weighted correction.
 */
import type { ResumeContent } from '@/types/document'
import { buildLayoutGraph } from './layoutGraph'
import { parseLayout, type ImportResult } from './parse'

export type { ImportResult } from './parse'

export async function importResumeFromPdf(file: File | ArrayBuffer): Promise<ImportResult> {
  const graph = await buildLayoutGraph(file)
  return parseLayout(graph)
}

/** Convenience: returns just the content (for the create flow). */
export async function pdfToResumeContent(file: File): Promise<ResumeContent> {
  return (await importResumeFromPdf(file)).content
}
