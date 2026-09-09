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
/** How far a SPARSE page may grow to fill itself. Auto-fit used to work in
 *  one direction only - an overflowing page shrank, a half-empty one just
 *  stayed small, leaving a strip of dead paper under short resumes. Capped
 *  modestly: at 1.15 a 10.5pt body reaches ~12pt, which fills a page without
 *  reading as a poster. */
export const MAX_FIT_UP = 1.15
/** One grid step of the deterministic fit search - shared by the shrink and
 *  grow directions so preview and export land on identical scales. */
export const FIT_STEP = 0.004

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
  if ((await measure(1)) <= pageH) {
    /* GROW. The page already fits - fill it instead of leaving it sparse.
     * Same discrete grid as the shrink search, so the answer is THE largest
     * fitting grid scale however the search gets there, and the exporter
     * (searching cold) agrees with the preview to the digit. The cap is
     * probed first: most sparse pages fit the whole cap, making the common
     * case two measurements. */
    const NUp = Math.floor((MAX_FIT_UP - 1) / FIT_STEP)
    if (NUp <= 0) return 1
    const upAt = (i: number) => Number((1 + i * FIT_STEP).toFixed(3))
    const fitsUp = async (i: number) => (await measure(upAt(i))) <= pageH
    if (await fitsUp(NUp)) {
      const r = upAt(NUp)
      await measure(r)
      return r
    }
    let lo = 0 // largest index known to fit (index 0 == scale 1, known)
    let hi = NUp // known not to fit
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (await fitsUp(mid)) lo = mid
      else hi = mid
    }
    const r = upAt(lo)
    await measure(r)
    return r
  }
  /* The search walks a DISCRETE grid of scales, and its answer is THE largest
   * grid scale that fits - a unique value no matter where the search started.
   * That is what lets the preview seed itself from its previous answer while
   * the exporter searches cold, and still land on the identical scale: a
   * plain binary search from two different brackets converges to two
   * different thousandths, and preview and export MUST agree (the parity
   * gate exists because they once did not). */
  const STEP = FIT_STEP
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

/* ---- Magic fit: two numbers, in the author's order, inside the author's
   floors, towards the author's page target -----------------------------------
   The single scale above moved type and spacing together and could not be
   told where to stop; a person who wants "never below 11pt" or "keep the
   name as I set it" had no way to say so, and the toggle never said what
   it had chosen (the owner, 2026-09-09). `fitToPages` searches a TYPE scale
   and a SPACING scale on the same deterministic grid, so the preview and
   the exporter still land on the identical answer.

   Proportion, not only page count: a page whose gaps were crushed to 0.7
   under untouched type reads as cramped, and one whose gaps grew 30% under
   untouched type reads as airy, whatever the template. So the axis the
   author puts first LEADS only a little on its own (spacing to 0.85 or
   1.12, type to 0.92 or 1.08), then both move together in that proportion,
   and only when the floor of one stops the pair does the lead axis go on
   alone to its own floor. The owner's word for the goal: not merely
   deterministic, "perfect visually". */

/** The two scales a fitted page is drawn at; {1, 1} is "as set". */
export interface FitVector {
  type: number
  space: number
}

/** How far spacing may tighten or widen; type keeps MIN_FIT / MAX_FIT_UP. */
export const FIT_SPACE_MIN = 0.7
export const FIT_SPACE_MAX = 1.3
/** How far the leading axis moves alone before the other joins it. */
export const LEAD_SHRINK = { space: 0.85, type: 0.92 } as const
export const LEAD_GROW = { space: 1.12, type: 1.08 } as const

export interface FitRules {
  /** At most this many pages. */
  target: number
  /** The body size, in points, the fit never goes below. */
  minBody: number
  /** The body size as set, in points (the floor is expressed against it). */
  fontSize: number
  /** What gives first when the page is over: spacing, both together (the
   *  old single scale), or type. The grow direction follows the same order. */
  priority: 'spacing' | 'both' | 'type'
}

