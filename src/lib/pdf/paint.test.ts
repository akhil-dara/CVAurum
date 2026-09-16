import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs'
import { inflateSync } from 'node:zlib'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFDict, PDFDocument, PDFName } from 'pdf-lib'
import * as fontkitNs from '@pdf-lib/fontkit'
import type { Font as FontkitFont } from '@pdf-lib/fontkit'
import {
  textInk,
  paintOps,
  paintPages,
  assignOpsToPages,
  glyphPathToDrawPath,
  roundedRectPath,
  dataUriToBytes,
  rasterSize,
  needsReshape,
  DRIFT_FRACTION,
} from './paint'
import { PdfFontCache } from './fonts'
import { createTagSink } from './structure'
import { clampChromeOpToPage } from './paint'
import { pxToPt, ptToPx, flipY } from './units'
import type { CornerRadii, DecoBox, DrawOp, LinearGradient, TextRun } from './types'

// Same CJS/ESM interop ambiguity fonts.ts and render.tsx guard against.
const fontkit = ((fontkitNs as unknown as { default?: unknown }).default ?? fontkitNs) as Parameters<
  PDFDocument['registerFontkit']
>[0] & { create(data: Uint8Array): FontkitFont }

const here = path.dirname(fileURLToPath(import.meta.url))
const FONT_DIR = path.resolve(here, '../../../public/fonts-pdf')
const FONT_FILE = 'arimo-700.ttf'
const FONT_INDEX = { 'arimo|700': FONT_FILE }

// PdfFontCache fetches font bytes over HTTP in the real app; stub fetch so
// paintOps exercises the real production font-loading path against a real
// embedded .ttf read straight off disk, instead of a hand-rolled substitute.
//
// Also serves a real (not stubbed/decoded) 1x1 PNG for TEST_PNG_SRC below,
// so `embedImage`'s magic-byte check and pdf-lib's own `embedPng` both run
// for real against genuine bytes — the task-17 image-radii-clip tests need
// `paintOps` to reach a real embedded PDFImage, not bail out early on a null.
const TEST_PNG_SRC = 'https://example.test/photo.png'
const TEST_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
let originalFetch: typeof fetch
beforeAll(() => {
  originalFetch = globalThis.fetch
  globalThis.fetch = (async (input: string | URL) => {
    const url = String(input)
    if (url === TEST_PNG_SRC) {
      const bytes = Buffer.from(TEST_PNG_BASE64, 'base64')
      const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
      return { ok: true, arrayBuffer: async () => ab } as Response
    }
    if (url.endsWith('.webp')) {
      // Neither PNG nor JPEG magic - the bytes a real art band arrives as,
      // which is what sends embedImage down its decode-and-re-encode path.
      const bytes = Buffer.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])
      const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
      return { ok: true, arrayBuffer: async () => ab } as Response
    }
    const file = url.replace(/^\/fonts-pdf\//, '')
    const bytes = fs.readFileSync(path.join(FONT_DIR, file))
    const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    return { ok: true, arrayBuffer: async () => ab } as Response
  }) as typeof fetch
})
afterAll(() => {
  globalThis.fetch = originalFetch
})

function baseRun(overrides: Partial<TextRun> = {}): TextRun {
  return {
    text: 'SUMMARY',
    xPx: 10,
    widthPx: 0,
    baselinePx: 20,
    sizePx: 12,
    family: 'Arimo',
    weight: 700,
    italic: false,
    color: { r: 0, g: 0, b: 0, a: 1 },
    letterSpacingPx: 0,
    isDecorative: false,
    ...overrides,
  }
}

/** Runs paintOps against a fresh page, returning the page itself (for
 *  Resources-dict inspection) plus the RAW (unencoded) content-stream
 *  operator text — pdf-lib's own PDFOperator.toString(), not a saved/
 *  reparsed PDF — so assertions can look for Tr/Tj/vector-fill operators
 *  directly without a full PDF round-trip. */
async function renderPage(ops: DrawOp[], captureDecoBoxes?: DecoBox[]) {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  const page = doc.addPage([300, 300])
  const fonts = new PdfFontCache(doc, FONT_INDEX)
  await paintOps(page, ops, fonts, 300, captureDecoBoxes)
  const contentStream = (
    page as unknown as { getContentStream: () => { getContentsString(): string } }
  ).getContentStream()
  return { doc, page, stream: contentStream.getContentsString() }
}

/** The body of every `stream ... endstream` in a saved file, so a test can
 *  inflate them and read what pdf-lib actually wrote. */
const STREAM_BODY = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g

async function renderContentStream(ops: DrawOp[]): Promise<string> {
  return (await renderPage(ops)).stream
}

/** The x values pdf-lib actually wrote for each `Tm` (text-positioning)
 *  operator, in document order — one per drawText call (real or invisible
 *  tracked-heading layer). */
function tmXPositions(stream: string): number[] {
  return [...stream.matchAll(/1 0 0 1 (-?[\d.]+) -?[\d.]+ Tm/g)].map((m) => Number(m[1]))
}

/** Every value pdf-lib wrote for a `Tz` (horizontal-scaling) operator, in
 *  document order — one set/reset pair per Tz-scaled drawText call. */
function tzValues(stream: string): number[] {
  return [...stream.matchAll(/(-?[\d.]+) Tz/g)].map((m) => Number(m[1]))
}

/** The exact width pdf-lib's OWN embedded-font metric gives `text` at
 *  `sizePx` — the same metric paint.ts's adjacency logic (and, downstream,
 *  pdf.js's own gap measurement) uses. A separate PDFDocument instance from
 *  whatever the test renders into, but the same font FILE, so the metric is
 *  identical — verified indirectly by every assertion below landing exactly
 *  on this value, not approximately. */
async function trueWidthPt(text: string, sizePx: number): Promise<number> {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  const fonts = new PdfFontCache(doc, FONT_INDEX)
  const font = await fonts.embed('Arimo', 700)
  return font.widthOfTextAtSize(text, pxToPt(sizePx))
}

/** The width the TRACKED cut of the font gives `text` at `sizePx` — computed
 *  straight off the real .ttf with fontkit, modelling exactly what
 *  `widenAdvances` does to `hmtx` (one INTEGER font-unit delta added to every
 *  advance, clamped at 0), so the expectations below are independent of
 *  paint.ts's own output rather than a re-read of it. */
function trackedWidthPt(text: string, sizePx: number, letterSpacingPx: number): number {
  const bytes = new Uint8Array(fs.readFileSync(path.join(FONT_DIR, FONT_FILE)))
  const font = fontkit.create(bytes)
  const sizePt = pxToPt(sizePx)
  const scale = sizePt / font.unitsPerEm
  const delta = Math.round((letterSpacingPx / sizePx) * font.unitsPerEm)
  // pdf-lib's own `widthOfTextAtSize` sums each GLYPH's `advanceWidth` (the
  // hmtx value widenAdvances patches), not the kerned `positions[i].xAdvance`
  // — measured: the two differ by ~0.6% on a string with kern pairs, which is
  // exactly the drift the painter's Tz corrects for and must not be confused
  // with it here.
  let cursor = 0
  for (const g of font.layout(text).glyphs) cursor += Math.max(0, g.advanceWidth + delta) * scale
  return cursor
}

describe('paintOps — tracked (letter-spaced) runs are ordinary visible text', () => {
  // The old shape was two layers: visible vector glyph outlines carrying the
  // tracking, plus an INVISIBLE (Tr 3) untracked copy of the string for
  // extractors. It extracted correctly and an external ATS scanner read the
  // file and reported "text drawn invisibly" — 22 of one export's 93 text
  // objects were rendering mode 3. The tracking lives in the font's own
  // advance widths now (fonts.ts's `widenAdvances`), so one ordinary visible
  // text-showing operator says everything.

  it('draws ONE visible Tj — no invisible layer, no Tc, no vector outlines', async () => {
    const stream = await renderContentStream([
      { kind: 'text', run: baseRun({ text: 'SUMMARY', letterSpacingPx: 1.5 }) },
    ])
    expect(stream.match(/\bTj\b/g)?.length).toBe(1)
    expect(stream).not.toMatch(/\bTr\b/) // no rendering-mode change at all
    expect(stream).not.toMatch(/\bTc\b/) // tracking is in the font, not the operator
    expect(stream.match(/\bf\b/g)).toBeNull() // and nothing is drawn as vector fills
  })

  it('advances by the TRACKED width, one integer-unit increment per glyph', async () => {
    // Read off the page rather than asserted on a width the painter reports:
    // a second run placed just past the first, close enough to snap, must
    // land on the tracked end, and the tracked end must be wider than plain.
    const sizePx = 12
    const plainEnd = await trueWidthPt('Languages', sizePx)
    const trackedEnd = trackedWidthPt('Languages', sizePx, 0.1)
    expect(trackedEnd).toBeGreaterThan(plainEnd)
    const stream = await renderContentStream([
      { kind: 'text', run: baseRun({ text: 'Languages', xPx: 0, baselinePx: 20, sizePx, letterSpacingPx: 0.1 }) },
      { kind: 'text', run: baseRun({ text: 'X', xPx: ptToPx(plainEnd), baselinePx: 20, sizePx }) },
    ])
    const [, secondX] = tmXPositions(stream)
    expect(secondX).toBeCloseTo(trackedEnd, 3)
  })

  it('negative tracking is simply a NARROWER cut, not a special case', async () => {
    const sizePx = 12
    const plainEnd = await trueWidthPt('Alex Morgan', sizePx)
    const narrowEnd = trackedWidthPt('Alex Morgan', sizePx, -0.12)
    expect(narrowEnd).toBeLessThan(plainEnd)
    const stream = await renderContentStream([
      { kind: 'text', run: baseRun({ text: 'Alex Morgan', xPx: 0, baselinePx: 20, sizePx, letterSpacingPx: -0.12 }) },
      { kind: 'text', run: baseRun({ text: 'X', xPx: ptToPx(plainEnd), baselinePx: 20, sizePx }) },
    ])
    expect(stream.match(/\bTj\b/g)?.length).toBe(2)
    const [, secondX] = tmXPositions(stream)
    expect(secondX).toBeCloseTo(narrowEnd, 3)
  })

  it('draws ordinary (non-tracked) text as a single plain, visible Tj — no Tr, no vector layer', async () => {
    const stream = await renderContentStream([
      { kind: 'text', run: baseRun({ text: 'Senior Software Engineer', letterSpacingPx: 0 }) },
    ])
    expect(stream).not.toMatch(/\bTr\b/)
    expect(stream).not.toMatch(/\bTc\b/)
    expect(stream.match(/\bTj\b/g)?.length).toBe(1)
  })

  it('propagates a font-embed failure for a tracked heading (real content, hard-fail)', async () => {
    const ops: DrawOp[] = [
      { kind: 'text', run: baseRun({ text: 'SUMMARY', letterSpacingPx: 1.5, family: 'Nonexistent Font' }) },
    ]
    await expect(renderContentStream(ops)).rejects.toThrow()
  })
})

describe('paintOps — a tracked run is fitted to its DOM width with Tz', () => {
  // Same mechanism, same 90-110 sanity band and same reason as the untracked
  // branch (task 12): our embedded static fonts measure a run from ~0.5%
  // (Inter) to ~1.8% (Montserrat) wide of what Chromium renders, so without
  // it the ink drifts right of its on-screen position along a long heading.
  // The DOM width already INCLUDES the tracking, and so does the tracked cut,
  // so numerator and denominator measure the same thing.
  const sizePx = 12

  it('emits a Tz pair of 100 * domWidth / trackedWidth around the single Tj', async () => {
    const text = 'SUMMARY'
    const letterSpacingPx = 1.5
    const trackedPt = trackedWidthPt(text, sizePx, letterSpacingPx)
    // A DOM width 3% under what our font draws — the drift this corrects.
    const domWidthPx = ptToPx(trackedPt * 0.97)
    const stream = await renderContentStream([
      { kind: 'text', run: baseRun({ text, letterSpacingPx, widthPx: domWidthPx }) },
    ])
    const tz = tzValues(stream)
    expect(tz.length).toBe(2)
    expect(tz[0]).toBeCloseTo(97, 2)
    expect(tz[1]).toBe(100)
    expect(stream.match(/\bTj\b/g)?.length).toBe(1)
  })

  it('clamps a bogus DOM width into the same 90-110 band the untracked branch uses', async () => {
    const text = 'SUMMARY'
    const letterSpacingPx = 1.5
    const trackedPt = trackedWidthPt(text, sizePx, letterSpacingPx)
    const wide = await renderContentStream([
      { kind: 'text', run: baseRun({ text, letterSpacingPx, widthPx: ptToPx(trackedPt * 3) }) },
    ])
    expect(tzValues(wide)[0]).toBe(110)
    const narrow = await renderContentStream([
      { kind: 'text', run: baseRun({ text, letterSpacingPx, widthPx: ptToPx(trackedPt * 0.2) }) },
    ])
    expect(tzValues(narrow)[0]).toBe(90)
  })

  it('emits no Tz at all when the run was never measured (widthPx 0)', async () => {
    const stream = await renderContentStream([
      { kind: 'text', run: baseRun({ text: 'SUMMARY', letterSpacingPx: 1.5 }) },
    ])
    expect(tzValues(stream).length).toBe(0)
  })

  it('normal (non-tracked) runs are unaffected: still no Tz at all when widthPx is unset (task 12 behavior preserved)', async () => {
    const stream = await renderContentStream([
      { kind: 'text', run: baseRun({ text: 'Senior Software Engineer', letterSpacingPx: 0 }) },
    ])
    expect(tzValues(stream).length).toBe(0)
  })
})

