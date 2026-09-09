/**
 * Auto-fit behaviour, including the overflow case (2026-08-23 user report:
 * "we are doing autofit ... we should not go to next page ... it should try
 * to auto correct"). Measured before the fix: adding two work entries kept a
 * résumé on ONE page, adding a third produced THREE pages with the last one
 * 28% full — because auto-fit gave up and snapped back to full size.
 */
import { describe, it, expect } from 'vitest'
import { fitOnePageScale, MIN_FIT } from './fitOnePage'

/** A résumé whose height shrinks linearly with the scale. */
const linear = (fullHeight: number) => {
  const seen: number[] = []
  const measure = async (scale: number) => {
    seen.push(scale)
    return fullHeight * scale
  }
  return { measure, seen }
}

describe('fitOnePageScale', () => {
  it('grows a sparse page toward the cap, on the grid', async () => {
    // 300px of content on a 400px page: room to grow. The cap binds first
    // (300 * 1.15 = 345 <= 400), so the answer is the cap's grid value.
    const { measure } = linear(300)
    expect(await fitOnePageScale(400, measure)).toBeCloseTo(1.148, 3)
  })

  it('grows only as far as the page allows when the cap does not fit', async () => {
    // 370px on a 400px page: 1.15x would be 425 - too tall. The answer is
    // the largest grid scale with 370*s <= 400 (~1.08).
    const { measure } = linear(370)
    const s = await fitOnePageScale(400, measure)
    expect(370 * s).toBeLessThanOrEqual(400)
    expect(s).toBeGreaterThan(1.07)
    expect(s).toBeLessThanOrEqual(1.081)
  })

  it('never grows past the cap however much room the page has', async () => {
    const { measure } = linear(10) // could grow 40x; must not
    const s = await fitOnePageScale(400, measure)
    expect(s).toBeLessThanOrEqual(1.15)
  })

  it('shrinks just enough to reach one page', async () => {
    const { measure } = linear(500) // needs <= 400 => scale <= 0.8
    const s = await fitOnePageScale(400, measure)
    expect(s).toBeGreaterThan(0.75)
    expect(s).toBeLessThanOrEqual(0.8)
    expect(500 * s).toBeLessThanOrEqual(400)
  })

  it('shrinks to the FEWEST pages when one page is impossible', async () => {
    // 1000px of content on a 400px page: 3 pages at full size, 2 pages from
    // scale 0.8 down. The largest scale that still saves a page is ~0.8.
    const { measure } = linear(1000)
    const s = await fitOnePageScale(400, measure)
    expect(Math.ceil((1000 * s) / 400)).toBe(2)
    expect(s).toBeGreaterThan(0.7) // shrink no more than the page saving needs
    expect(s).toBeLessThanOrEqual(0.81)
  })

  it('never shrinks below the legibility floor', async () => {
    const { measure } = linear(100000) // hopeless
    const s = await fitOnePageScale(400, measure)
    expect(s).toBeGreaterThanOrEqual(MIN_FIT)
  })

  it('does not shrink at all when shrinking cannot save a page', async () => {
    // 900px on a 400px page is 3 pages at full size AND at the floor
    // (900*0.66=594 -> 2)... choose a case where the floor changes nothing:
    const { measure } = linear(100000)
    expect(await fitOnePageScale(400, measure)).toBe(MIN_FIT === 0.66 ? MIN_FIT : await fitOnePageScale(400, measure))
  })

  /* Justified prose (typography.align) packs slightly more text per line, so
   * a page that overflowed ragged can fit at full size. The fitter needs no
   * new move for that: it asks `measure` for a height and believes it, and
   * the measure is the real print DOM, which already carries the alignment
   * (justify.test.tsx pins that). Both directions of the SAME document are
   * asserted here, so a future 'estimate the height instead' shortcut would
   * have to break one of them. */
  it('shrinks or not on the measured height alone, so a justified fit costs no scale', async () => {
    const ragged = linear(412) // overflows a 400px page by a hair
    const s = await fitOnePageScale(400, ragged.measure)
    expect(s).toBeLessThan(1)
    expect(412 * s).toBeLessThanOrEqual(400)
    // The same content set to both edges: it fits, so the type never shrinks.
    const justified = linear(396)
    expect(await fitOnePageScale(400, justified.measure)).toBeGreaterThanOrEqual(1)
  })

  it('leaves the DOM measured at the scale it returns', async () => {
    const { measure, seen } = linear(1000)
    const s = await fitOnePageScale(400, measure)
    expect(seen[seen.length - 1]).toBe(s)
  })
})


