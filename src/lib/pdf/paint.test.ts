import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFDict, PDFDocument, PDFName } from 'pdf-lib'
import * as fontkitNs from '@pdf-lib/fontkit'
import type { Font as FontkitFont } from '@pdf-lib/fontkit'
import { paintOps, paintPages, assignOpsToPages, glyphPathToDrawPath, roundedRectPath, DRIFT_FRACTION } from './paint'
import { PdfFontCache } from './fonts'
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
  return { page, stream: contentStream.getContentsString() }
}

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

/** Independently computes the SAME visible-tracked-width accumulation
 *  `paintGlyphOutlines` uses (glyph advance*scale + one letterSpacingPt
 *  increment per glyph, including the last) directly against the real
 *  embedded .ttf via fontkit — used by the task-16 tests below to assert an
 *  EXACT expected Tz value against the real font metric, not a re-read of
 *  paint.ts's own output (which would be tautological). */
function trackedVisibleWidthPt(text: string, sizePx: number, letterSpacingPx: number): number {
  const bytes = new Uint8Array(fs.readFileSync(path.join(FONT_DIR, FONT_FILE)))
  const font = fontkit.create(bytes)
  const glyphRun = font.layout(text)
  const scale = pxToPt(sizePx) / font.unitsPerEm
  const letterSpacingPt = pxToPt(letterSpacingPx)
  let cursor = 0
  for (const pos of glyphRun.positions) cursor += pos.xAdvance * scale + letterSpacingPt
  return cursor
}

