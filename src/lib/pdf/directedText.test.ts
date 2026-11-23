import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFDocument, PDFRawStream, decodePDFRawStream, type PDFFont } from 'pdf-lib'
import * as fontkitNs from '@pdf-lib/fontkit'
import type { Font as FontkitFont } from '@pdf-lib/fontkit'
import { directedLayout, shapingDirection, withDirection } from './directedText'
import * as bidiImpl from './bidi'
import { mirrorRtl, setBidi } from './text'

const fontkit = ((fontkitNs as unknown as { default?: unknown }).default ?? fontkitNs) as Parameters<
  PDFDocument['registerFontkit']
>[0] & { create(data: Uint8Array): FontkitFont }

const here = path.dirname(fileURLToPath(import.meta.url))
const FONT_DIR = path.resolve(here, '../../../public/fonts-pdf')
const VAZIRMATN = new Uint8Array(fs.readFileSync(path.join(FONT_DIR, 'vazirmatn-400.ttf')))
const ARIMO = new Uint8Array(fs.readFileSync(path.join(FONT_DIR, 'arimo-700.ttf')))
/** The same face straight off disk, for the glyph ids the PDF ones are checked against. */
const fk = fontkit.create(VAZIRMATN)
const idOf = (cp: number) => fk.glyphForCodePoint(cp).id

const ZWNJ = '‌'
const NAME = `نوری${ZWNJ}زاده`

async function embed(bytes: Uint8Array, subset = false): Promise<{ doc: PDFDocument; font: PDFFont }> {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  return { doc, font: await doc.embedFont(bytes, { subset }) }
}

/** The glyph ids a non-subset embed wrote: its hex codes ARE the font's own glyph ids. */
const glyphIds = (hex: { asString(): string } | string) => {
  const s = typeof hex === 'string' ? hex : hex.asString()
  return (s.replace(/[<>]/g, '').match(/.{4}/g) ?? []).map((h) => parseInt(h, 16))
}

describe('withDirection: Persian digits drawn in reading order', () => {
  it('encodes ۱۴۰۲ as ۱,۴,۰,۲ under ltr (fontkit alone reverses them)', async () => {
    const { font } = await embed(VAZIRMATN)
    const expected = [0x6f1, 0x6f4, 0x6f0, 0x6f2].map(idOf)
    expect(glyphIds(font.encodeText('۱۴۰۲').toString())).toEqual([...expected].reverse())
    expect(glyphIds(withDirection(font, 'ltr', () => font.encodeText('۱۴۰۲')).toString())).toEqual(expected)
  })
})

describe('withDirection: the zero-width non-joiner', () => {
  it('keeps ی in its final/isolated form beside the ZWNJ, never the joined one', async () => {
    const { font } = await embed(VAZIRMATN)
    const ids = glyphIds(withDirection(font, 'rtl', () => font.encodeText(NAME)).toString())
    // Drawn right to left: ه د ا ز ZWNJ ی ر و ن, so ی is the sixth glyph.
    const unjoined = glyphIds(withDirection(font, 'rtl', () => font.encodeText('نوری')).toString())[0]
    const joined = glyphIds(withDirection(font, 'rtl', () => font.encodeText('نوریزاده')).toString())[4]
    expect(ids[5]).toBe(unjoined)
    expect(ids[5]).not.toBe(joined)
    // The font's own ZWNJ glyph is drawn, not the space fontkit swaps in.
    expect(ids[4]).toBe(idOf(0x200c))
    expect(ids).not.toContain(idOf(0x20))
  })

  it('gives the ZWNJ no advance: the name measures exactly its two halves', async () => {
    const { font } = await embed(VAZIRMATN)
    const at = (text: string) => withDirection(font, 'rtl', () => font.widthOfTextAtSize(text, 12))
    // ز never joins to the letter before it, so each half shapes the same alone.
    expect(at(NAME)).toBeCloseTo(at('نوری') + at('زاده'), 6)
    // Today's call (no direction) draws the hidden ZWNJ as a whole space.
    expect(font.widthOfTextAtSize(NAME, 12)).toBeGreaterThan(at(NAME) + 1)
  })
})