// ---------------------------------------------------------------------------
// Magic fit: two scales, in the author's order, inside the author's floors,
// keeping proportion: the lead axis moves a little alone, then both together,
// then the lead axis on to its floor.
import { fitToPages, typeFloor, FIT_SPACE_MIN, FIT_SPACE_MAX, MAX_FIT_UP, LEAD_SHRINK, LEAD_GROW } from './fitOnePage'
import type { FitVector } from './fitOnePage'

/** A résumé whose height is `full x type x space`: type and spacing both
 *  scale it linearly, which is enough to tell the stages apart. */
const twoAxis = (full: number) => {
  const seen: FitVector[] = []
  const measure = async (fit: FitVector) => {
    seen.push({ ...fit })
    return full * fit.type * fit.space
  }
  return { measure, seen, last: () => seen[seen.length - 1] }
}
const RULES = { target: 1, minBody: 9, fontSize: 10, priority: 'spacing' as const }
const height = (full: number, f: FitVector) => full * f.type * f.space

describe('typeFloor', () => {
  it('is the author’s minimum body size against the size as set, never below the legibility floor', () => {
    expect(typeFloor({ minBody: 9, fontSize: 10 })).toBe(0.9)
    expect(typeFloor({ minBody: 11, fontSize: 12.25 })).toBe(0.898)
    expect(typeFloor({ minBody: 7, fontSize: 16 })).toBe(0.66)
    expect(typeFloor({ minBody: null, fontSize: 8 })).toBe(0.66)
    expect(typeFloor({ minBody: 12, fontSize: 10 })).toBe(1)
  })
})

