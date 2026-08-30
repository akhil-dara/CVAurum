/**
 * Find the largest "fit-to-one-page" scale in [MIN_FIT, 1] at which the printed
 * resume content fits a single page, by BINARY SEARCH on the realized height.
 *
 * Binary search is deterministic and stable — unlike a recompute-from-height
 * loop, which oscillates when text reflows non-linearly as the font shrinks
 * (a line un-wraps and the height jumps). Both the live editor preview and the
 * print/PDF route use this exact routine, so the on-screen page count and the
 * exported PDF ALWAYS agree.
 *
 * `measure(scale)` must apply the scale, let it paint, and return the realized
 * content height (px). Returns 1 when the content already fits at full size, or
 * when it can't fit even at MIN_FIT (then it's left full size and paginates).
 */
export const MIN_FIT = 0.66

export async function fitOnePageScale(
  pageH: number,
  measure: (scale: number) => Promise<number>,
  /** Budget for pages AFTER the first, used only when the caller cannot
   *  supply a real page count. Defaults to `pageH`. */
  subsequentPageH: number = pageH,
  /** The TRUE page count at the scale `measure` just rendered. Height alone
   *  over-estimates what a page holds, because real breaks land at content
   *  boundaries: measured on a real resume, the height estimate picked scale
   *  0.995 believing it saved a page when the paginator still produced three.
   *  Callers that can paginate (the exporter and the live preview) pass this
   *  so both pick the identical scale. */
  countPages?: () => Promise<number>,
  /** The scale the previous fit settled on. One edit rarely moves the answer
   *  far, so the search brackets it first - measured, an edit pause paid ~10
   *  sequential render+layout probes of the whole hidden resume; seeded, a
   *  typical one pays 5-6. */
  hint?: number
): Promise<number> {
  if ((await measure(1)) <= pageH) return 1 // already fits — no shrink
  /* The search walks a DISCRETE grid of scales, and its answer is THE largest
   * grid scale that fits - a unique value no matter where the search started.
   * That is what lets the preview seed itself from its previous answer while
   * the exporter searches cold, and still land on the identical scale: a
   * plain binary search from two different brackets converges to two
   * different thousandths, and preview and export MUST agree (the parity
   * gate exists because they once did not). */
  const STEP = 0.004
  const N = Math.floor((1 - MIN_FIT) / STEP) // grid: MIN_FIT + i*STEP, i in [0, N]
  const scaleAt = (i: number) => Number((MIN_FIT + i * STEP).toFixed(3))
  const fits = async (i: number) => (await measure(scaleAt(i))) <= pageH
  let loI = 0 // largest index known (or assumed, then verified) to fit
  let hiI = N + 1 // smallest index known not to fit (N+1 stands for scale 1)
  let loVerified = false
  if (hint && hint > MIN_FIT && hint < 1) {
    const h = Math.max(0, Math.min(N, Math.round((hint - MIN_FIT) / STEP)))
    const K = 10 // +-0.04 around the previous answer
    if (await fits(h)) {
      loI = h
      loVerified = true
      const up = Math.min(N, h + K)
      if (up > h && (await fits(up))) loI = up
      else if (up > h) hiI = up
    } else {
      hiI = h
      const down = Math.max(0, h - K)
      if (down < h && (await fits(down))) {
        loI = down
        loVerified = true
      }
    }
  }
  if (!loVerified) {
    if (!(await fits(0))) return fewestPagesScale(pageH, measure, subsequentPageH, countPages)
  }
  while (hiI - loI > 1) {
    const mid = (loI + hiI) >> 1
    if (await fits(mid)) loI = mid
    else hiI = mid
  }
  const result = scaleAt(loI)
  await measure(result)
  return result
}

/**
 * One page is impossible — so aim for the FEWEST pages instead of giving up.
 *
 * This used to restore full size and let the document paginate naturally,
 * which produced a cliff: measured on a real résumé, two extra work entries
 * still fitted ONE page, and a third produced THREE (last page 28% full),
 * because "doesn't fit one page" threw away all the shrinking. A user who
 * asked to fit one page wants compact output; the honest approximation of
 * that intent is the smallest page count the legibility floor allows, at the
 * LARGEST scale that achieves it — so the type shrinks only as much as the
 * page it saves actually requires.
 *
 * Page count is estimated the way the paginator budgets — page one gets the
 * full page, later pages get `subsequentPageH` — and is monotonic in the
 * scale, which is all the search needs: exact break positions remain the
 * paginator's job, running afterwards on whatever scale this returns.
 */
async function fewestPagesScale(
  pageH: number,
  measure: (scale: number) => Promise<number>,
  subsequentPageH: number,
  countPages?: () => Promise<number>
): Promise<number> {
  const pagesAt = async (scale: number) => {
    const h = await measure(scale)
    if (countPages) return countPages()
    if (h <= pageH) return 1
    return 1 + Math.ceil((h - pageH) / Math.max(1, subsequentPageH))
  }
  const best = await pagesAt(MIN_FIT) // fewest pages the floor allows
  if ((await pagesAt(1)) === best) {
    await measure(1) // shrinking would not save a page — keep full size
    return 1
  }
  let lo = MIN_FIT // known to reach `best` pages
  let hi = 1 // known to need more
  for (let i = 0; i < 6; i++) {
    const mid = (lo + hi) / 2
    if ((await pagesAt(mid)) <= best) lo = mid
    else hi = mid
  }
  const result = Number(lo.toFixed(3))
  await measure(result)
  return result
}
