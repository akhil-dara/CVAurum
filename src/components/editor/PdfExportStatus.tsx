/**
 * Visible proof that a PDF is being generated. The export menu's own
 * "Generating…" label lives inside a dropdown that closes, and on a phone
 * the menu is the whole screen - so the state is shown here, in one place,
 * whatever started the export (menu, command palette, keyboard). It reads
 * the same flag the flow sets, so it can never disagree with the export.
 */
import { useEffect, useState } from 'react'
import { useEditorStore } from '@/store/useEditorStore'

export function PdfExportStatus() {
  const exporting = useEditorStore((s) => s.pdfExporting)
  return exporting ? <Pill /> : null
}

function Pill() {
  // Elapsed seconds, shown after a moment: a render that takes a while on a
  // slow phone still visibly moves, instead of looking stuck.
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const started = Date.now()
    const t = window.setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000)
    return () => window.clearInterval(t)
  }, [])
  return (
    <div
      role="status"
      aria-live="assertive"
      data-testid="pdf-export-status"
      // Above the phone's bottom bar, clear of the toast stack's corner.
      className="pointer-events-none fixed inset-x-0 bottom-6 z-[90] flex justify-center px-4 phone:bottom-20"
    >
      <div className="card flex items-center gap-3 rounded-full py-2.5 pl-4 pr-5 shadow-float">
        <span aria-hidden className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-muted border-t-primary" />
        <span className="text-sm font-medium">Generating your PDF…</span>
        <span className="text-xs text-muted-foreground">
          <span className="hidden sm:inline">vector text, every page</span>
          {seconds >= 2 && <span className="tabular-nums sm:ml-2">{seconds}s</span>}
        </span>
      </div>
    </div>
  )
}
