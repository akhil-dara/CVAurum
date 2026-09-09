import type { ResumeDocument } from '@/types/document'
import type { FitResult } from './fitReadout'
import { fitSizesPt } from './fitReadout'
import { moveSection, sectionLabel } from './sections'

/** A candidate document measured the way the preview measures the real one:
 *  the same search, the same paginator, the same rules. */
export type FitTrialFn = (candidate: ResumeDocument) => Promise<FitResult>

export interface Suggestion {
  id: string
  /** What the move is and what it measured: "Move Languages above Skills:
   *  2 pages, page 2 is 62% full". */
  label: string
  /** Applies the move to a document through the normal update path. */
  mutate: (doc: ResumeDocument) => void
}

/** The last page has "a lot of free space" below this fill: worth a few
 *  reorder trials (each one render and one search, on request only). */
const SPARSE = 0.6
/** A reorder must fill the last page by at least this much more to be worth
 *  offering when it does not save a page. */
const GAIN = 0.1
const MAX_OFFERS = 3

const pages = (n: number) => `${n} page${n === 1 ? '' : 's'}`
const pct = (x: number) => `${Math.round(x * 100)}%`
const pt = (x: number) => `${Math.round(x * 10) / 10}pt`
const outcome = (r: FitResult) =>
  r.pages === 1 ? `1 page, ${pct(r.lastPageFill)} full` : `${pages(r.pages)}, page ${r.pages} is ${pct(r.lastPageFill)} full`

function columnOf(doc: ResumeDocument, key: string): string[] | null {
  const l = doc.metadata.layout
  if (l.main.includes(key)) return l.main
  if (l.aside.includes(key)) return l.aside
  if (l.footer?.includes(key)) return l.footer
  return null
}

/** Measures a few concrete moves and returns the ones that come out better
 *  than the current fit, best first, at most three: pulling the résumé onto
 *  one page fewer (when the target allows it), and moving a section on a
 *  nearly empty last page one place up. Each candidate costs one trial; the
 *  caller runs this on request only. */
export async function suggestFits(doc: ResumeDocument, trial: FitTrialFn, current: FitResult): Promise<Suggestion[]> {
  const offers: { s: Suggestion; pages: number; fill: number }[] = []
  const target = doc.metadata.page.fit.target

  // Pull up: one page fewer with the same rules. When the target is already
  // below the page count the search has tried that and fallen back.
  if (current.pages > 1 && target >= current.pages) {
    const n = (current.pages - 1) as 1 | 2 | 3
    const c = structuredClone(doc)
    c.metadata.page.fit.target = n
    const r = await trial(c)
    if (r.pages <= n) {
      const s = fitSizesPt(c.metadata, r.fit)
      offers.push({
        s: {
          id: `target-${n}`,
          label: `Fit ${pages(n)}: body ${pt(s.body)}, gaps ${pct(r.fit.space)}`,
          mutate: (d) => {
            d.metadata.page.fit.target = n
          },
        },
        pages: r.pages,
        fill: r.lastPageFill,
      })
    }
  }

  // Reorder: a section on a sparse last page moves one place up its column.
  if (current.pages > 1 && current.lastPageFill < SPARSE) {
    for (const key of current.lastPageSections ?? []) {
      const col = columnOf(doc, key)
      if (!col) continue
      const at = col.indexOf(key)
      if (at <= 0) continue
      const above = col[at - 1]
      const c = structuredClone(doc)
      moveSection(c.metadata.layout, key, -1)
      const r = await trial(c)
      const better = r.pages < current.pages || (r.pages === current.pages && r.lastPageFill >= current.lastPageFill + GAIN)
      if (!better) continue
      offers.push({
        s: {
          id: `move-${key}`,
          label: `Move ${sectionLabel(key, doc)} above ${sectionLabel(above, doc)}: ${outcome(r)}`,
          mutate: (d) => moveSection(d.metadata.layout, key, -1),
        },
        pages: r.pages,
        fill: r.lastPageFill,
      })
    }
  }

  offers.sort((a, b) => a.pages - b.pages || b.fill - a.fill)
  return offers.slice(0, MAX_OFFERS).map((o) => o.s)
}
