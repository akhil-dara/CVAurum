import { describe, expect, it } from 'vitest'
import { applyCharFallback, needsFallback } from './charFallback'

describe('applyCharFallback', () => {
  it('turns every unsupported hyphen into one the fonts can draw', () => {
    // A certificate pasted from Word carries U+2011, and it was being dropped:
    // "PL-300" reached the text layer as "PL300" and matched nothing.
    expect(applyCharFallback('PL\u2011300')).toBe('PL-300')
    expect(applyCharFallback('PL\u2010300')).toBe('PL-300')
    expect(applyCharFallback('PL\u2012300')).toBe('PL-300')
  })

  it('normalises non-breaking and thin spaces to a plain space', () => {
    expect(applyCharFallback('A\u00a0B')).toBe('A B')
    expect(applyCharFallback('A\u202fB')).toBe('A B')
  })

  it('drops invisible marks entirely', () => {
    expect(applyCharFallback('soft\u00adhyphen')).toBe('softhyphen')
    expect(applyCharFallback('zero\u200bwidth')).toBe('zerowidth')
  })

  it('leaves alone the characters that already survive the pipeline', () => {
    for (const s of ['2018 \u2013 2021', 'x \u2212 y', 'caf\u00e9', '\u2018quoted\u2019', 'plain-hyphen']) {
      expect(applyCharFallback(s)).toBe(s)
      expect(needsFallback(s)).toBe(false)
    }
  })
})
