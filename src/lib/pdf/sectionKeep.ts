/**
 * Keep a SHORT main-column section on one page (2026-08-25).
 *
 * A section split by a page break has no heading on its continuation, so
 * everything after the break reads under whatever heading came before it.
 * `readingOrder.ts` can rescue the SIDEBAR's continuation by leading the next
 * page with the sidebar; nothing can rescue the MAIN column's, because the
 * other column's text from the previous page sits between the two halves and
 * page order is fixed. The only remaining cure is not to split it.
 *
 * Not splitting is not free: a section moved whole to the next page leaves the
 * space it would have filled empty. So the rule is bounded to sections short
 * enough that moving one costs a modest gap rather than most of a page, and a
 * section too tall to fit a page alone is never flagged at all - flagging one
 * would stand it in front of a break it cannot clear and strand whole pages.
 *
 * Expressed in the paginator's existing vocabulary: `keepWithNext` on every
 * block of the section but its last makes each candidate inside it illegal
 * (`buildCandidates` drops a candidate whose predecessor carries the flag),
 * while the section GAP that follows stays legal - the best break available.
 */
import type { PageBlock } from './paginate'

/**
 * How tall a main-column section may be, as a fraction of one page's usable
 * height, and still be held together.
 *
 * The trade is direct, and was measured rather than guessed. Holding together
 * any section that could fit a page at all (fraction 1.0) took section
 * ATTRIBUTION from 3/8 configurations clean to 7/8 - and page FILL from 24/25
 * down to 17/25, introducing pages that ended 12, 28 and 31 percent full. That
 * is the same "the page break is improper" defect the fraction is supposed to
 * help with, arriving by another route, so the ceiling stays low: this protects
 * a genuinely SHORT section from being torn in half (a 87px Education section
 * split 57+30 was the case that prompted it) and leaves a section approaching a
 * full page to break normally.
 *
 * A main-column section that spans a break still has its continuation filed
 * under the preceding heading. That cannot be fixed by ordering (see
 * readingOrder.ts) and cannot be fixed here without paying in blank space; it
 * needs either a repeated heading on the continuation page, which the user
 * has rejected, or content that fits.
 */
export const KEEP_WHOLE_MAX_FRACTION = 0.4

/**
 * Returns `blocks` with `keepWithNext` set inside every main-column section
 * short enough to hold together. The input is never mutated; the same array
 * is returned when nothing qualifies, so the common path allocates nothing.
 */
export function keepShortSectionsWhole(
  blocks: PageBlock[],
  usablePageHeightPx: number,
  maxFraction = KEEP_WHOLE_MAX_FRACTION
): PageBlock[] {
  if (!(usablePageHeightPx > 0) || !blocks.length) return blocks
  const limit = usablePageHeightPx * maxFraction

  // Sections are the runs BETWEEN section gaps; the gaps themselves are never
  // part of a section and never get flagged.
  const runs: number[][] = []
  let current: number[] = []
  blocks.forEach((b, i) => {
    if (b.kind === 'section-gap') {
      if (current.length) runs.push(current)
      current = []
      return
    }
    current.push(i)
  })
  if (current.length) runs.push(current)

  const toFlag = new Set<number>()
  for (const run of runs) {
    const top = blocks[run[0]].topPx
    const bottom = blocks[run[run.length - 1]].bottomPx
    if (bottom - top > limit) continue
    for (const i of run.slice(0, -1)) if (blocks[i].keepWithNext !== true) toFlag.add(i)
  }
  if (!toFlag.size) return blocks
  return blocks.map((b, i) => (toFlag.has(i) ? { ...b, keepWithNext: true } : b))
}
