/**
 * The SUBSET TAG on an embedded font's name.
 *
 * The exporter has always subset its faces — `embedFont(bytes, { subset: true })`
 * — but pdf-lib named the result as if it were the whole face: with no
 * `customName` it writes `BaseFont` as the PostScript name plus a decimal
 * suffix (`Inter-Regular-4827`). A command-line font lister then reads the
 * file and says the fonts are NOT subsets, because the six-letter tag the
 * specification asks for is the only thing that says so and a strict reader
 * has no other signal.
 *
 * (The suffix was not random, whatever its generator is called — pdf-lib seeds
 * that generator, so the value was stable for a given document. Reproducible
 * output was never what the missing tag cost; it is asserted below anyway,
 * because a tag derived from the glyph set is the one kind of name that could
 * have cost it.)
 *
 * So each embedded subset now carries `ABCDEF+` in front of its base name, the
 * same tag in the font dictionary and in the font descriptor, a different tag
 * per distinct subset in the document, and the same tag every time the same
 * document is exported.
 */
import { describe, expect, it, beforeAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFArray, PDFDict, PDFDocument, PDFName, StandardFonts } from 'pdf-lib'
import * as fontkitNs from '@pdf-lib/fontkit'
import { PdfFontCache, subsetTag } from './fonts'

const fontkit = ((fontkitNs as unknown as { default?: unknown }).default ?? fontkitNs) as Parameters<
  PDFDocument['registerFontkit']
>[0]

const here = path.dirname(fileURLToPath(import.meta.url))
const DIR = path.resolve(here, '../../../public/fonts-pdf')
const INDEX = { 'inter|400': 'inter-400.ttf', 'inter|700': 'inter-700.ttf' }

beforeAll(() => {
  // The cache fetches font bytes over HTTP in the app; serve the real file off
  // disk instead, exactly as the other font suites do.
  ;(globalThis as unknown as { fetch: unknown }).fetch = async (url: string) => {
    const name = String(url).replace('/fonts-pdf/', '')
    const buf = fs.readFileSync(path.join(DIR, name))
    return { ok: true, arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) }
  }
})

/** Every `ABCDEF+Name` this file writes, as (tag, base name) pairs, read out
 *  of the saved bytes rather than out of the objects that produced them. */
function namesIn(pdf: string): Array<{ key: string; tag: string; base: string }> {
  return [...pdf.matchAll(/\/(BaseFont|FontName)\s*\/([A-Za-z]{0,8}\+)?([^\s/>\]]+)/g)].map((m) => ({
    key: m[1],
    tag: (m[2] ?? '').replace('+', ''),
    base: m[3],
  }))
}

/** A document that draws `text` in each of the cuts `make` returns. */
async function exportWith(
  make: (cache: PdfFontCache) => Promise<Array<{ font: Awaited<ReturnType<PdfFontCache['embed']>>; text: string }>>
): Promise<string> {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  // A fixed identity: the rest of the file has to be stable before two saves
  // can be compared, and the exporter stamps its own metadata in render.tsx.
  doc.setCreationDate(new Date(0))
  doc.setModificationDate(new Date(0))
  const cache = new PdfFontCache(doc, INDEX)
  const page = doc.addPage([300, 300])
  let y = 260
  for (const { font, text } of await make(cache)) {
    page.drawText(text, { font, size: 11, x: 20, y })
    y -= 20
  }
  return Buffer.from(await doc.save({ useObjectStreams: false })).toString('latin1')
}

describe('subsetTag', () => {
  it('is six uppercase letters, and a function of its seed alone', () => {
    for (const seed of ['inter|400', 'inter|400|t16000', 'inter|400|sc', '', 'x'.repeat(500)]) {
      const tag = subsetTag(seed)
      expect(tag).toMatch(/^[A-Z]{6}$/)
      expect(subsetTag(seed)).toBe(tag)
    }
  })

  it('separates seeds that differ by one character', () => {
    const seeds = ['inter|400', 'inter|401', 'inter|400|sc', 'inter|400|t16000', 'inter|400|t16001']
    expect(new Set(seeds.map(subsetTag)).size).toBe(seeds.length)
  })

  it('spreads: a thousand seeds produce a thousand tags', () => {
    const tags = new Set(Array.from({ length: 1000 }, (_, i) => subsetTag(`inter|400|${i}`)))
    expect(tags.size).toBe(1000)
  })
})