describe('paintOps — one line per visual row (the bridging space)', () => {
  // Between two runs with an empty void between them - what the painter wrote
  // between contact items, and between an entry title and its date - PyMuPDF
  // and the viewers that group text the way it does read two separate LINES,
  // so drag-selecting a contact row jumped from item to item. One real space,
  // scaled to exactly the gap, makes every engine read one line. It is bounded
  // by the LINE BOX (walk.ts's lineBoxId), never by geometry alone, so two
  // columns can never be joined however level they sit.
  const sizePx = 12

  /** Every string pdf-lib actually showed, in order, decoded from the hex
   *  payloads via the run of `Tm` positions that precede them. Space-only
   *  payloads are what this describe block is about, so they are identified
   *  by width rather than by content: a bridging space is drawn alone. */
  function tjCount(stream: string): number {
    return stream.match(/\bTj\b/g)?.length ?? 0
  }

  async function twoRuns(overridesA: Partial<TextRun>, overridesB: Partial<TextRun>) {
    return await renderContentStream([
      { kind: 'text', run: baseRun({ text: 'Senior Software Engineer', xPx: 0, baselinePx: 20, sizePx, lineBoxId: 1, ...overridesA }) },
      { kind: 'text', run: baseRun({ text: 'Mar 2021', baselinePx: 20, sizePx, lineBoxId: 1, ...overridesB }) },
    ])
  }

  it('draws ONE visible space stretched to exactly the gap', async () => {
    const endPt = await trueWidthPt('Senior Software Engineer', sizePx)
    const spacePt = await trueWidthPt(' ', sizePx)
    const gapPt = 300
    const stream = await twoRuns({}, { xPx: ptToPx(endPt + gapPt) })
    // Three showings: the first run, the bridging space, the second run.
    expect(tjCount(stream)).toBe(3)
    const tz = tzValues(stream)
    expect(tz.length).toBe(2)
    expect(tz[0]).toBeCloseTo((100 * gapPt) / spacePt, 2)
    expect(tz[1]).toBe(100)
    // ...drawn at the first run's own end, so it closes the void exactly.
    const xs = tmXPositions(stream)
    expect(xs[1]).toBeCloseTo(endPt, 6)
  })

  it('never bridges across two different line boxes, however level they sit', async () => {
    const endPt = await trueWidthPt('Senior Software Engineer', sizePx)
    const stream = await twoRuns({}, { xPx: ptToPx(endPt + 300), lineBoxId: 2 })
    expect(tjCount(stream)).toBe(2)
    expect(tzValues(stream).length).toBe(0)
  })

  it('never bridges a run the walker could not place (no line box)', async () => {
    const endPt = await trueWidthPt('Senior Software Engineer', sizePx)
    const stream = await twoRuns({ lineBoxId: undefined }, { xPx: ptToPx(endPt + 300), lineBoxId: undefined })
    expect(tjCount(stream)).toBe(2)
  })

  it('never doubles a space that is already there, on either side', async () => {
    const endPt = await trueWidthPt('Senior Software Engineer ', sizePx)
    const trailing = await twoRuns({ text: 'Senior Software Engineer ' }, { xPx: ptToPx(endPt + 300) })
    expect(tjCount(trailing)).toBe(2)
    const leadingEnd = await trueWidthPt('Senior Software Engineer', sizePx)
    const leading = await twoRuns({}, { text: ' Mar 2021', xPx: ptToPx(leadingEnd + 300) })
    expect(tjCount(leading)).toBe(2)
  })

  it('never bridges two lines of the same block, however small the gap', async () => {
    // Same line box, a whole line-height apart: two rows, not one.
    const endPt = await trueWidthPt('Senior Software Engineer', sizePx)
    const stream = await twoRuns({}, { xPx: ptToPx(endPt + 300), baselinePx: 20 + sizePx })
    expect(tjCount(stream)).toBe(2)
  })

  it('bridges a title and its date across a half-point baseline difference', async () => {
    // The real case: two blocks of different type sizes in one flex row sit
    // half a point apart, which is well inside 0.35 of the smaller size.
    const endPt = await trueWidthPt('Senior Software Engineer', sizePx)
    const stream = await twoRuns({}, { xPx: ptToPx(endPt + 300), baselinePx: 20.4, sizePx: sizePx * 0.9 })
    expect(tjCount(stream)).toBe(3)
  })

  it('leaves a gap under half a space width alone', async () => {
    const endPt = await trueWidthPt('Senior Software Engineer', sizePx)
    const spacePt = await trueWidthPt(' ', sizePx)
    const stream = await twoRuns({}, { xPx: ptToPx(endPt + spacePt * 0.3) })
    // Close enough to be snapped flush by the same-line chain instead.
    expect(tjCount(stream)).toBe(2)
  })

  it('fills an enormous gap with SEVERAL spaces rather than one absurd Tz', async () => {
    const endPt = await trueWidthPt('Senior Software Engineer', sizePx)
    const spacePt = await trueWidthPt(' ', sizePx)
    // Twice what one space may be stretched to (the cap is 20000%).
    const gapPt = spacePt * 400
    const stream = await twoRuns({}, { xPx: ptToPx(endPt + gapPt) })
    expect(tjCount(stream)).toBe(3)
    const tz = tzValues(stream)
    expect(tz[0]).toBeLessThanOrEqual(20000)
    expect(tz[0]).toBeCloseTo(20000, 0)
  })
})

describe('paintOps — decorative runs draw vector glyph outlines, never real text', () => {
  it('never emits a text-showing operator (Tj/TJ) or a text object (BT) for a decorative run', async () => {
    const stream = await renderContentStream([{ kind: 'text', run: baseRun({ text: 'V', isDecorative: true }) }])
    expect(stream).not.toMatch(/\bTj\b/)
    expect(stream).not.toMatch(/\bTJ\b/)
    expect(stream).not.toMatch(/\bBT\b/)
    // It did draw something: a filled vector path.
    expect(stream).toMatch(/\bf\b/)
  })

  it('draws different (non-empty) path data for different monogram letters', async () => {
    const streamV = await renderContentStream([{ kind: 'text', run: baseRun({ text: 'V', isDecorative: true }) }])
    const streamN = await renderContentStream([{ kind: 'text', run: baseRun({ text: 'N', isDecorative: true }) }])
    expect(streamV).not.toBe(streamN)
    expect(streamV.length).toBeGreaterThan(20)
  })

  // --- synthetic small caps (2026-08-19 user report: editor showed small-caps
  // headings, the PDF exported plain "Summary") ---

  /** The x of each painted glyph: drawSvgPath writes a positioning `cm` per
   *  glyph followed by an identity `1 0 0 1 0 0 cm`, which is dropped here. */
  function glyphXPositions(stream: string): number[] {
    return [...stream.matchAll(/1 0 0 1 (-?[\d.]+) (-?[\d.]+) cm/g)]
      .filter((m) => !(Number(m[1]) === 0 && Number(m[2]) === 0))
      .map((m) => Number(m[1]))
  }

  it('draws a small-caps run as VISIBLE text, one piece per size, nothing hidden', async () => {
    const stream = await renderContentStream([
      { kind: 'text', run: baseRun({ text: 'Summary', smallCapsScale: 0.73, letterSpacingPx: 0 }) },
    ])
    // "S" at full size, "ummary" reduced: two pieces, two ordinary Tj calls.
    expect(stream.match(/\bTj\b/g)?.length).toBe(2)
    expect(stream).not.toMatch(/\bTr\b/)
    expect(stream.match(/\bf\b/g)).toBeNull()
    // Two different Tf sizes on one baseline is the whole reason it is two
    // operators rather than one.
    const sizes = [...stream.matchAll(/\/[^\s]+ ([\d.]+) Tf/g)].map((m) => Number(m[1]))
    expect(sizes.length).toBe(2)
    expect(sizes[1]).toBeCloseTo(sizes[0] * 0.73, 4)
  })

  it('draws the CAPITALS and says the source’s own lowercase letters', async () => {
    // Chromium synthesizes small caps by drawing each lowercase letter as its
    // CAPITAL at a reduced size, so the capitals are what the page shows. They
    // are NOT what the file should say: uppercasing the string sent marquee's
    // skill-group label out as LANGUAGES, which a parser reads as a section
    // heading. The reduced piece is drawn from a small-caps CUT of the face
    // instead (fonts.ts's smallCapsVariant) with its own lowercase text.
    const { doc, page, stream } = await renderPage([
      { kind: 'text', run: baseRun({ text: 'Summary', smallCapsScale: 0.73, letterSpacingPx: 0, baselinePx: 20 }) },
      { kind: 'text', run: baseRun({ text: 'SUMMARY', letterSpacingPx: 0, baselinePx: 60 }) },
    ])
    // Two cuts of one face: three drawText calls, two embedded font
    // programs. (Their /Tf resource NAMES cannot be compared - pdf-lib gives
    // each setFont call a fresh random suffix - so the count of embedded
    // programs in the saved file is what says it.)
    expect(stream.match(/\bTj\b/g)?.length).toBe(3)
    // Object streams off so the font dictionaries are plain text to read.
    const saved = Buffer.from(await doc.save({ useObjectStreams: false })).toString('latin1')
    expect(saved.match(/\/FontFile2/g)?.length).toBe(2)
    expect(page.node.Resources()!.lookup(PDFName.of('Font'), PDFDict).keys().length).toBeGreaterThanOrEqual(2)

    // What the file SAYS, read back out of its own ToUnicode CMaps.
    const mapped = new Set<string>()
    for (const m of saved.matchAll(STREAM_BODY)) {
      let text = m[1]
      try {
        text = inflateSync(Buffer.from(m[1], 'latin1')).toString('latin1')
      } catch {
        /* an uncompressed stream is already text */
      }
      for (const block of text.matchAll(/beginbfchar([\s\S]*?)endbfchar/g))
        for (const pair of block[1].matchAll(/<[0-9A-Fa-f]+>\s*<([0-9A-Fa-f]{4})>/g))
          mapped.add(String.fromCharCode(parseInt(pair[1], 16)))
    }
    for (const ch of 'Summary') expect(mapped.has(ch)).toBe(true)
    // "SUMMARY" is on the page too, so its capitals are in the map; the point
    // is that the small-caps run added the LOWERCASE letters, not more capitals.
    expect([...'ummary'].every((c) => mapped.has(c))).toBe(true)
  })

  it('advances narrower for the reduced letters than for full-size capitals', async () => {
    // Same seven glyphs either way; only the six trailing ones shrink. Read
    // off the two pieces' own text-positioning operators plus the run's total
    // advance, measured by where a following snapped run lands.
    const sizePx = 12
    const fullEnd = await trueWidthPt('SUMMARY', sizePx)
    const capWidth = await trueWidthPt('S', sizePx)
    const reducedRest = await trueWidthPt('UMMARY', sizePx * 0.5)
    const smallCapsEnd = capWidth + reducedRest
    expect(smallCapsEnd).toBeLessThan(fullEnd) // the whole point of the reduction
    const spaceWidth = await trueWidthPt(' ', sizePx)
    const reducedStream = await renderContentStream([
      { kind: 'text', run: baseRun({ text: 'Summary', xPx: 0, baselinePx: 20, sizePx, smallCapsScale: 0.5 }) },
      // Half a space past the run's expected end: near enough to snap, so
      // where it lands reports the run's TRUE total advance.
      { kind: 'text', run: baseRun({ text: 'X', xPx: ptToPx(smallCapsEnd + spaceWidth * 0.5), baselinePx: 20, sizePx }) },
    ])
    const xs = tmXPositions(reducedStream)
    // Piece 1 ("S") at x 0, piece 2 ("UMMARY") just past it, then the
    // following run snapped to the run's true (narrower) end.
    expect(xs.length).toBe(3)
    expect(xs[0]).toBeCloseTo(0, 6)
    expect(xs[1]).toBeCloseTo(capWidth, 6)
    expect(xs[2]).toBeCloseTo(smallCapsEnd, 6)
  })

  it('leaves a run without small caps byte-identical to before', async () => {
    const withField = await renderContentStream([
      { kind: 'text', run: baseRun({ text: 'Summary', smallCapsScale: 0 }) },
    ])
    const withoutField = await renderContentStream([{ kind: 'text', run: baseRun({ text: 'Summary' }) }])
    expect(withField).toBe(withoutField)
  })

  it('draws a multi-glyph decorative run (e.g. a 2-3 letter monogram like "UC" or "NYU")', async () => {
    const stream = await renderContentStream([{ kind: 'text', run: baseRun({ text: 'UC', isDecorative: true }) }])
    // Two glyphs drawn means two separate fill operations in the stream.
    expect(stream.match(/\bf\b/g)?.length).toBe(2)
  })

  it('tolerates a decorative run whose font is missing, without throwing', async () => {
    const ops: DrawOp[] = [
      { kind: 'text', run: baseRun({ text: 'X', isDecorative: true, family: 'Nonexistent Font' }) },
    ]
    await expect(renderContentStream(ops)).resolves.not.toThrow()
  })

  it('still propagates a font-embed failure for REAL (non-decorative) content', async () => {
    const ops: DrawOp[] = [
      { kind: 'text', run: baseRun({ text: 'Real résumé content', isDecorative: false, family: 'Nonexistent Font' }) },
    ]
    await expect(renderContentStream(ops)).rejects.toThrow()
  })
})

