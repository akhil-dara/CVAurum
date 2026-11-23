// The painter shapes each run in its own direction (directedText.ts): an rtl
// run right to left with its brackets mirrored, Arabic-script digits left to
// right, and Latin exactly as before, never through the wrapper.
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFDict, PDFDocument, PDFName, type PDFFont, type PDFPage } from 'pdf-lib'
import * as fontkitNs from '@pdf-lib/fontkit'
import type { Font as FontkitFont } from '@pdf-lib/fontkit'

vi.mock('./directedText', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./directedText')>()
  return { ...mod, withDirection: vi.fn(mod.withDirection) }
})

import { glyphPathToDrawPath, paintOps } from './paint'
import { PdfFontCache } from './fonts'
import { TWIN_KEY_BASE, withDirection } from './directedText'
import { setBidi } from './text'
import * as bidi from './bidi'
import type { DrawOp, TextRun } from './types'

const fontkit = ((fontkitNs as unknown as { default?: unknown }).default ?? fontkitNs) as Parameters<
  PDFDocument['registerFontkit']
>[0] & { create(data: Uint8Array): FontkitFont }

const here = path.dirname(fileURLToPath(import.meta.url))
const FONT_DIR = path.resolve(here, '../../../public/fonts-pdf')
const INDEX = { 'arimo|700': 'arimo-700.ttf', 'vazirmatn|400': 'vazirmatn-400.ttf' }
const vaz = fontkit.create(new Uint8Array(fs.readFileSync(path.join(FONT_DIR, 'vazirmatn-400.ttf'))))
/** What the font itself draws for `text` shaped in `direction`, in visual (drawn) order. */
const layout5 = vaz.layout.bind(vaz) as unknown as (
  text: string,
  features: undefined,
  script: string,
  language: undefined,
  direction: string
) => { glyphs: Array<{ id: number }> }
const shaped = (text: string, direction: 'rtl' | 'ltr') =>
  layout5(text, undefined, direction === 'rtl' ? 'arab' : 'latn', undefined, direction).glyphs.map((g) => g.id)

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
afterEach(() => {
  setBidi(null)
  vi.mocked(withDirection).mockClear()
})

function run(overrides: Partial<TextRun>): TextRun {
  return {
    text: 'SUMMARY',
    xPx: 10,
    widthPx: 0,
    baselinePx: 40,
    sizePx: 12,
    family: 'Vazirmatn',
    weight: 400,
    italic: false,
    color: { r: 0, g: 0, b: 0, a: 1 },
    letterSpacingPx: 0,
    isDecorative: false,
    ...overrides,
  }
}

/** One drawn text object: which face, where, and the ORIGINAL glyph ids it shows, left to right. */
interface Drawn {
  face: 'vazirmatn' | 'arimo' | 'other'
  xPt: number
  ids: number[]
}

/** Paints `ops` and reads back, per text-showing operator, the face and the original glyph ids. */
async function paint(ops: DrawOp[], trackingEm = 0): Promise<Drawn[]> {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  const page = doc.addPage([400, 200])
  const fonts = new PdfFontCache(doc, INDEX)
  await paintOps(page, ops, fonts, 200)
  const faces = new Map<string, { face: Drawn['face']; back: Map<number, number> }>()
  const dict = (page as PDFPage).node.Resources()?.lookup(PDFName.of('Font'), PDFDict)
  const known: Array<[Drawn['face'], PDFFont]> = [
    ['vazirmatn', await fonts.embed('Vazirmatn', 400, trackingEm)],
    ['arimo', await fonts.embed('Arimo', 700, trackingEm)],
  ]
  for (const [key, ref] of dict?.entries() ?? []) {
    const hit = known.find(([, f]) => f.ref === ref)
    const map = hit ? (hit[1] as unknown as { embedder: { glyphIdMap: Map<number, number> } }).embedder.glyphIdMap : new Map()
    // A twin (a mirrored bracket's own copy of a glyph) reads back as the
    // glyph whose outline it draws.
    const outline = (o: number) => (o >= TWIN_KEY_BASE ? o - TWIN_KEY_BASE : o)
    faces.set(key.asString().slice(1), { face: hit ? hit[0] : 'other', back: new Map([...map].map(([o, s]) => [s, outline(o)])) })
  }
  const stream = (page as unknown as { getContentStream: () => { getContentsString(): string } })
    .getContentStream()
    .getContentsString()
  const out: Drawn[] = []
  let current = { face: 'other' as Drawn['face'], back: new Map<number, number>() }
  let x = 0
  for (const m of stream.matchAll(/\/(\S+) [\d.]+ Tf|1 0 0 1 (-?[\d.]+) -?[\d.]+ Tm|<([0-9A-Fa-f]*)> Tj/g)) {
    if (m[1]) current = faces.get(m[1]) ?? current
    else if (m[2]) x = Number(m[2])
    else {
      const ids = (m[3].match(/.{4}/g) ?? []).map((h) => current.back.get(parseInt(h, 16)) ?? -1)
      out.push({ face: current.face, xPt: x, ids })
    }
  }
  return out
}

const text = (r: TextRun): DrawOp => ({ kind: 'text', run: r })

describe('paintOps: Latin takes the old path', () => {
  it('never enters withDirection for a Latin run', async () => {
    await paint([text(run({ text: 'Senior Engineer, 2019 - 2024', family: 'Arimo', weight: 700 }))])
    expect(withDirection).not.toHaveBeenCalled()
  })
})

