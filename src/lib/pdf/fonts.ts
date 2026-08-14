import type { PDFDocument, PDFFont } from 'pdf-lib'
import * as fontkitNs from '@pdf-lib/fontkit'
import type { Font as FontkitFont } from '@pdf-lib/fontkit'

// @pdf-lib/fontkit is CJS: under Vite the real module ends up on `.default`,
// while under other bundlers/interop settings the namespace import IS the
// module. render.tsx hits the identical ambiguity when registering fontkit on
// the PDFDocument (see its comment); duplicated here rather than imported
// from there because render.tsx isn't in this task's touchable-files list,
// and this is the only other module that needs a real fontkit Font instance
// (to read glyph outlines for decorative text — see embedGlyphOutlines below).
const fontkit = ((fontkitNs as unknown as { default?: unknown }).default ?? fontkitNs) as {
  create(data: Uint8Array): FontkitFont
}

export class PdfFontMissingError extends Error {}

let indexPromise: Promise<Record<string, string>> | null = null
export function loadPdfFontIndex(): Promise<Record<string, string>> {
  if (!indexPromise) {
    indexPromise = fetch('/fonts-pdf/index.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('font index missing'))))
      .catch((e) => {
        indexPromise = null
        throw e
      })
  }
  return indexPromise
}

const slug = (family: string) =>
  family
    .replace(/^['"]|['"]$/g, '')
    .split(',')[0]
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/** Pure font-key resolution, exported for testing. */
export function resolveFontKey(index: Record<string, string>, family: string, weight: number): string | null {
  const fam = slug(family)
  if (index[`${fam}|${weight}`]) return `${fam}|${weight}`
  const weights = Object.keys(index)
    .filter((k) => k.startsWith(`${fam}|`))
    .map((k) => Number(k.split('|')[1]))
    .sort((a, b) => Math.abs(a - weight) - Math.abs(b - weight))
  return weights.length ? `${fam}|${weights[0]}` : null
}

/** Embeds each (family, weight) once per document. */
export class PdfFontCache {
  private cache = new Map<string, Promise<PDFFont>>()
  private glyphFontCache = new Map<string, Promise<FontkitFont>>()
  private bytesCache = new Map<string, Promise<Uint8Array>>()
  constructor(
    private doc: PDFDocument,
    private index: Record<string, string>
  ) {}

  embed(family: string, weight: number): Promise<PDFFont> {
    const key = this.resolve(family, weight)
    if (!key) throw new PdfFontMissingError(`no static font for ${family} ${weight}`)
    let p = this.cache.get(key)
    if (!p) {
      p = this.bytesFor(key).then((b) => this.doc.embedFont(b, { subset: true }))
      this.cache.set(key, p)
    }
    return p
  }

  /**
   * For DECORATIVE glyphs only (see paint.ts's vector-outline drawing path,
   * used for SVG logo marks and CSS separator/bullet glyphs) — the raw
   * fontkit `Font` backing this (family, weight), so callers can pull real
   * glyph outlines via `font.layout(text).glyphs[i].path` instead of drawing
   * extractable PDF text. Shares font bytes with `embed()` through
   * `bytesFor`, so this never doubles a network fetch for a (family, weight)
   * already used for real text on the same page.
   */
  embedGlyphOutlines(family: string, weight: number): Promise<FontkitFont> {
    const key = this.resolve(family, weight)
    if (!key) throw new PdfFontMissingError(`no static font for ${family} ${weight}`)
    let p = this.glyphFontCache.get(key)
    if (!p) {
      p = this.bytesFor(key).then((b) => fontkit.create(b))
      this.glyphFontCache.set(key, p)
    }
    return p
  }

  private bytesFor(key: string): Promise<Uint8Array> {
    let p = this.bytesCache.get(key)
    if (!p) {
      p = fetch(`/fonts-pdf/${this.index[key]}`)
        .then((r) => r.arrayBuffer())
        .then((b) => new Uint8Array(b))
      this.bytesCache.set(key, p)
    }
    return p
  }

  /** exact weight, else nearest weight in the same family */
  private resolve(family: string, weight: number): string | null {
    return resolveFontKey(this.index, family, weight)
  }
}