describe('paintOps — same-line adjacency (task 10c)', () => {
  // Replaces walk.ts's old canvas.measureText-based estimate (task 10a,
  // defect 5), which turned out to drift in BOTH directions depending on
  // the exact string (task-10c report) — no fixed-direction margin can
  // close both an overlap risk and a spurious-gap risk at once. This uses
  // pdf-lib's OWN `widthOfTextAtSize` for the ACTUAL embedded font, so
  // there's nothing to estimate: assertions below land on an EXACT value,
  // not "close enough".
  const sizePx = 12

  it('pushes an overlapping second run right to exactly the first run’s true drawn end', async () => {
    const trueEnd = await trueWidthPt('Languages', sizePx) // first run starts at xPx 0
    // Placed 2pt BEFORE the true end — i.e. would visually overlap if drawn
    // as given, simulating our embedded font drawing wider than whatever
    // produced this xPx.
    const overlappingXPx = (trueEnd - 2) / (72 / 96)
    const stream = await renderContentStream([
      { kind: 'text', run: baseRun({ text: 'Languages', xPx: 0, baselinePx: 20, sizePx }) },
      { kind: 'text', run: baseRun({ text: ':', xPx: overlappingXPx, baselinePx: 20, sizePx }) },
    ])
    const [, secondX] = tmXPositions(stream)
    expect(secondX).toBeCloseTo(trueEnd, 6)
  })

  it('closes a small unintended gap (smaller than a real space) to exactly zero', async () => {
    const trueEnd = await trueWidthPt('Cloud & DevOps', sizePx)
    const spaceWidth = await trueWidthPt(' ', sizePx)
    // A gap under one space-width — the exact shape of the "Cloud & DevOps"
    // TEXT_MISMATCH this was diagnosed from: no push was needed (already
    // past the true end), yet the residual gap alone crossed pdf.js's
    // word-boundary threshold.
    const smallGapXPx = (trueEnd + spaceWidth * 0.5) / (72 / 96)
    const stream = await renderContentStream([
      { kind: 'text', run: baseRun({ text: 'Cloud & DevOps', xPx: 0, baselinePx: 20, sizePx }) },
      { kind: 'text', run: baseRun({ text: ':', xPx: smallGapXPx, baselinePx: 20, sizePx }) },
    ])
    const [, secondX] = tmXPositions(stream)
    expect(secondX).toBeCloseTo(trueEnd, 6)
  })

  it('leaves a genuine word-space gap (a full space-width or more) untouched', async () => {
    const trueEnd = await trueWidthPt('8+ years', sizePx)
    const spaceWidth = await trueWidthPt(' ', sizePx)
    const realGapXPx = (trueEnd + spaceWidth * 1.5) / (72 / 96)
    const stream = await renderContentStream([
      { kind: 'text', run: baseRun({ text: '8+ years', xPx: 0, baselinePx: 20, sizePx }) },
      { kind: 'text', run: baseRun({ text: 'building reliable systems', xPx: realGapXPx, baselinePx: 20, sizePx }) },
    ])
    const [, secondX] = tmXPositions(stream)
    expect(secondX).toBeCloseTo(pxToPt(realGapXPx), 6)
  })

  it('never adjusts runs on different lines, however their x values relate', async () => {
    const stream = await renderContentStream([
      { kind: 'text', run: baseRun({ text: 'well-', xPx: 0, baselinePx: 20, sizePx }) },
      { kind: 'text', run: baseRun({ text: 'tested', xPx: 0, baselinePx: 40, sizePx }) },
    ])
    const [, secondX] = tmXPositions(stream)
    expect(secondX).toBeCloseTo(0, 6) // untouched: real DOM x, not pushed to line 1's end
  })

  it('applies the same exact-metric snap after a tracked run, against its tracked end', async () => {
    // The tracked cut is wider than the plain one, so the snap target is the
    // tracked end - computed independently off the .ttf, not read back from
    // the painter's own output.
    const trueEnd = await trueWidthPt('Languages', sizePx)
    const spaceWidth = await trueWidthPt(' ', sizePx)
    const smallGapXPx = (trueEnd + spaceWidth * 0.5) / (72 / 96)
    const stream = await renderContentStream([
      { kind: 'text', run: baseRun({ text: 'Languages', xPx: 0, baselinePx: 20, sizePx, letterSpacingPx: 0.1 }) },
      { kind: 'text', run: baseRun({ text: ': ', xPx: smallGapXPx, baselinePx: 20, sizePx, letterSpacingPx: 0.1 }) },
    ])
    const [firstX, secondX] = tmXPositions(stream)
    expect(firstX).toBeCloseTo(0, 6)
    expect(secondX).toBeCloseTo(trackedWidthPt('Languages', sizePx, 0.1), 6)
  })

  it('rejects a large negative gap and keeps the second run position', async () => {
    const trueEnd = await trueWidthPt('End Text', sizePx)
    const spaceWidth = await trueWidthPt(' ', sizePx)
    const leftXPx = (trueEnd - spaceWidth * 3.5) / (72 / 96)
    const stream = await renderContentStream([
      { kind: 'text', run: baseRun({ text: 'End Text', xPx: 0, baselinePx: 20, sizePx }) },
      { kind: 'text', run: baseRun({ text: 'Start', xPx: leftXPx, baselinePx: 20, sizePx }) },
    ])
    const [, secondX] = tmXPositions(stream)
    expect(secondX).toBeCloseTo(pxToPt(leftXPx), 6)
  })

  it('snaps metric-drift overlap (negative gap within 2% of previous run width) to previous end', async () => {
    // Real failure case from 19 templates: long regular-weight run (372pt)
    // rendered ~1.84pt narrower by Chromium than embedded font predicts; bold
    // run placed at Chromium position has -1.84pt gap, exceeding bold space
    // (1.6pt) but within 0.02 * 372pt = 7.4pt drift allowance. Must snap to
    // restore missing space: text reads 'to 190ms' not 'to190ms'.
    const longText =
      'Architected and deployed the comprehensive cloud infrastructure migration migration migration from 820ms to '
    const trueEnd = await trueWidthPt(longText, sizePx)
    const boldSpaceWidth = await trueWidthPt(' ', 12) // bold font's space
    // Use a gap that exceeds bold space width but fits within 0.02 * width.
    // Gap will be 1.2x bold space (which exceeds it) but fit in drift allowance
    // since 0.02 * trueEnd is much larger at this text length.
    const gapPt = boldSpaceWidth * 1.2
    const driftedXPx = (trueEnd - gapPt) / (72 / 96)
    const stream = await renderContentStream([
      { kind: 'text', run: baseRun({ text: longText, xPx: 0, baselinePx: 20, sizePx }) },
      { kind: 'text', run: baseRun({ text: '190ms', xPx: driftedXPx, baselinePx: 20, sizePx, weight: 700 }) },
    ])
    const [, boldX] = tmXPositions(stream)
    // With drift-proportional allowance, -gapPt fits within 0.02 * trueEnd so
    // snap happens. With plain spaceWidth, -gapPt exceeds it so snap fails.
    expect(boldX).toBeCloseTo(trueEnd, 6)
  })

  it('chain drift: a short mid-chain run must not shrink the allowance', async () => {
    // The one round-3 gap case (task-10c-fix4-brief.md): three real runs on
    // one baseline, A -> B -> C, where B is SHORT. B inherits A's drift when
    // it snaps, but round 3 bounded the NEXT boundary's allowance by B's own
    // (short) width as if each boundary were independent, collapsing it to
    // one space-width and rejecting a legitimate snap at B -> C. The fix
    // measures the allowance from the CHAIN's start (A's x), not just B.
    const textA =
      'Reduced infrastructure costs while cutting payment failures across the entire distributed checkout and billing subsystem by '
    const textB = '38%'
    const textC = 'and reclaiming'

    const spaceWidth = await trueWidthPt(' ', sizePx)
    const widthA = await trueWidthPt(textA, sizePx)
    const widthB = await trueWidthPt(textB, sizePx)
    const trueEndA = widthA // A starts at xPx 0

    // B: negative gap vs A's true end, within BOTH the old per-run allowance
    // (0.02 * widthA) and the new chain allowance (0.04 * widthA - chain is
    // just A at this point) - B snaps under either implementation, same
    // shape as the "snaps metric-drift overlap" case above.
    const gapAB = spaceWidth * 1.2
    expect(gapAB).toBeLessThan(0.02 * widthA) // snaps even under round 3
    const xBPx = (trueEndA - gapAB) / (72 / 96)

    // Once B snaps, its drawn end is exactly A's true end plus B's own
    // width, and the chain's start stays A's x (0) - not B's.
    const bDrawnEnd = trueEndA + widthB
    const chainWidth = bDrawnEnd - 0

    // C: gap vs B's drawn end must (a) exceed one space width, so a plain
    // space-width bound rejects it, and (b) exceed 0.02 * B's OWN (short)
    // width, so round 3's per-run allowance ALSO rejects it - yet (c) stay
    // under 0.04 * the CHAIN's width (measured from A, not B), so the new
    // chain-proportional allowance accepts it. B is short enough that (a)
    // alone dominates (b) - asserted explicitly below.
    const gapBC = spaceWidth * 1.5
    expect(gapBC).toBeGreaterThan(spaceWidth) // (a)
    expect(gapBC).toBeGreaterThan(0.02 * widthB) // (b)
    expect(gapBC).toBeLessThan(DRIFT_FRACTION * chainWidth) // (c)

    const xCPx = (bDrawnEnd - gapBC) / (72 / 96)

    const stream = await renderContentStream([
      { kind: 'text', run: baseRun({ text: textA, xPx: 0, baselinePx: 20, sizePx }) },
      { kind: 'text', run: baseRun({ text: textB, xPx: xBPx, baselinePx: 20, sizePx, weight: 700 }) },
      { kind: 'text', run: baseRun({ text: textC, xPx: xCPx, baselinePx: 20, sizePx }) },
    ])
    const [, bX, cX] = tmXPositions(stream)
    expect(bX).toBeCloseTo(trueEndA, 6)
    expect(cX).toBeCloseTo(bDrawnEnd, 6)
  })
})

describe('paintOps — Tz horizontal scaling for exact DOM-width runs (task 12)', () => {
  // Our embedded static fonts measure runs slightly wider than Chromium
  // renders them (see paint.ts's paintOps comment above the Tz block), so
  // drawn text drifts right of its on-screen position by the end of a long
  // line. Scaling each run to its DOM-measured width (widthPx, from a real
  // client rect — see text.ts's extractRuns) via `Tz` fixes that at the
  // source. widthPx === 0 (unmeasured — synthesized decorative runs, or a
  // caller that genuinely doesn't know it) must never trigger scaling.
  const sizePx = 12

  it('scales a run to its exact DOM width via Tz (set then reset to 100), and prevRealEnd tracks the DOM width for the next run', async () => {
    const text = 'Senior Software Engineer'
    const embeddedWidthPt = await trueWidthPt(text, sizePx)
    const domWidthPt = embeddedWidthPt * 0.98 // our font measures ~2% wider than Chromium here
    const domWidthPx = domWidthPt / pxToPt(1)

    const stream = await renderContentStream([
      { kind: 'text', run: baseRun({ text, xPx: 0, baselinePx: 20, sizePx, widthPx: domWidthPx }) },
      // Placed EXACTLY at the DOM-measured end of the first run — under the
      // OLD (pre-task-12) embedded-metric bookkeeping this would land ~2%
      // short of prevRealEnd.endXPt and get snapped to the WRONG (embedded-
      // metric) endpoint; with Tz active the true drawn end IS domWidthPt,
      // so it must snap flush there instead.
      { kind: 'text', run: baseRun({ text: 'X', xPx: domWidthPx, baselinePx: 20, sizePx }) },
    ])

    const tz = tzValues(stream)
    expect(tz.length).toBe(2) // set once, reset once
    expect(tz[0]).toBeCloseTo(98, 0)
    expect(tz[1]).toBe(100)

    const [firstX, secondX] = tmXPositions(stream)
    expect(firstX).toBeCloseTo(0, 6)
    expect(secondX).toBeCloseTo(domWidthPt, 6)
  })

  it('emits no Tz for a run with widthPx 0, and keeps embedded-width bookkeeping (existing behavior)', async () => {
    const text = 'Senior Software Engineer'
    const embeddedWidthPt = await trueWidthPt(text, sizePx)
    const embeddedEndXPx = embeddedWidthPt / pxToPt(1)

    const stream = await renderContentStream([
      { kind: 'text', run: baseRun({ text, xPx: 0, baselinePx: 20, sizePx, widthPx: 0 }) },
      { kind: 'text', run: baseRun({ text: 'X', xPx: embeddedEndXPx, baselinePx: 20, sizePx }) },
    ])

    expect(tzValues(stream).length).toBe(0)
    const [, secondX] = tmXPositions(stream)
    expect(secondX).toBeCloseTo(embeddedWidthPt, 6)
  })

  it('clamps an extreme widthPx ratio to the 90-110 band instead of applying it verbatim', async () => {
    const text = 'Senior Software Engineer'
    const embeddedWidthPt = await trueWidthPt(text, sizePx)

    const narrowPx = (embeddedWidthPt * 0.6) / pxToPt(1) // implies 60% -> clamps to 90
    const narrowStream = await renderContentStream([
      { kind: 'text', run: baseRun({ text, xPx: 0, baselinePx: 20, sizePx, widthPx: narrowPx }) },
    ])
    expect(tzValues(narrowStream)).toEqual([90, 100])

    // A run wider than its metric is only stretched when there is no gap to
    // put the extra width into (see the justified-line suite below), so the
    // upper half of the band is read off a single word.
    const word = 'Engineering'
    const wordWidthPt = await trueWidthPt(word, sizePx)
    const widePx = (wordWidthPt * 1.5) / pxToPt(1) // implies 150% -> clamps to 110
    const wideStream = await renderContentStream([
      { kind: 'text', run: baseRun({ text: word, xPx: 0, baselinePx: 20, sizePx, widthPx: widePx }) },
    ])
    expect(tzValues(wideStream)).toEqual([110, 100])
  })
})

describe('paintOps — a justified line puts its extra width in the spaces', () => {
  // A justified line reaches the painter as ONE run whose widthPx is the
  // WIDENED line width: the browser shared the extra width out over the
  // inter-word spaces. Stretching the whole run to that width would take it
  // out of the LETTERS instead, so a justified paragraph would draw at a
  // visibly different letter width line by line (and, past the 110 clamp,
  // stop short of the right margin). The slack belongs where the browser
  // put it - between the words.
  const sizePx = 12
  const text = 'Senior Software Engineer'

  it('draws one piece per word at its natural width, with the slack shared out over the gaps', async () => {
    const embeddedWidthPt = await trueWidthPt(text, sizePx)
    const domWidthPt = embeddedWidthPt * 1.12 // past the old clamp, so it used to draw short
    const stream = await renderContentStream([
      { kind: 'text', run: baseRun({ text, xPx: 0, baselinePx: 20, sizePx, widthPx: domWidthPt / pxToPt(1) }) },
    ])

    // Nothing is stretched, so there is no Tz to clamp at 110.
    expect(tzValues(stream).length).toBe(0)
    expect(stream.match(/\bTj\b/g)?.length).toBe(3)

    const widths = await Promise.all(['Senior ', 'Software ', 'Engineer'].map((p) => trueWidthPt(p, sizePx)))
    const gapPt = (domWidthPt - widths[0] - widths[1] - widths[2]) / 2
    expect(gapPt).toBeGreaterThan(0)
    const xs = tmXPositions(stream)
    expect(xs.length).toBe(3)
    expect(xs[0]).toBeCloseTo(0, 6)
    expect(xs[1]).toBeCloseTo(widths[0] + gapPt, 6)
    expect(xs[2]).toBeCloseTo(widths[0] + gapPt + widths[1] + gapPt, 6)
  })

  it('the line ends exactly at its DOM width, so the next run on it snaps flush', async () => {
    const embeddedWidthPt = await trueWidthPt(text, sizePx)
    const domWidthPt = embeddedWidthPt * 1.12
    const domWidthPx = domWidthPt / pxToPt(1)
    const stream = await renderContentStream([
      { kind: 'text', run: baseRun({ text, xPx: 0, baselinePx: 20, sizePx, widthPx: domWidthPx }) },
      { kind: 'text', run: baseRun({ text: 'X', xPx: domWidthPx, baselinePx: 20, sizePx }) },
    ])
    const xs = tmXPositions(stream)
    expect(xs[xs.length - 1]).toBeCloseTo(domWidthPt, 6)
  })

  it('a ragged line - no slack to share - is drawn exactly as it always was', async () => {
    const embeddedWidthPt = await trueWidthPt(text, sizePx)
    const domWidthPt = embeddedWidthPt * 0.98
    const stream = await renderContentStream([
      { kind: 'text', run: baseRun({ text, xPx: 0, baselinePx: 20, sizePx, widthPx: domWidthPt / pxToPt(1) }) },
    ])
    expect(stream.match(/\bTj\b/g)?.length).toBe(1)
    expect(tzValues(stream)[0]).toBeCloseTo(98, 0)
  })

  it('a slack too small to be justification (under 2%) is left to the metric correction', async () => {
    const embeddedWidthPt = await trueWidthPt(text, sizePx)
    const domWidthPt = embeddedWidthPt * 1.01
    const stream = await renderContentStream([
      { kind: 'text', run: baseRun({ text, xPx: 0, baselinePx: 20, sizePx, widthPx: domWidthPt / pxToPt(1) }) },
    ])
    expect(stream.match(/\bTj\b/g)?.length).toBe(1)
    expect(tzValues(stream)[0]).toBeCloseTo(101, 0)
  })
})

