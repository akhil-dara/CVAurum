/**
 * The TRACKED font variant: letter-spacing baked into `hmtx` advance widths.
 *
 * The painter used to draw a letter-spaced heading twice — visible vector
 * outlines carrying the tracking, plus an invisible (rendering mode 3) text
 * copy underneath for extractors to read. An external ATS scanner read that
 * file and reported "text drawn invisibly". A tracked CUT of the font removes
 * the need for either half: one ordinary, visible text-showing operator draws
 * glyphs that really are that far apart.
 *
 * So the property that has to hold is arithmetic: the variant's measured width
 * is the plain width plus exactly one tracking increment per glyph — including
 * the last, which is what Chromium's `letter-spacing` also does.
 */
import { describe, expect, it, beforeAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFDocument } from 'pdf-lib'
import * as fontkitNs from '@pdf-lib/fontkit'
import { widenAdvances, unitsPerEmOf, PdfFontCache } from './fonts'

const fontkit = ((fontkitNs as unknown as { default?: unknown }).default ?? fontkitNs) as Parameters<
  PDFDocument['registerFontkit']
>[0]

const here = path.dirname(fileURLToPath(import.meta.url))
const DIR = path.resolve(here, '../../../public/fonts-pdf')
const read = (file: string) => new Uint8Array(fs.readFileSync(path.join(DIR, file)))

// Three real bundled faces with different design grids, so the unit
// conversion is exercised rather than assumed: Inter is 2048/em, Source Serif
// and Montserrat are 1000/em.
const FILES = ['inter-400.ttf', 'source-serif-4-600.ttf', 'montserrat-700.ttf'].filter((f) =>
  fs.existsSync(path.join(DIR, f))
)

describe('widenAdvances', () => {
  it('has real fonts to measure', () => {
    expect(FILES.length).toBeGreaterThan(0)
  })

  it('reads a real unitsPerEm and refuses bytes that are not a font', () => {
    for (const f of FILES) expect(unitsPerEmOf(read(f))).toBeGreaterThanOrEqual(1000)
    expect(unitsPerEmOf(new Uint8Array([1, 2, 3, 4]))).toBe(0)
  })

  it('is a no-op at zero tracking, and never copies the bytes it does not change', () => {
    const b = read(FILES[0])
    expect(widenAdvances(b, 0)).toBe(b)
  })

  for (const file of FILES) {
    it(`${file}: the variant measures plain width + tracking per glyph`, async () => {
      const plainBytes = read(file)
      const upem = unitsPerEmOf(plainBytes)
      const trackingEm = 0.16
      const delta = Math.round(trackingEm * upem)
      const trackedBytes = widenAdvances(plainBytes, delta)
      expect(trackedBytes).not.toBe(plainBytes)
      expect(trackedBytes.length).toBe(plainBytes.length)

      const doc = await PDFDocument.create()
      doc.registerFontkit(fontkit)
      const plain = await doc.embedFont(plainBytes, { subset: true })
      const tracked = await doc.embedFont(trackedBytes, { subset: true })

      const text = 'SUMMARY'
      const size = 12
      const plainW = plain.widthOfTextAtSize(text, size)
      const trackedW = tracked.widthOfTextAtSize(text, size)
      // One increment per glyph, the last one included.
      const expected = plainW + (text.length * delta * size) / upem
      expect(trackedW).toBeCloseTo(expected, 4)
    })
  }

  it('bakes NEGATIVE tracking too, and never lets an advance wrap below zero', async () => {
    const plainBytes = read(FILES[0])
    const upem = unitsPerEmOf(plainBytes)
    const delta = Math.round(-0.02 * upem)
    const doc = await PDFDocument.create()
    doc.registerFontkit(fontkit)
    const plain = await doc.embedFont(plainBytes, { subset: true })
    const tracked = await doc.embedFont(widenAdvances(plainBytes, delta), { subset: true })
    const text = 'Gowthami Katta'
    const size = 24
    expect(tracked.widthOfTextAtSize(text, size)).toBeCloseTo(
      plain.widthOfTextAtSize(text, size) + (text.length * delta * size) / upem,
      4
    )
    // An advance this far negative would wrap a uint16 if it were not clamped;
    // the widths stay finite and non-negative instead.
    const floored = await doc.embedFont(widenAdvances(plainBytes, -upem * 4), { subset: true })
    expect(floored.widthOfTextAtSize(text, size)).toBeGreaterThanOrEqual(0)
    expect(floored.widthOfTextAtSize(text, size)).toBeLessThan(plain.widthOfTextAtSize(text, size))
  })
})

describe('PdfFontCache.embed(family, weight, trackingEm)', () => {
  const INDEX = { 'inter|400': 'inter-400.ttf' }
  beforeAll(() => {
    // The cache fetches font bytes over HTTP in the app; serve the real file
    // off disk instead, exactly as fonts.test.ts does.
    ;(globalThis as unknown as { fetch: unknown }).fetch = async (url: string) => {
      const name = String(url).replace('/fonts-pdf/', '')
      const buf = fs.readFileSync(path.join(DIR, name))
      return { ok: true, arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) }
    }
  })

  it('embeds one variant per distinct tracking, and reuses it', async () => {
    const doc = await PDFDocument.create()
    doc.registerFontkit(fontkit)
    const cache = new PdfFontCache(doc, INDEX)
    const plain = await cache.embed('Inter', 400)
    const trackedA = await cache.embed('Inter', 400, 0.16)
    const trackedB = await cache.embed('Inter', 400, 0.16)
    const negative = await cache.embed('Inter', 400, -0.02)
    expect(trackedA).toBe(trackedB)
    expect(trackedA).not.toBe(plain)
    expect(negative).not.toBe(trackedA)
    const size = 10
    expect(trackedA.widthOfTextAtSize('EXPERIENCE', size)).toBeGreaterThan(
      plain.widthOfTextAtSize('EXPERIENCE', size)
    )
    expect(negative.widthOfTextAtSize('EXPERIENCE', size)).toBeLessThan(
      plain.widthOfTextAtSize('EXPERIENCE', size)
    )
  })
})