describe('an exported document', () => {
  it('tags every embedded subset, the same tag in the dictionary and the descriptor', async () => {
    const pdf = await exportWith(async (c) => [{ font: await c.embed('Inter', 400), text: 'Summary' }])
    const names = namesIn(pdf)
    expect(names.length).toBeGreaterThanOrEqual(3) // Type0 + CIDFont BaseFont, descriptor FontName
    for (const n of names) {
      expect(n.tag, `${n.key} /${n.base} carries no subset tag`).toMatch(/^[A-Z]{6}$/)
      // The name itself is the real face, not a random suffix.
      expect(n.base).not.toMatch(/-\d+$/)
    }
    // One font, so one tag and one base name across all three places.
    expect(new Set(names.map((n) => `${n.tag}+${n.base}`)).size).toBe(1)
  })

  it('gives the plain, tracked and small-capitals cuts of one family different tags', async () => {
    const pdf = await exportWith(async (c) => {
      const caps = await c.smallCapsFont('Inter', 400)
      return [
        { font: await c.embed('Inter', 400), text: 'Summary' },
        { font: await c.embed('Inter', 400, 0.16), text: 'Summary' },
        { font: await c.embed('Inter', 400, -0.02), text: 'Summary' },
        ...(caps ? [{ font: caps, text: 'Summary' }] : []),
      ]
    })
    const full = [...new Set(namesIn(pdf).map((n) => `${n.tag}+${n.base}`))]
    // Four cuts of ONE family: one base name, four tags, no collisions.
    expect(full.length).toBe(4)
    expect(new Set(full.map((f) => f.split('+')[0])).size).toBe(4)
  })

  it('writes the same tags for the same document twice', async () => {
    const make = async (c: PdfFontCache) => [
      { font: await c.embed('Inter', 400), text: 'Summary' },
      { font: await c.embed('Inter', 400, 0.16), text: 'EXPERIENCE' },
      { font: await c.embed('Inter', 700), text: 'Alex Morgan' },
    ]
    const a = await exportWith(make)
    const b = await exportWith(make)
    const tags = (pdf: string) => namesIn(pdf).map((n) => `${n.key}=${n.tag}+${n.base}`)
    expect(tags(a)).toEqual(tags(b))
    // And the whole file with them: two saves of one document, with the clock
    // held still, are identical byte for byte. Measured on a real export too —
    // _local/probe-repro-export.cjs, same SHA-256 across two renders.
    expect(a).toBe(b)
  })

  it('tags by the GLYPHS a cut ends up carrying, so different text means a different tag', async () => {
    const one = await exportWith(async (c) => [{ font: await c.embed('Inter', 400), text: 'Summary' }])
    const two = await exportWith(async (c) => [{ font: await c.embed('Inter', 400), text: 'Experience' }])
    expect(namesIn(one)[0].tag).not.toBe(namesIn(two)[0].tag)
  })

  it('leaves a standard font, which is not embedded and not a subset, untagged', async () => {
    const doc = await PDFDocument.create()
    doc.registerFontkit(fontkit)
    const helv = await doc.embedFont(StandardFonts.Helvetica)
    doc.addPage([200, 200]).drawText('Summary', { font: helv, size: 11, x: 10, y: 100 })
    const pdf = Buffer.from(await doc.save({ useObjectStreams: false })).toString('latin1')
    expect(pdf).toContain('/BaseFont /Helvetica')
    expect(pdf).not.toMatch(/\/BaseFont\s*\/[A-Z]{6}\+Helvetica/)
  })

  it('names the descendant font and the descriptor identically, as a reader requires', async () => {
    const doc = await PDFDocument.create()
    doc.registerFontkit(fontkit)
    const cache = new PdfFontCache(doc, INDEX)
    const font = await cache.embed('Inter', 400)
    doc.addPage([200, 200]).drawText('Summary', { font, size: 11, x: 10, y: 100 })
    await doc.save()
    // Walked through the object graph rather than the bytes: Type0 -> its
    // descendant CIDFont -> that font's descriptor. All three have to say the
    // same name, tag included, or a reader cannot match the descriptor to the
    // font it describes.
    const type0 = doc.context.lookup(font.ref, PDFDict)
    const base = type0.get(PDFName.of('BaseFont')) as PDFName
    expect(base.asString()).toMatch(/^\/[A-Z]{6}\+/)
    const descendants = type0.get(PDFName.of('DescendantFonts')) as PDFArray
    const cid = doc.context.lookup(descendants.get(0), PDFDict)
    expect((cid.get(PDFName.of('BaseFont')) as PDFName).asString()).toBe(base.asString())
    const descriptor = doc.context.lookup(cid.get(PDFName.of('FontDescriptor')), PDFDict)
    expect((descriptor.get(PDFName.of('FontName')) as PDFName).asString()).toBe(base.asString())
  })
})