describe('paintOps — gradient background fills (task 10c)', () => {
  // creative's header banner/sidebar and spotlight's header banner all use
  // `background: linear-gradient(...)`, which only sets background-IMAGE —
  // boxOps used to only read backgroundColor (transparent for these), so
  // the entire panel (including the name/contact text painted on top,
  // which became invisible without it) silently failed to render at all.
  const opaque = { r: 0.5, g: 0.1, b: 0.9, a: 1 }
  const opaque2 = { r: 0.1, g: 0.8, b: 0.6, a: 1 }
  const gradient: LinearGradient = { angleDeg: 120, stops: [opaque, opaque2] }

  async function shadingResource(page: Awaited<ReturnType<typeof renderPage>>['page']) {
    page.node.normalizedEntries()
    const resources = page.node.Resources()!
    const shadingDict = resources.lookupMaybe(PDFName.of('Shading'), PDFDict)
    expect(shadingDict).toBeTruthy()
    const keys = shadingDict!.keys()
    expect(keys.length).toBe(1)
    return shadingDict!.lookup(keys[0], PDFDict)
  }

  it('paints a true vector shading (sh), never a raster image or a solid rg fallback', async () => {
    const { page, stream } = await renderPage([
      { kind: 'rect', xPx: 0, yPx: 0, wPx: 100, hPx: 50, fillGradient: gradient },
    ])
    expect(stream).toMatch(/\bsh\b/)
    expect(stream).toMatch(/\bW\b/) // clip
    expect(stream).not.toMatch(/\brg\b/) // no solid-color fallback painted
    expect(stream).not.toMatch(/\/(Image|XObject)\d* Do\b/) // no image XObject

    const shading = await shadingResource(page)
    expect(shading.lookup(PDFName.of('ShadingType'))?.toString()).toBe('2') // axial
    expect(shading.lookup(PDFName.of('ColorSpace'))?.toString()).toBe('/DeviceRGB')
  })

  it('registers a Type 2 (exponential) Function with the two stop colors as C0/C1', async () => {
    const { page } = await renderPage([{ kind: 'rect', xPx: 0, yPx: 0, wPx: 100, hPx: 50, fillGradient: gradient }])
    const shading = await shadingResource(page)
    const fn = shading.lookup(PDFName.of('Function'), PDFDict)
    expect(fn.lookup(PDFName.of('FunctionType'))?.toString()).toBe('2')
    expect(fn.lookup(PDFName.of('C0'))?.toString()).toBe(`[ ${opaque.r} ${opaque.g} ${opaque.b} ]`)
    expect(fn.lookup(PDFName.of('C1'))?.toString()).toBe(`[ ${opaque2.r} ${opaque2.g} ${opaque2.b} ]`)
  })

  it('computes an axial gradient line spanning the box using the CSS gradient-line formula', async () => {
    // A 0deg ("to top") gradient over a 100x50 (CSS px) box: stop 0 (C0) is
    // at the BOTTOM (0%) and stop 1 (C1) at the TOP (100%) — "to top"
    // describes where the gradient is headed, i.e. where the SECOND color
    // ends up. In PDF points (x1 CSS px = 0.75pt) that's a 75x37.5pt box;
    // length = |75*sin(0)| + |37.5*cos(0)| = 37.5, centered at (37.5,18.75)
    // in this local (0,0)-top-left, y-DOWN space, so Coords run from the
    // bottom center (37.5,37.5) to the top center (37.5,0).
    const { page } = await renderPage([
      { kind: 'rect', xPx: 0, yPx: 0, wPx: 100, hPx: 50, fillGradient: { angleDeg: 0, stops: [opaque, opaque2] } },
    ])
    const shading = await shadingResource(page)
    const coords = shading.lookup(PDFName.of('Coords'))!.toString()
    expect(coords).toBe('[ 37.5 37.5 37.5 0 ]')
  })

  it('draws the solid fill UNDER the gradient when both are present (CSS paint order)', async () => {
    const { stream } = await renderPage([
      { kind: 'rect', xPx: 0, yPx: 0, wPx: 100, hPx: 50, fill: { r: 1, g: 1, b: 1, a: 1 }, fillGradient: gradient },
    ])
    const rgIdx = stream.indexOf('rg')
    const shIdx = stream.indexOf('sh')
    expect(rgIdx).toBeGreaterThan(-1)
    expect(shIdx).toBeGreaterThan(rgIdx)
  })

  it('skips a translucent stop rather than painting the wrong opacity', async () => {
    const translucent: LinearGradient = { angleDeg: 120, stops: [opaque, { ...opaque2, a: 0.5 }] }
    const { page, stream } = await renderPage([
      { kind: 'rect', xPx: 0, yPx: 0, wPx: 100, hPx: 50, fillGradient: translucent },
    ])
    expect(stream).not.toMatch(/\bsh\b/)
    page.node.normalizedEntries()
    const resources = page.node.Resources()!
    expect(resources.lookupMaybe(PDFName.of('Shading'), PDFDict)).toBeUndefined()
  })

  it('never throws for a gradient rect op — a bad gradient is cosmetic, not real content', async () => {
    const ops: DrawOp[] = [
      { kind: 'rect', xPx: 0, yPx: 0, wPx: 100, hPx: 50, fillGradient: { angleDeg: NaN, stops: [opaque, opaque2] } },
    ]
    await expect(renderContentStream(ops)).resolves.not.toThrow()
  })

  it('a gradient-filled rect with per-corner radii clips to the asymmetric shape, not a uniform one (spotlight header banner)', async () => {
    // border-radius: 0 0 18px 18px — square top, rounded bottom, the exact
    // shape that painted as a plain rectangle before fix round 2 (only
    // border-top-left-radius, 0 here, was read and applied to all corners).
    const radii: CornerRadii = { tl: 0, tr: 0, br: 18, bl: 18 }
    const { stream } = await renderPage([
      { kind: 'rect', xPx: 0, yPx: 0, wPx: 100, hPx: 50, radii, fillGradient: gradient },
    ])
    // Bezier curve ops (c) appear for the clip path — the exact coordinates
    // are covered by the roundedRectPath unit tests below (same corner
    // math); here it's enough that curves are present at all (radius > 0
    // clips with arcs, not a plain 4-line rectangle) and that the shading
    // still paints (the clip didn't break the fill).
    expect(stream).toMatch(/\bc\b/)
    expect(stream).toMatch(/\bsh\b/)
  })
})

describe('paintOps — raster images clipped to per-corner border radii (task 17, ship blocker)', () => {
  // DEFAULT photoShape is 'circle' (types/metadata.ts) / `.rm-photo.circle {
  // border-radius: 9999px }` (artboard.css) — before this fix, paint.ts's
  // `case 'image'` never applied walk.ts's `radii` to the drawn image at
  // all, so every uploaded headshot exported as a plain SQUARE over the
  // correctly-rounded placeholder rect boxOps paints underneath it.
  const radii80: CornerRadii = { tl: 40, tr: 40, br: 40, bl: 40 }
  const imageOp = (overrides: Partial<Extract<DrawOp, { kind: 'image' }>> = {}): DrawOp => ({
    kind: 'image',
    xPx: 10,
    yPx: 10,
    wPx: 80,
    hPx: 80,
    src: TEST_PNG_SRC,
    ...overrides,
  })

  it('clips a radiused image: pushGraphicsState, clip-path operators (W n), drawImage (Do), then popGraphicsState, in order', async () => {
    const stream = await renderContentStream([imageOp({ radii: radii80 })])
    // Our OWN wrapping q/.../W n/.../Q around drawImage, PLUS drawImage's
    // own internal q/.../Do/.../Q nested inside it — two full push/pop
    // pairs total, exactly one clip (W n), exactly one image draw (Do).
    expect(stream.match(/\bq\b/g)?.length).toBe(2)
    expect(stream.match(/\bQ\b/g)?.length).toBe(2)
    expect(stream).toMatch(/\bW\b\s*\bn\b/) // clip: W (ClipNonZero) then n (EndPath)
    expect(stream.match(/\bDo\b/g)?.length).toBe(1)
    expect(stream).toMatch(/\bc\b/) // bezier curve ops — real corner arcs, not a plain rect
    // Order: our push comes before the clip, which comes before Do, which
    // comes before the last (our) pop.
    const qIdx = stream.indexOf('q')
    const wIdx = stream.indexOf('W')
    const doIdx = stream.indexOf('Do')
    const lastQIdx = stream.lastIndexOf('Q')
    expect(qIdx).toBeLessThan(wIdx)
    expect(wIdx).toBeLessThan(doIdx)
    expect(doIdx).toBeLessThan(lastQIdx)
  })

  it('zero-radii image keeps the existing direct path: no clip, only drawImage’s own single push/pop pair', async () => {
    const stream = await renderContentStream([imageOp({ radii: { tl: 0, tr: 0, br: 0, bl: 0 } })])
    expect(stream.match(/\bq\b/g)?.length).toBe(1) // drawImage's own internal wrap only — no overhead added
    expect(stream.match(/\bQ\b/g)?.length).toBe(1)
    expect(stream).not.toMatch(/\bW\b/) // no clip at all
    expect(stream.match(/\bDo\b/g)?.length).toBe(1)
  })

  it('falls back to a uniform radiusPx when radii is absent, with the same clip behavior', async () => {
    const stream = await renderContentStream([imageOp({ radiusPx: 40 })])
    expect(stream).toMatch(/\bW\b\s*\bn\b/)
    expect(stream.match(/\bq\b/g)?.length).toBe(2)
  })

  it('a fully-round photo (radius 9999 on an 80x80 box, the circle photoShape case) still clips, not throws', async () => {
    // The exact numeric clamp (9999 -> 40 on an 80x80 box) is proven directly
    // against `clampRadius`'s shared machinery via roundedRectPath below —
    // this confirms the SAME oversized-radius shape paint.ts's image path
    // actually sends through end to end.
    const stream = await renderContentStream([imageOp({ radii: { tl: 9999, tr: 9999, br: 9999, bl: 9999 } })])
    expect(stream).toMatch(/\bW\b\s*\bn\b/)
    expect(stream).toMatch(/\bc\b/)
  })

  it('tolerates an image whose src fails to load (skips painting, does not throw) even with radii set', async () => {
    const ops: DrawOp[] = [imageOp({ src: 'https://example.test/missing.png', radii: radii80 })]
    await expect(renderContentStream(ops)).resolves.not.toThrow()
  })

  it('a throw from drawImage on a radiused image does not leak the clip/transform into later ops (fix round: try/finally guard)', async () => {
    // Reviewer-proved defect: the clip/transform push was a bare
    // `page.drawImage(...)` statement followed by `popGraphicsState()` — a
    // throw from drawImage skipped the pop entirely. paintOps' outer per-op
    // catch swallows the error, so the leak was SILENT: every op painted
    // after this one would inherit the dead image's clip region and offset.
    // Fixed with the same try/finally discipline used everywhere else in
    // this file (e.g. paintTrackedHeading's Tr/Tz reset).
    const doc = await PDFDocument.create()
    doc.registerFontkit(fontkit)
    const page = doc.addPage([300, 300])
    const fonts = new PdfFontCache(doc, FONT_INDEX)

    let calls = 0
    const originalDrawImage = page.drawImage.bind(page)
    ;(page as unknown as { drawImage: typeof page.drawImage }).drawImage = ((
      ...args: Parameters<typeof page.drawImage>
    ) => {
      calls++
      if (calls === 1) throw new Error('boom: simulated drawImage failure')
      return originalDrawImage(...args)
    }) as typeof page.drawImage

    const ops: DrawOp[] = [
      imageOp({ radii: radii80 }), // throws once, mid-case, AFTER the clip is already pushed
      { kind: 'rect', xPx: 200, yPx: 10, wPx: 50, hPx: 50, fill: { r: 1, g: 0, b: 0, a: 1 } }, // must paint unclipped
    ]
    await expect(paintOps(page, ops, fonts, 300)).resolves.not.toThrow()

    const stream = (page as unknown as { getContentStream: () => { getContentsString(): string } })
      .getContentStream()
      .getContentsString()

    // Balanced push/pop: with the fix, our own `q` (pushed before the
    // failing drawImage call) is always matched by a `Q` from the finally,
    // even though drawImage itself threw before emitting its own internal
    // q/Do/Q. Before the fix this would be 1 q / 0 Q — unbalanced.
    const qCount = stream.match(/\bq\b/g)?.length ?? 0
    const QCount = stream.match(/\bQ\b/g)?.length ?? 0
    expect(qCount).toBe(QCount)

    // The following rect still paints (fill color `rg`), and it does so
    // strictly AFTER the FIRST `Q` in the stream — the image op's own
    // closing pop from the finally, since the image op is processed before
    // the rect — i.e. outside the graphics-state scope the failed image
    // opened, proving the rect is not painted through a leaked clip/
    // transform. (The rect's own drawRectangle call pushes and pops its OWN
    // separate q/Q pair around its fill — that later Q is not what's being
    // checked here; the image op's own scope closing first is.)
    const imageOwnQIdx = stream.indexOf('Q')
    const rectFillIdx = stream.indexOf('rg')
    expect(imageOwnQIdx).toBeGreaterThan(-1)
    expect(rectFillIdx).toBeGreaterThan(-1)
    expect(imageOwnQIdx).toBeLessThan(rectFillIdx)
  })

  it('asymmetric per-corner radii: the tl<->bl / tr<->br swap lands on the EXACT expected clip-path bezier coordinates', async () => {
    // The tl<->bl / tr<->br swap (paint.ts's case 'image' — correcting
    // roundedRectOperators' own top-left/y-down corner layout for the
    // page's bottom-left/y-up space) is new, easy-to-get-backwards geometry
    // that was previously protected only by a hand trace in review. This
    // asserts the REAL emitted bezier path numbers land where an
    // independent replica of roundedRectOperators' own kappa-bezier corner
    // math (computed here, not re-read from paint.ts) says they should.
    const wPx = 100
    const hPx = 50
    const radii: CornerRadii = { tl: 5, tr: 10, br: 15, bl: 20 } // four DISTINCT radii
    const stream = await renderContentStream([imageOp({ xPx: 0, yPx: 0, wPx, hPx, radii })])

    const wPt = pxToPt(wPx)
    const hPt = pxToPt(hPx)
    const kappa = 0.5522847498
    const clamp = (r: number) => Math.min(Math.max(r, 0), wPt / 2, hPt / 2)
    // paint.ts swaps tl<->bl and tr<->br in PX before converting to pt and
    // calling roundedRectOperators — replicate both the swap and the
    // clamped kappa-bezier math independently.
    const tl = clamp(pxToPt(radii.bl))
    const tr = clamp(pxToPt(radii.br))
    const br = clamp(pxToPt(radii.tr))
    const bl = clamp(pxToPt(radii.tl))
    const kTl = tl * kappa
    const kTr = tr * kappa
    const kBr = br * kappa
    const kBl = bl * kappa
    const expected: Array<[string, number[]]> = [
      ['m', [tl, 0]],
      ['l', [wPt - tr, 0]],
      ['c', [wPt - tr + kTr, 0, wPt, tr - kTr, wPt, tr]],
      ['l', [wPt, hPt - br]],
      ['c', [wPt, hPt - br + kBr, wPt - br + kBr, hPt, wPt - br, hPt]],
      ['l', [bl, hPt]],
      ['c', [bl - kBl, hPt, 0, hPt - bl + kBl, 0, hPt - bl]],
      ['l', [0, tl]],
      ['c', [0, tl - kTl, tl - kTl, 0, tl, 0]],
    ]

    // Only the clip path uses raw m/l/c path-construction operators — image
    // drawing (this op's own `Do`) only ever emits `cm`/`Do`, never m/l/c —
    // so every m/l/c line in this single-image-op stream belongs to it.
    const actual = [...stream.matchAll(/^([-\d.\s]+)\s(m|l|c)$/gm)].map((match): [string, number[]] => [
      match[2],
      match[1].trim().split(/\s+/).map(Number),
    ])

    expect(actual.length).toBe(expected.length)
    for (let i = 0; i < expected.length; i++) {
      expect(actual[i][0]).toBe(expected[i][0])
      expect(actual[i][1].length).toBe(expected[i][1].length)
      for (let j = 0; j < expected[i][1].length; j++) {
        expect(actual[i][1][j]).toBeCloseTo(expected[i][1][j], 4)
      }
    }
  })
})

