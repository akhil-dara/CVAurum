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

export async function fitOnePageScale(pageH: number, measure: (scale: number) => Promise<number>): Promise<number> {
  if ((await measure(1)) <= pageH) return 1 // already fits — no shrink
  if ((await measure(MIN_FIT)) > pageH) {
    await measure(1) // too dense to fit legibly — restore full size and paginate
    return 1
  }
  let lo = MIN_FIT // largest scale known to fit
  let hi = 1 // smallest scale known NOT to fit
  for (let i = 0; i < 7; i++) {
    const mid = (lo + hi) / 2
    if ((await measure(mid)) <= pageH) lo = mid
    else hi = mid
  }
  const result = Number(lo.toFixed(3))
  await measure(result)
  return result
}
