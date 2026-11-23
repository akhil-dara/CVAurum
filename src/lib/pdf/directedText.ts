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
 * ids it keeps for the subset are exactly the ones drawn. A font with no
 * fontkit font behind it (a standard font) runs `fn` unchanged.
 *
 * `fn` must be synchronous: the layout is restored when it returns.
 */
export function withDirection<T>(font: PDFFont, direction: ShapingDirection, fn: () => T): T {
  const embedder = (font as unknown as { embedder?: { font?: FkFont } }).embedder
  const fk = embedder?.font
  if (!fk || typeof fk.layout !== 'function') return fn()
  const hadOwn = Object.prototype.hasOwnProperty.call(fk, 'layout')
  const previous = fk.layout
  const script = scriptFor(direction)
  fk.layout = function directed(this: FkFont, text: string, features?: unknown) {
    return keepJoiners(fk, previous.call(this, text, features, script, undefined, direction), text)
  }
  try {
    return fn()
  } finally {
    if (hadOwn) fk.layout = previous
    else delete (fk as Partial<FkFont>).layout
  }
}