describe('roundedRectPath (fix round 2 — per-corner border radii)', () => {
  it('reduces to the original single-radius shape when all four corners match', () => {
    const uniform = roundedRectPath(100, 50, { tl: 10, tr: 10, br: 10, bl: 10 })
    // Every corner's arc uses the same radius (10) and the path starts/ends
    // at the same points the old single-`r` formula produced.
    expect(uniform).toBe(
      'M 10 0 H 90 A 10 10 0 0 1 100 10 V 40 A 10 10 0 0 1 90 50 H 10 A 10 10 0 0 1 0 40 V 10 A 10 10 0 0 1 10 0 Z'
    )
  })

  it('degenerates to a plain (zero-radius) rectangle when all four corners are 0', () => {
    expect(roundedRectPath(100, 50, { tl: 0, tr: 0, br: 0, bl: 0 })).toBe(
      'M 0 0 H 100 A 0 0 0 0 1 100 0 V 50 A 0 0 0 0 1 100 50 H 0 A 0 0 0 0 1 0 50 V 0 A 0 0 0 0 1 0 0 Z'
    )
  })

  it('applies distinct radii per corner — spotlight header banner shape (square top, rounded bottom)', () => {
    const d = roundedRectPath(100, 50, { tl: 0, tr: 0, br: 18, bl: 18 })
    // top edge starts flush at the corner (tl=0) and runs the full width to
    // the top-right corner (tr=0, no arc radius there)...
    expect(d.startsWith('M 0 0 H 100 A 0 0 0 0 1 100 0')).toBe(true)
    // ...while the bottom corners each carve out an 18-radius arc.
    expect(d).toContain('A 18 18 0 0 1 82 50') // bottom-right
    expect(d).toContain('A 18 18 0 0 1 0 32') // bottom-left
  })

  it('applies four DIFFERENT radii, one per corner, with none of them collapsing to another', () => {
    const d = roundedRectPath(200, 200, { tl: 5, tr: 10, br: 15, bl: 20 })
    expect(d).toContain('A 10 10 0 0 1 200 10') // top-right
    expect(d).toContain('A 15 15 0 0 1 185 200') // bottom-right
    expect(d).toContain('A 20 20 0 0 1 0 180') // bottom-left
    expect(d).toContain('A 5 5 0 0 1 5 0') // top-left (closing arc)
  })

  it('clamps a wildly oversized uniform radius (9999, the "circle" photoShape value) on an 80x80 box to a true circle (radius 40)', () => {
    // task 17: the same `clampRadius` machinery roundedRectOperators uses for
    // the image-clip path (unexported, tested indirectly there) — proven
    // here directly via roundedRectPath, which shares the identical clamp.
    const d = roundedRectPath(80, 80, { tl: 9999, tr: 9999, br: 9999, bl: 9999 })
    expect(d).toBe(
      'M 40 0 H 40 A 40 40 0 0 1 80 40 V 40 A 40 40 0 0 1 40 80 H 40 A 40 40 0 0 1 0 40 V 40 A 40 40 0 0 1 40 0 Z'
    )
  })

  it('clamps each corner independently against the shorter half-dimension, not a single shared value', () => {
    // A radius bigger than the box: on a 40x100 box, half-dimensions are
    // 20 (width/2) and 50 (height/2) — every corner clamps to 20 regardless
    // of the requested radius, same clamp rule as the old uniform version,
    // just applied per corner instead of once for all four.
    const d = roundedRectPath(40, 100, { tl: 999, tr: 5, br: 999, bl: 999 })
    expect(d).toContain('A 5 5 0 0 1 40 5') // tr kept its own (smaller) requested radius
    expect(d.startsWith('M 20 0')).toBe(true) // tl clamped to 20 (w/2)
  })
})

describe("paintOps — case 'roundedBorder' (task 22 — radius-aware borders)", () => {
  // walk.ts hands paint.ts an ALREADY-inset box+radii (see types.ts's
  // `roundedBorder` doc comment) — these numbers are deliberately simple
  // round pt-friendly values so the emitted operators are easy to eyeball,
  // not meant to represent a literal walk.ts inset computation (that
  // arithmetic is covered directly in walk.test.ts).
  const ringOp = (overrides: Partial<Extract<DrawOp, { kind: 'roundedBorder' }>> = {}): DrawOp => ({
    kind: 'roundedBorder',
    xPx: 10,
    yPx: 10,
    wPx: 80,
    hPx: 40,
    radii: { tl: 8, tr: 8, br: 8, bl: 8 },
    widthPx: 2,
    color: { r: 1, g: 0, b: 0, a: 1 },
    ...overrides,
  })

  it('strokes the rounded path (S) with NO fill (f/B) — a border-only op paints no background', async () => {
    const stream = await renderContentStream([ringOp()])
    expect(stream).toMatch(/\bS\b/)
    expect(stream).not.toMatch(/\bf\b/)
    expect(stream).not.toMatch(/\bB\b/)
    expect(stream).toMatch(/\bc\b/) // real corner arcs (bezier), not a plain 4-line rect
  })

  it('sets the stroke width (w) to the op’s widthPx converted to pt', async () => {
    const stream = await renderContentStream([ringOp({ widthPx: 4 })])
    const wMatch = stream.match(/(-?[\d.]+)\s+w\b/)
    expect(wMatch).not.toBeNull()
    expect(Number(wMatch![1])).toBeCloseTo(pxToPt(4), 6)
  })

  it('positions the path at the op’s own (already-inset) x/y, flipped into PDF page space', async () => {
    const pageHeightPt = 300
    const { stream } = await renderPage([ringOp({ xPx: 10, yPx: 20 })])
    // drawSvgPath emits its own translate `cm` (1 0 0 1 x y cm) ahead of the
    // y-flip scale `cm` — same two-step sequence the existing glyph-outline
    // test below (`drawSvgPath emits translate/rotate/scale as three
    // separate cm ops`) already documents for this exact pdf-lib internal.
    const expectedX = pxToPt(10)
    const expectedY = flipY(pxToPt(20), pageHeightPt)
    const cmMatch = stream.match(/1 0 0 1 (-?[\d.]+) (-?[\d.]+) cm/)
    expect(cmMatch).not.toBeNull()
    expect(Number(cmMatch![1])).toBeCloseTo(expectedX, 6)
    expect(Number(cmMatch![2])).toBeCloseTo(expectedY, 6)
  })

  it('a solid border sets an empty dash array ([] 0 d) — no dash pattern active', async () => {
    const stream = await renderContentStream([ringOp({ dashed: false })])
    expect(stream).toMatch(/\[\s*\]\s+0\s+d/)
  })

  it('a dashed/dotted border sets the same [2px, 2px] dash pattern the straight-line case uses', async () => {
    const stream = await renderContentStream([ringOp({ dashed: true })])
    const dMatch = stream.match(/\[([^\]]*)\]\s+(-?[\d.]+)\s+d/)
    expect(dMatch).not.toBeNull()
    const nums = dMatch![1].trim().split(/\s+/).map(Number)
    expect(nums).toEqual([pxToPt(2), pxToPt(2)])
  })

  it('never throws for a bad roundedBorder op — a cosmetic border failure must not sink the export', async () => {
    const ops: DrawOp[] = [ringOp({ wPx: NaN })]
    await expect(renderContentStream(ops)).resolves.not.toThrow()
  })

  it('degenerates to a plain (non-curved) rectangle outline when every corner radius is 0', async () => {
    // Not actually reachable via walk.ts (zero-radius boxes never emit a
    // roundedBorder op at all — see walk.test.ts's regression test — but
    // paint.ts's own case should still degrade gracefully, same as
    // roundedRectPath itself does at tl=tr=br=bl=0).
    const stream = await renderContentStream([ringOp({ radii: { tl: 0, tr: 0, br: 0, bl: 0 } })])
    expect(stream).toMatch(/\bS\b/)
    expect(stream).not.toMatch(/\bf\b/)
  })
})

describe('paintOps — inline SVG icons (task 13)', () => {
  // A lucide AlignLeft-shaped icon: fill:none, stroke:currentColor — the
  // shape every section-heading chip icon actually is.
  const strokedIcon: DrawOp = {
    kind: 'svg',
    xPx: 10,
    yPx: 10,
    wPx: 14,
    hPx: 14,
    d: 'M 21 6 L 3 6',
    viewBox: [0, 0, 24, 24],
    stroke: { r: 0.1, g: 0.1, b: 0.1, a: 1 },
    strokeWidthPx: 2.1,
  }

  it('draws a stroke-only icon with the stroke operator, never fills or enters the text layer', async () => {
    const stream = await renderContentStream([strokedIcon])
    expect(stream).toMatch(/\bS\b/) // stroke
    expect(stream).not.toMatch(/\bf\b/) // no fill — fill: none
    expect(stream).not.toMatch(/\bBT\b/) // not a text object
    expect(stream).not.toMatch(/\bTj\b/)
  })

  it('draws a filled icon with the fill operator, no stroke, when only `fill` is set', async () => {
    const stream = await renderContentStream([
      { ...strokedIcon, stroke: undefined, fill: { r: 0.2, g: 0.3, b: 0.4, a: 1 } },
    ])
    expect(stream).toMatch(/\bf\b/)
    expect(stream).not.toMatch(/\bS\b/)
  })

  it('draws fillAndStroke ("B") when both fill and stroke are set', async () => {
    const stream = await renderContentStream([{ ...strokedIcon, fill: { r: 0.2, g: 0.3, b: 0.4, a: 1 } }])
    expect(stream).toMatch(/\bB\b/)
  })

  it('never throws and paints nothing for an svg op with neither fill nor stroke', async () => {
    const ops: DrawOp[] = [{ ...strokedIcon, stroke: undefined, fill: undefined }]
    const stream = await renderContentStream(ops)
    expect(stream).not.toMatch(/\bS\b/)
    expect(stream).not.toMatch(/\bf\b/)
  })

  it('scales viewBox-unit path geometry to the box size via the cm scale factor (pt-per-viewBox-unit)', async () => {
    const { stream } = await renderPage([strokedIcon])
    // wPx 14px -> pt = 14 * 0.75 = 10.5pt; viewBox width 24 -> scale = 10.5/24 = 0.4375.
    // drawSvgPath emits translate/rotate/scale as three separate `cm` ops —
    // the scale one is uniquely `S 0 0 -S 0 0 cm` (e=f=0, d negative);
    // translate's e/f are the real (nonzero) position, rotate(0)'s d is +1.
    const m = stream.match(/([\d.]+) 0 0 (-[\d.]+) 0 0 cm/)
    expect(m).toBeTruthy()
    expect(Number(m![1])).toBeCloseTo(10.5 / 24, 6)
    expect(Number(m![2])).toBeCloseTo(-(10.5 / 24), 6)
  })

  it('passes the RAW (un-scaled) strokeWidthPx as the border width — the cm scale applies it, not this call', async () => {
    // Verified empirically against a rasterized probe that this is the
    // combination that lands on the correct final device-space thickness
    // (task-13 report) — pre-multiplying strokeWidthPx here would double-
    // scale it through the same `cm`.
    const stream = await renderContentStream([strokedIcon])
    expect(stream).toMatch(/\b2\.1 w\b/)
  })

  it('never throws for a degenerate viewBox (zero width) — cosmetic, not real content', async () => {
    const ops: DrawOp[] = [{ ...strokedIcon, viewBox: [0, 0, 0, 24] }]
    await expect(renderContentStream(ops)).resolves.not.toThrow()
  })
})

describe('glyphPathToDrawPath', () => {
  it('scales and negates y (font y-up -> drawSvgPath y-down), leaves x untouched, for a real glyph outline', () => {
    const bytes = new Uint8Array(fs.readFileSync(path.join(FONT_DIR, FONT_FILE)))
    const font = fontkit.create(bytes)
    const glyph = font.layout('V').glyphs[0]
    const scale = 0.01
    const d = glyphPathToDrawPath(glyph.path, scale)
    const m = d.match(/^M (-?[\d.]+) (-?[\d.]+)/)
    expect(m).toBeTruthy()
    const [, xStr, yStr] = m!
    // The 'V' glyph's first path point in this real, checked-in font file is
    // (1352, 1409) in font units (verified directly against the .ttf, not
    // assumed) — x stays positive-scaled, y flips to negative-scaled.
    expect(Number(xStr)).toBeCloseTo(1352 * scale, 2)
    expect(Number(yStr)).toBeCloseTo(-1409 * scale, 2)
  })

  it('returns an empty string for a glyph with no outline (e.g. space)', () => {
    const bytes = new Uint8Array(fs.readFileSync(path.join(FONT_DIR, FONT_FILE)))
    const font = fontkit.create(bytes)
    const glyph = font.layout(' ').glyphs[0]
    expect(glyphPathToDrawPath(glyph.path, 0.01)).toBe('')
  })
})