export interface FitInput {
  pageH: number
  /** Apply the vector, let it paint, return the realised content height in
   *  px. The DOM is left at the LAST vector measured. */
  measure: (fit: FitVector) => Promise<number>
  /** The true page count at the vector just measured; when absent, the
   *  height model (first page `pageH`, later pages `subsequentPageH`). */
  countPages?: () => Promise<number>
  subsequentPageH?: number
  /** The previous answer, to bracket the search (fewer probes; the same
   *  grid answer either way). */
  hint?: FitVector
}

/** The lowest type scale the rules allow: the legibility floor, or the
 *  author's own minimum body size, whichever is higher. */
export function typeFloor(rules: Pick<FitRules, 'minBody' | 'fontSize'>): number {
  const byBody = rules.fontSize > 0 ? rules.minBody / rules.fontSize : MIN_FIT
  return Math.min(1, Math.max(MIN_FIT, Number(byBody.toFixed(3))))
}

const round3 = (n: number) => Number(n.toFixed(3))

/** The largest index in [0, n] whose value fits, given fits(0) is true and
 *  fitting is monotone (true up to some index, false after). `hintI`
 *  brackets the search around a previous answer first. */
async function largestFitting(n: number, fits: (i: number) => Promise<boolean>, hintI?: number): Promise<number> {
  let lo = 0
  let hi = n + 1
  if (hintI !== undefined && hintI > 0 && hintI <= n) {
    const K = 10
    if (await fits(hintI)) {
      lo = hintI
      const up = Math.min(n, hintI + K)
      if (up > hintI && (await fits(up))) lo = up
      else if (up > hintI) hi = up
    } else {
      hi = hintI
      const down = Math.max(0, hintI - K)
      if (down < hintI && (await fits(down))) lo = down
    }
  }
  if (hi === n + 1 && lo === 0 && n > 0 && (await fits(n))) return n
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (await fits(mid)) lo = mid
    else hi = mid
  }
  return lo
}

/** An ascending grid from `from` to `to` in FIT_STEP steps, both ends in. */
function grid(from: number, to: number): number[] {
  const out: number[] = []
  const n = Math.floor((to - from) / FIT_STEP + 1e-9)
  for (let i = 0; i <= n; i++) out.push(round3(from + i * FIT_STEP))
  if (out[out.length - 1] !== round3(to)) out.push(round3(to))
  return out
}