describe('paintOps: each run in its own direction', () => {
  it('draws an rtl run right to left, joined, through withDirection', async () => {
    const drawn = await paint([text(run({ text: 'مهندس', direction: 'rtl' }))])
    expect(withDirection).toHaveBeenCalled()
    expect(drawn).toHaveLength(1)
    expect(drawn[0].ids).toEqual(shaped('مهندس', 'rtl'))
  })

  it('draws a run of Persian digits left to right', async () => {
    const drawn = await paint([text(run({ text: '۱۴۰۲' }))])
    expect(drawn[0].ids).toEqual([0x6f1, 0x6f4, 0x6f0, 0x6f2].map((cp) => vaz.glyphForCodePoint(cp).id))
  })

  it('mirrors the brackets of an rtl run: (مادری) is drawn with ( on the left', async () => {
    setBidi(bidi)
    const drawn = await paint([text(run({ text: '(مادری)', direction: 'rtl' }))])
    const ids = drawn[0].ids
    expect(ids[0]).toBe(vaz.glyphForCodePoint(0x28).id)
    expect(ids[ids.length - 1]).toBe(vaz.glyphForCodePoint(0x29).id)
  })

  it('keeps the ZWNJ, at zero width', async () => {
    const drawn = await paint([text(run({ text: 'نوری‌زاده', direction: 'rtl' }))])
    expect(drawn[0].ids).toContain(vaz.glyphForCodePoint(0x200c).id)
    expect(drawn[0].ids).not.toContain(vaz.glyphForCodePoint(0x20).id)
  })

  it('lays an rtl run drawn in two faces out right to left: its last word leftmost', async () => {
    // "نام: علی" set in a Latin face: the letters come from Vazirmatn, the
    // colon and space from Arimo, three pieces in logical order.
    const drawn = await paint([text(run({ text: 'نام: علی', family: 'Arimo', weight: 700, direction: 'rtl' }))])
    expect(drawn.map((d) => d.face)).toEqual(['vazirmatn', 'arimo', 'vazirmatn'])
    expect(drawn[0].ids).toEqual(shaped('علی', 'rtl'))
    expect(drawn[2].ids).toEqual(shaped('نام', 'rtl'))
    expect(drawn[0].xPt).toBeLessThan(drawn[1].xPt)
    expect(drawn[1].xPt).toBeLessThan(drawn[2].xPt)
  })

  it('a tracked rtl run in two faces is laid out right to left too', async () => {
    // The tracked cuts widen advances only, so their glyph ids are the face's own.
    const drawn = await paint(
      [text(run({ text: 'نام: علی', family: 'Arimo', weight: 700, direction: 'rtl', letterSpacingPx: 0.6 }))],
      0.6 / 12
    )
    expect(drawn.map((d) => d.face)).toEqual(['vazirmatn', 'arimo', 'vazirmatn'])
    expect(drawn[0].ids).toEqual(shaped('علی', 'rtl'))
    expect(drawn[2].ids).toEqual(shaped('نام', 'rtl'))
    expect(drawn[0].xPt).toBeLessThan(drawn[2].xPt)
  })

  it('spreads a justified rtl line with its first word on the right', async () => {
    const natural = await (async () => {
      const doc = await PDFDocument.create()
      doc.registerFontkit(fontkit)
      const f = await new PdfFontCache(doc, INDEX).embed('Vazirmatn', 400)
      return withDirection(f, 'rtl', () => f.widthOfTextAtSize('مهندس نرم افزار', 9))
    })()
    vi.mocked(withDirection).mockClear()
    const drawn = await paint([text(run({ text: 'مهندس نرم افزار', direction: 'rtl', widthPx: (natural * 1.1) / 0.75 }))])
    expect(drawn).toHaveLength(3)
    expect(drawn[0].ids).toEqual(shaped('افزار', 'rtl'))
    expect(drawn[2].ids).toEqual(shaped('مهندس ', 'rtl'))
  })
})

describe('paintOps: a decorative Arabic-script run in a face without Arabic', () => {
  // keystone's running foot repeats the name in a monospaced Latin face. As
  // outlines from that face alone, every Persian letter was its missing-glyph
  // box; the canvas borrows the letters from a fallback, and so does the file.
  it('draws its outlines from the chain font that has the letters', async () => {
    setBidi(bidi)
    const doc = await PDFDocument.create()
    doc.registerFontkit(fontkit)
    const page = doc.addPage([400, 200])
    const fonts = new PdfFontCache(doc, INDEX)
    const spy = vi.spyOn(fonts, 'embedGlyphOutlines')
    const drawn = vi.spyOn(page, 'drawSvgPath').mock.calls
    await paintOps(page, [text(run({ text: 'علی', family: 'Arimo', weight: 700, direction: 'rtl', isDecorative: true }))], fonts, 200)
    expect(spy.mock.calls.map((c) => c[0])).toContain('Vazirmatn')
    // And what it drew are Vazirmatn's own outlines for the joined word,
    // right to left, never a missing-glyph box.
    const vazGlyphs = layout5('علی', undefined, 'arab', undefined, 'rtl').glyphs as unknown as Array<{ id: number; path: Parameters<typeof glyphPathToDrawPath>[0] }>
    const scale = 9 / vaz.unitsPerEm
    expect(vazGlyphs.every((g) => g.id !== 0)).toBe(true)
    expect(drawn.map((c) => c[0])).toEqual(vazGlyphs.map((g) => glyphPathToDrawPath(g.path, scale)).filter(Boolean))
    const xs = drawn.map((c) => (c[1] as { x: number }).x)
    expect([...xs].sort((a, b) => a - b)).toEqual(xs)
  })
})