describe('dataUriToBytes (hosted-site CSP, user report 2026-08-16)', () => {
  // Production ships connect-src 'self', which BLOCKS fetch() on data:
  // URIs — every logo/photo embed silently failed on the hosted site while
  // dev (no CSP) passed. Data URIs must decode without touching the
  // network layer.
  const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
  it('decodes a base64 data URI to the exact bytes', () => {
    const bytes = dataUriToBytes(`data:image/png;base64,${PNG_B64}`)
    expect(bytes).not.toBeNull()
    expect(Buffer.from(bytes!).toString('base64')).toBe(PNG_B64)
  })
  it('decodes a percent-encoded (non-base64) data URI', () => {
    const bytes = dataUriToBytes('data:text/plain,hello%20world')
    expect(new TextDecoder().decode(bytes!)).toBe('hello world')
  })
  it('tolerates extra media-type parameters before base64', () => {
    const bytes = dataUriToBytes(`data:image/png;charset=binary;base64,${PNG_B64}`)
    expect(bytes).not.toBeNull()
    expect(bytes!.length).toBeGreaterThan(20)
  })
  it('returns null for non-data URLs and malformed input', () => {
    expect(dataUriToBytes('https://example.test/a.png')).toBeNull()
    expect(dataUriToBytes('data:image/png;base64')).toBeNull()
    expect(dataUriToBytes('data:image/png;base64,%%%invalid%%%')).toBeNull()
  })
})

describe('paintOps — decorative-box capture hook (task 15, gate instrumentation)', () => {
  // render.tsx only allocates and passes this array when
  // window.__cvaCaptureRenderBoxes === true (see its own doc comment) — from
  // paintOps's side, the array's mere presence/absence IS the flag, so these
  // tests exercise that directly rather than through window, keeping this
  // module's tests free of any DOM/global assumptions (paintOps itself never
  // touches `window`).
  it('flag off (no array passed): captures nothing, behaves exactly as before', async () => {
    const stream = await renderContentStream([{ kind: 'text', run: baseRun({ text: 'V', isDecorative: true }) }])
    // No captureDecoBoxes argument at all — same call shape every other
    // paintOps test in this file already uses. Just confirms it still paints
    // the decorative glyph normally (no behavior change).
    expect(stream).toMatch(/\bf\b/)
  })

  it('flag on (array passed): populates one box per decorative glyph-outline run painted', async () => {
    const boxes: DecoBox[] = []
    await renderPage(
      [
        { kind: 'text', run: baseRun({ text: 'V', isDecorative: true, xPx: 40, baselinePx: 60, sizePx: 14 }) },
        { kind: 'text', run: baseRun({ text: 'UC', isDecorative: true, xPx: 100, baselinePx: 60, sizePx: 10 }) },
      ],
      boxes
    )
    expect(boxes.length).toBe(2)
    // x/baseline-size/size*1.2 come straight off the run, per the brief's
    // approximate-box formula — exact, not estimated.
    expect(boxes[0]).toEqual({ xPx: 40, yPx: 60 - 14, wPx: expect.any(Number), hPx: 14 * 1.2 })
    expect(boxes[1]).toEqual({ xPx: 100, yPx: 60 - 10, wPx: expect.any(Number), hPx: 10 * 1.2 })
    // wPx is a real measured advance (font-derived), not zero/guessed.
    expect(boxes[0].wPx).toBeGreaterThan(0)
    expect(boxes[1].wPx).toBeGreaterThan(0)
    // "UC" (2 letters) should measure wider than "V" (1 letter) at a SMALLER
    // font size — confirms wPx tracks the real glyph run, not just sizePx.
    expect(boxes[1].wPx).toBeGreaterThan(boxes[0].wPx)
  })

  it("never captures REAL (non-decorative) text, even a tracked heading's visible vector layer", async () => {
    const boxes: DecoBox[] = []
    await renderPage(
      [
        { kind: 'text', run: baseRun({ text: 'Senior Software Engineer', isDecorative: false }) },
        { kind: 'text', run: baseRun({ text: 'SUMMARY', isDecorative: false, letterSpacingPx: 1.5 }) }, // tracked: draws vector outlines too, but is real content
      ],
      boxes
    )
    expect(boxes).toEqual([])
  })

  it('never changes the painted content stream — same ops paint identically whether or not the array is passed', async () => {
    const ops: DrawOp[] = [{ kind: 'text', run: baseRun({ text: 'NYU', isDecorative: true }) }]
    const withoutCapture = await renderContentStream(ops)
    const { stream: withCapture } = await renderPage(ops, [])
    expect(withCapture).toBe(withoutCapture)
  })
})

describe('assignOpsToPages — band assignment, offsets, chrome (task 3, native multi-page pdf plan)', () => {
  // Pure, DOM-free, pdf-lib-free — plain-object assertions against the
  // returned per-page DrawOp[][] directly.
  const rectOp = (yPx: number, hPx = 10, overrides: Partial<Extract<DrawOp, { kind: 'rect' }>> = {}): DrawOp => ({
    kind: 'rect',
    xPx: 0,
    yPx,
    wPx: 100,
    hPx,
    fill: { r: 0, g: 0, b: 0, a: 1 },
    ...overrides,
  })

  it('single page (cutsPx empty): returns [ops] — the SAME array reference, no cloning at all', () => {
    const ops: DrawOp[] = [rectOp(0), rectOp(50)]
    const pages = assignOpsToPages(ops, [], 40, 1000)
    expect(pages.length).toBe(1)
    expect(pages[0]).toBe(ops) // reference equality, not just deep-equal
  })

  it('assigns each op to the band containing its own top edge (rect: yPx)', () => {
    const opPage1 = rectOp(10)
    const opPage2 = rectOp(150)
    const opPage3 = rectOp(300)
    const pages = assignOpsToPages([opPage1, opPage2, opPage3], [100, 250], 20, 1000)
    expect(pages.length).toBe(3)
    expect(pages[0]).toEqual([opPage1])
    expect(pages[1]).toEqual([{ ...opPage2, yPx: 150 - (100 - 20) }])
    expect(pages[2]).toEqual([{ ...opPage3, yPx: 300 - (250 - 20) }])
  })

  it('an op with topEdge exactly AT a cut belongs to the page AFTER the cut', () => {
    const op = rectOp(100)
    const pages = assignOpsToPages([op], [100], 0, 1000)
    expect(pages[0]).toEqual([])
    expect(pages[1]).toEqual([{ ...op, yPx: 0 }]) // offset = 100 - 0 = 100 -> 100 - 100 = 0
  })

  it('page 1 offset is always exactly 0 — an op at the very top of the document keeps its own yPx', () => {
    const op = rectOp(0)
    const pages = assignOpsToPages([op, rectOp(500)], [200], 30, 1000)
    expect(pages[0][0]).toEqual(op) // untouched, not just numerically 0
  })

  it('line ops classify by the SMALLER of their two y endpoints, and both endpoints translate together', () => {
    const line: DrawOp = {
      kind: 'line',
      x1Px: 0,
      y1Px: 205,
      x2Px: 100,
      y2Px: 205,
      widthPx: 1,
      color: { r: 0, g: 0, b: 0, a: 1 },
    }
    const pages = assignOpsToPages([line], [200], 20, 1000)
    const offsetPx = 200 - 20
    expect(pages[1]).toEqual([{ ...line, y1Px: 205 - offsetPx, y2Px: 205 - offsetPx }])
  })

  it('text ops classify and translate by baselinePx (no ascent guess — see the function doc comment)', () => {
    const run: TextRun = { ...baseRun({ baselinePx: 210 }) }
    const op: DrawOp = { kind: 'text', run }
    const pages = assignOpsToPages([op], [200], 20, 1000)
    const offsetPx = 200 - 20
    expect(pages[1]).toEqual([{ kind: 'text', run: { ...run, baselinePx: 210 - offsetPx } }])
  })

  it('image/svg/roundedBorder ops all classify and translate by their own yPx, same as rect', () => {
    const image: DrawOp = { kind: 'image', xPx: 0, yPx: 210, wPx: 10, hPx: 10, src: 'x' }
    const svg: DrawOp = {
      kind: 'svg',
      xPx: 0,
      yPx: 220,
      wPx: 10,
      hPx: 10,
      d: 'M0 0',
      viewBox: [0, 0, 10, 10],
      strokeWidthPx: 1,
    }
    const border: DrawOp = {
      kind: 'roundedBorder',
      xPx: 0,
      yPx: 230,
      wPx: 10,
      hPx: 10,
      radii: { tl: 1, tr: 1, br: 1, bl: 1 },
      widthPx: 1,
      color: { r: 0, g: 0, b: 0, a: 1 },
    }
    const pages = assignOpsToPages([image, svg, border], [200], 0, 1000)
    expect(pages[1]).toEqual([
      { ...image, yPx: 10 },
      { ...svg, yPx: 20 },
      { ...border, yPx: 30 },
    ])
  })

  it('preserves each page’s own op order (document order subsequence, not reordered)', () => {
    const a = rectOp(10, 5, { fill: { r: 1, g: 0, b: 0, a: 1 } })
    const b = rectOp(20, 5, { fill: { r: 0, g: 1, b: 0, a: 1 } })
    const c = rectOp(30, 5, { fill: { r: 0, g: 0, b: 1, a: 1 } })
    const pages = assignOpsToPages([a, b, c], [1000], 0, 1000) // all on page 1
    expect(pages[0]).toEqual([a, b, c])
  })

  it('page-chrome ops repeat on EVERY page, clamped to that page’s own full height, ignoring the original band entirely', () => {
    const chrome: DrawOp = { ...rectOp(0, 900, { fill: { r: 0.1, g: 0.1, b: 0.1, a: 1 } }), pageChrome: true }
    const content = rectOp(500)
    const pages = assignOpsToPages([chrome, content], [400], 40, 1000)
    expect(pages.length).toBe(2)
    // Chrome appears on BOTH pages, reset to yPx 0 and hPx = the FULL page
    // height (1000) — not clamped to its own original 900, not offset like
    // ordinary content.
    expect(pages[0][0]).toEqual({ ...chrome, yPx: 0, hPx: 1000 })
    expect(pages[1][0]).toEqual({ ...chrome, yPx: 0, hPx: 1000 })
    // Ordinary content op still gets normal band assignment alongside it.
    expect(pages[1][1]).toEqual({ ...content, yPx: 500 - (400 - 40) })
  })

  it('three-page document: three bands, three distinct offsets', () => {
    const ops = [rectOp(10), rectOp(150), rectOp(350)]
    const pages = assignOpsToPages(ops, [100, 300], 25, 1000)
    expect(pages.length).toBe(3)
    expect(pages[0]).toEqual([ops[0]])
    expect(pages[1]).toEqual([{ ...ops[1], yPx: 150 - (100 - 25) }])
    expect(pages[2]).toEqual([{ ...ops[2], yPx: 350 - (300 - 25) }])
  })

  describe('a tagged op that does NOT start at the document top is not the ground', () => {
    // The marquee all-black export, in numbers. The strip's tail
    // (artboard.css `.rm-footer::after`) is one page of the strip's colour
    // hung below the strip so its ground reaches the paper's foot. On a
    // 1150.6px document it is 1122.5px tall and starts at y = 1225.1, BELOW
    // the document's own bottom — and 1122.5 >= 0.96 x 1150.6, so walk.ts's
    // height-only heuristic tagged it as page chrome. It was then redrawn at
    // full page height on every sheet and both exported pages came back
    // solid #111111 with the text layer intact underneath.
    const PAGE_H = 1122.5
    const CUT = 861.6
    const TOP_PAD = 75.6
    const tail: DrawOp = {
      ...rectOp(1225.1, PAGE_H, { fill: { r: 0.067, g: 0.067, b: 0.067, a: 1 } }),
      pageChrome: true,
    }

    it('does not repeat on every page: the tail never touches page 1', () => {
      const body = rectOp(400)
      const pages = assignOpsToPages([body, tail], [CUT], TOP_PAD, PAGE_H)
      expect(pages[0]).toEqual([body])
    })

    it('lands on the last page at its own offset position, not clamped to the full sheet', () => {
      const pages = assignOpsToPages([tail], [CUT], TOP_PAD, PAGE_H)
      // Ordinary band assignment: page-2 offset is cut - topPadding, and the
      // tail keeps its own height so the sheet's edge is what cuts it.
      expect(pages[1]).toEqual([{ ...tail, yPx: 1225.1 - (CUT - TOP_PAD) }])
      expect(pages[1][0]).not.toMatchObject({ yPx: 0, hPx: PAGE_H })
    })

    it('a tagged rect that DOES start at the document top still repeats full-bleed', () => {
      // The root's own background, the case the tag exists for — unchanged.
      const ground: DrawOp = { ...rectOp(0, 1150.6, { fill: { r: 1, g: 0.97, b: 0.94, a: 1 } }), pageChrome: true }
      const pages = assignOpsToPages([ground, tail], [CUT], TOP_PAD, PAGE_H)
      expect(pages[0][0]).toEqual({ ...ground, yPx: 0, hPx: PAGE_H })
      expect(pages[1][0]).toEqual({ ...ground, yPx: 0, hPx: PAGE_H })
    })

    it('one sub-pixel below the top is still the ground (1px of slack, measured)', () => {
      const ground: DrawOp = { ...rectOp(0.4, 1150.6), pageChrome: true }
      const pages = assignOpsToPages([ground], [CUT], TOP_PAD, PAGE_H)
      expect(pages[0][0]).toEqual({ ...ground, yPx: 0, hPx: PAGE_H })
      expect(pages[1][0]).toEqual({ ...ground, yPx: 0, hPx: PAGE_H })
    })
  })

  describe('task 6b — straddling decoration ops repeat on every band they intersect', () => {
    // Mirrors timeline's real defect: a tall thin decorative rail rect
    // straddles the cut, so the top-edge-only rule used to paint it ONLY on
    // the band owning its top edge, losing the rest on the next page (sweep
    // artifact: 155px of missing rail at the top of page 2).
    it('a tall thin rect spanning bands 1-2 is painted on BOTH pages, CROPPED to each band, while text ops appear exactly once', () => {
      const rail = rectOp(50, 300) // spans document [50, 350] -- straddles the cut at 200
      const textBefore: DrawOp = { kind: 'text', run: baseRun({ baselinePx: 100 }) }
      const textAfter: DrawOp = { kind: 'text', run: baseRun({ baselinePx: 250 }) }

      const pages = assignOpsToPages([textBefore, rail, textAfter], [200], 20, 1000)
      const offsetPx = 200 - 20 // page-2 offset

      expect(pages.length).toBe(2)
      // The rail appears in BOTH pages' op groups, each copy CROPPED to that
      // band's own [bandTop, bandBottom) range (fix-round-1, I2) before
      // translation -- not the full original height duplicated whole, which
      // would let each copy paint past its own band's boundary.
      expect(pages[0]).toEqual([textBefore, { ...rail, yPx: 50, hPx: 150 }])
      expect(pages[1]).toEqual([
        { ...rail, yPx: 200 - offsetPx, hPx: 150 },
        { kind: 'text', run: { ...textAfter.run, baselinePx: 250 - offsetPx } },
      ])

      // Each text op still appears EXACTLY ONCE across the whole document --
      // the top-edge rule for text/image ops is unchanged.
      const allTextRuns = [...pages[0], ...pages[1]].filter((o) => o.kind === 'text')
      expect(allTextRuns.length).toBe(2)
    })

    it('a stroked line spanning bands 1-2 is likewise painted on both pages, each copy cropped to its own band', () => {
      const rail: DrawOp = {
        kind: 'line',
        x1Px: 5,
        y1Px: 180,
        x2Px: 5,
        y2Px: 260,
        widthPx: 2,
        color: { r: 0, g: 0, b: 0, a: 1 },
      }
      const pages = assignOpsToPages([rail], [200], 0, 1000)
      expect(pages[0]).toEqual([{ ...rail, y1Px: 180, y2Px: 200 }])
      expect(pages[1]).toEqual([{ ...rail, y1Px: 0, y2Px: 60 }])
    })

    it('a rect fully inside one band is NOT duplicated or cropped (unchanged single-band assignment)', () => {
      const rect = rectOp(50, 100) // spans [50, 150] -- entirely within band 1 ([0, 200))
      const pages = assignOpsToPages([rect], [200], 20, 1000)
      expect(pages[0]).toEqual([rect])
      expect(pages[1]).toEqual([])
    })

    it('a rect spanning THREE bands is painted on all three, each copy cropped to its own band', () => {
      const rail = rectOp(50, 500) // spans [50, 550] -- crosses both cuts at 200 and 400
      const pages = assignOpsToPages([rail], [200, 400], 20, 1000)
      expect(pages.length).toBe(3)
      expect(pages[0]).toEqual([{ ...rail, yPx: 50, hPx: 150 }])
      expect(pages[1]).toEqual([{ ...rail, yPx: 200 - (200 - 20), hPx: 200 }])
      expect(pages[2]).toEqual([{ ...rail, yPx: 400 - (400 - 20), hPx: 150 }])
    })

    it('a pageChrome rect keeps its own dedicated full-page-height repetition path, not this straddling logic', () => {
      const chrome: DrawOp = { ...rectOp(0, 900, { fill: { r: 0.1, g: 0.1, b: 0.1, a: 1 } }), pageChrome: true }
      const pages = assignOpsToPages([chrome], [200], 20, 1000)
      expect(pages[0]).toEqual([{ ...chrome, yPx: 0, hPx: 1000 }])
      expect(pages[1]).toEqual([{ ...chrome, yPx: 0, hPx: 1000 }])
    })

    it('I2 (fix round 1): a straddling radius-free rect is CROPPED to each bands intersection, not duplicated whole', () => {
      // The exact reviewer repro: rect [980, 1040], cut at 1000, pad 57 --
      // pre-fix, page 2 showed the FULL uncropped rect translated (local
      // [37, 97]), duplicating the [980, 1000) slice page 1 already painted
      // (a straddling 2px divider reappeared as a stray ~1px hairline just
      // above page 2's real content).
      const rect = rectOp(980, 60) // spans document [980, 1040]
      const pages = assignOpsToPages([rect], [1000], 57, 1123)
      expect(pages.length).toBe(2)
      expect(pages[0]).toEqual([{ ...rect, yPx: 980, hPx: 20 }]) // cropped to [980, 1000)
      expect(pages[1]).toEqual([{ ...rect, yPx: 57, hPx: 40 }]) // cropped to [1000, 1040) then offset by (1000-57)
    })

    it('I2 (fix round 1): a straddling rect WITH nonzero radii returns to single-band (top-edge) assignment, uncropped', () => {
      const rect = rectOp(980, 60, { radii: { tl: 8, tr: 8, br: 8, bl: 8 } })
      const pages = assignOpsToPages([rect], [1000], 57, 1123)
      // Anchor (top edge, yPx=980) falls in band 0 -- painted ONCE there,
      // whole, exactly like every other radiused/non-rect/non-line kind.
      expect(pages[0]).toEqual([rect])
      expect(pages[1]).toEqual([])
    })

    it('I2 (fix round 1): a straddling rect with an all-zero radii object still crops normally (not treated as radiused)', () => {
      const rect = rectOp(980, 60, { radii: { tl: 0, tr: 0, br: 0, bl: 0 } })
      const pages = assignOpsToPages([rect], [1000], 57, 1123)
      expect(pages[0]).toEqual([{ ...rect, yPx: 980, hPx: 20 }])
      expect(pages[1]).toEqual([{ ...rect, yPx: 57, hPx: 40 }])
    })
  })
})

