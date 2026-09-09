import type { ResumeDocument } from '@/types/document'
import { useEditorStore } from '@/store/useEditorStore'
import { formatFitReadout } from '@/lib/fitReadout'

/** One sentence under the Magic fit switch: what the fit did to the sizes
 *  and how the pages came out, from the preview's own measurement. */
export function FitReadout({ doc }: { doc: ResumeDocument }) {
  const result = useEditorStore((s) => s.fitResult)
  return (
    <p className="-mt-1 text-[11px] leading-snug text-muted-foreground" data-testid="fit-readout" aria-live="polite">
      {formatFitReadout(doc.metadata, result)}
    </p>
  )
}