describe('paintOps — tracked (letter-spaced) headings draw two layers', () => {
  // /ActualText was tried first (per the task-10b brief) and rejected with
  // evidence — pdf.js's getTextContent() never reads it (see paint.ts's
  // paintTrackedHeading doc comment and the task-10b report for the pdfjs
  // source references and an isolated before/after probe). The shipped fix
  // is two layers: an invisible untracked real Tj (extractable) plus visible
  // vector glyph outlines (pixel-identical, not part of the text layer).

  it('draws an invisible (Tr 3) untracked Tj for the real, extractable text', async () => {
    const stream = await renderContentStream([
      { kind: 'text', run: baseRun({ text: 'SUMMARY', letterSpacingPx: 1.5 }) },
    ])
    expect(stream).toMatch(/\b3 Tr\b/) // invisible rendering mode set...
    expect(stream).toMatch(/\b0 Tr\b/) // ...and restored to fill afterward
    expect(stream).toMatch(/\bTj\b/)
    // No Tc at all: the extractable layer is intentionally untracked, so
    // pdf.js's glyph-gap word-boundary heuristic (fontSize * 0.102, see the
    // paintTrackedHeading doc comment) never fires for it.
    expect(stream).not.toMatch(/\bTc\b/)
  })

  it('also draws visible vector glyph outlines carrying the full tracked spacing', async () => {
    const tracked = await renderContentStream([
      { kind: 'text', run: baseRun({ text: 'SUMMARY', letterSpacingPx: 1.5 }) },
    ])
    const untracked = await renderContentStream([
      { kind: 'text', run: baseRun({ text: 'SUMMARY', letterSpacingPx: 0 }) },
    ])
    // The tracked case draws the SAME word as decorative-style vector fills
    // (7 letters -> 7 fill ops) on top of the invisible Tj; the untracked
    // case draws only the single ordinary Tj, no vector fills at all.
    expect(tracked.match(/\bf\b/g)?.length).toBe(7)
    expect(untracked.match(/\bf\b/g)).toBeNull()
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

describe('paintOps — tracked-heading selection geometry via Tz (task 16)', () => {
  // Selecting text in the exported PDF used to highlight only ~60-70% of
  // every letter-spaced heading, because a viewer builds a text item's
  // selection box from its ADVERTISED ADVANCE, and the invisible extractable
  // layer (deliberately drawn UNTRACKED — see the describe block above) is
  // narrower than the visible tracked outlines actually painted over it. The
  // fix stretches the invisible layer's advance via `Tz` (not `Tc`, which
  // would reintroduce the tracked-split extraction bug) to match the visible
  // tracked width.
  const sizePx = 12

  it('emits a Tz pair (set to 100*visible/untracked, reset to 100) around the single invisible drawText', async () => {
    const text = 'SUMMARY'
    const letterSpacingPx = 1.5
    const untrackedWidthPt = await trueWidthPt(text, sizePx)
    const visibleWidthPt = trackedVisibleWidthPt(text, sizePx, letterSpacingPx)
    const expectedTz = (100 * visibleWidthPt) / untrackedWidthPt
    expect(expectedTz).toBeGreaterThan(100) // sanity: tracking really does widen the run

    const stream = await renderContentStream([{ kind: 'text', run: baseRun({ text, letterSpacingPx }) }])
    const tz = tzValues(stream)
    expect(tz.length).toBe(2) // set once, reset once — no Tz left active for later ops
    expect(tz[0]).toBeCloseTo(expectedTz, 3)
    expect(tz[1]).toBe(100)
  })

  it('the Tz set/reset wraps the SAME (still single) invisible drawText call, in order: Tz set -> Tr 3 -> Tj -> Tr 0 -> Tz reset', async () => {
    const stream = await renderContentStream([
      { kind: 'text', run: baseRun({ text: 'SUMMARY', letterSpacingPx: 1.5 }) },
    ])
    expect(stream.match(/\bTj\b/g)?.length).toBe(1) // still exactly ONE drawText for the invisible layer
    const tzSetIdx = stream.indexOf('Tz')
    const tr3Idx = stream.indexOf('3 Tr')
    const tjIdx = stream.indexOf('Tj')
    const tr0Idx = stream.indexOf('0 Tr')
    const tzResetIdx = stream.lastIndexOf('Tz')
    expect(tzSetIdx).toBeLessThan(tr3Idx)
    expect(tr3Idx).toBeLessThan(tjIdx)
    expect(tjIdx).toBeLessThan(tr0Idx)
    expect(tr0Idx).toBeLessThanOrEqual(tzResetIdx)
  })

  it('clamps an absurd letterSpacing implying a >400% ratio down to 400', async () => {
    // One glyph with a huge letterSpacingPx (paintGlyphOutlines still adds
    // one letterSpacingPt increment even for a single glyph) pushes the raw
    // ratio far past 400 — the clamp must cap it, not apply it verbatim.
    const stream = await renderContentStream([{ kind: 'text', run: baseRun({ text: 'S', letterSpacingPx: 500 }) }])
    const tz = tzValues(stream)
    expect(tz[0]).toBe(400)
    expect(tz[1]).toBe(100)
  })

  it('clamps a raw ratio just under 100 (real font-metric noise at a tiny letterSpacing) up to exactly 100 — never emits a sub-100 Tz', async () => {
    // fontkit's own glyph-advance sum (what paintGlyphOutlines/this test's
    // trackedVisibleWidthPt helper both compute) is not bit-identical to
    // pdf-lib's widthOfTextAtSize for the same text/font/size — a small,
    // real mismatch unrelated to letter-spacing. At a tiny letterSpacingPx
    // that gap isn't yet covered by the added tracking, so the RAW ratio
    // actually lands just BELOW 100 here — inside the +-1pp noise dead-band
    // (fix round), which snaps it to exactly 100. Confirmed independently
    // before asserting the resulting behavior, so this isn't just re-reading
    // paint.ts's own output.
    const text = 'SUMMARY'
    const letterSpacingPx = 0.01
    const untrackedWidthPt = await trueWidthPt(text, sizePx)
    const rawVisibleWidthPt = trackedVisibleWidthPt(text, sizePx, letterSpacingPx)
    const rawRatio = (100 * rawVisibleWidthPt) / untrackedWidthPt
    expect(rawRatio).toBeLessThan(100)
    expect(rawRatio).toBeGreaterThan(99) // inside the dead-band, not the real negative-tracking regime

    const stream = await renderContentStream([{ kind: 'text', run: baseRun({ text, letterSpacingPx }) }])
    const tz = tzValues(stream)
    // Dead-band snaps to exactly 100 -> the `tzPct !== 100` guard correctly
    // emits NO Tz at all (same as the unscaled case), rather than a sub-100
    // value that would shrink the invisible layer's advance below what the
    // visible tracked outlines need it to cover.
    expect(tz.length).toBe(0)
  })

  it('a mid-band noise ratio (~99.7) also stays inside the dead-band and emits NO Tz pair', async () => {
    // Distinct from the previous case (ratio ~99.4, near the band's edge) —
    // this lands closer to the middle of the +-1pp dead-band, proving the
    // band isn't just barely catching edge values.
    const text = 'SUMMARY'
    const letterSpacingPx = 0.04
    const untrackedWidthPt = await trueWidthPt(text, sizePx)
    const rawVisibleWidthPt = trackedVisibleWidthPt(text, sizePx, letterSpacingPx)
    const rawRatio = (100 * rawVisibleWidthPt) / untrackedWidthPt
    expect(rawRatio).toBeGreaterThan(99)
    expect(rawRatio).toBeLessThan(100.5) // comfortably mid-band, not just under the 101 edge

    const stream = await renderContentStream([{ kind: 'text', run: baseRun({ text, letterSpacingPx }) }])
    expect(tzValues(stream).length).toBe(0)
  })

  it('genuine negative letter-spacing (e.g. .rm-name) emits a Tz BELOW 100 matching the computed ratio, not floored', async () => {
    // Fix round: the original [100, 400] clamp assumed a tracked heading's
    // visible width is never shorter than its untracked one — false for the
    // 17 negative-letter-spacing rules in templates.css (all on .rm-name,
    // which goes through this same paintTrackedHeading path). Flooring Tz at
    // 100 for negative tracking left the invisible layer WIDER than the
    // (narrower, negatively-tracked) visible ink, overshooting the selection
    // box past the run's true right edge.
    const text = 'SUMMARY'
    const letterSpacingPx = -1
    const untrackedWidthPt = await trueWidthPt(text, sizePx)
    const visibleWidthPt = trackedVisibleWidthPt(text, sizePx, letterSpacingPx)
    const rawRatio = (100 * visibleWidthPt) / untrackedWidthPt
    expect(rawRatio).toBeLessThan(99) // clearly outside the +-1pp noise dead-band
    expect(rawRatio).toBeGreaterThan(50) // and above the floor, so it passes through unclamped

    const stream = await renderContentStream([{ kind: 'text', run: baseRun({ text, letterSpacingPx }) }])
    const tz = tzValues(stream)
    expect(tz.length).toBe(2) // set once, reset once
    expect(tz[0]).toBeCloseTo(rawRatio, 3)
    expect(tz[0]).toBeLessThan(100)
    expect(tz[1]).toBe(100)
  })

  it('clamps an absurdly negative letterSpacing implying a ratio below 50% up to exactly 50', async () => {
    const text = 'SUMMARY'
    const letterSpacingPx = -6 // wildly oversized negative tracking
    const untrackedWidthPt = await trueWidthPt(text, sizePx)
    const visibleWidthPt = trackedVisibleWidthPt(text, sizePx, letterSpacingPx)
    const rawRatio = (100 * visibleWidthPt) / untrackedWidthPt
    expect(rawRatio).toBeLessThan(50) // sanity: this really would go below the floor unclamped

    const stream = await renderContentStream([{ kind: 'text', run: baseRun({ text, letterSpacingPx }) }])
    const tz = tzValues(stream)
    expect(tz[0]).toBe(50)
    expect(tz[1]).toBe(100)
  })

  it('a run placed at the OLD (pre-fix, untracked) end now overlaps and gets pushed to the TRUE tracked end', async () => {
    // Direct proof that prevRealEnd bookkeeping now advances by the VISIBLE
    // (Tz-stretched) width, not the untracked metric: a small enough
    // letterSpacingPx keeps the induced overlap within the same-line snap's
    // drift allowance, so the second run must land exactly at the tracked
    // end, not at the untracked one it was positioned against.
    const text = 'Languages'
    const letterSpacingPx = 0.1
    const untrackedWidthPt = await trueWidthPt(text, sizePx)
    const visibleWidthPt = trackedVisibleWidthPt(text, sizePx, letterSpacingPx)
    expect(visibleWidthPt).toBeGreaterThan(untrackedWidthPt) // sanity

    const stream = await renderContentStream([
      { kind: 'text', run: baseRun({ text, xPx: 0, baselinePx: 20, sizePx, letterSpacingPx }) },
      { kind: 'text', run: baseRun({ text: 'X', xPx: ptToPx(untrackedWidthPt), baselinePx: 20, sizePx }) },
    ])
    const [, secondX] = tmXPositions(stream)
    expect(secondX).toBeCloseTo(visibleWidthPt, 3)
  })

  it('normal (non-tracked) runs are unaffected: still no Tz at all when widthPx is unset (task 12 behavior preserved)', async () => {
    const stream = await renderContentStream([
      { kind: 'text', run: baseRun({ text: 'Senior Software Engineer', letterSpacingPx: 0 }) },
    ])
    expect(tzValues(stream).length).toBe(0)
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

  it('applies the same exact-metric snap to a tracked heading invisible extractable layer', async () => {
    // task 16: the tracked branch's invisible layer is now Tz-stretched to
    // the VISIBLE (tracked) width, so the snap target is that stretched end,
    // not the plain untracked metric `trueWidthPt` gives — read the actual
    // Tz this run drew (self-consistent with paintTrackedHeading's own
    // computation, not re-derived) to get the expected end.
    const trueEnd = await trueWidthPt('Languages', sizePx)
    const spaceWidth = await trueWidthPt(' ', sizePx)
    const smallGapXPx = (trueEnd + spaceWidth * 0.5) / (72 / 96)
    const stream = await renderContentStream([
      { kind: 'text', run: baseRun({ text: 'Languages', xPx: 0, baselinePx: 20, sizePx, letterSpacingPx: 0.1 }) },
      { kind: 'text', run: baseRun({ text: ': ', xPx: smallGapXPx, baselinePx: 20, sizePx, letterSpacingPx: 0.1 }) },
    ])
    const [firstX, secondX] = tmXPositions(stream)
    const [firstTz] = tzValues(stream)
    const trueEndTracked = trueEnd * (firstTz / 100)
    expect(firstX).toBeCloseTo(0, 6)
    expect(secondX).toBeCloseTo(trueEndTracked, 6)
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

    const widePx = (embeddedWidthPt * 1.5) / pxToPt(1) // implies 150% -> clamps to 110
    const wideStream = await renderContentStream([
      { kind: 'text', run: baseRun({ text, xPx: 0, baselinePx: 20, sizePx, widthPx: widePx }) },
    ])
    expect(tzValues(wideStream)).toEqual([110, 100])
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
