import { describe, it, expect, afterEach, vi } from 'vitest'
import * as bidi from './bidi'
import { SOFT_HYPHEN } from '@/lib/hyphenate'
import {
  applyTextTransform,
  collapseWhitespace,
  directionPieces,
  extractRuns,
  foldBlankPieces,
  placeBlanks,
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

  it('splits a right-to-left line with no letter in it the way the browser lays it out', () => {
    // harvard's education date on a right-to-left page: the canvas shows
    // "2017 — 2013", each year left to right, the dash between them right to left.
    setBidi(bidi)
    const raw = '2013 — 2017'
    expect(pieces(raw, directionPieces(raw, 'rtl')!)).toEqual([
      ['2013', 'ltr'],
      [' — ', 'rtl'],
      ['2017', 'ltr'],
    ])
    // A Latin phrase stays one left-to-right run, and a lone run of digits too.
    expect(directionPieces('Mar 2021 — Present', 'rtl')).toBeNull()
    expect(directionPieces('۱۴۰۲', 'rtl')).toBeNull()
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

describe('foldBlankPieces (a space-only piece joins a neighbour, never vanishes)', () => {
  it('folds a trailing space into the piece before it (ltr base)', () => {
    setBidi(bidi)
    // bidi-js levels 1110: the space is its own ltr piece.
    const raw = 'نام '
    expect(bidi.bidiRuns(raw, 'ltr').length).toBe(2)
    expect(pieces(raw, directionPieces(raw, 'ltr')!)).toEqual([['نام ', 'rtl']])
    expect(pieces('کار در ', directionPieces('کار در ', 'ltr')!)).toEqual([['کار در ', 'rtl']])
  })

  it('folds a leading space into the piece after it (rtl base)', () => {
    setBidi(bidi)
    // bidi-js levels 1 22222 111111: the opening space is its own rtl piece.
    const raw = ' React مهندس'
    expect(bidi.bidiRuns(raw, 'rtl').length).toBe(3)
    expect(pieces(raw, directionPieces(raw, 'rtl')!)).toEqual([
      [' React', 'ltr'],
      [' مهندس', 'rtl'],
    ])
    // Under an ltr base, levels 0111: the leading space joins the Persian.
    expect(pieces(' نام', directionPieces(' نام', 'ltr')!)).toEqual([[' نام', 'rtl']])
  })

  it('folds a blank piece between two others into the PREVIOUS one', () => {
    const text = 'abc def'
    const got = foldBlankPieces(text, [
      { start: 0, end: 3, rtl: true },
      { start: 3, end: 4, rtl: false },
      { start: 4, end: 7, rtl: false },
    ])
    expect(got).toEqual([
      { start: 0, end: 4, rtl: true },
      { start: 4, end: 7, rtl: false },
    ])
  })

  it('merges neighbours left with one direction once a blank between them is folded', () => {
    expect(
      foldBlankPieces('abc def', [
        { start: 0, end: 3, rtl: true },
        { start: 3, end: 4, rtl: false },
        { start: 4, end: 7, rtl: true },
      ])
    ).toEqual([{ start: 0, end: 7, rtl: true }])
  })

  it('counts a soft hyphen as blank and keeps a joiner-only piece', () => {
    expect(
      foldBlankPieces('ab' + SOFT_HYPHEN, [
        { start: 0, end: 2, rtl: true },
        { start: 2, end: 3, rtl: false },
      ])
    ).toEqual([{ start: 0, end: 3, rtl: true }])
    expect(
      foldBlankPieces('ab' + ZWNJ, [
        { start: 0, end: 2, rtl: true },
        { start: 2, end: 3, rtl: false },
      ])
    ).toEqual([
      { start: 0, end: 2, rtl: true },
      { start: 2, end: 3, rtl: false },
    ])
  })

  it('leaves pieces without a blank one untouched, and an all-blank text empty', () => {
    const p = [
      { start: 0, end: 2, rtl: true },
      { start: 2, end: 4, rtl: false },
    ]
    expect(foldBlankPieces('abcd', p)).toEqual(p)
    expect(foldBlankPieces('  ', [{ start: 0, end: 2, rtl: false }])).toEqual([])
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
  function stubDom(xOf: (i: number) => number, direction: 'ltr' | 'rtl', letterSpacing = 'normal') {
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
      letterSpacing,
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

  it('keeps a trailing space that bidi puts in its own piece, inside the measured run', () => {
    // "کار در " then a bold word: under an ltr base the last space is level 0.
    const data = 'کار در '
    stubDom((i) => (i < 6 ? 50 - i * 10 : 60), 'ltr')
    setBidi(bidi)
    const runs = extractRuns(textNode(data), root)
    // The space sits to the word's right, the edge an rtl run starts at.
    expect(runs.map((r) => [r.text, r.xPx, r.widthPx, r.direction])).toEqual([[' کار در', 0, 70, 'rtl']])
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

  it('draws a space folded into a run at the edge where the browser put it', () => {
    // ' React مهندس' on a right-to-left line, levels 1 22222 1 11111: the
    // opening space is rightmost, React (drawn left to right) to its left,
    // then the second space, then the Persian word.
    const data = ' React مهندس'
    const xs = [490, 440, 450, 460, 470, 480, 430, 420, 410, 400, 390, 380]
    stubDom((i) => xs[i], 'rtl')
    setBidi(bidi)
    const runs = extractRuns(textNode(data), root)
    expect(runs.map((r) => [r.text, r.xPx, r.widthPx, r.direction])).toEqual([
      // the space sits to React's RIGHT, so it is drawn after it
      ['React ', 440, 60, undefined],
      // and to the Persian word's right, which is where an rtl run starts
      [' مهندس', 380, 60, 'rtl'],
    ])
  })

  it('draws a punctuation-only node of a right-to-left line with its space on the side the browser drew it', () => {
    // "فرانت‌اند: React": the ": " node alone, the colon at 60..70, the space to its LEFT.
    stubDom((i) => (i === 0 ? 60 : 50), 'rtl')
    setBidi(bidi)
    const runs = extractRuns(textNode(': '), root)
    // One right-to-left piece: its text starts at the right, so the space,
    // drawn on the left, is its last character.
    expect(runs.map((r) => [r.text, r.xPx, r.widthPx, r.direction])).toEqual([[': ', 50, 20, 'rtl']])
  })

  it('draws Arabic script untracked, as the browser does, and keeps the tracking of the Latin beside it', () => {
    // chronicle's tracked title: Chromium spaces no cursive script, so the
    // canvas shows the Persian joined and untracked. Tracked in the file, its
    // letters came apart and the run ran over the dash beside it.
    const data = 'Vertex مهندس'
    stubDom((i) => (i < 7 ? i * 10 : 70 + (11 - i) * 10), 'ltr', '1.5px')
    setBidi(bidi)
    const runs = extractRuns(textNode(data), root)
    expect(runs.map((r) => [r.text, r.letterSpacingPx])).toEqual([
      ['Vertex ', 1.5],
      ['مهندس', 0],
    ])
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

describe('placeBlanks (the spaces of a run go where the browser drew them)', () => {
  const core = { left: 100, right: 200 }
  it('puts a space on the left before a left-to-right core and after a right-to-left one', () => {
    expect(placeBlanks('ab', core, [{ left: 90, right: 100 }], false)).toBe(' ab')
    expect(placeBlanks('ab', core, [{ left: 90, right: 100 }], true)).toBe('ab ')
  })
  it('puts a space on the right after a left-to-right core and before a right-to-left one', () => {
    expect(placeBlanks('ab', core, [{ left: 200, right: 210 }], false)).toBe('ab ')
    expect(placeBlanks('ab', core, [{ left: 200, right: 210 }], true)).toBe(' ab')
  })
  it('leaves out a space that does not touch the core: it belongs beside another run', () => {
    // harvard, a right-to-left page: "· English (C1)", where the space before
    // the "English" node sits to the right of "(C1)", not of "English".
    expect(placeBlanks('English', { left: 0, right: 43 }, [{ left: 71, right: 75 }], false)).toBe('English')
  })

  it('leaves out a space with no width: the one hanging at a line end draws nothing', () => {
    // clarity: "... React و " broken after و; the space after it hangs at the line end.
    expect(placeBlanks('و', { left: 246, right: 251 }, [{ left: 251, right: 254 }, { left: 246, right: 246 }], true)).toBe(' و')
  })

  it('never doubles a space on one side', () => {
    expect(placeBlanks('ab', core, [{ left: 90, right: 100 }, { left: 80, right: 90 }, { left: 200, right: 210 }], false)).toBe(' ab ')
  })
})
