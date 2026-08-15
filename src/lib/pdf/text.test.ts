import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  applyTextTransform,
  collapseWhitespace,
  extractRuns,
  halfLeadingBaselinePx,
  textNodeLineSegments,
} from './text'

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
    const root = {
      getBoundingClientRect: () => ({ top: 0, left: 0, right: 200, bottom: 300 }),
    } as unknown as HTMLElement

    const runs = extractRuns(node, root)

    expect(runs.length).toBe(1)
    expect(runs[0].widthPx).toBeGreaterThan(0)
    // Same rect xPx is derived from (rect.left - rootRect.left): widthPx is
    // rect.right - rect.left off that identical rect, per the task-12 brief.
    expect(runs[0].widthPx).toBe(RECT.right - RECT.left)
    expect(runs[0].xPx).toBe(RECT.left - 0)
  })
})

describe('textNodeLineSegments (task 2, native-multipage-pdf plan — shared line-rect helper factored out of extractRuns)', () => {
  const originalDocument = globalThis.document
  afterEach(() => {
    globalThis.document = originalDocument
  })

  it('returns a single segment spanning the whole node for a one-line run', () => {
    const rect = { top: 100, bottom: 116, left: 0, right: 40 }
    globalThis.document = {
      createRange: () => ({ setStart: () => {}, setEnd: () => {}, getBoundingClientRect: () => rect }),
    } as unknown as Document

    const node = { data: 'Hi' } as unknown as Text
    expect(textNodeLineSegments(node)).toEqual([{ start: 0, end: 2, rect }])
  })

  it('splits into per-visual-line segments where a character top jumps by more than 1px (soft wrap) — extractPageBlocks (walk.ts) reuses this exact geometry for its "line" PageBlocks', () => {
    // "ABCD": chars 0-1 sit on one visual line (top 100), chars 2-3 on the
    // next (top 120) — models a two-line wrap the same way extractRuns'
    // pre-factor inline loop did (compare each character's own top to the
    // previous one).
    const charRect = (i: number) =>
      i < 2
        ? { top: 100, bottom: 116, left: i * 10, right: i * 10 + 10 }
        : { top: 120, bottom: 136, left: i * 10, right: i * 10 + 10 }
    globalThis.document = {
      createRange: () => {
        let start = 0
        let end = 0
        return {
          setStart: (_n: unknown, o: number) => {
            start = o
          },
          setEnd: (_n: unknown, o: number) => {
            end = o
          },
          // Single-character query (the segmentation loop): that char's own
          // rect. Multi-character query (the per-segment measurement loop):
          // the union bounding box of its first and last character — a
          // reasonable stand-in for what a real multi-char Range reports.
          getBoundingClientRect: () => {
            if (end - start <= 1) return charRect(start)
            const first = charRect(start)
            const last = charRect(end - 1)
            return {
              top: Math.min(first.top, last.top),
              bottom: Math.max(first.bottom, last.bottom),
              left: first.left,
              right: last.right,
            }
          },
        }
      },
    } as unknown as Document

    const node = { data: 'ABCD' } as unknown as Text
    const segments = textNodeLineSegments(node)

    expect(segments).toEqual([
      { start: 0, end: 2, rect: { top: 100, bottom: 116, left: 0, right: 20 } },
      { start: 2, end: 4, rect: { top: 120, bottom: 136, left: 20, right: 40 } },
    ])
  })

  it('returns an empty array for an empty text node, without touching the DOM at all', () => {
    globalThis.document = {
      createRange: () => {
        throw new Error('should not be called for an empty node')
      },
    } as unknown as Document

    const node = { data: '' } as unknown as Text
    expect(textNodeLineSegments(node)).toEqual([])
  })
})

