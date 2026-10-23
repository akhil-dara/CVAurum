import { useState } from 'react'
import type { ResumeDocument } from '@/types/document'
import { useEditorStore } from '@/store/useEditorStore'
import { formatFitReadout, formatFitSummary } from '@/lib/fitReadout'

/** Under the Magic fit switch: one plain line - does it fit, and was the text
 *  made smaller - from the preview's own measurement, with the exact sizes
 *  (body, leading, headings, name, gaps, how full the page is) one tap away.
 *  The exact sentence was the only readout, and read as the engineer's. */
export function FitReadout({ doc }: { doc: ResumeDocument }) {
  const result = useEditorStore((s) => s.fitResult)
  const [details, setDetails] = useState(false)
  return (
    <div className="-mt-1 text-[11px] leading-snug" data-testid="fit-readout" aria-live="polite">
      <p className="text-foreground">
        {formatFitSummary(doc.metadata, result)}
        {result ? (
          <button
            type="button"
            className="ml-1.5 font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
            aria-expanded={details}
            onClick={() => setDetails((d) => !d)}
          >
            {details ? 'Hide details' : 'Details'}
          </button>
        ) : null}
      </p>
      {details ? <p className="mt-1 text-muted-foreground">{formatFitReadout(doc.metadata, result)}</p> : null}
    </div>
  )
}
