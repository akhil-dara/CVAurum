// An arrow in a Latin line. No text face bundled for the PDF draws U+2192, so
// the marks font carries the four arrows (scripts/make-marks-font.py) and the
// run borrows the arrow from it, exactly as the canvas does through the same
// font stack - drawn, positioned where it belongs, and in the text layer.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFDict, PDFDocument, PDFName, type PDFFont, type PDFPage } from 'pdf-lib'
import * as fontkitNs from '@pdf-lib/fontkit'
import type { Font as FontkitFont } from '@pdf-lib/fontkit'
import { paintOps } from './paint'
import { PdfFontCache } from './fonts'
import type { DrawOp, TextRun } from './types'

const fontkit = ((fontkitNs as unknown as { default?: unknown }).default ?? fontkitNs) as Parameters<
  PDFDocument['registerFontkit']
>[0] & { create(data: Uint8Array): FontkitFont }

const here = path.dirname(fileURLToPath(import.meta.url))
const FONT_DIR = path.resolve(here, '../../../public/fonts-pdf')
const INDEX = JSON.parse(fs.readFileSync(path.join(FONT_DIR, 'index.json'), 'utf8')) as Record<string, string>
const marks = fontkit.create(new Uint8Array(fs.readFileSync(path.join(FONT_DIR, 'cva-marks-400.ttf'))))
const FAMILY = 'Inter, "Vazirmatn Arabic", "CVAurum Marks", sans-serif'

