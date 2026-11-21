/**
 * The single entry point every "Download PDF" affordance (top bar menu,
 * command palette) calls.
 *
 * A PDF of a Latin-script resume comes from the native renderer (render.tsx):
 * vector text, selectable, the same layout the preview shows. There is no
 * fallback behind it. A browser-print fallback used to catch renderer
 * failures, and it hid them: the author got a different document, made by
 * a different engine, and nothing said so. A failure is reported as a
 * failure (`PdfExportError`) and NOTHING is downloaded.
 *
 * Arabic script is the one document the native renderer cannot draw: the
 * letters have to be joined (GSUB) and ordered (bidi) by a shaper, and pdf-lib
 * paints runs as they come. That document is printed by the browser instead —
 * deliberately, once, and the export says so — rather than being handed over
 * with its letters apart.
 */
import { saveDoc } from '@/lib/storage'
import { usesArabicScript } from '@/data/fonts'
import { pdfBaseName } from '@/lib/pdf'
import { downloadBlob } from '@/lib/utils'
import type { ResumeDocument } from '@/types/document'
import { renderResumePdf, lastRenderedPageCount, PdfMultiPageUnsupportedError } from './render'

/** What the export produced, for the user-facing outcome message. */
export type PdfExportResult =
  | { kind: 'file'; fileName: string; pages: number; bytes: number }
  | { kind: 'print'; fileName: string }

/** The renderer could not produce the document. `message` is written for
 *  the user; the original error is logged for the bug report. */
export class PdfExportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PdfExportError'
  }
}

/**
 * Does this document need the browser's print engine rather than the native
 * painter?
 *
 * Two things say yes, and the second is the one that matters: the document can
 * ask for a mirrored page (`layout.rtl`), but Arabic script can also arrive in
 * a document that never asked — a Persian name, a Persian job title, an Arabic
 * summary in an otherwise English resume. The same rule the font chain follows
 * applies here: a face is chosen by the characters it has to draw, not by the
 * interface or the layout switch (src/data/fonts.ts). So the content decides.
 */
export function needsBrowserPrint(doc: ResumeDocument): boolean {
  if (doc.metadata?.layout?.rtl) return true
  return usesArabicScript(JSON.stringify(doc.content ?? {}))
}

export async function exportResumePdf(doc: ResumeDocument): Promise<PdfExportResult> {
  // The tab is opened BEFORE the first await so the browser counts it as part
  // of the click (otherwise the popup is blocked), then pointed at the resume
  // once it is saved - the print route loads the document from storage by id.
  if (needsBrowserPrint(doc)) {
    const tab = typeof window !== 'undefined' ? window.open('about:blank', '_blank') : null
    try {
      await saveDoc(doc)
    } catch (e) {
      // A failed save used to leave the about:blank tab standing over the app.
      tab?.close()
      throw e
    }
    const url = `/print/${doc.id}`
    if (tab) tab.location.href = url
    else if (typeof window !== 'undefined') window.location.assign(url)
    return { kind: 'print', fileName: `${pdfBaseName(doc)}.pdf` }
  }

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
  return { kind: 'file', fileName, pages: lastRenderedPageCount(), bytes: bytes.byteLength }
}

/** A sentence the author can act on, never a stack trace. */
function explain(e: unknown): string {
  if (e instanceof PdfMultiPageUnsupportedError) {
    return 'This resume has no place where a page can end. Try shorter entries or a different template.'
  }
  const msg = e instanceof Error && e.message ? e.message : ''
  // Offline, the export fails inside fetch() when a font it needs was never
  // saved on this device, and "Failed to fetch" names neither the cause nor
  // anything the author can do. Both pieces of the old advice - try again,
  // switch templates - are useless with no connection, and switching is worse
  // than useless: another template needs fonts that are not there either.
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false
  if (offline || (e instanceof TypeError && /fetch|network|load failed/i.test(msg))) {
    return 'This export needs a font that is not saved on this device yet, and there is no connection to fetch it. Connect once and export again — after that this resume exports with no connection.'
  }
  const detail = msg ? ` (${msg.slice(0, 120)})` : ''
  return `The PDF renderer hit an error${detail}. Try again, or switch templates and try once more.`
}
