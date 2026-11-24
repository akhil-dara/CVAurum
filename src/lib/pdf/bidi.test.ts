import { describe, expect, it } from 'vitest'
import bidiFactory from 'bidi-js'
import { bidiRuns, hasStrongRtl, mirrorForRtl, type BidiRun } from './bidi'

const reference = bidiFactory()

/** The text of each run, paired with its direction, in logical order. */
function pieces(text: string, runs: BidiRun[]): Array<[string, 'rtl' | 'ltr']> {
  return runs.map((r) => [text.slice(r.start, r.end), r.rtl ? 'rtl' : 'ltr'])
}

/** Runs cover the text exactly: contiguous, non-empty, start at 0, end at length. */
function expectCovers(text: string, runs: BidiRun[]): void {
  let at = 0
  for (const r of runs) {
    expect(r.start).toBe(at)
    expect(r.end).toBeGreaterThan(r.start)
    at = r.end
  }
  expect(at).toBe(text.length)
}

/** Every character's run direction agrees with bidi-js's own level parity. */
function expectMatchesLevels(text: string, base: 'rtl' | 'ltr', runs: BidiRun[]): void {
  const { levels } = reference.getEmbeddingLevels(text, base)
  for (const r of runs) {
    for (let i = r.start; i < r.end; i++) expect((levels[i] & 1) === 1).toBe(r.rtl)
  }
  // Maximal: neighbouring runs never share a direction.
  for (let k = 1; k < runs.length; k++) expect(runs[k].rtl).not.toBe(runs[k - 1].rtl)
}

describe('bidiRuns', () => {
  it('isolates a Latin word inside Persian, with the spaces on the rtl side', () => {
    const text = 'مهندس React ارشد'
    const runs = bidiRuns(text, 'rtl')
    expectCovers(text, runs)
    expectMatchesLevels(text, 'rtl', runs)
    expect(pieces(text, runs)).toEqual([
      ['مهندس ', 'rtl'],
      ['React', 'ltr'],
      [' ارشد', 'rtl'],
    ])
  })

  it('gives Persian digits inside rtl text an ltr run', () => {
    const text = 'کاهش ۳۸٪ خطا'
    const runs = bidiRuns(text, 'rtl')
    expectCovers(text, runs)
    expectMatchesLevels(text, 'rtl', runs)
    const digits = runs.find((r) => r.start <= text.indexOf('۳۸') && r.end >= text.indexOf('۳۸') + 2)
    expect(digits).toBeDefined()
    expect(digits!.rtl).toBe(false)
    expect(text.slice(digits!.start, digits!.end)).toBe('۳۸')
  })

  it('marks the Persian run rtl and the year ltr inside an ltr line', () => {
    const text = 'Vertex Labs مهندس 2021'
    const runs = bidiRuns(text, 'ltr')
    expectCovers(text, runs)
    expectMatchesLevels(text, 'ltr', runs)
    const persian = runs.find((r) => text.slice(r.start, r.end).includes('مهندس'))!
    expect(persian.rtl).toBe(true)
    const year = runs.find((r) => text.slice(r.start, r.end).includes('2021'))!
    expect(year.rtl).toBe(false)
    expect(text.slice(year.start, year.end)).toBe('2021')
  })

  it('leaves plain English as one ltr run', () => {
    const text = 'plain English'
    expect(bidiRuns(text, 'ltr')).toEqual([{ start: 0, end: text.length, rtl: false }])
  })

  it('returns no runs for empty text', () => {
    expect(bidiRuns('', 'rtl')).toEqual([])
  })
})

describe('hasStrongRtl', () => {
  it('is false for plain English and true for Persian', () => {
    expect(hasStrongRtl('plain English')).toBe(false)
    expect(hasStrongRtl('2021 (x)')).toBe(false)
    expect(hasStrongRtl('Vertex Labs مهندس')).toBe(true)
  })

  it('counts Hebrew as strong rtl, and Persian digits alone as not', () => {
    expect(hasStrongRtl('שלום')).toBe(true)
    expect(hasStrongRtl('۳۸')).toBe(false)
  })
})

describe('mirrorForRtl', () => {
  it('swaps parentheses before an rtl run is reversed for display', () => {
    expect(mirrorForRtl('(مادری)')).toBe(')مادری(')
  })

  it('swaps guillemets', () => {
    expect(mirrorForRtl('«x»')).toBe('»x«')
  })

  it('leaves text with no mirrored characters unchanged', () => {
    expect(mirrorForRtl('abc مهندس')).toBe('abc مهندس')
  })
})
