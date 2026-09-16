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

/** A sfnt table directory entry, by tag. Returns null for anything that is not
 *  a plain TrueType/OpenType file (a font COLLECTION, `ttcf`, among them). */
function sfntTables(d: DataView): Map<string, { offset: number; length: number }> | null {
  if (d.byteLength < 12) return null
  const version = d.getUint32(0)
  // 0x00010000 = TrueType outlines, 'true' = the old Apple tag, 'OTTO' = CFF.
  // A CFF font has no `glyf`, but it still carries `head`/`hhea`/`hmtx`, which
  // is all this file touches.
  if (version !== 0x00010000 && version !== 0x74727565 && version !== 0x4f54544f) return null
  const numTables = d.getUint16(4)
  if (12 + numTables * 16 > d.byteLength) return null
  const out = new Map<string, { offset: number; length: number }>()
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16
    let tag = ''
    for (let j = 0; j < 4; j++) tag += String.fromCharCode(d.getUint8(rec + j))
    out.set(tag, { offset: d.getUint32(rec + 8), length: d.getUint32(rec + 12) })
  }
  return out
}

/** `head.unitsPerEm` — the font's design grid, the unit `letter-spacing` has
 *  to be converted into before it can be baked into an advance width. 0 when
 *  the bytes are not a font this understands. */
export function unitsPerEmOf(bytes: Uint8Array): number {
  const d = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const head = sfntTables(d)?.get('head')
  if (!head || head.offset + 20 > d.byteLength) return 0
  return d.getUint16(head.offset + 18)
}

/**
 * The SAME font, with every horizontal advance widened by `deltaUnits` font
 * units — a TRACKED cut of the face.
 *
 * Why the bytes rather than the operator: PDF's own character-spacing operator
 * (`Tc`) moves the pen between glyphs, and every extractor in use reconstructs
 * words from glyph GEOMETRY — pdf.js splits at any gap over `fontSize * 0.102`
 * (`TRACKING_SPACE_FACTOR` in its evaluator), PyMuPDF and poppler do the
 * equivalent — so a heading set with `letter-spacing: 0.16em` extracts as
 * "S U M M A R Y". The painter used to answer that by drawing the visible
 * letters as vector outlines and hiding a second, untracked copy of the text
 * under them in rendering mode 3; an external scanner read the file and
 * reported "text drawn invisibly", which is exactly the shape of the trick
 * even though nothing was being concealed.
 *
 * Tracking baked into `hmtx` is not a trick: the glyphs really are that wide,
 * one text-showing operator draws them, and the same three extractors read
 * "SUMMARY" as one word (measured — see the task brief's font-variant note).
 *
 * `hhea.numberOfHMetrics` says how many `longHorMetric` records `hmtx` opens
 * with; every glyph past them reuses the LAST record's advance, which this
 * widens along with the rest, so no glyph is left untracked. Nothing else in
 * the file is touched — not `head`, not `glyf`, not the checksums (neither
 * pdf-lib nor fontkit verifies them; confirmed by embedding a patched font and
 * reading its widths back out, see fontsTracked.test.ts).
 *
 * Advances are clamped into [0, 65535]: `advanceWidth` is a uint16, and
 * NEGATIVE tracking (every template's `.rm-name` carries -0.01em or -0.02em)
 * would otherwise wrap a narrow glyph's advance around to enormous.
 */
export function widenAdvances(bytes: Uint8Array, deltaUnits: number): Uint8Array {
  if (!deltaUnits) return bytes
  const out = bytes.slice()
  const d = new DataView(out.buffer, out.byteOffset, out.byteLength)
  const tables = sfntTables(d)
  const hhea = tables?.get('hhea')
  const hmtx = tables?.get('hmtx')
  if (!hhea || !hmtx || hhea.offset + 36 > d.byteLength) return bytes
  const numberOfHMetrics = d.getUint16(hhea.offset + 34)
  for (let i = 0; i < numberOfHMetrics; i++) {
    const at = hmtx.offset + i * 4
    if (at + 2 > d.byteLength || at + 2 > hmtx.offset + hmtx.length) break
    const advance = d.getUint16(at)
    d.setUint16(at, Math.max(0, Math.min(0xffff, advance + deltaUnits)))
  }
  return out
}

/**
 * Every (code point -> glyph id) pair of a font's BMP `cmap`, or null when it
 * has no subtable this reads.
 *
 * Format 4 only, and that is not a shortcut: every one of the 159 bundled PDF
 * faces carries a (platform 3, encoding 1) format 4 subtable and nothing else
 * that matters (measured with fontTools across public/fonts-pdf), because they
 * are BMP-only subsets — Latin, Cyrillic, Greek, Vietnamese. A face with only
 * a format 0/6/12 subtable returns null and simply gets no small-caps variant.
 */
