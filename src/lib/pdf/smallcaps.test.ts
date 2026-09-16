/**
 * Small-caps segmentation (2026-08-19 user report: the editor shows SMALL-CAPS
 * section headings while the exported PDF showed plain "Summary"). Six
 * templates set `font-variant: small-caps`; none of our 118 self-hosted fonts
 * carries a real `smcp` feature, so Chromium SYNTHESIZES small caps by drawing
 * the uppercase glyph of every lowercase letter at a reduced size.
 *
 * This splitter describes the SIZE change to the painter, and nothing else:
 * each segment keeps the source's own text. The capitals come from the font
 * cut that draws the reduced segments (fonts.ts's `smallCapsVariant`), so the
 * file shows capitals and says "Summary" — which is what it has to say, or a
 * parser reads marquee's "Languages" skill group as a LANGUAGES section.
 */
import { describe, it, expect } from 'vitest'
import { smallCapsSegments } from './smallcaps'

describe('smallCapsSegments', () => {
  it('splits a title-case word into a full-size cap and reduced-size letters', () => {
    expect(smallCapsSegments('Summary')).toEqual([
      { text: 'S', reduced: false },
      { text: 'ummary', reduced: true },
    ])
  })

  it('keeps spaces and punctuation at FULL size (only cased letters shrink)', () => {
    expect(smallCapsSegments('Work Experience')).toEqual([
      { text: 'W', reduced: false },
      { text: 'ork', reduced: true },
      { text: ' E', reduced: false },
      { text: 'xperience', reduced: true },
    ])
  })

  it('leaves already-uppercase text as a single full-size segment', () => {
    expect(smallCapsSegments('B.B.A.')).toEqual([{ text: 'B.B.A.', reduced: false }])
    expect(smallCapsSegments('EDUCATION')).toEqual([{ text: 'EDUCATION', reduced: false }])
  })

  it('treats digits and symbols as uncased (full size)', () => {
    expect(smallCapsSegments('Top 10 & more')).toEqual([
      { text: 'T', reduced: false },
      { text: 'op', reduced: true },
      { text: ' 10 & ', reduced: false },
      { text: 'more', reduced: true },
    ])
  })

  it('handles an all-lowercase string as one reduced segment', () => {
    expect(smallCapsSegments('skills')).toEqual([{ text: 'skills', reduced: true }])
  })

  it('is empty for empty input', () => {
    expect(smallCapsSegments('')).toEqual([])
  })

  it('reduces non-ASCII lowercase letters too, still in their own case', () => {
    expect(smallCapsSegments('éducation')).toEqual([{ text: 'éducation', reduced: true }])
    expect(smallCapsSegments('Über')).toEqual([
      { text: 'Ü', reduced: false },
      { text: 'ber', reduced: true },
    ])
  })

  it('reduces a letter whose uppercase is TWO characters, without rewriting it', () => {
    // ß uppercases to "SS", which no cmap can express as one glyph — it takes
    // the reduced size and keeps its own shape, as Chromium draws it.
    expect(smallCapsSegments('Straße')).toEqual([
      { text: 'S', reduced: false },
      { text: 'traße', reduced: true },
    ])
  })

  it('round-trips the SOURCE text: concatenating the segments gives it back', () => {
    for (const s of ['Summary', 'Work Experience', 'B.B.A.', 'Top 10 & more', 'éducation', 'Straße']) {
      expect(
        smallCapsSegments(s)
          .map((x) => x.text)
          .join('')
      ).toBe(s)
    }
  })
})
