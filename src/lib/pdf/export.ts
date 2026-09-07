/**
 * The single entry point every "Download PDF" affordance (top bar menu,
 * command palette) calls.
 *
 * Every PDF this app hands out comes from the native renderer (render.tsx):
 * vector text, selectable, the same layout the preview shows. There is no
 * other path behind it. A browser-print fallback used to catch renderer
 * failures, and it hid them: the author got a different document, made by
 * a different engine, and nothing said so. A failure is now reported as a
 * failure (`PdfExportError`) and NOTHING is downloaded, so a regression can
 * never hide behind a fallback and a bug report carries the real error.
 */
import { saveDoc } from '@/lib/storage'
import { pdfBaseName } from '@/lib/pdf'
import { downloadBlob } from '@/lib/utils'
import type { ResumeDocument } from '@/types/document'
import { renderResumePdf, lastRenderedPageCount, PdfMultiPageUnsupportedError } from './render'

/** What the export produced, for the user-facing outcome message. */
export interface PdfExportResult {
  fileName: string
  pages: number
  /** size of the file in bytes */
  bytes: number
}

/** The renderer could not produce the document. `message` is written for
 *  the user; the original error is logged for the bug report. */
export class PdfExportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PdfExportError'
  }
}

export async function exportResumePdf(doc: ResumeDocument): Promise<PdfExportResult> {
  // An export is the moment the author most expects their work to be safe,
  // so the document is persisted before anything else happens.
  await saveDoc(doc)

  let bytes: Uint8Array
  try {
    bytes = await renderResumePdf(doc)
  } catch (e) {
    // Logged unconditionally (not just in dev) so a user's bug report
    // carries the signal.
    console.error('Native PDF export failed', e)
    throw new PdfExportError(explain(e))
  }

  const fileName = `${pdfBaseName(doc)}.pdf`
  downloadBlob(new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' }), fileName)
  return { fileName, pages: lastRenderedPageCount(), bytes: bytes.byteLength }
}

/** A sentence the author can act on, never a stack trace. */
function explain(e: unknown): string {
  if (e instanceof PdfMultiPageUnsupportedError) {
    return 'This resume has no place where a page can end. Try shorter entries or a different template.'
  }
  const detail = e instanceof Error && e.message ? ` (${e.message.slice(0, 120)})` : ''
  return `The PDF renderer hit an error${detail}. Try again, or switch templates and try once more.`
}
