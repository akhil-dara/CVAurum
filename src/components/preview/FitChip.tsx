import { Wand2 } from 'lucide-react'
import type { ResumeDocument } from '@/types/document'
import { useEditorStore } from '@/store/useEditorStore'
import { fitSizesPt } from '@/lib/fitReadout'

/** Opens the Design panel at the Magic fit card, from anywhere. */
export function openMagicFit() {
  const ed = useEditorStore.getState()
  ed.setLeftTab('design')
  ed.setLeftOpen(true)
  setTimeout(() => window.dispatchEvent(new Event('cvaurum:open-magic-fit')), 80)
}

/** A pill over the page that says what Magic fit did in five words ("2
 *  pages · body 8.3pt"), counts the moves it can offer, and opens the card
 *  on a tap: the author no longer has to know the card exists to find out
 *  why the page looks the way it does. */
export function FitChip({ doc }: { doc: ResumeDocument }) {
  const result = useEditorStore((s) => s.fitResult)
  const offers = useEditorStore((s) => s.fitOffers)
  const on = doc.metadata.page.autoFit
  const pt = (x: number) => `${Math.round(x * 10) / 10}pt`
  let text = on ? 'Magic fit' : 'Magic fit off'
  if (result) {
    const pages = `${result.pages} page${result.pages === 1 ? '' : 's'}`
    const body = on ? ` · body ${pt(fitSizesPt(doc.metadata, result.fit).body)}` : ''
    text = `${on ? 'Magic fit' : 'Fit off'} · ${pages}${body}`
  }
  const short = result && result.pages > doc.metadata.page.fit.target && on
  return (
    // In the page's own flow, a row above the sheet: it scrolls away with the
    // page instead of riding over it (sticky, it covered the name on a phone
    // and sat on whatever scrolled under it; reported 2026-09-12).
    <div className="flex justify-end px-3 pb-2 pt-3">
      <button
        type="button"
        data-testid="fit-chip"
        onClick={openMagicFit}
        title="Open Magic fit"
        className="flex items-center gap-1.5 rounded-full border border-border bg-surface/95 py-1 pl-2 pr-2.5 text-[11px] font-medium text-foreground shadow-float backdrop-blur transition hover:border-primary/50 coarse:min-h-9"
      >
        <Wand2 className="h-3.5 w-3.5 text-primary" aria-hidden />
        <span className="whitespace-nowrap">{text}</span>
        {short && (
          <span className="rounded-full bg-amber-500/15 px-1.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300" title="The page target is out of reach within your rules">
            over
          </span>
        )}
        {offers.length > 0 && (
          <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
            {offers.length} {offers.length === 1 ? 'move' : 'moves'}
          </span>
        )}
      </button>
    </div>
  )
}