describe('halfLeadingBaselinePx (task 14 — true DOM baselines, half-leading arithmetic)', () => {
  it('degrades to the pre-task-14 formula (rect.top + ascent) when the probe fell back (heightPx: null)', () => {
    // No matching DOM line-box height to center against when the probe was
    // unusable — mixing a canvas-derived ascent with a real DOM height would
    // be worse than either alone, so the centering term is skipped entirely.
    expect(halfLeadingBaselinePx(100, 0, 16, { ascentPx: 9, heightPx: null })).toBe(109)
  })

  it('is a near no-op when line-height is normal (layoutHeightPx ~= the measured rect height)', () => {
    // rect height (16) - layoutHeightPx (16) = 0 -> the centering term
    // vanishes; baseline is just rect.top + the (now more accurate) ascent.
    expect(halfLeadingBaselinePx(100, 0, 16, { ascentPx: 11.5, heightPx: 16 })).toBe(111.5)
  })

  it('centers the font box in a taller line box (line-height > font box — the actual defect this fixes)', () => {
    // A 20px line box around a 14px font box (10 ascent + 4 descent): 3px of
    // half-leading pads the TOP of the line box before the font box starts,
    // so the baseline sits 3px lower than rect.top + ascent alone would put it.
    const baseline = halfLeadingBaselinePx(200, 50, /* rectHeight */ 20, { ascentPx: 10, heightPx: 14 })
    expect(baseline).toBe(200 - 50 + 3 + 10) // (20 - 14) / 2 = 3px half-leading
  })

  it('is relative to root, not the page (rootTop subtracted before adding the offsets)', () => {
    expect(halfLeadingBaselinePx(500, 400, 16, { ascentPx: 9, heightPx: 16 })).toBe(500 - 400 + 9)
  })

  it('clamps the centering term at 0 rather than going negative when layoutHeightPx overshoots rect.height', () => {
    // Real regression found via the live probe (task-14 report): Poppins
    // Bold's "line-height: normal" probe height (47px at the clarity
    // template's actual heading size) overshot the REAL single line's
    // measured rect.height (44px) — the font's "normal" reference includes
    // more line-gap than this specific heading's own (tighter) authored
    // line-height. Applied verbatim, (44 - 47) / 2 = -1.5 pulled the
    // baseline UP, regressing dy from -0.66pt to -1.03pt vs print ground
    // truth. There is no such thing as negative leading on a single line, so
    // the term must never subtract — only the (now more accurate) ascent
    // applies here, same as the heightPx: null fallback path.
    const baseline = halfLeadingBaselinePx(100, 0, /* rectHeight */ 44, { ascentPx: 34, heightPx: 47 })
    expect(baseline).toBe(100 - 0 + 34) // NOT 100 - 1.5 + 34
  })

  it('still applies a genuinely positive centering term even right at the clamp boundary', () => {
    // rectHeight exactly equal to layoutHeightPx is the boundary between the
    // two regimes: (0)/2 = 0 either way, clamped or not — confirms the clamp
    // doesn't accidentally suppress the boundary case itself.
    expect(halfLeadingBaselinePx(100, 0, 14, { ascentPx: 10, heightPx: 14 })).toBe(110)
  })
})