let originalFetch: typeof fetch
beforeAll(() => {
  originalFetch = globalThis.fetch
  globalThis.fetch = (async (input: string | URL) => {
    const bytes = fs.readFileSync(path.join(FONT_DIR, String(input).replace(/^\/fonts-pdf\//, '')))
    const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    return { ok: true, arrayBuffer: async () => ab } as Response
  }) as typeof fetch
})
afterAll(() => {
  globalThis.fetch = originalFetch
})

const run = (over: Partial<TextRun>): TextRun => ({
  text: 'REST → GraphQL',
  xPx: 100,
  widthPx: 0,
  baselinePx: 40,
  sizePx: 12,
  family: FAMILY,
  weight: 400,
  italic: false,
  color: { r: 0, g: 0, b: 0, a: 1 },
  letterSpacingPx: 0,
  isDecorative: false,
  ...over,
})

interface Drawn {
  face: 'inter' | 'marks' | 'other'
  xPt: number
  ids: number[]
  font: PDFFont | null
  hex: string
}

async function paint(r: TextRun): Promise<{ drawn: Drawn[]; fonts: PdfFontCache; doc: PDFDocument }> {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  const page = doc.addPage([600, 200])
  const fonts = new PdfFontCache(doc, INDEX)
  await paintOps(page, [{ kind: 'text', run: r } as DrawOp], fonts, 200)
  const known: Array<[Drawn['face'], PDFFont]> = [
    ['inter', await fonts.embed('Inter', 400)],
    ['marks', await fonts.embed('CVAurum Marks', 400)],
  ]
  const dict = (page as PDFPage).node.Resources()?.lookup(PDFName.of('Font'), PDFDict)
  const faces = new Map<string, { face: Drawn['face']; font: PDFFont | null; back: Map<number, number> }>()
  for (const [key, ref] of dict?.entries() ?? []) {
    const hit = known.find(([, f]) => f.ref === ref)
    const map = hit ? (hit[1] as unknown as { embedder: { glyphIdMap: Map<number, number> } }).embedder.glyphIdMap : new Map()
    faces.set(key.asString().slice(1), { face: hit ? hit[0] : 'other', font: hit ? hit[1] : null, back: new Map([...map].map(([o, s]) => [s, o])) })
  }
  const stream = (page as unknown as { getContentStream: () => { getContentsString(): string } }).getContentStream().getContentsString()
  const drawn: Drawn[] = []
  let cur = { face: 'other' as Drawn['face'], font: null as PDFFont | null, back: new Map<number, number>() }
  let x = 0
  for (const m of stream.matchAll(/\/(\S+) [\d.]+ Tf|1 0 0 1 (-?[\d.]+) -?[\d.]+ Tm|<([0-9A-Fa-f]*)> Tj/g)) {
    if (m[1]) cur = faces.get(m[1]) ?? cur
    else if (m[2]) x = Number(m[2])
    else drawn.push({ face: cur.face, xPt: x, font: cur.font, hex: m[3], ids: (m[3].match(/.{4}/g) ?? []).map((h) => cur.back.get(parseInt(h, 16)) ?? -1) })
  }
  return { drawn, fonts, doc }
}

describe('paintOps: an arrow in a Latin run', () => {
  it('draws the arrow from the marks font, between the words, at its own advance', async () => {
    const { drawn, fonts } = await paint(run({}))
    expect(drawn.map((d) => d.face)).toEqual(['inter', 'marks', 'inter'])
    expect(drawn[1].ids).toEqual([marks.glyphForCodePoint(0x2192).id])
    expect(drawn[1].ids).not.toContain(0)
    const inter = await fonts.embed('Inter', 400)
    const pt = 9 // 12px
    // Each piece starts where the one before it ends.
    expect(drawn[0].xPt).toBeCloseTo(75, 3)
    expect(drawn[1].xPt).toBeCloseTo(75 + inter.widthOfTextAtSize('REST ', pt), 2)
    const markFont = await fonts.embed('CVAurum Marks', 400)
    expect(drawn[2].xPt).toBeCloseTo(drawn[1].xPt + markFont.widthOfTextAtSize('→', pt), 2)
  })

  it('puts the arrow in the text layer', async () => {
    const { doc } = await paint(run({}))
    const bytes = await doc.save()
    const text = new TextDecoder('latin1').decode(bytes)
    expect(bytes.length).toBeGreaterThan(0)
    // The marks subset is written with a ToUnicode CMap naming U+2192.
    const back = await PDFDocument.load(bytes)
    let found = false
    for (const [, obj] of back.context.enumerateIndirectObjects()) {
      const { PDFRawStream, decodePDFRawStream } = await import('pdf-lib')
      if (!(obj instanceof PDFRawStream)) continue
      const s = new TextDecoder().decode(decodePDFRawStream(obj).decode())
      if (s.includes('beginbfchar') && /<2192>/i.test(s)) found = true
    }
    expect(found).toBe(true)
    expect(text.length).toBeGreaterThan(0)
  })

  it('still spreads a justified line with an arrow in it to the margin', async () => {
    const plain = await paint(run({ text: 'Led the move REST → GraphQL across twelve services' }))
    const pieces = plain.drawn
    const naturalEnd = (() => {
      const last = pieces[pieces.length - 1]
      return last.xPt
    })()
    expect(naturalEnd).toBeGreaterThan(75)
    // Natural width, measured the way the painter measures it.
    const inter = await plain.fonts.embed('Inter', 400)
    const markFont = await plain.fonts.embed('CVAurum Marks', 400)
    const natural =
      inter.widthOfTextAtSize('Led the move REST ', 9) + markFont.widthOfTextAtSize('→', 9) + inter.widthOfTextAtSize(' GraphQL across twelve services', 9)
    const domPt = natural * 1.15
    const { drawn, fonts } = await paint(run({ text: 'Led the move REST → GraphQL across twelve services', widthPx: domPt / 0.75 }))
    const last = drawn[drawn.length - 1]
    const lastFont = last.face === 'marks' ? await fonts.embed('CVAurum Marks', 400) : await fonts.embed('Inter', 400)
    const lastText = last.face === 'marks' ? '→' : 'services'
    // The last word ends at the margin, and the words are spread (not stretched letters).
    expect(last.xPt + lastFont.widthOfTextAtSize(lastText, 9)).toBeCloseTo(75 + domPt, 1)
    expect(drawn.length).toBeGreaterThan(3)
  })
})