function readCmap4(d: DataView): Map<number, number> | null {
  const cmap = sfntTables(d)?.get('cmap')
  if (!cmap || cmap.offset + 4 > d.byteLength) return null
  const numTables = d.getUint16(cmap.offset + 2)
  let sub = -1
  for (let i = 0; i < numTables; i++) {
    const rec = cmap.offset + 4 + i * 8
    if (rec + 8 > d.byteLength) return null
    const platform = d.getUint16(rec)
    const encoding = d.getUint16(rec + 2)
    const at = cmap.offset + d.getUint32(rec + 4)
    if (at + 4 > d.byteLength || d.getUint16(at) !== 4) continue
    // (3,1) is the one every bundled face has; (0,3) says the same thing and
    // stands in for a face that somehow carries only the Unicode record.
    if (platform === 3 && encoding === 1) sub = at
    else if (sub < 0 && platform === 0) sub = at
  }
  if (sub < 0) return null
  const segCountX2 = d.getUint16(sub + 6)
  const segCount = segCountX2 / 2
  const endAt = sub + 14
  const startAt = endAt + segCountX2 + 2
  const deltaAt = startAt + segCountX2
  const rangeAt = deltaAt + segCountX2
  if (rangeAt + segCountX2 > d.byteLength) return null
  const out = new Map<number, number>()
  for (let s = 0; s < segCount; s++) {
    const end = d.getUint16(endAt + s * 2)
    const start = d.getUint16(startAt + s * 2)
    const delta = d.getInt16(deltaAt + s * 2)
    const rangeOffset = d.getUint16(rangeAt + s * 2)
    if (start > end) continue
    for (let cp = start; cp <= end && cp !== 0x10000; cp++) {
      let gid: number
      if (rangeOffset === 0) gid = (cp + delta) & 0xffff
      else {
        const at = rangeAt + s * 2 + rangeOffset + (cp - start) * 2
        if (at + 2 > d.byteLength) continue
        const g = d.getUint16(at)
        gid = g === 0 ? 0 : (g + delta) & 0xffff
      }
      if (gid !== 0) out.set(cp, gid)
    }
  }
  return out.size ? out : null
}

/** One `cmap` table holding a single (platform 3, encoding 1) format 4
 *  subtable for `map`. Every segment carries its glyph ids in `glyphIdArray`
 *  (idDelta 0) rather than trying to find arithmetic runs: the table is a few
 *  KB either way and nothing downstream reads it more than once. */
function buildCmap4(map: Map<number, number>): Uint8Array {
  const cps = [...map.keys()].filter((cp) => cp >= 0 && cp <= 0xffff).sort((a, b) => a - b)
  // One segment per contiguous run of code points, plus the 0xFFFF terminator
  // the format requires.
  const segs: Array<{ start: number; end: number }> = []
  for (const cp of cps) {
    const last = segs[segs.length - 1]
    if (last && cp === last.end + 1) last.end = cp
    else segs.push({ start: cp, end: cp })
  }
  const glyphIds: number[] = []
  const rangeOffsets: number[] = []
  for (const seg of segs) {
    rangeOffsets.push(glyphIds.length)
    for (let cp = seg.start; cp <= seg.end; cp++) glyphIds.push(map.get(cp) ?? 0)
  }
  segs.push({ start: 0xffff, end: 0xffff })
  const segCount = segs.length
  const subLen = 16 + segCount * 8 + glyphIds.length * 2
  const out = new Uint8Array(4 + 8 + subLen)
  const v = new DataView(out.buffer)
  v.setUint16(0, 0) // cmap version
  v.setUint16(2, 1) // one encoding record
  v.setUint16(4, 3) // platform 3 (Windows)
  v.setUint16(6, 1) // encoding 1 (Unicode BMP)
  v.setUint32(8, 12) // the subtable follows the record
  const s = 12
  v.setUint16(s, 4)
  v.setUint16(s + 2, subLen)
  v.setUint16(s + 4, 0) // language
  v.setUint16(s + 6, segCount * 2)
  const pow = 1 << Math.floor(Math.log2(segCount))
  v.setUint16(s + 8, pow * 2) // searchRange
  v.setUint16(s + 10, Math.log2(pow)) // entrySelector
  v.setUint16(s + 12, segCount * 2 - pow * 2) // rangeShift
  const endAt = s + 14
  const startAt = endAt + segCount * 2 + 2
  const deltaAt = startAt + segCount * 2
  const rangeAt = deltaAt + segCount * 2
  const glyphAt = rangeAt + segCount * 2
  for (let i = 0; i < segCount; i++) {
    v.setUint16(endAt + i * 2, segs[i].end)
    v.setUint16(startAt + i * 2, segs[i].start)
    if (i === segCount - 1) {
      // The terminator maps 0xFFFF to glyph 0 the way every font does.
      v.setInt16(deltaAt + i * 2, 1)
      v.setUint16(rangeAt + i * 2, 0)
    } else {
      v.setInt16(deltaAt + i * 2, 0)
      // glyphIndexAddress = idRangeOffset[i] + 2*(c - startCode[i]) + &idRangeOffset[i]
      v.setUint16(rangeAt + i * 2, (segCount - i) * 2 + rangeOffsets[i] * 2)
    }
  }
  for (let i = 0; i < glyphIds.length; i++) v.setUint16(glyphAt + i * 2, glyphIds[i])
  return out
}