describe('paintPages — multi-page paint assembly (task 3, native multi-page pdf plan)', () => {
  it('single page (cutsPx empty) paints byte-identical to calling paintOps directly', async () => {
    const ops: DrawOp[] = [
      { kind: 'rect', xPx: 0, yPx: 0, wPx: 50, hPx: 20, fill: { r: 0.2, g: 0.3, b: 0.4, a: 1 } },
      { kind: 'text', run: baseRun({ text: 'Senior Software Engineer' }) },
    ]

    const docA = await PDFDocument.create()
    docA.registerFontkit(fontkit)
    const pageA = docA.addPage([300, 300])
    const fontsA = new PdfFontCache(docA, FONT_INDEX)
    await paintOps(pageA, ops, fontsA, 300)
    const streamA = (pageA as unknown as { getContentStream: () => { getContentsString(): string } })
      .getContentStream()
      .getContentsString()

    const docB = await PDFDocument.create()
    docB.registerFontkit(fontkit)
    const pageB = docB.addPage([300, 300])
    const fontsB = new PdfFontCache(docB, FONT_INDEX)
    await paintPages([pageB], ops, fontsB, 300, 300, [], 0)
    const streamB = (pageB as unknown as { getContentStream: () => { getContentsString(): string } })
      .getContentStream()
      .getContentsString()

    expect(streamB).toBe(streamA)
  })

  it('creates real pages at the given A4 dimensions, both pages the same size', async () => {
    const doc = await PDFDocument.create()
    doc.registerFontkit(fontkit)
    const wPt = pxToPt(794)
    const hPt = pxToPt(1123)
    const page1 = doc.addPage([wPt, hPt])
    const page2 = doc.addPage([wPt, hPt])
    const fonts = new PdfFontCache(doc, FONT_INDEX)
    await paintPages([page1, page2], [], fonts, hPt, 1123, [500], 0)
    expect(page1.getSize()).toEqual({ width: wPt, height: hPt })
    expect(page2.getSize()).toEqual({ width: wPt, height: hPt })
  })

  it('a pageChrome background rect paints on every page, full page height, at PAGE-LOCAL yPx 0 in each stream', async () => {
    const doc = await PDFDocument.create()
    doc.registerFontkit(fontkit)
    const page1 = doc.addPage([300, 300])
    const page2 = doc.addPage([300, 300])
    const fonts = new PdfFontCache(doc, FONT_INDEX)
    const chrome: DrawOp = {
      kind: 'rect',
      xPx: 0,
      yPx: 0,
      wPx: 300,
      hPx: 900, // spans the whole 2-page document in document space
      fill: { r: 0.05, g: 0.05, b: 0.05, a: 1 },
      pageChrome: true,
    }
    await paintPages([page1, page2], [chrome], fonts, 300, 300, [400], 0)

    const stream1 = (page1 as unknown as { getContentStream: () => { getContentsString(): string } })
      .getContentStream()
      .getContentsString()
    const stream2 = (page2 as unknown as { getContentStream: () => { getContentsString(): string } })
      .getContentStream()
      .getContentsString()
    // Both pages fill a rect (pdf-lib's own drawRectangle emits an m/l/l/l/h
    // path, not a raw `re` primitive) at page-local y=0 with the page's own
    // FULL height (300px -> 225pt) — not the original 900px height, not
    // offset. `0 0 m` / `0 <h> l` is that path's first two points.
    const pathMatch1 = stream1.match(/0 0 m\s*\n0 ([\d.]+) l/)
    const pathMatch2 = stream2.match(/0 0 m\s*\n0 ([\d.]+) l/)
    expect(pathMatch1).not.toBeNull()
    expect(pathMatch2).not.toBeNull()
    expect(Number(pathMatch1![1])).toBeCloseTo(pxToPt(300), 3)
    expect(Number(pathMatch2![1])).toBeCloseTo(pxToPt(300), 3)
  })

  it('the same-line snap chain resets at each page boundary — a run on page 2 never snaps against page 1 ink', async () => {
    // Mirrors paintOps' own "snaps metric-drift overlap" test shape (paint.ts
    // — the negative-gap-within-drift-allowance snap): constructed so the
    // SECOND run would snap against the FIRST run's true end if they were
    // painted through the same paintOps call/prevRealEnd chain. Split across
    // a page boundary here, they must NOT interact at all.
    const sizePx = 12
    const textA =
      'Architected and deployed the comprehensive cloud infrastructure migration migration migration from 820ms to '
    const trueEndA = await trueWidthPt(textA, sizePx)
    const boldSpaceWidth = await trueWidthPt(' ', 12)
    const gapPt = boldSpaceWidth * 1.2 // exceeds bold space width, but within chain-drift allowance
    const driftedXPx = (trueEndA - gapPt) / (72 / 96)

    const cutPx = 100
    const pageTopPaddingPx = 0
    const offsetPx = cutPx - pageTopPaddingPx

    const ops: DrawOp[] = [
      { kind: 'text', run: baseRun({ text: textA, xPx: 0, baselinePx: 20, sizePx }) }, // page 1: baselinePx 20 < cutPx
      // Placed so its POST-TRANSLATION baseline lands at 20 too (same as A's)
      // and its x is the SAME drift-triggering position used above — if this
      // were wrongly processed through page 1's chain, it would snap to
      // trueEndA exactly like paintOps' own same-page test proves it should.
      {
        kind: 'text',
        run: baseRun({ text: '190ms', xPx: driftedXPx, baselinePx: 20 + offsetPx, sizePx, weight: 700 }),
      },
    ]

    const doc = await PDFDocument.create()
    doc.registerFontkit(fontkit)
    const page1 = doc.addPage([600, 300])
    const page2 = doc.addPage([600, 300])
    const fonts = new PdfFontCache(doc, FONT_INDEX)
    await paintPages([page1, page2], ops, fonts, 300, 300, [cutPx], pageTopPaddingPx)

    const stream1 = (page1 as unknown as { getContentStream: () => { getContentsString(): string } })
      .getContentStream()
      .getContentsString()
    const stream2 = (page2 as unknown as { getContentStream: () => { getContentsString(): string } })
      .getContentStream()
      .getContentsString()

    expect(stream1.match(/\bTj\b/g)?.length).toBe(1) // only textA landed on page 1
    expect(stream2.match(/\bTj\b/g)?.length).toBe(1) // only the second run landed on page 2

    const secondX = [...stream2.matchAll(/1 0 0 1 (-?[\d.]+) -?[\d.]+ Tm/g)].map((m) => Number(m[1]))[0]
    // Must render at its OWN given (translated) x — NOT snapped to trueEndA,
    // proving page 2's paintOps call started with a fresh (null) prevRealEnd.
    expect(secondX).toBeCloseTo(pxToPt(driftedXPx), 6)
    expect(secondX).not.toBeCloseTo(trueEndA, 1)
  })
})

describe('paintOps — tagged PDF marked content', () => {
  /** Renders with a real tag sink and returns the page's content stream. */
  const renderTagged = async (ops: DrawOp[]) => {
    const pdfDoc = await PDFDocument.create()
    pdfDoc.registerFontkit(fontkit)
    const page = pdfDoc.addPage([300, 400])
    const fonts = new PdfFontCache(pdfDoc, FONT_INDEX)
    const sink = createTagSink()
    sink.startPage(0)
    await paintOps(page, ops, fonts, 400, undefined, sink)
    const stream = (page as unknown as { getContentStream: () => { getContentsString(): string } })
      .getContentStream()
      .getContentsString()
    return { stream, marks: sink.marks }
  }

  it('opens and closes exactly one sequence per op — never leaves one dangling', async () => {
    // Includes a TRACKED run, which takes an early `continue` out of the
    // paint loop: that path once skipped its EMC and left 137 begins against
    // 55 ends in a real export.
    const { stream } = await renderTagged([
      { kind: 'text', run: baseRun({ text: 'Summary' }), role: 'P' },
      { kind: 'text', run: baseRun({ text: 'Tracked', letterSpacingPx: 1.5 }), role: 'H2' },
      { kind: 'rect', xPx: 0, yPx: 0, wPx: 10, hPx: 10, fill: { r: 0, g: 0, b: 0, a: 1 } },
    ])
    const begins = (stream.match(/\bBDC\b/g) ?? []).length + (stream.match(/\bBMC\b/g) ?? []).length
    const ends = (stream.match(/\bEMC\b/g) ?? []).length
    expect(begins).toBe(3)
    expect(ends).toBe(3)
  })

  it('gives real content an MCID and decoration a bare Artifact', async () => {
    const { stream, marks } = await renderTagged([
      { kind: 'text', run: baseRun({ text: 'Experience' }), role: 'H2' },
      { kind: 'rect', xPx: 0, yPx: 0, wPx: 10, hPx: 10, fill: { r: 0, g: 0, b: 0, a: 1 } },
    ])
    expect(stream).toContain('/H2 <</MCID 0>> BDC')
    expect(stream).toContain('/Artifact BMC')
    // Only the tagged content is recorded for the structure tree.
    expect(marks).toEqual([{ pageIndex: 0, mcid: 0, role: 'H2' }])
  })

  it('numbers MCIDs from zero on every page', async () => {
    const pdfDoc = await PDFDocument.create()
    pdfDoc.registerFontkit(fontkit)
    const fonts = new PdfFontCache(pdfDoc, FONT_INDEX)
    const sink = createTagSink()
    sink.startPage(0)
    const first = pdfDoc.addPage([300, 400])
    await paintOps(first, [{ kind: 'text', run: baseRun({ text: 'One' }), role: 'P' }], fonts, 400, undefined, sink)
    sink.startPage(1)
    const second = pdfDoc.addPage([300, 400])
    await paintOps(second, [{ kind: 'text', run: baseRun({ text: 'Two' }), role: 'P' }], fonts, 400, undefined, sink)
    expect(sink.marks).toEqual([
      { pageIndex: 0, mcid: 0, role: 'P' },
      { pageIndex: 1, mcid: 0, role: 'P' },
    ])
  })
})

