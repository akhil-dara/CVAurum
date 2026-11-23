// Shaping a run in its own direction, for the native PDF painter.
//
// pdf-lib draws and measures text through its font embedder, which calls the
// fontkit font's `layout(text, features)` and nothing more: no script, no
// direction. fontkit then guesses both per string, and the guess is wrong for
// the one case a right-to-left resume always has. A run of Persian DIGITS
// ('۱۴۰۲') is detected as Arabic script and so reversed, while the walker
// (text.ts) has already resolved it, by the Unicode Bidi Algorithm, as a
// left-to-right run that must be drawn in reading order. So the painter says
// the direction itself, by wrapping the embedder's `layout` for the length of
// one draw or measure (`withDirection`).
//
// The same wrapper keeps the zero-width joiners. fontkit hides every default-
// ignorable character after shaping by swapping its glyph for the SPACE glyph
// at zero advance - but pdf-lib does not use fontkit's advances: it writes
// each glyph's own width into the file. A hidden U+200C was therefore drawn as
// a full space (and read back as one). `keepJoiners` puts the font's own
// zero-width joiner glyph back, or drops the glyph when the font has none.
//
// Latin text never comes here: `shapingDirection` is null for a run with no
// Arabic-script character and no direction, and the painter then takes its
// old call unchanged.
import type { PDFFont } from 'pdf-lib'
import type { TextRun } from './types'
import { mirrorRtl } from './text'

export type ShapingDirection = 'rtl' | 'ltr'

/** Arabic-script letters and digits: the Arabic blocks and their presentation forms (U+FEFF, the BOM, excluded). */
const ARABIC_SCRIPT = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-ﻼ]/

/**
 * How the painter shapes `run`: 'rtl' for a right-to-left run (text.ts sets
 * `direction`), 'ltr' for any other run holding an Arabic-script character
 * (the digits bidi resolved left-to-right inside a right-to-left line), and
 * null for everything else, which is drawn exactly as it always was.
 */
export function shapingDirection(run: Pick<TextRun, 'text' | 'direction'>): ShapingDirection | null {
  if (run.direction === 'rtl') return 'rtl'
  return ARABIC_SCRIPT.test(run.text) ? 'ltr' : null
}

/** The fontkit script tag the layout is asked for: Arabic for rtl, Latin for ltr (digits keep their order under it). */
const scriptFor = (direction: ShapingDirection) => (direction === 'rtl' ? 'arab' : 'latn')

/** The default-ignorable characters fontkit hides after shaping (its `isDefaultIgnorable`), in logical order. */
const DEFAULT_IGNORABLE =
  /[­͏؜឴឵᠋-᠎​-‏‪-‮⁠-⁯︀-️﻿￰-￸]|\uD82F[\uDCA0-\uDCA3]|\uD834[\uDD73-\uDD7A]|[\uDB40-\uDB43][\uDC00-\uDFFF]/g

const ZWNJ = 0x200c
const ZWJ = 0x200d

/** The slice of a fontkit glyph this module reads. */
interface FkGlyph {
  id: number
  advanceWidth: number
  codePoints?: number[]
}
/** The slice of a fontkit glyph run this module reads and rewrites. */
interface FkGlyphRun {
  glyphs: FkGlyph[]
  positions: Array<{ xAdvance: number; yAdvance: number }>
  direction?: string
}
/** The slice of a fontkit font this module reads. */
interface FkFont {
  layout: (text: string, features?: unknown, script?: string, language?: string, direction?: string) => FkGlyphRun
  glyphForCodePoint: (cp: number) => FkGlyph
}

/**
 * Undoes fontkit's hiding of U+200C and U+200D in a shaped run, in place.
 *
 * Every glyph fontkit hid is the space glyph at zero advance; the characters
 * it hid are the string's default ignorables, in logical order (reversed in a
 * right-to-left run, whose glyphs fontkit reverses before hiding). A joiner
 * gets the font's own glyph back when that glyph has zero width, which draws
 * nothing and reads back as the joiner. Any other hidden glyph, and a joiner
 * the font cannot draw at zero width, is removed: it draws nothing and adds no
 * advance, where the space glyph pdf-lib would write adds a whole space.
 */
