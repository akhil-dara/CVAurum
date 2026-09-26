import { Wand2 } from 'lucide-react'
import type { ResumeDocument } from '@/types/document'
import { useEditorStore } from '@/store/useEditorStore'
import { useResumeStore } from '@/store/useResumeStore'
import { fitSizesPt } from '@/lib/fitReadout'

/** Opens the Design panel at the Magic fit card, from anywhere. */
export function openMagicFit() {
  const ed = useEditorStore.getState()
  ed.setLeftTab('design')
  ed.setLeftOpen(true)
  setTimeout(() => window.dispatchEvent(new Event('cvaurum:open-magic-fit')), 80)
}

const pt = (x: number) => `${Math.round(x * 10) / 10}pt`
const CHIP =
  'flex items-center gap-1.5 rounded-full border border-border bg-surface/95 py-1 pl-2 pr-2.5 text-[11px] font-medium text-foreground shadow-float backdrop-blur transition hover:border-primary/50 coarse:min-h-9'

/**
 * What the page is doing with the text size, in words, over the page.
 *
 * The slider says the size the author set; the page prints what the fit
 * chose, and when the two differed only the card knew ("I set 10pt and it
 * prints 8.6?", reported 2026-09-26). So the chip says it: "Printed at 8.6pt
 * · you set 10pt", with the one move that undoes it beside it. With the fit
 * off it says the pages and the size, and when a few lines have spilled onto
 * a last page it offers to fit them back - only at 9pt or more
 * (fitSuggest.ts suggestFitOn).
 */
export function FitChip({ doc }: { doc: ResumeDocument }) {
  const result = useEditorStore((s) => s.fitResult)
  const offers = useEditorStore((s) => s.fitOffers)
  const updateDoc = useResumeStore((s) => s.updateDoc)
  const on = doc.metadata.page.autoFit
  const setPt = doc.metadata.typography.fontSize
  const pages = result ? `${result.pages} page${result.pages === 1 ? '' : 's'}` : ''

  if (!on) {
    const fitOn = offers.find((o) => o.id.startsWith('fit-on-'))
    return (
      <>
        <button type="button" data-testid="fit-chip" onClick={openMagicFit} title="Open Magic fit" className={CHIP}>
          <Wand2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          <span className="whitespace-nowrap">{result ? `${pages} · text ${pt(setPt)}` : `Text ${pt(setPt)}`}</span>
        </button>
        {fitOn && (
          <button
            type="button"
            data-testid="fit-on-offer"
            className="flex items-center gap-1.5 rounded-full bg-primary py-1 pl-2 pr-2.5 text-[11px] font-semibold text-primary-foreground shadow-float transition hover:bg-primary/90 coarse:min-h-9"
            onClick={() => updateDoc((d) => fitOn.mutate(d))}
          >
            <Wand2 className="h-3.5 w-3.5" aria-hidden />
            <span className="whitespace-nowrap">{fitOn.label}</span>
          </button>
        )}
      </>
    )
  }

  const body = result ? fitSizesPt(doc.metadata, result.fit).body : setPt
  const shrunk = !!result && body < setPt - 0.05
  const short = result && result.pages > doc.metadata.page.fit.target
  return (
    <>
      <button type="button" data-testid="fit-chip" onClick={openMagicFit} title="Open Magic fit" className={CHIP}>
        <Wand2 className="h-3.5 w-3.5 text-primary" aria-hidden />
        <span className="whitespace-nowrap">
          {!result ? 'Magic fit' : shrunk ? `${pages} · printed at ${pt(body)}, you set ${pt(setPt)}` : `Magic fit · ${pages} · text ${pt(body)}`}
        </span>
        {short && (
          <span
            className="rounded-full bg-amber-500/15 px-1.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300"
            title="The page target is out of reach within your rules"
          >
            over
          </span>
        )}
        {offers.length > 0 && (
          <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
            {offers.length} {offers.length === 1 ? 'move' : 'moves'}
          </span>
        )}
      </button>
      {shrunk && (
        <button
          type="button"
          data-testid="fit-use-set"
          className="flex items-center rounded-full border border-primary/50 bg-surface/95 px-2.5 py-1 text-[11px] font-semibold text-primary shadow-float transition hover:bg-primary/10 coarse:min-h-9"
          title="Turn Magic fit off: the text prints at the size you set and flows onto more pages"
          onClick={() =>
            updateDoc((d) => {
              d.metadata.page.autoFit = false
            })
          }
        >
          Use {pt(setPt)}
        </button>
      )}
    </>
  )
}
