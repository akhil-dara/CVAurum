/**
 * The one flow behind every "Download PDF" control: the in-flight flag that
 * keeps a second click from starting a second render, the visible
 * "generating" state (PdfExportStatus reads the same flag), and an outcome
 * the author can see either way - what was downloaded, or why nothing was.
 *
 * Every sentence the author reads here comes from the interface dictionary:
 * this is the moment they finally hold the file, and a Persian reader was
 * being told about it in English.
 *
 * The heavy modules (pdf-lib, the renderer) are imported here on demand so
 * the editor's first paint never carries them.
 */
import { useEditorStore } from '@/store/useEditorStore'
import { useAppStore } from '@/store/useAppStore'
import type { ResumeDocument } from '@/types/document'
import { translate, type MsgKey } from '@/i18n/core'

export async function runPdfExport(doc: ResumeDocument): Promise<void> {
  if (useEditorStore.getState().pdfExporting) return
  useEditorStore.getState().setPdfExporting(true)
  const toast = useAppStore.getState().toast
  const locale = useAppStore.getState().settings.locale
  const t = (key: MsgKey, vars?: Record<string, string | number>) => translate(locale, key, vars)
  try {
    const { exportResumePdf } = await import('./export')
    const result = await exportResumePdf(doc, locale)
    // A character no embedded font can draw is DROPPED, not shown as a box,
    // so an export can succeed while losing whole sentences - a name written
    // in Telugu simply is not in the file. Say so rather than hand over a
    // resume with the author's own name missing.
    const { lastUnsupportedCharacters } = await import('./metrics')
    const missing = lastUnsupportedCharacters()
    if (missing.length) {
      toast(
        t(missing.length > 1 ? 'export.missingMany' : 'export.missingOne', {
          file: result.fileName,
          n: missing.length,
          chars: `${missing.slice(0, 8).join(' ')}${missing.length > 8 ? '...' : ''}`,
        }),
        'error'
      )
    } else {
      const done = t(result.pages === 1 ? 'export.doneOne' : 'export.doneMany', {
        file: result.fileName,
        n: result.pages,
        size: formatSize(result.bytes),
      })
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
        toast(t('export.backupOffer', { done }), 'success', {
          label: t('save.backUp'),
          run: async () => {
            const { exportFullBackup } = await import('@/lib/backup')
            const n = await exportFullBackup()
            toast(t(n === 1 ? 'save.backupDone' : 'save.backupDonePlural', { n }), 'success')
          },
        })
      } else {
        toast(done, 'success')
      }
    }
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e)
    toast(t('export.failed', { reason }), 'error')
  } finally {
    useEditorStore.getState().setPdfExporting(false)
  }
}

export function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}
