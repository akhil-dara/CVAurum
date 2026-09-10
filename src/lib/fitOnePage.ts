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
  /** The body size the fit never goes below, in points; null means the
   *  search's own floor (MIN_FIT of the body), the fit before rules existed. */
  minBody: number | null
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
  const byBody = rules.minBody != null && rules.fontSize > 0 ? rules.minBody / rules.fontSize : MIN_FIT
  // A floor above the size as set is honoured as a floor: "never below
  // 11pt" on a 7.25pt body means the fit sets 11pt (measured: it used to be
  // clamped to 1 and the author got 8.3pt back from an 11pt rule).
  return Math.max(MIN_FIT, Number(byBody.toFixed(3)))
}

/** The highest type scale the rules allow: the growth cap, or the floor
 *  when the floor sits above it. */
export function typeCeil(rules: Pick<FitRules, 'minBody' | 'fontSize'>): number {
  return Math.max(MAX_FIT_UP, typeFloor(rules))
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
  const tCeil = typeCeil(rules)
  const pagesAt = async (fit: FitVector): Promise<number> => {
    const h = await measure(fit)
    // Content within the page height IS one page: the exporter and the
    // preview paint it as one (their gate, exceedsOnePage, allows even a
    // margin more), so the paginator is not asked. Asking it here declared a
    // page two for content that only reached into the bottom padding, and a
    // résumé the old fit put on one page fell back to two (pdf gate,
    // folio-noir after the gate's template sequence: 1074px in a 1123px page).
    // Past the page height the true count decides, as the old fallback did.
    if (h <= pageH) return 1
    if (countPages) return countPages()
    return 1 + Math.ceil((h - pageH) / Math.max(1, subsequentPageH))
  }
  const fitsWithin = async (fit: FitVector, target: number) => (await pagesAt(fit)) <= target
  const clampSpace = (v: number) => round3(Math.min(FIT_SPACE_MAX, Math.max(FIT_SPACE_MIN, v)))
  const clampType = (v: number) => round3(Math.min(tCeil, Math.max(tFloor, v)))
  const same = (a: FitVector, b: FitVector) => a.type === b.type && a.space === b.space
  // The starting point: as set, unless the floor sits above it.
  const origin: FitVector = { type: clampType(1), space: 1 }

  /* Every priority is a PATH: an ordered list of vectors that starts next to
   * the origin and walks outward, shrinking or growing. The answer is the
   * point of least movement that meets the target (shrinking) or the point
   * of most movement that still meets it (growing): both are "the largest
   * fitting index" on a list ordered so that fitting is monotone, which is
   * what the grid search needs and what makes the preview and the exporter
   * land on the identical vector however they start. */
  const walk = (from: number, to: number) => (from <= to ? grid(from, to) : grid(to, from).reverse())
  const lead: 'space' | 'type' = rules.priority === 'type' ? 'type' : 'space'
  const other: 'space' | 'type' = lead === 'space' ? 'type' : 'space'
  const endOf = (axis: 'space' | 'type', dir: -1 | 1) =>
    axis === 'space' ? (dir < 0 ? FIT_SPACE_MIN : FIT_SPACE_MAX) : dir < 0 ? tFloor : tCeil
  const vec = (leadV: number, otherV: number): FitVector =>
    lead === 'space' ? { space: clampSpace(leadV), type: clampType(otherV) } : { type: clampType(leadV), space: clampSpace(otherV) }
  const pathFor = (dir: -1 | 1): FitVector[] => {
    const out: FitVector[] = []
    const push = (v: FitVector) => {
      if (!same(v, origin) && !(out.length && same(out[out.length - 1], v))) out.push(v)
    }
    if (rules.priority === 'both') {
      /* The old single scale, kept as a choice: one k on both axes, between
       * the type's own floor and cap (the gaps follow it exactly, as they
       * always did: no spacing bound of its own, and no going on alone). */
      const kEnd = dir < 0 ? tFloor : tCeil
      for (const k of walk(origin.type, kEnd)) push({ type: clampType(k), space: round3(k) })
      return out
    }
    const leadStart = origin[lead]
    const otherStart = origin[other]
    const leadEnd = endOf(lead, dir)
    const otherEnd = endOf(other, dir)
    // Stage 1: the lead alone, as far as its lead bound (never past its end).
    const bound = (dir < 0 ? LEAD_SHRINK : LEAD_GROW)[lead]
    const bound1 = dir < 0 ? Math.max(bound, leadEnd) : Math.min(bound, leadEnd)
    for (const v of walk(leadStart, bound1)) push(vec(v, otherStart))
    // Stage 2: both together. k runs over the other axis; the lead rides at
    // bound1 x k (relative to its start), until either reaches its end.
    const leadRoom = bound1 > 0 ? leadEnd / bound1 : 1
    const kEnd = dir < 0 ? Math.max(otherEnd, leadRoom) : Math.min(otherEnd, leadRoom)
    for (const k of walk(otherStart, kEnd)) push(vec(bound1 * k, k))
    // Stage 3: whichever axis still has room goes on alone to its own end
    // (the lead when the other stopped the pair, the other when the lead's
    // own end stopped it: growing type-first, spacing goes on to 1.3 after
    // type reaches its cap; it used to stop with it).
    const after = out.length ? out[out.length - 1] : origin
    if (after[lead] !== round3(leadEnd)) for (const v of walk(after[lead], leadEnd)) push(vec(v, after[other]))
    const after2 = out.length ? out[out.length - 1] : origin
    if (after2[other] !== round3(otherEnd)) for (const v of walk(after2[other], otherEnd)) push(vec(after2[lead], v))
    return out
  }

  const hintIndexIn = (path: FitVector[]) => {
    const h = input.hint
    if (!h) return undefined
    const i = path.findIndex((v) => same(v, h))
    return i >= 0 ? i : undefined
  }

  /* One target. Returns null when even the end of the shrink path does not
   * meet it. A target above the author's own is the fewest-pages fallback:
   * the page is kept at the origin or shrunk, never grown to FILL the extra
   * page (measured: a one-page résumé the floor could not fit grew to both
   * ceilings and came out as two pages with the second three-quarters full). */
  const search = async (target: number, allowGrow: boolean): Promise<FitVector | null> => {
    if (await fitsWithin(origin, target)) {
      if (!allowGrow) return origin
      const path = pathFor(1)
      if (!path.length) return origin
      // ordered from the origin outward: fits up to some index, not after
      const i = await largestFitting(path.length, (k) => (k === 0 ? Promise.resolve(true) : fitsWithin(path[k - 1], target)), hintIndexIn(path))
      return i === 0 ? origin : path[i - 1]
    }
    const path = pathFor(-1)
    if (!path.length) return null
    // ordered from the end of the path back towards the origin: the far end
    // fits (checked), and the answer is the least movement that still does
    const rev = [...path].reverse()
    if (!(await fitsWithin(rev[0], target))) return null
    const hi = hintIndexIn(rev)
    const i = await largestFitting(rev.length - 1, (k) => fitsWithin(rev[k], target), hi)
    return rev[i]
  }

  for (let target = rules.target; target <= Math.max(rules.target, 6); target++) {
    const r = await search(target, target === rules.target)
    if (r) {
      await measure(r)
      return r
    }
  }
  const floors: FitVector = { type: tFloor, space: FIT_SPACE_MIN }
  await measure(floors)
  return floors
}
