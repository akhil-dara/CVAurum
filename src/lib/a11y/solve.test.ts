import { describe, expect, it } from 'vitest'
import { over, parseColor, quantise, ratio, type Rgba } from './color'
import { capReason, clears, solveValue, worstOn, type InkTarget } from './solve'
import { paintWith } from './transform'

const rgba = (v: string): Rgba => parseColor(v) as Rgba

/** What the page would measure with this value written into the setting. */
const asPainted = (target: InkTarget, value: string): number => {
  const ink = paintWith(target.path, rgba(value))
  return Math.min(...target.grounds.map((g) => ratio(quantise(over(ink, g.color)), g.color)))
}

/** A flat ground, as most of them are. */
const on = (...hexes: string[]) => hexes.map((h) => ({ color: rgba(h) }))

describe('solving for the setting rather than for the ink', () => {
  it('offers a value whose PAINTED result reads, not one whose raw value does', () => {
    // The ink is painted at 85% of the setting, on the sidebar's own ground.
    const target: InkTarget = {
      path: { value: rgba('#b9c4d1'), amount: 1, alpha: 0.85 },
      grounds: on('#eef2f7'),
      required: 4.5,
    }
    const solved = solveValue(rgba('#b9c4d1'), [target])
    expect(solved.color).toBeDefined()
    // The number reported is the number the page will paint.
    expect(asPainted(target, solved.color as string)).toBeGreaterThanOrEqual(4.5 - 0.005)
    expect(solved.worst).toBeCloseTo(asPainted(target, solved.color as string), 1)
  })

  it('offers nothing at all when the transform itself caps the pair', () => {
    // 45% of ANY colour over white: black at 45% is #8c8c8c, 3.36:1. No value
    // of the setting reaches 4.5:1, and a colour offered here would send the
    // author round a loop - change the colour, keep the warning.
    const target: InkTarget = {
      path: { value: rgba('#6a7686'), amount: 1, alpha: 0.45 },
      grounds: on('#ffffff'),
      required: 4.5,
    }
    const solved = solveValue(rgba('#6a7686'), [target])
    expect(solved.color).toBeUndefined()
    expect(solved.best).toBeGreaterThan(3.3)
    expect(solved.best).toBeLessThan(3.4)
    const reason = capReason([target], solved.best, 'Muted text')
    expect(reason).toMatch(/45%/)
    expect(reason).toMatch(/3\.3\d:1/)
  })

  it('holds every ground the setting paints on at once', () => {
    // The same ink on the page and on a lifted card. A colour solved against
    // the card alone leaves the page failing.
    const page: InkTarget = {
      path: { value: rgba('#a8a8a8'), amount: 1, alpha: 1 },
      grounds: on('#ffffff'),
      required: 4.5,
    }
    const card: InkTarget = {
      path: { value: rgba('#a8a8a8'), amount: 1, alpha: 1 },
      grounds: on('#cfd8e6'),
      required: 4.5,
    }
    const pageOnly = solveValue(rgba('#a8a8a8'), [page])
    const both = solveValue(rgba('#a8a8a8'), [page, card])
    expect(both.color).toBeDefined()
    expect(clears([page, card], rgba(both.color as string))).toBe(true)
    // ...and the page's own answer is not good enough for the card, which is
    // exactly the defect: one row's colour left the other rows failing.
    expect(clears([card], rgba(pageOnly.color as string))).toBe(false)
    expect(asPainted(card, pageOnly.color as string)).toBeLessThan(4.5)
  })

  it('keeps each target own threshold', () => {
    const heading: InkTarget = {
      path: { value: rgba('#9fb8e0'), amount: 1, alpha: 1 },
      grounds: on('#ffffff'),
      required: 3,
    }
    const body: InkTarget = {
      path: { value: rgba('#9fb8e0'), amount: 1, alpha: 1 },
      grounds: on('#ffffff'),
      required: 4.5,
    }
    const big = solveValue(rgba('#9fb8e0'), [heading])
    const all = solveValue(rgba('#9fb8e0'), [heading, body])
    expect(worstOn(heading, rgba(big.color as string))).toBeGreaterThanOrEqual(3)
    expect(worstOn(body, rgba(all.color as string))).toBeGreaterThanOrEqual(4.5 - 0.005)
  })

  it('says which grounds are irreconcilable when they are', () => {
    // Words straddling a light page and a near-black band: no ink reads on
    // both, and the honest answer names the grounds rather than a colour.
    const split: InkTarget = {
      path: { value: rgba('#808080'), amount: 1, alpha: 1 },
      grounds: on('#ffffff', '#111111'),
      required: 4.5,
    }
    const solved = solveValue(rgba('#808080'), [split])
    expect(solved.color).toBeUndefined()
    expect(capReason([split], solved.best, 'Body text')).toMatch(/#ffffff/)
  })

  it('moves the ground with the setting when the ground is a wash of it', () => {
    // A card is 4% of the body ink laid over the page. Darken the ink and the
    // card darkens with it - so a colour solved against the card AS IT STANDS
    // lands short the moment the page repaints, which is how twenty-two
    // findings survived their own fix by six hundredths.
    // A 12% wash, not the 4% of the report that found this: a suggestion now
    // carries headroom (SUGGEST_MARGIN), which absorbs a small wash's drift,
    // and this test is about the drift itself, so it must outrun the margin.
    const asStands: InkTarget = {
      path: { value: rgba('#9a9a9a'), amount: 1, alpha: 1 },
      grounds: on('#f3f3f3'),
      required: 4.5,
    }
    const moving: InkTarget = {
      path: { value: rgba('#9a9a9a'), amount: 1, alpha: 1 },
      grounds: [{ color: rgba('#f3f3f3'), tint: { amount: 0.12, partner: rgba('#ffffff') } }],
      required: 4.5,
    }
    const naive = solveValue(rgba('#9a9a9a'), [asStands]).color as string
    const solved = solveValue(rgba('#9a9a9a'), [moving]).color as string
    // The naive answer measures 4.5 against the card it was solved against...
    expect(asPainted(asStands, naive)).toBeGreaterThanOrEqual(4.5 - 0.005)
    // ...and less than that against the card the page will actually paint.
    expect(worstOn(moving, rgba(naive))).toBeLessThan(4.5 - 0.005)
    expect(worstOn(moving, rgba(solved))).toBeGreaterThanOrEqual(4.5 - 0.005)
  })

  it('leaves a value that already reads exactly as it was', () => {
    const fine: InkTarget = {
      path: { value: rgba('#1a1a1a'), amount: 1, alpha: 1 },
      grounds: on('#ffffff'),
      required: 4.5,
    }
    expect(solveValue(rgba('#1a1a1a'), [fine]).color).toBe('#1a1a1a')
  })
})

describe('a suggestion clears with headroom, not on the line', () => {
  // A value measuring exactly 4.50:1 live measured 4.46:1 on the exported
  // file, where a colour-mix wash lands one channel darker.
  it('offers only a value that clears the threshold by the margin', async () => {
    const { solveValue, SUGGEST_MARGIN } = await import('./solve')
    const target: InkTarget = { path: { value: rgba('#969696'), amount: 1, alpha: 1 }, grounds: on('#ffffff'), required: 4.5 }
    const r = solveValue(rgba('#969696'), [target])
    expect(r.color).toBeDefined()
    expect(r.worst! >= 4.5 + SUGGEST_MARGIN).toBe(true)
  })
})