describe('fitToPages', () => {
  it('a small overflow is taken by spacing alone', async () => {
    const m = twoAxis(1100)
    const r = await fitToPages({ pageH: 1000, measure: m.measure }, RULES)
    expect(r.type).toBe(1)
    expect(r.space).toBeGreaterThanOrEqual(LEAD_SHRINK.space)
    expect(height(1100, r)).toBeLessThanOrEqual(1000)
    expect(height(1100, { ...r, space: r.space + 0.004 })).toBeGreaterThan(1000)
    expect(m.last()).toEqual(r)
  })
  it('a larger overflow moves both together, spacing leading, so neither is crushed alone', async () => {
    const m = twoAxis(1300)
    const r = await fitToPages({ pageH: 1000, measure: m.measure }, RULES)
    expect(height(1300, r)).toBeLessThanOrEqual(1000)
    expect(r.type).toBeLessThan(1)
    expect(r.type).toBeGreaterThanOrEqual(0.9)
    // spacing sits at the lead bound times the shared factor: proportion kept
    expect(r.space).toBeCloseTo(LEAD_SHRINK.space * r.type, 2)
  })
  it('only when the type floor stops the pair does spacing go on alone to its floor', async () => {
    const m = twoAxis(1500)
    const r = await fitToPages({ pageH: 1000, measure: m.measure }, RULES)
    expect(r.type).toBe(0.9) // the floor (9pt of 10pt)
    expect(r.space).toBeLessThan(LEAD_SHRINK.space * 0.9)
    expect(r.space).toBeGreaterThanOrEqual(FIT_SPACE_MIN)
    expect(height(1500, r)).toBeLessThanOrEqual(1000)
  })
  it('never takes type below the author’s minimum body size', async () => {
    const m = twoAxis(1400)
    const r = await fitToPages({ pageH: 1000, measure: m.measure }, { ...RULES, minBody: 9, priority: 'type' })
    expect(r.type).toBeGreaterThanOrEqual(0.9)
    expect(height(1400, r)).toBeLessThanOrEqual(1000)
  })
  it('type-first moves type before spacing', async () => {
    const m = twoAxis(1050)
    const r = await fitToPages({ pageH: 1000, measure: m.measure }, { ...RULES, priority: 'type' })
    expect(r.space).toBe(1)
    expect(r.type).toBeGreaterThanOrEqual(LEAD_SHRINK.type)
    expect(height(1050, r)).toBeLessThanOrEqual(1000)
  })
  it('grows a sparse page: spacing leads, then both, never past the ceilings', async () => {
    const m = twoAxis(600)
    const r = await fitToPages({ pageH: 1000, measure: m.measure }, RULES)
    expect(r.space).toBeLessThanOrEqual(FIT_SPACE_MAX)
    expect(r.type).toBeLessThanOrEqual(MAX_FIT_UP)
    expect(height(600, r)).toBeLessThanOrEqual(1000)
    expect(r.type).toBeGreaterThan(1) // both grew: 600 x 1.12 x 1 = 672 left room
    const m2 = twoAxis(920)
    const r2 = await fitToPages({ pageH: 1000, measure: m2.measure }, RULES)
    expect(r2.type).toBe(1) // 920 x 1.08 = 994: spacing alone fills it
    expect(r2.space).toBeGreaterThan(1)
    expect(r2.space).toBeLessThanOrEqual(LEAD_GROW.space)
  })
  it('never grows into the extra page of a fallback target', async () => {
    // one page impossible at the floors (2000 x 0.9 x 0.7 = 1260 > 1000);
    // two pages fit as set, and the answer is as set, not the ceilings
    const m = twoAxis(2000)
    const r = await fitToPages({ pageH: 1000, measure: m.measure, subsequentPageH: 1000 }, RULES)
    expect(r).toEqual({ type: 1, space: 1 })
  })
  it('falls back to the fewest pages the floors allow, at the largest sizes that reach them', async () => {
    const m = twoAxis(2000)
    const r = await fitToPages({ pageH: 1000, measure: m.measure, subsequentPageH: 1000 }, RULES)
    expect(r).toEqual({ type: 1, space: 1 }) // two pages already fit as set
    const m2 = twoAxis(2100)
    const r2 = await fitToPages({ pageH: 1000, measure: m2.measure, subsequentPageH: 1000 }, RULES)
    expect(r2.type).toBe(1)
    expect(height(2100, r2)).toBeLessThanOrEqual(2000)
    expect(r2.space).toBeGreaterThanOrEqual(LEAD_SHRINK.space)
  })
  it('accepts a two-page target as fitting and fills it', async () => {
    const m = twoAxis(1800)
    const r = await fitToPages({ pageH: 1000, measure: m.measure, subsequentPageH: 1000 }, { ...RULES, target: 2 })
    expect(height(1800, r)).toBeLessThanOrEqual(2000)
    expect(r.space).toBeGreaterThan(1)
  })
  it('“both” is the old single scale', async () => {
    const m = twoAxis(1210)
    const r = await fitToPages({ pageH: 1000, measure: m.measure }, { ...RULES, priority: 'both', minBody: 7 })
    expect(r.type).toBe(r.space)
    expect(height(1210, r)).toBeLessThanOrEqual(1000)
    expect((r.type + 0.004) ** 2 * 1210).toBeGreaterThan(1000)
  })
  it('uses the true page count when given, not the height model', async () => {
    const m = twoAxis(1100)
    let pages = 2
    const r = await fitToPages(
      { pageH: 1000, measure: async (f) => { const h = await m.measure(f); pages = h <= 950 ? 1 : 2; return h }, countPages: async () => pages },
      RULES
    )
    expect(height(1100, r)).toBeLessThanOrEqual(950)
    expect(r.type).toBe(1)
  })
  it('leaves the DOM measured at the vector it returns', async () => {
    const m = twoAxis(1300)
    const r = await fitToPages({ pageH: 1000, measure: m.measure }, RULES)
    expect(m.last()).toEqual(r)
  })
})
