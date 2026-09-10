import { extractPageBlocks } from './walk'
import { paginate } from './paginate'
import { computeUsablePageHeightPx, computeFirstPageUsablePageHeightPx, findMainColumnPaddingPx, exceedsOnePage } from './metrics'

export interface PageMeasure {
  pages: number
  /** The last page's content height over its usable height. */
  lastPageFill: number
  /** Keys of the sections whose top lies on the last page. */
  lastPageSections: string[]
  cutsPx: number[]
  contentHeightPx: number
}

/** The true pagination of a print-mode root: the export's own gate for one
 *  page, else the export's own paginator on the same blocks and budgets.
 *  The preview's overlay, its readout and Magic fit's trials all read this
 *  one routine, so none of them can disagree with the PDF on a page count. */
export function measurePages(printRoot: HTMLElement, pageH: number, marginMm: number, forcedCutsPx: number[] = []): PageMeasure {
  const padding = findMainColumnPaddingPx(printRoot)
  const usable = computeUsablePageHeightPx(pageH, padding)
  const first = computeFirstPageUsablePageHeightPx(pageH, padding)
  const contentHeightPx = printRoot.getBoundingClientRect().height
  if (!exceedsOnePage(contentHeightPx, pageH, marginMm)) {
    // The sheet against the page, the comparison the fit itself makes: a
    // full page reads 100%, not 104% (against the usable height it did).
    return { pages: 1, lastPageFill: contentHeightPx / pageH, lastPageSections: [], cutsPx: [], contentHeightPx }
  }
  const r = paginate({
    blocks: extractPageBlocks(printRoot, usable),
    contentHeightPx,
    usablePageHeightPx: usable,
    firstPageUsablePageHeightPx: first,
    maxPageHeightPx: pageH,
    forcedCutsPx,
  })
  const lastCut = r.cutsPx.length ? r.cutsPx[r.cutsPx.length - 1] : 0
  const lastPageFill = r.cutsPx.length === 0 ? contentHeightPx / first : (contentHeightPx - lastCut) / usable
  return { pages: r.pageCount, lastPageFill, lastPageSections: sectionsFromY(printRoot, lastCut), cutsPx: r.cutsPx, contentHeightPx }
}

/** The keys of the sections whose top sits at or below `y` px from the
 *  root's top; none when `y` is 0 (everything is on the first page). */
export function sectionsFromY(printRoot: HTMLElement, y: number): string[] {
  if (y <= 0) return []
  const top = printRoot.getBoundingClientRect().top
  const out: string[] = []
  printRoot.querySelectorAll<HTMLElement>('[data-section]').forEach((el) => {
    const key = el.dataset.section
    if (key && el.getBoundingClientRect().top - top >= y - 0.5 && !out.includes(key)) out.push(key)
  })
  return out
}
