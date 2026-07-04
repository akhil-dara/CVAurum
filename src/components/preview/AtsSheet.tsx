/**
 * "What ATS sees" — replaces the designed canvas with the plain linear text an
 * ATS parser extracts from the exported PDF. Fully client-side (no rendering,
 * no network): the same content model the templates draw, flattened in the
 * document's true reading order. Lets users verify nothing important is lost
 * or out of order before they apply.
 */
import { useMemo, useState } from 'react'
import { ScanText, Copy, Check } from 'lucide-react'
import type { ResumeDocument } from '@/types/document'
import { resumeToAtsText } from '@/lib/atsText'

export function AtsSheet({ doc }: { doc: ResumeDocument }) {
  const text = useMemo(() => resumeToAtsText(doc), [doc])
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }
  return (
    <div className="canvas-bg h-full w-full overflow-auto">
      <div className="mx-auto flex min-h-full max-w-3xl flex-col px-4 py-8 sm:px-6">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ScanText className="h-4 w-4 text-primary" /> What an ATS sees
            </div>
            <p className="mt-1 max-w-lg text-xs leading-relaxed text-muted-foreground">
              The raw text a parser reads from your PDF, in its true reading order. If something's missing or scrambled
              here, an ATS will miss it too — everything below comes straight from your resume's text layer.
            </p>
          </div>
          <button className="btn-ghost btn-sm shrink-0" onClick={copy}>
            {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy text'}
          </button>
        </div>
        <pre className="flex-1 whitespace-pre-wrap rounded-xl border border-border bg-white p-6 font-mono text-[12px] leading-relaxed text-slate-800 shadow-page dark:bg-slate-950 dark:text-slate-200">
          {text}
        </pre>
      </div>
    </div>
  )
}
