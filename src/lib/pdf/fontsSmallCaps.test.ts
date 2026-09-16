/**
 * The SMALL-CAPS font variant: a cut of the face whose `cmap` draws each
 * lowercase letter's CAPITAL while the letter itself stays lowercase.
 *
 * The property that has to hold is a double one, and both halves matter:
 *   - what the reader SEES is the capital — the same glyph id, and the same
 *     advance width, that the uppercase letter would have drawn;
 *   - what an extractor READS is the source string, unchanged. pdf-lib builds
 *     `ToUnicode` from each glyph's reverse mapping, so the capital's glyph
 *     must carry exactly ONE code point: the lowercase letter.
 *
 * Uppercasing the string instead (the first attempt at small caps in the
 * export) satisfied the first half and broke the second: marquee's skill-group
 * label went into the file as LANGUAGES, and a parser reads that as a section
 * heading rather than a group's name.
 */
import { describe, expect, it, beforeAll } from 'vitest'
import fs from 'node:fs'
import { inflateSync } from 'node:zlib'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFDocument } from 'pdf-lib'
import * as fontkitNs from '@pdf-lib/fontkit'
import { smallCapsVariant, widenAdvances, unitsPerEmOf, PdfFontCache } from './fonts'

const fontkitMod = ((fontkitNs as unknown as { default?: unknown }).default ?? fontkitNs) as {
  create(data: Uint8Array): {
    layout(text: string): { glyphs: Array<{ id: number; codePoints: number[]; advanceWidth: number }> }
    unitsPerEm: number
  }
}
const registerable = fontkitMod as unknown as Parameters<PDFDocument['registerFontkit']>[0]

const here = path.dirname(fileURLToPath(import.meta.url))
const DIR = path.resolve(here, '../../../public/fonts-pdf')
const read = (file: string) => new Uint8Array(fs.readFileSync(path.join(DIR, file)))

// Three real bundled faces on different design grids, so nothing about the
// rewrite is specific to one file: Inter is 2048/em, the other two 1000/em.
const FILES = ['inter-400.ttf', 'source-serif-4-600.ttf', 'montserrat-700.ttf'].filter((f) =>
  fs.existsSync(path.join(DIR, f))
)