describe('clampChromeOpToPage — chrome gradients continue across pages', () => {
  const band = (over: Partial<Extract<DrawOp, { kind: 'rect' }>> = {}): DrawOp => ({
    kind: 'rect',
    xPx: 0,
    yPx: 0,
    wPx: 278,
    hPx: 2400, // a full-document sidebar band
    fillGradient: {
      angleDeg: 180,
      stops: [
        { r: 1, g: 0, b: 0, a: 1 },
        { r: 0, g: 0, b: 1, a: 1 },
      ],
    },
    pageChrome: true,
    ...over,
  })

  it('clamps the painted rect to the page, as before', () => {
    const out = clampChromeOpToPage(band(), 1123, 0)
    expect(out).toMatchObject({ kind: 'rect', yPx: 0, hPx: 1123 })
  })

  it('keeps the gradient box spanning the whole document on page 1', () => {
    const out = clampChromeOpToPage(band(), 1123, 0)
    expect(out.kind === 'rect' && out.gradientBoxPx).toEqual({ yPx: 0, hPx: 2400 })
  })

  it('shifts the gradient box UP on later pages so the ramp continues', () => {
    // Page 3 of a document whose band top is 2000px: the gradient started
    // 2000px above this page, so its box begins at -2000 in page space.
    const out = clampChromeOpToPage(band(), 1123, 2000)
    expect(out.kind === 'rect' && out.gradientBoxPx).toEqual({ yPx: -2000, hPx: 2400 })
  })

  it('leaves a plain-fill chrome band untouched (no gradient box invented)', () => {
    const out = clampChromeOpToPage(band({ fillGradient: undefined, fill: { r: 0, g: 0, b: 0, a: 1 } }), 1123, 900)
    expect(out.kind === 'rect' && out.gradientBoxPx).toBeUndefined()
  })

  it('passes non-rect chrome ops straight through', () => {
    const line: DrawOp = {
      kind: 'line',
      x1Px: 0,
      y1Px: 0,
      x2Px: 10,
      y2Px: 0,
      widthPx: 1,
      color: { r: 0, g: 0, b: 0, a: 1 },
    }
    expect(clampChromeOpToPage(line, 1123, 500)).toBe(line)
  })
})

/**
 * The art band (P10) reaches the PDF through the generic image path: it is a
 * webp, so pdf-lib cannot embed its bytes and the painter decodes and
 * re-encodes it. Re-encoded as a PNG at the source's NATURAL size, a
 * 1200x300 photographic band lands as about a megabyte of Flate-compressed
 * samples, which puts any document carrying one two to three times over the
 * export budget the spec sets - and, drawn straight into the box, it
 * stretches where the canvas crops, so the two outputs show different
 * pictures. An opaque source is therefore re-encoded as a JPEG at the size
 * it is actually drawn, with the same crop the page shows.
 */
describe('paintOps - an opaque source is re-encoded at the size it is drawn', () => {
  // Neither PNG nor JPEG magic: the bytes reach the decode-and-re-encode
  // path, exactly as a real webp band does.
  const WEBP_SRC = 'https://example.test/band.webp'
  // A real 1x1 JPEG and a real 1x1 PNG, so pdf-lib's own embedders run for
  // real on whichever one the painter asks the canvas for.
  const JPEG_B64 =
    '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigD//2Q=='
  const PNG_B64 = TEST_PNG_BASE64

  type Draw = { args: number[]; type: string }
  let draws: Draw[] = []
  let boxes: { w: number; h: number }[] = []
  let asked: string[] = []
  let opaque = true
  let originalDocument: unknown
  let originalImage: unknown

  beforeAll(() => {
    const g = globalThis as unknown as Record<string, unknown>
    originalDocument = g.document
    originalImage = g.Image
    g.Image = class {
      naturalWidth = 1200
      naturalHeight = 300
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_v: string) {
        queueMicrotask(() => this.onload?.())
      }
    }
    g.document = {
      createElement: (tag: string) => {
        if (tag !== 'canvas') return {}
        const canvas = {
          width: 0,
          height: 0,
          getContext: () => ({
            drawImage: (...args: unknown[]) => {
              draws.push({ args: args.slice(1) as number[], type: 'draw' })
            },
            getImageData: (_x: number, _y: number, w: number, h: number) => {
              const data = new Uint8ClampedArray(w * h * 4).fill(255)
              if (!opaque) data[3] = 0
              return { data }
            },
          }),
          toDataURL: (type: string) => {
            asked.push(type)
            boxes.push({ w: canvas.width, h: canvas.height })
            return type === 'image/jpeg' ? `data:image/jpeg;base64,${JPEG_B64}` : `data:image/png;base64,${PNG_B64}`
          },
        }
        return canvas
      },
    }
  })
  afterAll(() => {
    const g = globalThis as unknown as Record<string, unknown>
    g.document = originalDocument
    g.Image = originalImage
  })

  const reset = (isOpaque: boolean) => {
    draws = []
    boxes = []
    asked = []
    opaque = isOpaque
  }

  /** The PDF as it is written out, where the image's own filter shows. */
  const savedPdf = async (ops: DrawOp[]) => {
    const { page } = await renderPage(ops)
    return Buffer.from(await page.doc.save()).toString('latin1')
  }

  const bandOp = (overrides: Partial<Extract<DrawOp, { kind: 'image' }>> = {}): DrawOp => ({
    kind: 'image',
    xPx: 0,
    yPx: 0,
    wPx: 260,
    hPx: 120,
    src: WEBP_SRC,
    fit: 'cover',
    ...overrides,
  })

  it('writes an opaque source as a JPEG stream, not a Flate one', async () => {
    reset(true)
    const pdf = await savedPdf([bandOp()])
    expect(asked).toContain('image/jpeg')
    expect(pdf).toContain('DCTDecode')
  })

  it('encodes it at the size it is drawn, not at the source natural size', async () => {
    reset(true)
    await savedPdf([bandOp()])
    // The drawn box, supersampled - never the 1200x300 the source decodes to.
    expect(boxes.length).toBe(1)
    expect(boxes[0].w).toBeGreaterThanOrEqual(260)
    expect(boxes[0].w).toBeLessThanOrEqual(260 * 2)
    expect(boxes[0].h / boxes[0].w).toBeCloseTo(120 / 260, 2)
  })

  it('crops the source the way the page crops it, instead of stretching it', async () => {
    reset(true)
    await savedPdf([bandOp()])
    // 1200x300 into a 260x120 box under object-fit: cover: the full height is
    // kept and the width is cut to the box's aspect, centred - 650 of 1200,
    // starting at 275. A stretch would pass no source rectangle at all.
    const crop = draws.find((d) => d.args.length === 8)
    expect(crop, 'the source was drawn without a crop rectangle').toBeDefined()
    const [sx, sy, sw, sh] = crop!.args
    expect(sh).toBe(300)
    expect(sw).toBeCloseTo(650, 0)
    expect(sx).toBeCloseTo(275, 0)
    expect(sy).toBe(0)
  })

  it('leaves a source with transparency on the PNG path', async () => {
    // The identity marks and logos ride on their alpha; a JPEG has none.
    reset(false)
    const pdf = await savedPdf([bandOp({ src: 'https://example.test/mark.webp' })])
    expect(asked).toEqual(['image/png'])
    expect(pdf).not.toContain('DCTDecode')
  })

  it('crops a see-through source the way the page crops it, too', async () => {
    // It used to be written at its NATURAL size and then stretched into the
    // box by the draw - the same "two outputs, two pictures" the opaque path
    // above was fixed for, still happening to every mark that carries alpha.
    reset(false)
    await savedPdf([bandOp({ src: 'https://example.test/mark.webp' })])
    const crop = draws.find((d) => d.args.length === 8)
    expect(crop, 'the see-through source was drawn without a crop rectangle').toBeDefined()
    const [sx, sy, sw, sh] = crop!.args
    expect(sh).toBe(300)
    expect(sw).toBeCloseTo(650, 0)
    expect(sx).toBeCloseTo(275, 0)
    expect(sy).toBe(0)
    expect(boxes[0].w).toBeGreaterThanOrEqual(260)
    expect(boxes[0].h / boxes[0].w).toBeCloseTo(120 / 260, 2)
  })

  it('keeps a see-through source that already fits the box at its natural size', async () => {
    // Nothing to crop, so nothing is resampled: a mark that is drawn in a box
    // of its own shape must not lose its edges to a round trip.
    reset(false)
    await savedPdf([bandOp({ src: 'https://example.test/mark.webp', wPx: 400, hPx: 100 })])
    expect(boxes[0]).toEqual({ w: 1200, h: 300 })
    expect(draws.every((d) => d.args.length !== 8)).toBe(true)
  })

  it('letterboxes a contain source instead of stretching it', async () => {
    // `object-fit: contain` is what an entry logo uses. The whole mark, centred
    // in the box's own shape, with see-through space around it - a 1200x300
    // mark in a square box used to arrive squashed to a quarter of its height.
    reset(true)
    await savedPdf([bandOp({ wPx: 200, hPx: 200, fit: 'contain' })])
    expect(asked).toEqual(['image/png']) // a letterbox cannot be a JPEG
    expect(boxes[0].w).toBe(boxes[0].h)
    const fit = draws.find((d) => d.args.length === 4)
    expect(fit, 'the contain source was not drawn as a fitted rectangle').toBeDefined()
    const [dx, dy, dw, dh] = fit!.args
    // 1200x300 into a square: full width, a quarter of the height, centred.
    expect(dw).toBeCloseTo(boxes[0].w, 0)
    expect(dh).toBeCloseTo(boxes[0].w / 4, 0)
    expect(dx).toBeCloseTo(0, 0)
    expect(dy).toBeCloseTo((boxes[0].h - dh) / 2, 0)
  })
})

/**
 * What can go into the file untouched.
 *
 * `page.drawImage` fills the box with the whole source - no object-fit, no
 * EXIF - so the original bytes are only the right answer when the source
 * already has the box's shape and is stored the way up it is shown. Measured
 * on the JSON-import path, which (unlike the cropper) hands the painter the
 * file exactly as the author had it: a 600x400 photo in a round frame exported
 * as a squashed oval where the page showed a circle, and a photo tagged
 * orientation 6 exported lying on its side.
 *
 * `rasterSize` reads that off the bytes rather than paying for a decode. It
 * was checked against sharp on nine real files - transparent and opaque PNG,
 * baseline, progressive (SOF2), CMYK (4-component), EXIF-tagged and 4000px
 * JPEG - and agreed on every one.
 */
describe('rasterSize / needsReshape - when original bytes are the wrong picture', () => {
  const png = (w: number, h: number) => {
    const b = new Uint8Array(33)
    b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0)
    b.set([0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52], 8) // length + "IHDR"
    b.set([(w >> 24) & 255, (w >> 16) & 255, (w >> 8) & 255, w & 255], 16)
    b.set([(h >> 24) & 255, (h >> 16) & 255, (h >> 8) & 255, h & 255], 20)
    return b
  }
  /** FFD8, an optional EXIF APP1 carrying `orientation`, then a frame header. */
  const jpeg = (w: number, h: number, orientation = 0, sof = 0xc0) => {
    const out: number[] = [0xff, 0xd8]
    if (orientation) {
      const tiff = [
        0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, // II, 42, IFD0 at +8
        0x01, 0x00, // one entry
        0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, orientation, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, // no next IFD
      ]
      const payload = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, ...tiff] // "Exif\0\0"
      const len = payload.length + 2
      out.push(0xff, 0xe1, (len >> 8) & 255, len & 255, ...payload)
    }
    out.push(0xff, sof, 0x00, 0x11, 0x08, (h >> 8) & 255, h & 255, (w >> 8) & 255, w & 255, 0x03)
    out.push(...new Array(6).fill(0), 0xff, 0xda)
    return new Uint8Array(out)
  }

  it('reads a PNG size out of its IHDR', () => {
    expect(rasterSize(png(600, 400))).toEqual({ w: 600, h: 400, orientation: 1 })
  })

  it('reads a baseline and a PROGRESSIVE JPEG the same way', () => {
    expect(rasterSize(jpeg(600, 400))).toEqual({ w: 600, h: 400, orientation: 1 })
    // SOF2 is the progressive frame header; a scan for SOF0 alone misses it.
    expect(rasterSize(jpeg(600, 400, 0, 0xc2))).toEqual({ w: 600, h: 400, orientation: 1 })
  })

  it('reports the TURNED size for a quarter-turn EXIF tag, as a browser does', () => {
    // Stored 400 wide, tagged "turn it": every reader shows 600x400, and so
    // must this - otherwise the shape it is compared against is the wrong one.
    expect(rasterSize(jpeg(400, 600, 6))).toEqual({ w: 600, h: 400, orientation: 6 })
    expect(rasterSize(jpeg(600, 400, 1))).toEqual({ w: 600, h: 400, orientation: 1 })
  })

  it('returns null for bytes that are neither', () => {
    expect(rasterSize(new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4]))).toBeNull()
  })

  it('keeps the original bytes when the source already has the box shape', () => {
    const square = { w: 360, h: 360, orientation: 1 }
    expect(needsReshape(square, { wPx: 134, hPx: 134, fit: 'cover' })).toBe(false)
    expect(needsReshape(square, { wPx: 29, hPx: 29, fit: 'contain' })).toBe(false)
  })

  it('redraws a source whose shape disagrees with the box', () => {
    const wide = { w: 600, h: 400, orientation: 1 }
    expect(needsReshape(wide, { wPx: 134, hPx: 134, fit: 'cover' })).toBe(true)
    expect(needsReshape(wide, { wPx: 29, hPx: 29, fit: 'contain' })).toBe(true)
  })

  it('leaves a source with no object-fit alone, whatever its shape', () => {
    // The DOM stretches that one into the box as well, so the two agree.
    expect(needsReshape({ w: 600, h: 400, orientation: 1 }, { wPx: 134, hPx: 134 })).toBe(false)
  })

  it('redraws anything carrying a rotation tag, even into a box of its own shape', () => {
    // A square photo tagged "turn it" has nothing to crop and is still wrong.
    expect(needsReshape({ w: 400, h: 400, orientation: 6 }, { wPx: 134, hPx: 134, fit: 'cover' })).toBe(true)
    expect(needsReshape({ w: 400, h: 400, orientation: 3 }, { wPx: 134, hPx: 134 })).toBe(true)
  })
})

describe('textInk - pure white is written one level off pure (ATS white-on-white rule)', () => {
  // Checkers count every text show filled #FFFFFF as hidden text and cannot
  // see the dark band it sits on; measured on 12 of 102 exports, all of them
  // light text on a coloured strip.
  it('moves exact white to 254/255 on every channel', () => {
    const ink = textInk({ r: 1, g: 1, b: 1 })
    expect(ink.red).toBeCloseTo(254 / 255, 6)
    expect(ink.green).toBeCloseTo(254 / 255, 6)
    expect(ink.blue).toBeCloseTo(254 / 255, 6)
  })
  it('leaves every other colour exactly as it came', () => {
    expect(textInk({ r: 0.2, g: 0.4, b: 0.6 })).toMatchObject({ red: 0.2, green: 0.4, blue: 0.6 })
    expect(textInk({ r: 0.99, g: 1, b: 1 })).toMatchObject({ red: 0.99, green: 1, blue: 1 })
    expect(textInk({ r: 0, g: 0, b: 0 })).toMatchObject({ red: 0, green: 0, blue: 0 })
  })
})
