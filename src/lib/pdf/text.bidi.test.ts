import { describe, it, expect, afterEach, vi } from 'vitest'
import * as bidi from './bidi'
import {
  applyTextTransform,
  collapseWhitespace,
  directionPieces,
  extractRuns,
  prepareBidi,
  setBidi,
  splitSegmentByDirection,
} from './text'

const ZWNJ = '\u200C'
const ZWJ = '\u200D'

afterEach(() => setBidi(null))

/** The text of each piece, paired with its direction, in logical order. */
function pieces(text: string, runs: { start: number; end: number; rtl: boolean }[]): Array<[string, 'rtl' | 'ltr']> {
  return runs.map((r) => [text.slice(r.start, r.end), r.rtl ? 'rtl' : 'ltr'])
}

describe('splitSegmentByDirection', () => {
  it('returns the boundaries bidiRuns returns, on the strings Task 3 tests', () => {
    setBidi(bidi)
    const cases: Array<[string, 'rtl' | 'ltr']> = [
      ['مهندس React ارشد', 'rtl'],
      ['کاهش ۳۸٪ خطا', 'rtl'],
      ['Vertex Labs مهندس 2021', 'ltr'],
    ]
    for (const [text, base] of cases) {
      expect(splitSegmentByDirection(text, base)).toEqual(bidi.bidiRuns(text, base))
    }
    expect(pieces('مهندس React ارشد', splitSegmentByDirection('مهندس React ارشد', 'rtl'))).toEqual([
      ['مهندس ', 'rtl'],
      ['React', 'ltr'],
      [' ارشد', 'rtl'],
    ])
  })

  it('returns one ltr run for pure Latin', () => {
    setBidi(bidi)
    expect(splitSegmentByDirection('plain English', 'ltr')).toEqual([{ start: 0, end: 13, rtl: false }])
  })

  it('returns no runs for empty text', () => {
    setBidi(bidi)
    expect(splitSegmentByDirection('', 'rtl')).toEqual([])
  })
})

describe('joiners survive the text pipeline', () => {
  it('collapseWhitespace keeps U+200C', () => {
    expect(collapseWhitespace('نوری‌زاده', 'normal')).toBe('نوری‌زاده')
    expect(collapseWhitespace('نوری‌زاده', 'normal')).toContain(ZWNJ)
  })

  it('collapseWhitespace and text-transform keep U+200C and U+200D', () => {
    const text = `a${ZWNJ}b  c${ZWJ}d`
    expect(collapseWhitespace(text, 'normal')).toBe(`a${ZWNJ}b c${ZWJ}d`)
    expect(applyTextTransform(text, 'uppercase')).toBe(`A${ZWNJ}B  C${ZWJ}D`)
  })
})

describe('directionPieces (the walker decides whether a line splits)', () => {
  it('never calls the bidi functions for Latin text, even with bidi installed', () => {
    const spy = { bidiRuns: vi.fn(bidi.bidiRuns), hasStrongRtl: vi.fn(bidi.hasStrongRtl) }
    setBidi(spy)
    expect(directionPieces('Senior Engineer, 2019 - 2024', 'ltr')).toBeNull()
    expect(directionPieces('Ünïcödé façade — naïve', 'ltr')).toBeNull()
    expect(spy.bidiRuns).not.toHaveBeenCalled()
    expect(spy.hasStrongRtl).not.toHaveBeenCalled()
  })

  it('falls back to one run (null) for Persian when no bidi is installed', () => {
    expect(directionPieces('مهندس React ارشد', 'rtl')).toBeNull()
  })

  it('returns null for Arabic-script text with no strong rtl letter (Arabic-Indic digits alone)', () => {
    setBidi(bidi)
    expect(directionPieces('۱۴۰۲', 'ltr')).toBeNull()
  })

  it('splits a mixed line, with indices valid on the raw text', () => {
    setBidi(bidi)
    const raw = 'Vertex Labs\nمهندس 2021'
    const got = directionPieces(raw, 'ltr')!
    expect(pieces(raw, got)).toEqual([
      ['Vertex Labs\n', 'ltr'],
      ['مهندس ', 'rtl'],
      ['2021', 'ltr'],
    ])
  })
})

describe('prepareBidi (lazy load on the export path)', () => {
  it('does not load bidi for a document without Arabic script, and clears any installed one', async () => {
    setBidi(bidi)
    const load = vi.fn(async () => bidi)
    await prepareBidi(false, load)
    expect(load).not.toHaveBeenCalled()
    expect(directionPieces('مهندس React ارشد', 'rtl')).toBeNull()
  })

  it('loads and installs bidi for a document with Arabic script', async () => {
    const load = vi.fn(async () => bidi)
    await prepareBidi(true, load)
    expect(load).toHaveBeenCalledTimes(1)
    expect(directionPieces('مهندس React ارشد', 'rtl')).not.toBeNull()
  })
})

