/**
 * The one flow behind every "Download PDF" control: the in-flight flag that
 * keeps a second click from starting a second render, the visible
 * "generating" state (PdfExportStatus reads the same flag), and an outcome
 * the author can see either way - what was downloaded, or why nothing was.
 *
 * The heavy modules (pdf-lib, the renderer) are imported here on demand so
 * the editor's first paint never carries them.
 */
import { useEditorStore } from '@/store/useEditorStore'
import { useAppStore } from '@/store/useAppStore'
import type { ResumeDocument } from '@/types/document'

export async function runPdfExport(doc: ResumeDocument): Promise<void> {
  if (useEditorStore.getState().pdfExporting) return
  useEditorStore.getState().setPdfExporting(true)
  const toast = useAppStore.getState().toast
  try {
    const { exportResumePdf } = await import('./export')
    const result = await exportResumePdf(doc)
    // A character no embedded font can draw is DROPPED, not shown as a box,
    // so an export can succeed while losing whole sentences - a name written
    // in Telugu simply is not in the file. Say so rather than hand over a
    // resume with the author's own name missing.
    const { lastUnsupportedCharacters } = await import('./metrics')
    const missing = lastUnsupportedCharacters()
    if (missing.length) {
      toast(
        `Downloaded ${result.fileName}, but ${missing.length} character${missing.length > 1 ? 's' : ''} could not be drawn and were left out: ${missing.slice(0, 8).join(' ')}${missing.length > 8 ? '...' : ''}. No bundled font has these characters yet.`,
        'error'
      )
    } else {
      const done = `Downloaded ${result.fileName} · ${result.pages} page${result.pages === 1 ? '' : 's'} · ${formatSize(result.bytes)}`
      // The first finished export is when someone first cares about their
      // work, and it lives only in this browser: offer, once, to keep a copy.
      const { offerBackupAfterExport, readLastBackup } = await import('@/lib/saveSafety')
      let offered = false
      try {
        offered = localStorage.getItem('cvaurum:backup-offered') === '1'
        if (!offered) localStorage.setItem('cvaurum:backup-offered', '1')
      } catch {
        offered = true // no storage to remember the offer in: do not nag
      }
      if (offerBackupAfterExport({ lastBackup: readLastBackup(), offered })) {
        toast(`${done}. Your résumés live only in this browser - keep a backup too.`, 'success', {
          label: 'Back up',
          run: async () => {
            const { exportFullBackup } = await import('@/lib/backup')
            const n = await exportFullBackup()
            toast(`Backed up ${n} resume${n === 1 ? '' : 's'}`, 'success')
          },
        })
      } else {
        toast(done, 'success')
      }
    }
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e)
    toast(`Couldn't generate the PDF, so nothing was downloaded. ${reason}`, 'error')
  } finally {
    useEditorStore.getState().setPdfExporting(false)
  }
}

export function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}