describe('smallCapsVariant', () => {
  it('has real fonts to measure', () => {
    expect(FILES.length).toBeGreaterThan(0)
  })

  it('refuses bytes that are not a font, rather than emitting a broken one', () => {
    expect(smallCapsVariant(new Uint8Array([1, 2, 3, 4]))).toBeNull()
  })

  for (const file of FILES) {
    it(`${file}: lowercase letters lay out as the capitals' own glyphs`, () => {
      const plainBytes = read(file)
      const capsBytes = smallCapsVariant(plainBytes)
      expect(capsBytes).not.toBeNull()
      const plain = fontkitMod.create(plainBytes)
      const caps = fontkitMod.create(capsBytes!)

      // (a) the same glyph ids the plain font gives the uppercase string
      const lower = caps.layout('anguages')
      const upper = plain.layout('ANGUAGES')
      expect(lower.glyphs.map((g) => g.id)).toEqual(upper.glyphs.map((g) => g.id))

      // (b) each of those glyphs carries the LOWERCASE letter, and only it
      expect(lower.glyphs.map((g) => g.codePoints)).toEqual([...'anguages'].map((c) => [c.codePointAt(0)]))

      // (c) and the capitals' widths
      expect(lower.glyphs.map((g) => g.advanceWidth)).toEqual(upper.glyphs.map((g) => g.advanceWidth))
    })

    it(`${file}: uncased characters are left exactly as they were`, () => {
      const plain = fontkitMod.create(read(file))
      const caps = fontkitMod.create(smallCapsVariant(read(file))!)
      for (const text of ['2021 & 2024', '— (–) .,:;/']) {
        expect(caps.layout(text).glyphs.map((g) => g.id)).toEqual(plain.layout(text).glyphs.map((g) => g.id))
      }
    })

    it(`${file}: a CAPITAL is gone from the variant, which is what keeps the text layer honest`, () => {
      // Dropping the uppercase code point is the whole mechanism: it leaves
      // the capital's glyph with exactly one code point - the lowercase
      // letter - so pdf-lib's ToUnicode says "a", not "A". The variant is
      // therefore only ever asked to draw the lowercase pieces of a run
      // (smallcaps.ts splits on exactly that); the full-size pieces, capitals
      // among them, are drawn by the ordinary cut.
      const caps = fontkitMod.create(smallCapsVariant(read(file))!)
      expect(caps.layout('ABC').glyphs.map((g) => g.id)).toEqual([0, 0, 0])
    })
  }

  it('composes with the tracked cut: both transforms on the same bytes', async () => {
    const plainBytes = read(FILES[0])
    const upem = unitsPerEmOf(plainBytes)
    const delta = Math.round(0.16 * upem)
    const both = widenAdvances(smallCapsVariant(plainBytes)!, delta)
    const doc = await PDFDocument.create()
    doc.registerFontkit(registerable)
    const plain = await doc.embedFont(plainBytes, { subset: true })
    const tracked = await doc.embedFont(both, { subset: true })
    const text = 'summary'
    const size = 12
    // The capitals' width, plus one tracking increment per glyph.
    const expected = plain.widthOfTextAtSize(text.toUpperCase(), size) + (text.length * delta * size) / upem
    expect(tracked.widthOfTextAtSize(text, size)).toBeCloseTo(expected, 4)
  })

  it('a drawn page shows the capitals and says the lowercase letters', async () => {
    const doc = await PDFDocument.create()
    doc.registerFontkit(registerable)
    const plainFont = await doc.embedFont(read(FILES[0]), { subset: true })
    const capsFont = await doc.embedFont(smallCapsVariant(read(FILES[0]))!, { subset: true })
    const page = doc.addPage([200, 100])
    // Drawn the way paintTrackedRun draws it: the already-capital "L" at full
    // size in the ordinary cut, the lowercase rest at the reduced size in the
    // small-caps cut, each keeping its own text.
    page.drawText('L', { x: 10, y: 50, size: 12, font: plainFont })
    page.drawText('anguages', { x: 10 + plainFont.widthOfTextAtSize('L', 12), y: 50, size: 9, font: capsFont })
    const bytes = await doc.save()

    // The ToUnicode CMap pdf-lib wrote for the subset, read straight out of
    // the file: every code the page draws has to map back to the source
    // string's own characters. pdf-lib deflates its streams, so every stream
    // in the file is inflated and the CMap picked out of them.
    const raw = Buffer.from(bytes).toString('latin1')
    const streams: string[] = []
    for (const m of raw.matchAll(/stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g)) {
      try {
        streams.push(inflateSync(Buffer.from(m[1], 'latin1')).toString('latin1'))
      } catch {
        streams.push(m[1])
      }
    }
    const cmaps = streams.flatMap((t) => [...t.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)].map((m) => m[1]))
    expect(cmaps.length).toBeGreaterThan(0)
    const mapped = new Set<string>()
    for (const body of cmaps) {
      for (const m of body.matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
        const to = m[2].match(/.{4}/g) ?? []
        mapped.add(to.map((h) => String.fromCharCode(parseInt(h, 16))).join(''))
      }
    }
    // Natural case, exactly as drawn — the capital A is NOT in the text layer.
    for (const ch of 'anguages') expect(mapped.has(ch)).toBe(true)
    expect(mapped.has('L')).toBe(true)
    // ...and no capital besides the one the source actually wrote.
    expect([...mapped].filter((c) => c >= 'A' && c <= 'Z')).toEqual(['L'])

    // ...while the glyphs drawn really are the capitals'.
    const caps = fontkitMod.create(smallCapsVariant(read(FILES[0]))!)
    const plain = fontkitMod.create(read(FILES[0]))
    expect(caps.layout('anguages').glyphs.map((g) => g.id)).toEqual(plain.layout('ANGUAGES').glyphs.map((g) => g.id))
  })
})

describe('PdfFontCache.smallCapsFont', () => {
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

  it('embeds one small-caps variant per (family, weight, tracking), and reuses it', async () => {
    const doc = await PDFDocument.create()
    doc.registerFontkit(registerable)
    const cache = new PdfFontCache(doc, INDEX)
    const plain = await cache.embed('Inter', 400)
    const capsA = await cache.smallCapsFont('Inter', 400)
    const capsB = await cache.smallCapsFont('Inter', 400)
    const capsTracked = await cache.smallCapsFont('Inter', 400, 0.16)
    expect(capsA).toBe(capsB)
    expect(capsA).not.toBe(plain)
    expect(capsTracked).not.toBe(capsA)
    const size = 10
    // "summary" in the small-caps cut measures what "SUMMARY" does in the
    // plain one: the capitals' advances, reached through the lowercase text.
    expect(capsA!.widthOfTextAtSize('summary', size)).toBeCloseTo(plain.widthOfTextAtSize('SUMMARY', size), 4)
    expect(capsTracked!.widthOfTextAtSize('summary', size)).toBeGreaterThan(
      capsA!.widthOfTextAtSize('summary', size)
    )
  })
})
