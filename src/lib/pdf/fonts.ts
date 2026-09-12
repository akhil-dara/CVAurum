import type { PDFDocument, PDFFont } from 'pdf-lib'
import * as fontkitNs from '@pdf-lib/fontkit'
import type { Font as FontkitFont } from '@pdf-lib/fontkit'
import { scriptFallbacks } from '@/data/fonts'
import { loadPdfFontIndex, resolveFontKey } from './fontIndex'

// Re-exported: render.tsx and the tests have always taken these from here,
// and they now live in a module the editor can import without dragging
// pdf-lib and fontkit along with them (fontIndex.ts).

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

export { loadPdfFontIndex, resolveFontKey }

/** Embeds each (family, weight) once per document. */
export class PdfFontCache {
  private cache = new Map<string, Promise<PDFFont>>()
  private glyphFontCache = new Map<string, Promise<FontkitFont>>()
  private coverageCache = new Map<string, Promise<Array<{ family: string; has: (cp: number) => boolean }>>>()
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

  /**
   * The fonts that may draw a run set in `family`: the family itself, then
   * its script fallbacks (src/data/fonts.ts), each with a glyph test. A chain
   * member with no static font of its own is skipped rather than failing the
   * run. Resolved once per (family, weight) and shared with `embed`'s bytes.
   */
  async coverage(family: string, weight: number): Promise<Array<{ family: string; has: (cp: number) => boolean }>> {
    const key = `${this.resolve(family, weight) ?? family}|${weight}`
    let p = this.coverageCache.get(key)
    if (!p) {
      p = (async () => {
        const out: Array<{ family: string; has: (cp: number) => boolean }> = []
        const seen = new Set<string>()
        // `family` is the run's whole CSS stack ('"Bebas Neue", "Oswald", ...'):
        // the FIRST name, unquoted, is the one the registry knows. (Stripping
        // the quotes before splitting left a trailing quote on the name, so
        // every family fell to the sans chain and a display face's Cyrillic
        // came out in Inter while the canvas drew it in Oswald: measured.)
        const primary = family.split(',')[0].trim().replace(/^['"]|['"]$/g, '')
        for (const fam of [family, ...scriptFallbacks(primary)]) {
          const k = this.resolve(fam, weight)
          if (!k || seen.has(k)) continue
          seen.add(k)
          let font: FontkitFont
          try {
            font = await this.embedGlyphOutlines(fam, weight)
          } catch {
            continue
          }
          const has = (font as unknown as { hasGlyphForCodePoint?: (cp: number) => boolean }).hasGlyphForCodePoint
          if (typeof has !== 'function') continue
          out.push({ family: fam, has: (cp) => has.call(font, cp) })
        }
        return out
      })()
      this.coverageCache.set(key, p)
    }
    return p
  }

  /**
   * The distinct characters in `text` that NO font in the chain for
   * (family, weight) has a glyph for.
   *
   * A character with no glyph is not drawn as a box - it is dropped, so a
   * resume written in a script the embedded fonts do not cover exports
   * "successfully" while carrying none of its own words. Measured: a summary
   * in Telugu, Japanese and Hindi produced a 60KB PDF with all three scripts
   * absent from the text layer. Cyrillic, Greek and Vietnamese are covered
   * by the fallback chain now (issue #10); the rest is still reported.
   */
  async missingGlyphs(family: string, weight: number, text: string): Promise<string[]> {
    if (!text) return []
    const chain = await this.coverage(family, weight)
    if (!chain.length) return [] // no font resolved at all is a different failure, reported elsewhere
    const missing = new Set<string>()
    for (const ch of text) {
      const cp = ch.codePointAt(0)
      if (cp === undefined) continue
      // Whitespace and control characters are never drawn; absence is normal.
      if (cp <= 0x20) continue
      if (!chain.some((c) => c.has(cp))) missing.add(ch)
    }
    return [...missing]
  }

  private bytesFor(key: string): Promise<Uint8Array> {
    let p = this.bytesCache.get(key)
    if (!p) {
      p = fetch(`/fonts-pdf/${this.index[key]}`)
        .then((r) => {
          // Without this the body of a 404 went to embedFont as font bytes,
          // and the author got an opaque parse error naming nothing.
          if (!r.ok) throw new Error(`the font file for ${key} is unavailable (${r.status})`)
          return r.arrayBuffer()
        })
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
