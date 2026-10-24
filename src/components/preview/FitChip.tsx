import { Wand2 } from 'lucide-react'
import type { ResumeDocument } from '@/types/document'
import { useEditorStore } from '@/store/useEditorStore'
import { useResumeStore } from '@/store/useResumeStore'
import { useAppStore } from '@/store/useAppStore'
import { fitSizesPt, shrinkWords } from '@/lib/fitReadout'

/** Opens the Design panel at the Magic fit card, from anywhere. */
export function openMagicFit() {
  const ed = useEditorStore.getState()
  ed.setLeftTab('design')
  ed.setLeftOpen(true)
  setTimeout(() => window.dispatchEvent(new Event('cvaurum:open-magic-fit')), 80)
}

const pt = (x: number) => `${Math.round(x * 10) / 10}pt`
/** A segment of the page-checks strip (PageChecks in ResumePreview). */
export const CHIP =
  'flex items-center gap-1.5 py-1 pl-2 pr-2.5 text-[11px] font-medium text-foreground transition hover:bg-muted/70 focus-visible:relative focus-visible:z-10 coarse:min-h-9'

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
  const toast = useAppStore((s) => s.toast)
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
            className="flex items-center gap-1.5 bg-primary py-1 pl-2 pr-2.5 text-[11px] font-semibold text-primary-foreground transition hover:bg-primary/90 coarse:min-h-9"
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
  const said = shrinkWords(body, setPt)
  return (
    <>
      {/* Said the way a job seeker thinks about it - does it fit, and was
          the text made smaller - with the exact sizes in the tooltip. "1 page
          · printed at 8.8pt, you set 9.6pt" was the engineer's sentence. */}
      <button
        type="button"
        data-testid="fit-chip"
        onClick={openMagicFit}
        title={
          shrunk
            ? `Magic fit made the text smaller to fit: it prints at ${pt(body)}; you set ${pt(setPt)}. Open Magic fit.`
            : 'Open Magic fit'
        }
        className={CHIP}
      >
        <Wand2 className="h-3.5 w-3.5 text-primary" aria-hidden />
        <span className="whitespace-nowrap">
          {!result
            ? 'Magic fit'
            : shrunk
              ? <>Fits {pages} · <span className={`phone:hidden${said.warn ? ' font-semibold text-amber-800 dark:text-amber-300' : ''}`}>{said.words} ({pt(body)})</span><span className={`desk:hidden${said.warn ? ' font-semibold text-amber-800 dark:text-amber-300' : ''}`}>{pt(body)}</span></>
              : `Fits ${pages} · text ${pt(body)}`}
        </span>
        {short && (
          <span
            className="rounded-full bg-amber-500/15 px-1.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300"
            title="Your page target can't be reached within your rules"
          >
            won't fit
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
          className="flex items-center px-2.5 py-1 text-[11px] font-semibold text-primary transition hover:bg-primary/10 coarse:min-h-9"
          title={`Print the text at the ${pt(setPt)} you set. It may need more pages; Magic fit turns off.`}
          onClick={() => {
            updateDoc((d) => {
              d.metadata.page.autoFit = false
            })
            // A changed page count is the one thing nobody should find out
            // later: say what happened, and put the way back right here.
            toast(`Printing at ${pt(setPt)}, as you set. It may run onto more pages.`, 'info', {
              label: 'Undo',
              run: () =>
                updateDoc((d) => {
                  d.metadata.page.autoFit = true
                }),
            })
          }}
        >
          Print at {pt(setPt)}
        </button>
      )}
    </>
  )
}