describe('layoutMetricsFor / extractRuns — DOM layout probe (task 14)', () => {
  // These tests need a FRESH module instance per test (task-14's cache is
  // module-level, keyed only by font shorthand, and persists for the file's
  // whole run under vitest's default single-instance-per-file module
  // registry) — vi.resetModules() + a dynamic import gives each test its own
  // isolated ascentCache/layoutMetricsCache/measureDiv/measureProbe, so one
  // test's mocked probe rects can never leak into another's expectations
  // (unlike the static top-of-file import the other describes share).
  const originalDocument = globalThis.document
  const originalGetComputedStyle = globalThis.getComputedStyle

  afterEach(() => {
    globalThis.document = originalDocument
    globalThis.getComputedStyle = originalGetComputedStyle
    vi.resetModules()
  })

  // tag-dispatching createElement stub: 'div' -> the line-box container,
  // 'span' -> the inline-block probe, 'canvas' -> the ascentPx fallback's
  // measurement context (fontBoundingBoxAscent = canvasAscent).
  function fakeDocument(opts: { divTop: number; divHeight: number; probeTop: number; canvasAscent?: number }) {
    const div = {
      style: {} as Record<string, string>,
      appendChild: () => {},
      getBoundingClientRect: () => ({ top: opts.divTop, height: opts.divHeight }),
    }
    const probe = { style: {} as Record<string, string>, getBoundingClientRect: () => ({ top: opts.probeTop }) }
    const canvasCtx = {
      font: '',
      measureText: () => ({
        width: 6,
        fontBoundingBoxAscent: opts.canvasAscent ?? 9,
        actualBoundingBoxAscent: opts.canvasAscent ?? 9,
      }),
    }
    const doc = {
      body: { appendChild: () => {} },
      createElement: (tag: string) => (tag === 'div' ? div : tag === 'span' ? probe : { getContext: () => canvasCtx }),
      createTextNode: () => ({}),
    }
    return { doc: doc as unknown as Document, div, probe }
  }

  it('measures ascent as probeRect.top - divRect.top, and height as the div line-box height', async () => {
    vi.resetModules()
    globalThis.document = fakeDocument({ divTop: 50, divHeight: 20, probeTop: 64 }).doc // ascent = 14
    const { layoutMetricsFor } = await import('./text')
    expect(layoutMetricsFor('normal 400 12px Arial')).toEqual({ ascentPx: 14, heightPx: 20 })
  })

  it('caches per font shorthand — a second call for the same font does not re-measure', async () => {
    vi.resetModules()
    const { doc, div } = fakeDocument({ divTop: 0, divHeight: 20, probeTop: 14 })
    globalThis.document = doc
    const { layoutMetricsFor } = await import('./text')
    const first = layoutMetricsFor('normal 400 12px Arial')
    div.getBoundingClientRect = () => ({ top: 999, height: 999 }) // would change the result if re-measured
    expect(layoutMetricsFor('normal 400 12px Arial')).toEqual(first)
  })

  it('falls back to the canvas ascent when the probe ascent is non-positive (nonsense guard)', async () => {
    vi.resetModules()
    globalThis.document = fakeDocument({ divTop: 50, divHeight: 20, probeTop: 50, canvasAscent: 8.5 }).doc // ascent = 0
    const { layoutMetricsFor } = await import('./text')
    expect(layoutMetricsFor('normal 400 12px Arial')).toEqual({ ascentPx: 8.5, heightPx: null })
  })

  it('falls back to the canvas ascent when the probe ascent is >= the line-box height (nonsense guard)', async () => {
    vi.resetModules()
    globalThis.document = fakeDocument({ divTop: 0, divHeight: 10, probeTop: 15, canvasAscent: 7 }).doc // ascent = 15 >= height 10
    const { layoutMetricsFor } = await import('./text')
    expect(layoutMetricsFor('normal 400 12px Arial')).toEqual({ ascentPx: 7, heightPx: null })
  })

  it('falls back to the canvas ascent entirely when no usable DOM is available (e.g. document.body missing)', async () => {
    vi.resetModules()
    const canvasCtx = {
      font: '',
      measureText: () => ({ width: 6, fontBoundingBoxAscent: 9, actualBoundingBoxAscent: 9 }),
    }
    globalThis.document = {
      createElement: (tag: string) => (tag === 'canvas' ? { getContext: () => canvasCtx } : {}),
    } as unknown as Document
    const { layoutMetricsFor } = await import('./text')
    expect(layoutMetricsFor('normal 400 12px Arial')).toEqual({ ascentPx: 9, heightPx: null })
  })

  it('extractRuns wires the probe into a real baseline: centers the font box in a taller line box', async () => {
    vi.resetModules()
    // A 22px real line box (what the DOM Range reports for the actual text)
    // around a 14px font box (10 ascent + 4 descent, what the probe reports
    // for the FONT alone) -> 4px of half-leading above the font box.
    const RECT = { top: 100, left: 40, right: 130, bottom: 122 }
    const fakeRange = { setStart: () => {}, setEnd: () => {}, getBoundingClientRect: () => ({ ...RECT }) }
    const { doc } = fakeDocument({ divTop: 0, divHeight: 14, probeTop: 10 })
    globalThis.document = { ...doc, createRange: () => fakeRange } as unknown as Document
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

    const { extractRuns } = await import('./text')
    const parent = {} as unknown as HTMLElement
    const node = { data: 'Hi', parentElement: parent } as unknown as Text
    const root = {
      getBoundingClientRect: () => ({ top: 0, left: 0, right: 200, bottom: 300 }),
    } as unknown as HTMLElement

    const runs = extractRuns(node, root)
    expect(runs.length).toBe(1)
    // rect height = 122 - 100 = 22 (the REAL line, from the Range) — half-
    // leading = (22 - 14) / 2 = 4; baseline = rect.top(100) - root.top(0) + 4 + ascent(10).
    expect(runs[0].baselinePx).toBe(114)
  })
})
