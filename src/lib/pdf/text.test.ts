import { describe, it, expect, afterEach } from 'vitest'
import { applyTextTransform, collapseWhitespace, extractRuns } from './text'

describe('applyTextTransform', () => {
  it('uppercases (our section titles are tracked uppercase)', () => {
    expect(applyTextTransform('Experience', 'uppercase')).toBe('EXPERIENCE')
  })
  it('lowercases', () => {
    expect(applyTextTransform('Experience', 'lowercase')).toBe('experience')
  })
  it('capitalises each word', () => {
    expect(applyTextTransform('senior engineer', 'capitalize')).toBe('Senior Engineer')
  })
  it('passes text through for none/unknown', () => {
    expect(applyTextTransform('Kept As-Is', 'none')).toBe('Kept As-Is')
    expect(applyTextTransform('Kept As-Is', '')).toBe('Kept As-Is')
  })
})

describe('collapseWhitespace', () => {
  it('collapses runs of whitespace to one space when white-space is normal', () => {
    expect(collapseWhitespace('Led   the\n  rebuild', 'normal')).toBe('Led the rebuild')
  })
  it('preserves text verbatim for pre/pre-wrap', () => {
    expect(collapseWhitespace('a   b', 'pre')).toBe('a   b')
    expect(collapseWhitespace('a   b', 'pre-wrap')).toBe('a   b')
  })
  it('handles an empty string', () => {
    expect(collapseWhitespace('', 'normal')).toBe('')
  })
  it('keeps a single leading/trailing space rather than trimming it', () => {
    // This is what separates adjacent inline runs on the same line (e.g.
    // plain text ending "...from 820ms to " immediately followed by a bold
    // "190ms" span): the trailing space must survive so the drawn text
    // doesn't read "to190ms".
    expect(collapseWhitespace('to ', 'normal')).toBe('to ')
    expect(collapseWhitespace(' 190ms', 'normal')).toBe(' 190ms')
    expect(collapseWhitespace('a  ', 'normal')).toBe('a ')
  })
})

describe('extractRuns — widthPx (task 12)', () => {
  // This suite runs under vitest's plain 'node' environment (see
  // vitest.config.ts — deliberately not jsdom/happy-dom), so there's no real
  // `document`/`getComputedStyle`/`Range` to exercise extractRuns against.
  // Rather than pull in a DOM implementation for one function, this stubs
  // just the handful of DOM entry points extractRuns actually calls with
  // fakes that mimic a single line of real text: a Range whose
  // getBoundingClientRect always returns the SAME fixed rect (this is the
  // "simple single-line node" case — no line-break detection needed), and a
  // canvas 2D context stub for ascentPx's baseline measurement.
  const originalDocument = globalThis.document
  const originalGetComputedStyle = globalThis.getComputedStyle

  afterEach(() => {
    globalThis.document = originalDocument
    globalThis.getComputedStyle = originalGetComputedStyle
  })

  it('emits widthPx from the same client rect xPx already comes from, for a simple single-line run', () => {
    const RECT = { top: 100, left: 40, right: 130, bottom: 116 }
    const fakeRange = {
      setStart: () => {},
      setEnd: () => {},
      getBoundingClientRect: () => ({ ...RECT }),
    }
    const fakeCanvasCtx = {
      font: '',
      measureText: () => ({ width: 6, fontBoundingBoxAscent: 9, actualBoundingBoxAscent: 9 }),
    }
    globalThis.document = {
      createRange: () => fakeRange,
      createElement: () => ({ getContext: () => fakeCanvasCtx }),
    } as unknown as Document
    globalThis.getComputedStyle = (() => ({
      visibility: 'visible',
      display: 'inline',
      opacity: '1',
      color: 'rgb(20, 20, 20)',
      fontStyle: 'normal',
      fontWeight: '400',
      fontSize: '12px',
      fontFamily: 'Arial',
      whiteSpace: 'normal',
      textTransform: 'none',
      letterSpacing: 'normal',
    })) as unknown as typeof getComputedStyle

    const parent = {} as unknown as HTMLElement
    const node = { data: 'Hi', parentElement: parent } as unknown as Text
    const root = { getBoundingClientRect: () => ({ top: 0, left: 0, right: 200, bottom: 300 }) } as unknown as HTMLElement

    const runs = extractRuns(node, root)

    expect(runs.length).toBe(1)
    expect(runs[0].widthPx).toBeGreaterThan(0)
    // Same rect xPx is derived from (rect.left - rootRect.left): widthPx is
    // rect.right - rect.left off that identical rect, per the task-12 brief.
    expect(runs[0].widthPx).toBe(RECT.right - RECT.left)
    expect(runs[0].xPx).toBe(RECT.left - 0)
  })
})