/** The same font with one table replaced, the directory rebuilt around it.
 *  Table data stays 4-byte aligned and in the directory's own order.
 *
 *  CHECKSUMS ARE NOT RECOMPUTED — neither the per-table `checkSum` in the
 *  directory nor `head.checkSumAdjustment`. Nothing that reads these bytes
 *  verifies them: fontkit parses the tables it needs and pdf-lib re-emits a
 *  subset of its own, and both were confirmed to accept a patched face (see
 *  fontsTracked.test.ts, which embeds one and reads its widths back out).
 *  `widenAdvances` above leaves them alone for the same reason. */
function replaceSfntTable(bytes: Uint8Array, tag: string, table: Uint8Array): Uint8Array | null {
  const d = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const tables = sfntTables(d)
  if (!tables || !tables.has(tag)) return null
  const numTables = d.getUint16(4)
  const entries: Array<{ tag: string; data: Uint8Array; checkSum: number }> = []
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16
    let t = ''
    for (let j = 0; j < 4; j++) t += String.fromCharCode(d.getUint8(rec + j))
    const checkSum = d.getUint32(rec + 4)
    const offset = d.getUint32(rec + 8)
    const length = d.getUint32(rec + 12)
    if (offset + length > bytes.byteLength) return null
    entries.push({ tag: t, data: t === tag ? table : bytes.subarray(offset, offset + length), checkSum })
  }
  const pad = (n: number): number => (n + 3) & ~3
  let total = 12 + numTables * 16
  for (const e of entries) total += pad(e.data.byteLength)
  const out = new Uint8Array(total)
  const o = new DataView(out.buffer)
  out.set(bytes.subarray(0, 12), 0)
  let at = 12 + numTables * 16
  for (let i = 0; i < entries.length; i++) {
    const rec = 12 + i * 16
    for (let j = 0; j < 4; j++) o.setUint8(rec + j, entries[i].tag.charCodeAt(j))
    o.setUint32(rec + 4, entries[i].checkSum)
    o.setUint32(rec + 8, at)
    o.setUint32(rec + 12, entries[i].data.byteLength)
    out.set(entries[i].data, at)
    at += pad(entries[i].data.byteLength)
  }
  return out
}

/**
 * The same font cut as REAL SMALL CAPITALS: every lowercase letter draws its
 * capital's glyph, and keeps its own lowercase character.
 *
 * None of the 118 self-hosted families carries an OpenType `smcp`, so Chromium
 * synthesizes `font-variant: small-caps` by drawing each lowercase letter as
 * its UPPERCASE glyph at a reduced size. The exporter has to say the same
 * thing in the file, and the obvious way — uppercase the string and draw that
 * — changes what the file SAYS: a heading the page shows as "Sᴜᴍᴍᴀʀʏ"
 * extracted as "SUMMARY", the name on aurum-editorial as "ALEX MORGAN", and
 * marquee's skill-group label as "LANGUAGES", which a parser reads as a
 * LANGUAGES section heading and not a group name.
 *
 * A real small-caps font does not work that way, and neither does this. Only
 * the `cmap` changes: each lowercase letter whose uppercase counterpart is a
 * SINGLE code point in the font maps to the UPPERCASE glyph's id, and that
 * uppercase code point is then DROPPED from the map. Two consequences, both
 * load-bearing:
 *   - fontkit resolves characters through the cmap, so `layout('anguages')`
 *     on this cut returns the capitals' glyph ids, with the capitals' widths.
 *   - pdf-lib writes `ToUnicode` from each glyph's REVERSE mapping, and with
 *     the uppercase code point gone each capital glyph has exactly one code
 *     point — the lowercase letter. So every extractor reads "Languages".
 *
 * A letter whose uppercase is more than one code point (ß, ﬁ) is left alone
 * and draws its own lowercase glyph at the reduced size; the alternative is
 * inventing a two-glyph substitution no cmap can express.
 *
 * Returns null for a face this cannot rewrite (no format 4 subtable, an
 * unparseable directory), which the caller reads as "no small-caps cut" — see
 * `PdfFontCache.smallCapsFont`.
 */