describe('withDirection: state is restored', () => {
  it('leaves a later plain encodeText exactly as a fresh font encodes it', async () => {
    const { font } = await embed(ARIMO)
    const { font: fresh } = await embed(ARIMO)
    withDirection(font, 'rtl', () => font.encodeText('Abc'))
    expect(font.encodeText('Abc').toString()).toBe(fresh.encodeText('Abc').toString())
    const layout = (font as unknown as { embedder: { font: object } }).embedder.font
    expect(Object.prototype.hasOwnProperty.call(layout, 'layout')).toBe(false)
  })

  it('restores the layout when the wrapped call throws', async () => {
    const { font } = await embed(VAZIRMATN)
    const inner = (font as unknown as { embedder: { font: { layout: unknown } } }).embedder.font
    const before = inner.layout
    expect(() =>
      withDirection(font, 'rtl', () => {
        throw new Error('boom')
      })
    ).toThrow('boom')
    expect(inner.layout).toBe(before)
    expect(glyphIds(font.encodeText('۱۴۰۲').toString())).toEqual([0x6f2, 0x6f0, 0x6f4, 0x6f1].map(idOf))
  })

  it('does not reach another font while it runs', async () => {
    const doc = await PDFDocument.create()
    doc.registerFontkit(fontkit)
    const a = await doc.embedFont(VAZIRMATN)
    const b = await doc.embedFont(VAZIRMATN)
    const plain = glyphIds(b.encodeText('۱۴۰۲').toString())
    withDirection(a, 'ltr', () => {
      expect(glyphIds(b.encodeText('۱۴۰۲').toString())).toEqual(plain)
    })
  })

  it('nests: an inner direction is undone back to the outer one', async () => {
    const { font } = await embed(VAZIRMATN)
    const ltr = [0x6f1, 0x6f4, 0x6f0, 0x6f2].map(idOf)
    withDirection(font, 'ltr', () => {
      withDirection(font, 'rtl', () => font.encodeText('۱۴۰۲'))
      expect(glyphIds(font.encodeText('۱۴۰۲').toString())).toEqual(ltr)
    })
  })

  it('nests: the inner direction is the one an inner call shapes in', async () => {
    const { font } = await embed(VAZIRMATN)
    const rtl = [0x6f2, 0x6f0, 0x6f4, 0x6f1].map(idOf)
    const inner = withDirection(font, 'ltr', () => withDirection(font, 'rtl', () => font.encodeText('۱۴۰۲')))
    expect(glyphIds(inner.toString())).toEqual(rtl)
  })
})

describe('withDirection: the subset embedder keeps the glyphs it draws', () => {
  it('a subset PDF drawn in both directions saves, parses, and carries the ZWNJ glyph', async () => {
    const { doc, font } = await embed(VAZIRMATN, true)
    const page = doc.addPage([300, 200])
    withDirection(font, 'rtl', () => page.drawText(NAME, { x: 10, y: 150, size: 14, font }))
    withDirection(font, 'ltr', () => page.drawText('۱۴۰۲', { x: 10, y: 120, size: 14, font }))
    withDirection(font, 'rtl', () => page.drawText('(مادری)', { x: 10, y: 90, size: 14, font }))
    const map = (font as unknown as { embedder: { glyphIdMap: Map<number, number> } }).embedder.glyphIdMap
    // The subset recorded the font's own ZWNJ glyph - the one drawn.
    expect(map.has(idOf(0x200c))).toBe(true)
    expect(map.has(idOf(0x20))).toBe(false)
    const bytes = await doc.save()
    const back = await PDFDocument.load(bytes)
    expect(back.getPageCount()).toBe(1)
  })
})

