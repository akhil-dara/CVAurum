/**
 * Synthetic small-caps segmentation (2026-08-19 user report: the editor shows
 * SMALL-CAPS section headings while the exported PDF showed plain "Summary").
 * Six templates set `font-variant: small-caps`; none of our 118 self-hosted
 * fonts carries a real `smcp` feature, so Chromium SYNTHESIZES small caps by
 * drawing the uppercase glyph of every lowercase letter at a reduced size —
 * which is exactly what this splitter describes to the painter.
 */
import { describe, it, expect } from 'vitest'
import { smallCapsSegments } from './smallcaps'

describe('smallCapsSegments', () => {
  it('splits a title-case word into a full-size cap and reduced-size caps', () => {
    expect(smallCapsSegments('Summary')).toEqual([
      { text: 'S', reduced: false },
      { text: 'UMMARY', reduced: true },
    ])
  })

  it('keeps spaces and punctuation at FULL size (only cased letters shrink)', () => {
    expect(smallCapsSegments('Work Experience')).toEqual([
      { text: 'W', reduced: false },
      { text: 'ORK', reduced: true },
      { text: ' E', reduced: false },
      { text: 'XPERIENCE', reduced: true },
    ])
  })

  it('leaves already-uppercase text as a single full-size segment', () => {
    expect(smallCapsSegments('B.B.A.')).toEqual([{ text: 'B.B.A.', reduced: false }])
    expect(smallCapsSegments('EDUCATION')).toEqual([{ text: 'EDUCATION', reduced: false }])
  })

  it('treats digits and symbols as uncased (full size)', () => {
    expect(smallCapsSegments('Top 10 & more')).toEqual([
      { text: 'T', reduced: false },
      { text: 'OP', reduced: true },
      { text: ' 10 & ', reduced: false },
      { text: 'MORE', reduced: true },
    ])
  })

  it('handles an all-lowercase string as one reduced segment', () => {
    expect(smallCapsSegments('skills')).toEqual([{ text: 'SKILLS', reduced: true }])
  })

  it('is empty for empty input', () => {
    expect(smallCapsSegments('')).toEqual([])
  })

  it('uppercases non-ASCII lowercase letters too', () => {
    expect(smallCapsSegments('éducation')).toEqual([{ text: 'ÉDUCATION', reduced: true }])
    expect(smallCapsSegments('Über')).toEqual([
      { text: 'Ü', reduced: false },
      { text: 'BER', reduced: true },
    ])
  })

  it('round-trips the visible text: concatenating segments uppercases the source', () => {
    for (const s of ['Summary', 'Work Experience', 'B.B.A.', 'Top 10 & more', 'éducation']) {
      expect(
        smallCapsSegments(s)
          .map((x) => x.text)
          .join('')
      ).toBe(s.toUpperCase())
    }
  })
})