export function smallCapsVariant(bytes: Uint8Array): Uint8Array | null {
  const d = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const map = readCmap4(d)
  if (!map) return null
  const next = new Map(map)
  const dropped: number[] = []
  for (const [cp] of map) {
    const ch = String.fromCodePoint(cp)
    const upper = ch.toUpperCase()
    if (upper === ch || [...upper].length !== 1) continue
    const uc = upper.codePointAt(0)!
    const gid = map.get(uc)
    if (gid === undefined) continue
    next.set(cp, gid)
    dropped.push(uc)
  }
  if (!dropped.length) return null
  for (const uc of dropped) next.delete(uc)
  const table = buildCmap4(next)
  return replaceSfntTable(bytes, 'cmap', table)
}

/** Embeds each (family, weight) once per document. */
export class PdfFontCache {
  private cache = new Map<string, Promise<PDFFont>>()
  private smallCapsCache = new Map<string, Promise<PDFFont | null>>()
  private glyphFontCache = new Map<string, Promise<FontkitFont>>()
  private coverageCache = new Map<string, Promise<Array<{ family: string; has: (cp: number) => boolean }>>>()
  private bytesCache = new Map<string, Promise<Uint8Array>>()
  constructor(
    private doc: PDFDocument,
    private index: Record<string, string>
  ) {}

  /**
   * The embedded font for (family, weight) — or, when `trackingEm` is nonzero,
   * a per-(family, weight, trackingEm) VARIANT of it whose advance widths carry
   * the tracking (see `widenAdvances`). One embed per distinct variant per
   * document, same as the plain cut; a résumé uses a handful at most (a
   * section title's tracking, a name's negative tracking, and the reduced size
   * a small-caps piece needs), and each is subset to the glyphs it draws.
   */
  embed(family: string, weight: number, trackingEm = 0): Promise<PDFFont> {
    const key = this.resolve(family, weight)
    if (!key) throw new PdfFontMissingError(`no static font for ${family} ${weight}`)
    // Keyed on the tracking the caller asked for, quantised at 1e-5 em. That
    // is FINER than the font-unit delta the bytes are actually cut at, so two
    // trackings a hair apart that round to the same hmtx delta get one embed
    // each rather than sharing one - correct, just not maximally thrifty. A
    // resume asks for a handful of distinct trackings in total (a section
    // title's, a name's, and whatever a reduced small-caps piece works out to),
    // so the cache is doing its job either way.
    const ck = trackingEm ? `${key}|t${Math.round(trackingEm * 1e5)}` : key
    let p = this.cache.get(ck)
    if (!p) {
      p = this.bytesFor(key).then((b) => {
        const upem = trackingEm ? unitsPerEmOf(b) : 0
        const delta = upem ? Math.round(trackingEm * upem) : 0
        return this.doc.embedFont(delta ? widenAdvances(b, delta) : b, { subset: true })
      })
      this.cache.set(ck, p)
    }
    return p
  }

  /**
   * The SMALL-CAPITALS cut of (family, weight) — the same face with a `cmap`
   * that draws each lowercase letter's capital while the letter itself, and
   * everything an extractor reads, stays lowercase (`smallCapsVariant`).
   *
   * `trackingEm` composes with it: a small-caps heading is usually letter-
   * spaced too, so both transforms are applied to the same bytes and the pair
   * is cached as one variant. Cached per (family, weight, trackingEm) like the
   * plain and tracked cuts, and subset to the glyphs it draws.
   *
   * Resolves to NULL when the face carries no cmap this can rewrite; the
   * caller then draws the piece in the ordinary cut with its text uppercased,
   * which is what the page shows but not what it says.
   */
  smallCapsFont(family: string, weight: number, trackingEm = 0): Promise<PDFFont | null> {
    const key = this.resolve(family, weight)
    if (!key) throw new PdfFontMissingError(`no static font for ${family} ${weight}`)
    const ck = `${key}|sc${trackingEm ? `|t${Math.round(trackingEm * 1e5)}` : ''}`
    let p = this.smallCapsCache.get(ck)
    if (!p) {
      p = this.bytesFor(key).then((b) => {
        const caps = smallCapsVariant(b)
        if (!caps) return null
        const upem = trackingEm ? unitsPerEmOf(caps) : 0
        const delta = upem ? Math.round(trackingEm * upem) : 0
        return this.doc.embedFont(delta ? widenAdvances(caps, delta) : caps, { subset: true })
      })
      this.smallCapsCache.set(ck, p)
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
