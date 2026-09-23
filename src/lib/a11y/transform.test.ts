import { describe, expect, it } from 'vitest'
import { parseColor, toHex, type Rgba } from './color'
import { matchPaints, paintWith, solveAmount, isTransformed, type PaintCandidate } from './transform'

const rgba = (v: string): Rgba => parseColor(v) as Rgba
const cand = (pairs: [string, string][]): PaintCandidate[] => pairs.map(([key, color]) => ({ key, color: rgba(color) }))

const VARS = cand([
  ['--rm-text', '#1a1a1a'],
  ['--rm-muted', '#6a7686'],
  ['--rm-sidebar-text', '#b9c4d1'],
  ['--rm-bg', '#ffffff'],
])

describe('tracing an ink back to the setting it was painted from', () => {
  it('matches on the channels and records the alpha, because half these inks are painted weaker', () => {
    // color-mix(in srgb, var(--rm-muted) 45%, transparent), as a browser
    // resolves it: the muted colour, painted at 45%.
    const m = matchPaints(rgba('rgba(106, 118, 134, 0.45)'), VARS, VARS)
    expect(m[0].key).toBe('--rm-muted')
    expect(m[0].path.alpha).toBeCloseTo(0.45, 3)
    expect(m[0].path.amount).toBe(1)
    expect(toHex(m[0].path.value as Rgba)).toBe('#6a7686')
  })

  it('names the sidebar ink as the sidebar ink, not as whatever the role guessed', () => {
    // The defect: a sidebar ink at .85 matched no tracked value while the
    // alpha was matched on too, and the report named "Muted text" - a control
    // that moved nothing. Only the sidebar's own control moves this ink.
    const m = matchPaints(rgba('rgba(185, 196, 209, 0.85)'), VARS, VARS)
    expect(m.map((x) => x.key)).toContain('--rm-sidebar-text')
    expect(m.map((x) => x.key)).not.toContain('--rm-muted')
  })

  it('solves the proportion when an ink is two settings mixed', () => {
    // color: color-mix(in srgb, var(--rm-text) 72%, var(--rm-muted))
    const painted = paintWith({ amount: 0.72, partner: rgba('#6a7686'), alpha: 1 }, rgba('#1a1a1a'))
    const m = matchPaints([Math.round(painted[0]), Math.round(painted[1]), Math.round(painted[2]), 1], VARS, VARS)
    expect(m[0].key).toBe('--rm-text')
    expect(m[0].path.amount).toBeCloseTo(0.72, 2)
    expect(m[0].partnerKey).toBe('--rm-muted')
  })

  it('says nothing when no setting on the artboard accounts for the ink', () => {
    expect(matchPaints(rgba('#ff00aa'), VARS, VARS)).toHaveLength(0)
  })

  it('refuses a proportion that is not determined by the two colours', () => {
    // Two near-identical colours mix to the same ink at any proportion, so a
    // proportion solved off them is arithmetic, not evidence.
    expect(solveAmount(rgba('#6a7686'), rgba('#6a7687'), rgba('#6a7685'))).toBeNull()
    // ...and a proportion that only fits one channel is a coincidence.
    expect(solveAmount(rgba('#804020'), rgba('#000000'), rgba('#ffffff'))).toBeNull()
  })

  it('paints a candidate value back through the transform it was traced from', () => {
    const path = { amount: 0.45, partner: rgba('#ffffff'), alpha: 1 }
    expect(toHex(paintWith(path, rgba('#000000')))).toBe('#8c8c8c')
    expect(isTransformed(path)).toBe(true)
    expect(isTransformed({ amount: 1, alpha: 1 })).toBe(false)
  })
})