describe('shapingDirection', () => {
  it('is null for Latin, ltr for Arabic-script digits, rtl for an rtl run', () => {
    expect(shapingDirection({ text: 'Senior Engineer, 2019 - 2024' })).toBeNull()
    expect(shapingDirection({ text: 'Ünïcödé façade' })).toBeNull()
    expect(shapingDirection({ text: '۱۴۰۲' })).toBe('ltr')
    expect(shapingDirection({ text: 'مهندس', direction: 'rtl' })).toBe('rtl')
    expect(shapingDirection({ text: '﻿Abc' })).toBeNull()
  })
})

describe('directedLayout (the decorative outline path)', () => {
  it('is the plain layout with no direction, and orders digits under ltr', () => {
    const plain = fk.layout('۱۴۰۲').glyphs.map((g) => g.id)
    expect(directedLayout(fk, '۱۴۰۲', null).glyphs.map((g) => g.id)).toEqual(plain)
    expect(directedLayout(fk, '۱۴۰۲', 'ltr').glyphs.map((g) => g.id)).toEqual([...plain].reverse())
  })
})

/** Every (code -> text) pair of the saved file's ToUnicode CMaps. */
async function toUnicode(bytes: Uint8Array): Promise<Map<number, string>> {
  const back = await PDFDocument.load(bytes)
  const out = new Map<number, string>()
  for (const [, obj] of back.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue
    const text = new TextDecoder().decode(decodePDFRawStream(obj).decode())
    if (!text.includes('beginbfchar')) continue
    for (const m of text.matchAll(/<([0-9a-f]{4})> <([0-9a-f]+)>/gi)) {
      const units = (m[2].match(/.{4}/g) ?? []).map((h) => parseInt(h, 16))
      out.set(parseInt(m[1], 16), String.fromCharCode(...units))
    }
  }
  return out
}

describe('withDirection: the text layer of a right-to-left run reads back as written', () => {
  // Every extractor in use (pdf.js, poppler) reads a run's glyphs left to
  // right as drawn and then reverses the right-to-left stretch, character by
  // character. Two glyphs break that unless the file says what they stand
  // for the way those readers will turn it around.
  it('maps the lam-alef ligature in drawn order, so the reversal reads لا and not ال', async () => {
    const { doc, font } = await embed(VAZIRMATN, true)
    const codes = glyphIds(withDirection(font, 'rtl', () => font.encodeText('کالا')).toString())
    const map = await toUnicode(await doc.save())
    const read = codes.map((c) => map.get(c) ?? '?').join('')
    // Drawn left to right: the ligature, then ا, then ک. Reversed: ک ا ل ا.
    expect([...read].reverse().join('')).toBe('کالا')
  })

  it('maps a mirrored bracket to the character the author typed, and the same bracket left to right to itself', async () => {
    setBidi(bidiImpl)
    try {
      const { doc, font } = await embed(VAZIRMATN, true)
      // The painter mirrors an rtl run before shaping it (paint.ts mirrorRtl).
      const rtl = glyphIds(withDirection(font, 'rtl', () => font.encodeText(mirrorRtl('(مادری)'))).toString())
      const ltr = glyphIds(font.encodeText('(C1)').toString())
      const map = await toUnicode(await doc.save())
      const rtlRead = rtl.map((c) => map.get(c) ?? '?').join('')
      expect([...rtlRead].reverse().join('')).toBe('(مادری)')
      expect(ltr.map((c) => map.get(c) ?? '?').join('')).toBe('(C1)')
      // The drawn shape is still the mirrored one: the leftmost glyph of the
      // rtl run is the same outline as the ltr opening bracket.
      const sub = (font as unknown as { embedder: { subset: { glyphs: number[] } } }).embedder.subset.glyphs
      expect(sub[rtl[0]]).toBe(sub[ltr[0]])
      expect(rtl[0]).not.toBe(ltr[0])
    } finally {
      setBidi(null)
    }
  })
})
