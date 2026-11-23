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

  it('keeps a zero-width non-joiner or joiner beside an Arabic-script letter', () => {
    // "نوری‌زاده": the ZWNJ is what stops ی joining ز. Dropping it made the
    // browser (and then the PDF) draw the joined form, and the name read
    // "نوریزاده" back out of the file.
    expect(applyCharFallback('نوری‌زاده')).toBe('نوری‌زاده')
    expect(applyCharFallback('می‌شود')).toBe('می‌شود')
    expect(applyCharFallback('ل‍ا')).toBe('ل‍ا')
    // The rest of the zero-width family still goes, even in Persian text.
    expect(applyCharFallback('نوری​زاده')).toBe('نوریزاده')
  })

  it('still drops a zero-width joiner or non-joiner in Latin text', () => {
    expect(applyCharFallback('Data‌Science')).toBe('DataScience')
    expect(applyCharFallback('a‍b')).toBe('ab')
  })

  it('leaves alone the characters that already survive the pipeline', () => {
    for (const s of ['2018 \u2013 2021', 'x \u2212 y', 'caf\u00e9', '\u2018quoted\u2019', 'plain-hyphen']) {
      expect(applyCharFallback(s)).toBe(s)
      expect(needsFallback(s)).toBe(false)
    }
  })
})
