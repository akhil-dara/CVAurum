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
import { buildLayoutGraph, type BuildOptions } from './layoutGraph'
import { parseLayout, type ImportResult } from './parse'

export type { ImportResult } from './parse'

export interface ImportOptions {
  /** Disable the OCR fallback for no-text/scanned pages (default: enabled). */
  ocr?: boolean
  /** Progress for the (slow) OCR phase — e.g. to drive a toast. */
  onOcrProgress?: BuildOptions['onOcrProgress']
  /** Filename hint (auto-read from a File) used to recover a missing name. */
  fileName?: string
}

// Tokens that mean a filename token isn't part of a person's name.
const FILE_NONAME =
  /^(resume|cv|curriculum|vitae|final|draft|updated?|latest|copy|new|old|data|analyst|engineer|developer|manager|consultant|software|senior|junior|lead|intern|specialist|architect|designer|scientist|administrator|security|cyber|professional|profile|portfolio)$/i

/**
 * Derive a name from a filename like "Dadi_Saikumar_Resume.pdf" → "Dadi Saikumar"
 * (résumés are usually named after the person). Returns '' unless it cleanly
 * yields 2–4 alphabetic, non-role tokens — so role/number-named files are ignored.
 */
function nameFromFilename(fn: string): string {
  const base = fn
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[_\-.]+/g, ' ')
    .replace(/\b(?:19|20)\d{2}\b/g, ' ')
    .replace(/\bv?\d+\b/gi, ' ')
  const tokens = base.split(/\s+/).filter(Boolean).filter((t) => !FILE_NONAME.test(t))
  if (tokens.length < 2 || tokens.length > 4) return ''
  if (!tokens.every((t) => /^[A-Za-z][A-Za-z'’.-]*$/.test(t) && t.length >= 2)) return ''
  return tokens.map((t) => t[0].toUpperCase() + t.slice(1).toLowerCase()).join(' ')
}

export async function importResumeFromPdf(file: File | ArrayBuffer, opts: ImportOptions = {}): Promise<ImportResult> {
  const graph = await buildLayoutGraph(file, { ocr: opts.ocr, onOcrProgress: opts.onOcrProgress })
  const result = parseLayout(graph)
  // Last-resort name recovery from the filename (e.g. PDFs whose name lives only
  // in a running page-header). Never overrides a name found in the content.
  if (!result.content.basics.name) {
    const fname = opts.fileName ?? (file instanceof File ? file.name : '')
    const n = fname && nameFromFilename(fname)
    if (n) result.content.basics.name = n
  }
  return result
}

/** Convenience: returns just the content (for the create flow). */
export async function pdfToResumeContent(file: File): Promise<ResumeContent> {
  return (await importResumeFromPdf(file)).content
}
