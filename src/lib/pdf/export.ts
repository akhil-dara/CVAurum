/**
 * The single entry point every "Download PDF" affordance (top bar menu,
 * command palette) should call. Native, in-app rendering (render.tsx) is the
 * default engine now that both verification gates are green across all
 * templates x personas — the browser's print dialog is kept as the automatic
 * fallback for the one case native can't yet handle (multi-page resumes) and
 * as a support/debug escape hatch.
 */
import { saveDoc } from '@/lib/storage'
import { openPrintWindow, pdfBaseName } from '@/lib/pdf'
import { downloadBlob } from '@/lib/utils'
import type { ResumeDocument } from '@/types/document'
import { renderResumePdf, PdfMultiPageUnsupportedError } from './render'

export type PdfExportOutcome = 'native' | 'print-fallback'

/** Support/debug lever only — flip via devtools console. With the native
 *  engine now the default, this flag's ONLY job is to force the old print
 *  path (e.g. to rule out a native-renderer bug while triaging a report). */
const FORCE_PRINT_KEY = 'cvaurum:pdf-engine'

export async function exportResumePdf(doc: ResumeDocument): Promise<PdfExportOutcome> {
  // The print route loads the doc from storage by id, so keep it saved
  // before export exactly as the pre-native flow did — harmless for the
  // native path too.
  await saveDoc(doc)

  if (localStorage.getItem(FORCE_PRINT_KEY) === 'print') {
    openPrintWindow(doc.id)
    return 'print-fallback'
  }

  try {
    const bytes = await renderResumePdf(doc)
    downloadBlob(new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' }), `${pdfBaseName(doc)}.pdf`)
    return 'native'
  } catch (e) {
    // A multi-page overflow is an EXPECTED outcome (pagination is a separate,
    // not-yet-shipped feature) — not a bug, so stay quiet. Anything else is a
    // real renderer failure and must be logged unconditionally (not just in
    // dev) so a user's bug report carries the signal.
    if (!(e instanceof PdfMultiPageUnsupportedError)) {
      console.error('Native PDF export failed, falling back to print', e)
    }
    openPrintWindow(doc.id)
    return 'print-fallback'
  }
}
