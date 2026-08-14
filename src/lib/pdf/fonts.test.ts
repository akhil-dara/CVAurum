import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFDocument } from 'pdf-lib'
import * as fontkitNs from '@pdf-lib/fontkit'
import { resolveFontKey, PdfFontCache, PdfFontMissingError } from './fonts'

// Same CJS/ESM interop ambiguity fonts.ts and render.tsx both guard against —
// see fonts.ts's comment. Only needed here for embed(), which calls
// doc.embedFont() -> requires registerFontkit(); embedGlyphOutlines() uses
// fonts.ts's own internal fontkit instance and doesn't need this.
const fontkit = ((fontkitNs as unknown as { default?: unknown }).default ?? fontkitNs) as Parameters<
  PDFDocument['registerFontkit']
>[0]

const INDEX = { 'inter|400': 'a.ttf', 'inter|700': 'b.ttf', 'playfair-display|500': 'c.ttf' }

describe('resolveFontKey', () => {
  it('finds an exact family and weight', () => {
    expect(resolveFontKey(INDEX, 'Inter', 400)).toBe('inter|400')
  })
  it('normalises a CSS font-family stack to the first family', () => {
    expect(resolveFontKey(INDEX, '"Playfair Display", Georgia, serif', 500)).toBe('playfair-display|500')
  })
  it('falls back to the nearest weight in the same family', () => {
    expect(resolveFontKey(INDEX, 'Inter', 600)).toBe('inter|700')
    expect(resolveFontKey(INDEX, 'Inter', 300)).toBe('inter|400')
  })
  it('returns null when the family is absent', () => {
    expect(resolveFontKey(INDEX, 'Comic Sans MS', 400)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// embedGlyphOutlines: the raw fontkit Font used to draw DECORATIVE text
// (logo monograms, CSS separator/bullet glyphs) as vector outlines instead of
// real PDF text — see paint.ts's paintDecorativeGlyphs. PdfFontCache fetches
// font bytes over HTTP in the real app (`fetch('/fonts-pdf/...')`); stubbing
// global fetch to read the SAME real .ttf off disk lets these tests exercise
// the actual production class rather than a hand-rolled substitute.
const here = path.dirname(fileURLToPath(import.meta.url))
const FONT_DIR = path.resolve(here, '../../../public/fonts-pdf')
const FONT_FILE = 'arimo-700.ttf'
const REAL_INDEX = { 'arimo|700': FONT_FILE }

describe('PdfFontCache.embedGlyphOutlines', () => {
  let fetchCalls: string[] = []
  let originalFetch: typeof fetch

  beforeAll(() => {
    originalFetch = globalThis.fetch
    globalThis.fetch = (async (input: string | URL) => {
      const url = String(input)
      fetchCalls.push(url)
      const file = url.replace(/^\/fonts-pdf\//, '')
      const bytes = fs.readFileSync(path.join(FONT_DIR, file))
      const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
      return { ok: true, arrayBuffer: async () => ab } as Response
    }) as typeof fetch
  })
  afterAll(() => {
    globalThis.fetch = originalFetch
  })

  it('throws PdfFontMissingError for a family/weight not in the index', async () => {
    const doc = await PDFDocument.create()
    const fonts = new PdfFontCache(doc, REAL_INDEX)
    expect(() => fonts.embedGlyphOutlines('Comic Sans MS', 400)).toThrow(PdfFontMissingError)
  })

  it('returns a real fontkit Font that can lay out text and expose glyph outlines', async () => {
    const doc = await PDFDocument.create()
    const fonts = new PdfFontCache(doc, REAL_INDEX)
    const font = await fonts.embedGlyphOutlines('Arimo', 700)
    expect(font.unitsPerEm).toBeGreaterThan(0)
    const run = font.layout('V')
    expect(run.glyphs).toHaveLength(1)
    expect(run.glyphs[0].path.toSVG()).toContain('M')
  })

  it('shares the underlying byte fetch with embed() for the same (family, weight)', async () => {
    fetchCalls = []
    const doc = await PDFDocument.create()
    doc.registerFontkit(fontkit)
    const fonts = new PdfFontCache(doc, REAL_INDEX)
    await fonts.embed('Arimo', 700)
    await fonts.embedGlyphOutlines('Arimo', 700)
    expect(fetchCalls).toHaveLength(1)
  })
})
