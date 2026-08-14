import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFDict, PDFDocument, PDFName } from 'pdf-lib'
import * as fontkitNs from '@pdf-lib/fontkit'
import type { Font as FontkitFont } from '@pdf-lib/fontkit'
import { paintOps, glyphPathToDrawPath } from './paint'
import { PdfFontCache } from './fonts'
import { pxToPt } from './units'
import type { DrawOp, LinearGradient, TextRun } from './types'

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
let originalFetch: typeof fetch
beforeAll(() => {
  originalFetch = globalThis.fetch
  globalThis.fetch = (async (input: string | URL) => {
    const file = String(input).replace(/^\/fonts-pdf\//, '')
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
async function renderPage(ops: DrawOp[]) {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  const page = doc.addPage([300, 300])
  const fonts = new PdfFontCache(doc, FONT_INDEX)
  await paintOps(page, ops, fonts, 300)
  const contentStream = (page as unknown as { getContentStream: () => { getContentsString(): string } }).getContentStream()
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

describe('paintOps — tracked (letter-spaced) headings draw two layers', () => {
  // /ActualText was tried first (per the task-10b brief) and rejected with
  // evidence — pdf.js's getTextContent() never reads it (see paint.ts's
  // paintTrackedHeading doc comment and the task-10b report for the pdfjs
  // source references and an isolated before/after probe). The shipped fix
  // is two layers: an invisible untracked real Tj (extractable) plus visible
  // vector glyph outlines (pixel-identical, not part of the text layer).

  it('draws an invisible (Tr 3) untracked Tj for the real, extractable text', async () => {
    const stream = await renderContentStream([{ kind: 'text', run: baseRun({ text: 'SUMMARY', letterSpacingPx: 1.5 }) }])
    expect(stream).toMatch(/\b3 Tr\b/) // invisible rendering mode set...
    expect(stream).toMatch(/\b0 Tr\b/) // ...and restored to fill afterward
    expect(stream).toMatch(/\bTj\b/)
    // No Tc at all: the extractable layer is intentionally untracked, so
    // pdf.js's glyph-gap word-boundary heuristic (fontSize * 0.102, see the
    // paintTrackedHeading doc comment) never fires for it.
    expect(stream).not.toMatch(/\bTc\b/)
  })

  it('also draws visible vector glyph outlines carrying the full tracked spacing', async () => {
    const tracked = await renderContentStream([{ kind: 'text', run: baseRun({ text: 'SUMMARY', letterSpacingPx: 1.5 }) }])
    const untracked = await renderContentStream([{ kind: 'text', run: baseRun({ text: 'SUMMARY', letterSpacingPx: 0 }) }])
    // The tracked case draws the SAME word as decorative-style vector fills
    // (7 letters -> 7 fill ops) on top of the invisible Tj; the untracked
    // case draws only the single ordinary Tj, no vector fills at all.
    expect(tracked.match(/\bf\b/g)?.length).toBe(7)
    expect(untracked.match(/\bf\b/g)).toBeNull()
  })

  it('draws ordinary (non-tracked) text as a single plain, visible Tj — no Tr, no vector layer', async () => {
    const stream = await renderContentStream([{ kind: 'text', run: baseRun({ text: 'Senior Software Engineer', letterSpacingPx: 0 }) }])
    expect(stream).not.toMatch(/\bTr\b/)
    expect(stream).not.toMatch(/\bTc\b/)
    expect(stream.match(/\bTj\b/g)?.length).toBe(1)
  })

  it('propagates a font-embed failure for a tracked heading (real content, hard-fail)', async () => {
    const ops: DrawOp[] = [{ kind: 'text', run: baseRun({ text: 'SUMMARY', letterSpacingPx: 1.5, family: 'Nonexistent Font' }) }]
    await expect(renderContentStream(ops)).rejects.toThrow()
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
    const ops: DrawOp[] = [{ kind: 'text', run: baseRun({ text: 'X', isDecorative: true, family: 'Nonexistent Font' }) }]
    await expect(renderContentStream(ops)).resolves.not.toThrow()
  })

  it('still propagates a font-embed failure for REAL (non-decorative) content', async () => {
    const ops: DrawOp[] = [{ kind: 'text', run: baseRun({ text: 'Real résumé content', isDecorative: false, family: 'Nonexistent Font' }) }]
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
    const trueEnd = await trueWidthPt('Languages', sizePx)
    const spaceWidth = await trueWidthPt(' ', sizePx)
    const smallGapXPx = (trueEnd + spaceWidth * 0.5) / (72 / 96)
    const stream = await renderContentStream([
      { kind: 'text', run: baseRun({ text: 'Languages', xPx: 0, baselinePx: 20, sizePx, letterSpacingPx: 0.1 }) },
      { kind: 'text', run: baseRun({ text: ': ', xPx: smallGapXPx, baselinePx: 20, sizePx, letterSpacingPx: 0.1 }) },
    ])
    const [firstX, secondX] = tmXPositions(stream)
    expect(firstX).toBeCloseTo(0, 6)
    expect(secondX).toBeCloseTo(trueEnd, 6)
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
    const longText = 'Architected and deployed the comprehensive cloud infrastructure migration migration migration from 820ms to '
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
    const { page, stream } = await renderPage([{ kind: 'rect', xPx: 0, yPx: 0, wPx: 100, hPx: 50, fillGradient: translucent }])
    expect(stream).not.toMatch(/\bsh\b/)
    page.node.normalizedEntries()
    const resources = page.node.Resources()!
    expect(resources.lookupMaybe(PDFName.of('Shading'), PDFDict)).toBeUndefined()
  })

  it('never throws for a gradient rect op — a bad gradient is cosmetic, not real content', async () => {
    const ops: DrawOp[] = [{ kind: 'rect', xPx: 0, yPx: 0, wPx: 100, hPx: 50, fillGradient: { angleDeg: NaN, stops: [opaque, opaque2] } }]
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