describe('extractRuns emits one run per direction', () => {
  const originalDocument = globalThis.document
  const originalGetComputedStyle = globalThis.getComputedStyle
  afterEach(() => {
    globalThis.document = originalDocument
    globalThis.getComputedStyle = originalGetComputedStyle
  })

  /**
   * One line of text laid out the way the browser draws it: `xOf(i)` is the
   * left edge of logical character i (each 10px wide). A Range's boxes are
   * the union of its characters' boxes.
   */
  function stubDom(xOf: (i: number) => number, direction: 'ltr' | 'rtl') {
    const box = (s: number, e: number) => {
      let left = Infinity
      let right = -Infinity
      for (let i = s; i < e; i++) {
        left = Math.min(left, xOf(i))
        right = Math.max(right, xOf(i) + 10)
      }
      return { top: 100, bottom: 116, left, right, width: right - left, height: 16 }
    }
    globalThis.document = {
      createRange: () => {
        let s = 0
        let e = 0
        return {
          setStart: (_n: unknown, o: number) => (s = o),
          setEnd: (_n: unknown, o: number) => (e = o),
          getBoundingClientRect: () => box(s, e),
          getClientRects: () => [box(s, e)],
        }
      },
      createElement: () => ({
        getContext: () => ({ font: '', measureText: () => ({ width: 6, fontBoundingBoxAscent: 9 }) }),
      }),
    } as unknown as Document
    globalThis.getComputedStyle = (() => ({
      visibility: 'visible',
      display: 'inline',
      opacity: '1',
      color: 'rgb(20, 20, 20)',
      fontStyle: 'normal',
      fontWeight: '400',
      fontSize: '12px',
      fontFamily: 'Vazirmatn',
      whiteSpace: 'normal',
      textTransform: 'none',
      letterSpacing: 'normal',
      direction,
    })) as unknown as typeof getComputedStyle
  }
  const root = { getBoundingClientRect: () => ({ top: 0, left: 0, right: 500, bottom: 300 }) } as unknown as HTMLElement
  const textNode = (data: string) => ({ data, parentElement: {} }) as unknown as Text

  it('measures the Persian piece of an ltr line where the browser drew it', () => {
    // "Vertex مهندس": the seven Latin characters (with the space) sit at
    // 0..70, the Persian word is drawn right to left over 70..120.
    const data = 'Vertex مهندس'
    stubDom((i) => (i < 7 ? i * 10 : 70 + (11 - i) * 10), 'ltr')
    setBidi(bidi)
    const runs = extractRuns(textNode(data), root)
    expect(runs.map((r) => [r.text, r.xPx, r.widthPx, r.direction])).toEqual([
      ['Vertex ', 0, 70, undefined],
      ['مهندس', 70, 50, 'rtl'],
    ])
    expect('direction' in runs[0]).toBe(false)
  })

  it('keeps U+200C inside an rtl run', () => {
    const data = `نوری${ZWNJ}زاده React`
    // Right-to-left line: the Persian name from 500 leftwards, React at its left.
    stubDom((i) => (i < 10 ? 490 - i * 10 : 350 + (i - 10) * 10), 'rtl')
    setBidi(bidi)
    const runs = extractRuns(textNode(data), root)
    expect(runs.map((r) => [r.text, r.direction])).toEqual([
      [`نوری${ZWNJ}زاده `, 'rtl'],
      ['React', undefined],
    ])
    expect(runs[1].xPx).toBe(350)
    expect(runs[1].widthPx).toBe(50)
  })

  it('leaves Latin text as one run with no direction key, bidi installed or not', () => {
    const data = 'Senior Engineer'
    stubDom((i) => i * 10, 'ltr')
    const without = extractRuns(textNode(data), root)
    setBidi(bidi)
    const withBidi = extractRuns(textNode(data), root)
    expect(withBidi).toEqual(without)
    expect(withBidi.length).toBe(1)
    expect('direction' in withBidi[0]).toBe(false)
  })

  it('falls back to one run for Persian when no bidi is installed', () => {
    const data = 'Vertex مهندس'
    stubDom((i) => (i < 7 ? i * 10 : 70 + (11 - i) * 10), 'ltr')
    const runs = extractRuns(textNode(data), root)
    expect(runs.length).toBe(1)
    expect(runs[0].text).toBe(data)
    expect('direction' in runs[0]).toBe(false)
  })
})
