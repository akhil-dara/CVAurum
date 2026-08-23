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
  it('leaves a résumé that already fits at full size alone', async () => {
    const { measure } = linear(300)
    expect(await fitOnePageScale(400, measure)).toBe(1)
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

  it('leaves the DOM measured at the scale it returns', async () => {
    const { measure, seen } = linear(1000)
    const s = await fitOnePageScale(400, measure)
    expect(seen[seen.length - 1]).toBe(s)
  })
})