export function keepJoiners(font: FkFont, run: FkGlyphRun, text: string): FkGlyphRun {
  const space = font.glyphForCodePoint(0x20)
  const hidden: number[] = []
  for (let i = 0; i < run.glyphs.length; i++) {
    const pos = run.positions[i]
    if (run.glyphs[i].id === space.id && pos && pos.xAdvance === 0 && pos.yAdvance === 0) hidden.push(i)
  }
  if (!hidden.length) return run
  const chars = text.match(DEFAULT_IGNORABLE) ?? []
  if (run.direction === 'rtl') chars.reverse()
  // Only trusted when the counts agree; otherwise every hidden glyph is
  // simply removed, which is never worse than a space where none was typed.
  const known = chars.length === hidden.length
  const drop = new Set<number>()
  hidden.forEach((at, k) => {
    const cp = known ? chars[k].codePointAt(0) : undefined
    if (cp === ZWNJ || cp === ZWJ) {
      const own = font.glyphForCodePoint(cp)
      if (own && own.id !== 0 && own.advanceWidth === 0) {
        run.glyphs[at] = own
        return
      }
    }
    drop.add(at)
  })
  if (drop.size) {
    run.glyphs = run.glyphs.filter((_, i) => !drop.has(i))
    run.positions = run.positions.filter((_, i) => !drop.has(i))
  }
  return run
}

/**
 * fontkit's `layout` for `text` in `direction`, joiners kept: the decorative
 * (vector outline) path's twin of what `withDirection` does inside pdf-lib.
 * With a null direction it is the plain `font.layout(text)`.
 */
export function directedLayout<R>(font: { layout: (text: string) => R }, text: string, direction: ShapingDirection | null): R {
  if (!direction) return font.layout(text)
  const fk = font as unknown as FkFont
  return keepJoiners(fk, fk.layout(text, undefined, scriptFor(direction), undefined, direction), text) as unknown as R
}

/** Where a twin glyph's key starts: past any glyph id a font can have (16-bit). */
export const TWIN_KEY_BASE = 0x10000

/** The slice of fontkit's subset (a TTF subset) that `twinSlot` extends. */
interface FkSubset {
  glyphs: number[]
  includeGlyph: (glyph: number | { id: number }) => number
  glyphEncoder?: unknown
  cvaTwins?: Map<number, number>
}

/**
 * Lets `subset` hold a second copy of a glyph: a glyph object carrying
 * `cvaTwinOf` (the original id) gets a slot of its own, the same outline and
 * advance under another subset id, so that id can carry another ToUnicode
 * entry. Installed once per subset; every other glyph takes fontkit's own
 * path. False for a subset this cannot extend (anything but a TrueType one).
 */
function twinSlots(subset: FkSubset | undefined): boolean {
  if (!subset || !Array.isArray(subset.glyphs) || subset.glyphEncoder === undefined) return false
  if (subset.cvaTwins) return true
  const twins = new Map<number, number>()
  const own = subset.includeGlyph
  subset.cvaTwins = twins
  subset.includeGlyph = function (this: FkSubset, glyph) {
    const of = typeof glyph === 'object' ? (glyph as { cvaTwinOf?: number }).cvaTwinOf : undefined
    if (of === undefined) return own.call(this, glyph)
    let at = twins.get(of)
    if (at === undefined) {
      this.glyphs.push(of)
      at = this.glyphs.length - 1
      twins.set(of, at)
    }
    return at
  }
  return true
}