export async function fitToPages(input: FitInput, rules: FitRules): Promise<FitVector> {
  const { pageH, measure, countPages } = input
  const subsequentPageH = input.subsequentPageH ?? pageH
  const tFloor = typeFloor(rules)
  const pagesAt = async (fit: FitVector): Promise<number> => {
    const h = await measure(fit)
    if (countPages) return countPages()
    if (h <= pageH) return 1
    return 1 + Math.ceil((h - pageH) / Math.max(1, subsequentPageH))
  }
  const fitsWithin = async (fit: FitVector, target: number) => (await pagesAt(fit)) <= target

  /* A stage searches one parameter over an ascending grid of values; `at`
   * turns a value into the vector to measure. `values[0]` is known to fit
   * (the caller checked); the answer is the largest value that fits. */
  const stage = async (values: number[], at: (v: number) => FitVector, target: number, hintValue?: number) => {
    const hintI = hintValue === undefined ? -1 : values.findIndex((v) => Math.abs(v - hintValue) < 1e-9)
    const i = await largestFitting(values.length - 1, (k) => fitsWithin(at(values[k]), target), hintI >= 0 ? hintI : undefined)
    return at(values[i])
  }
  const clampSpace = (v: number) => round3(Math.min(FIT_SPACE_MAX, Math.max(FIT_SPACE_MIN, v)))
  const clampType = (v: number) => round3(Math.min(MAX_FIT_UP, Math.max(tFloor, v)))
  const lead: 'space' | 'type' = rules.priority === 'type' ? 'type' : 'space'
  const other: 'space' | 'type' = lead === 'space' ? 'type' : 'space'
  const asSet: FitVector = { type: 1, space: 1 }

  /* The three-stage path in one direction. `dir` is -1 to shrink, +1 to
   * grow. Stage 1: the lead axis alone, as far as its lead bound. Stage 2:
   * a scalar k moves both, the lead axis at leadBound x k, the other at k,
   * as far as the first floor/ceiling either reaches. Stage 3: the lead
   * axis alone, on to its own floor/ceiling. Each stage stops as soon as
   * the page fits (shrink) or as far as it still fits (grow). Returns null
   * when even the end of the path does not fit (shrink only). */
  const path = async (target: number): Promise<FitVector | null> => {
    const shrinking = !(await fitsWithin(asSet, target))
    const dir = shrinking ? -1 : 1
    const leadBound = (dir < 0 ? LEAD_SHRINK : LEAD_GROW)[lead]
    const leadEnd = lead === 'space' ? (dir < 0 ? FIT_SPACE_MIN : FIT_SPACE_MAX) : dir < 0 ? tFloor : MAX_FIT_UP
    const otherEnd = other === 'space' ? (dir < 0 ? FIT_SPACE_MIN : FIT_SPACE_MAX) : dir < 0 ? tFloor : MAX_FIT_UP
    const vec = (leadV: number, otherV: number): FitVector =>
      lead === 'space' ? { space: clampSpace(leadV), type: clampType(otherV) } : { type: clampType(leadV), space: clampSpace(otherV) }
    // the whole path's end: does anything fit at all?
    const endOfPath = vec(leadEnd, otherEnd)
    if (shrinking && !(await fitsWithin(endOfPath, target))) return null
    // Stage 1: lead alone to its lead bound (the grid runs from the bound
    // towards 1 when shrinking, so "largest fitting" is the least movement).
    const bound1 = dir < 0 ? Math.max(leadBound, leadEnd) : Math.min(leadBound, leadEnd)
    if (dir < 0 ? !(await fitsWithin(vec(bound1, 1), target)) : await fitsWithin(vec(bound1, 1), target)) {
      // Stage 2: both together. k runs over the other axis's own range,
      // the lead axis rides at bound1 x k (relative to 1).
      const kEnd = dir < 0 ? otherEnd : Math.min(otherEnd, dir < 0 ? 1 : leadEnd / bound1)
      const both = (k: number) => vec(bound1 * k, k)
      const kFits = (k: number) => fitsWithin(both(k), target)
      if (dir < 0 ? !(await kFits(kEnd)) : await kFits(kEnd)) {
        // Stage 3: the lead axis alone, the other at its end
        const otherFixed = kEnd
        const s3 = (v: number) => vec(v, otherFixed)
        if (dir < 0) return stage(grid(leadEnd, round3(bound1 * kEnd)), s3, target, input.hint?.[lead])
        const from = round3(bound1 * kEnd)
        return stage(grid(from, leadEnd), s3, target, input.hint?.[lead])
      }
      if (dir < 0) return stage(grid(otherEnd, 1).map(round3), both, target, input.hint?.[other])
      return stage(grid(1, kEnd), both, target, input.hint?.[other])
    }
    if (dir < 0) return stage(grid(bound1, 1), (v) => vec(v, 1), target, input.hint?.[lead])
    return stage(grid(1, bound1), (v) => vec(v, 1), target, input.hint?.[lead])
  }

  if (rules.priority === 'both') {
    /* The old single scale, kept as a choice: one k on both axes. */
    if (await fitsWithin(asSet, rules.target)) {
      const vals = grid(1, MAX_FIT_UP)
      const i = await largestFitting(vals.length - 1, (k) => fitsWithin({ type: vals[k], space: vals[k] }, rules.target))
      const r = { type: vals[i], space: vals[i] }
      await measure(r)
      return r
    }
    for (let target = rules.target; target <= Math.max(rules.target, 6); target++) {
      if (!(await fitsWithin({ type: tFloor, space: tFloor }, target))) continue
      const vals = grid(tFloor, 1)
      const i = await largestFitting(vals.length - 1, (k) => fitsWithin({ type: vals[k], space: vals[k] }, target))
      const r = { type: vals[i], space: vals[i] }
      await measure(r)
      return r
    }
    const r = { type: tFloor, space: tFloor }
    await measure(r)
    return r
  }

  for (let target = rules.target; target <= Math.max(rules.target, 6); target++) {
    const r = await path(target)
    if (r) {
      await measure(r)
      return r
    }
  }
  const floors: FitVector = { type: tFloor, space: FIT_SPACE_MIN }
  await measure(floors)
  return floors
}