/**
 * The glyphs of a shaped right-to-left run, as the text layer must name them.
 *
 * pdf-lib writes each glyph's ToUnicode from the glyph's `codePoints`, and
 * every extractor in use (pdf.js, poppler) reads a run's glyphs left to right
 * as drawn, then turns the right-to-left stretch around character by
 * character. Two kinds of glyph come out wrong under that:
 *   - a LIGATURE (lam-alef) names its letters in logical order, لا, which the
 *     reversal turns into ال: "کالا" read back as "کاال". It is named in
 *     drawn order instead, so the reversal restores it.
 *   - a MIRRORED bracket: the run was mirrored before shaping (paint.ts
 *     mirrorRtl), so the glyph drawn for a typed "(" is the ")" glyph, named
 *     ")": "(مادری)" read back as ")مادری(". It is named by the character
 *     the author typed. One glyph id carries one name, and the same bracket
 *     drawn left to right must keep its own, so the mirrored use is drawn
 *     from a TWIN of the glyph (`twinSlots`): the same outline under its own
 *     subset id. Where the subset cannot hold a twin the name is left as it
 *     was.
 * Every other glyph is returned as it is.
 */
function textLayerGlyphs(glyphs: FkGlyph[], subset: FkSubset | undefined): FkGlyph[] {
  let twins: boolean | null = null
  return glyphs.map((g) => {
    const cps = g.codePoints
    if (!cps || !cps.length) return g
    if (cps.length > 1) return Object.create(g, { codePoints: { value: [...cps].reverse() } }) as FkGlyph
    const drawn = String.fromCodePoint(cps[0])
    const typed = mirrorRtl(drawn)
    if (typed === drawn) return g
    twins ??= twinSlots(subset)
    if (!twins) return g
    return Object.create(g, {
      // Its own key for pdf-lib's (glyph id -> subset id) map, and the
      // original's advance and id for everything that measures it.
      id: { value: TWIN_KEY_BASE + g.id },
      advanceWidth: { value: g.advanceWidth },
      cvaTwinOf: { value: g.id },
      codePoints: { value: [...typed].map((c) => c.codePointAt(0) ?? 0) },
    }) as FkGlyph
  })
}

/**
 * Runs `fn` with `font` shaping in `direction`: every `encodeText` and
 * `widthOfTextAtSize` it makes lays the text out with fontkit
 * `layout(text, features, script, undefined, direction)`, script 'arab' for
 * rtl and 'latn' for ltr, joiners kept (`keepJoiners`).
 *
 * The hook is the narrowest pdf-lib offers: both of its custom-font embedders
 * (CustomFontEmbedder and the subsetting CustomFontSubsetEmbedder) hold one
 * fontkit font of their own and call `this.font.layout(text, this.fontFeatures)`
 * from `encodeText` and `widthOfTextAtSize`. An own `layout` is set on THAT
 * font object for the length of `fn` and taken off again afterwards, also when
 * `fn` throws, so nothing changes for any other font or any later call. The
 * subset embedder records the glyphs the wrapped layout returns, so the glyph
 * ids it keeps for the subset are exactly the ones drawn. A right-to-left
 * run's glyphs are also renamed for the text layer (`textLayerGlyphs`), so a
 * ligature and a mirrored bracket read back as typed. A font with no
 * fontkit font behind it (a standard font) runs `fn` unchanged.
 *
 * `fn` must be synchronous: the layout is restored when it returns.
 */
export function withDirection<T>(font: PDFFont, direction: ShapingDirection, fn: () => T): T {
  const embedder = (font as unknown as { embedder?: { font?: FkFont; subset?: FkSubset } }).embedder
  const fk = embedder?.font
  if (!fk || typeof fk.layout !== 'function') return fn()
  const hadOwn = Object.prototype.hasOwnProperty.call(fk, 'layout')
  const previous = fk.layout
  // fontkit's own layout, under any direction an outer call set: a nested
  // call shapes in ITS direction, not the outer one's.
  const base = (previous as { cvaBase?: FkFont['layout'] }).cvaBase ?? previous
  const script = scriptFor(direction)
  const directed = function directed(this: FkFont, text: string, features?: unknown) {
    const run = keepJoiners(fk, base.call(this, text, features, script, undefined, direction), text)
    if (direction === 'rtl') run.glyphs = textLayerGlyphs(run.glyphs, embedder?.subset)
    return run
  }
  ;(directed as { cvaBase?: FkFont['layout'] }).cvaBase = base
  fk.layout = directed
  try {
    return fn()
  } finally {
    if (hadOwn) fk.layout = previous
    else delete (fk as Partial<FkFont>).layout
  }
}
