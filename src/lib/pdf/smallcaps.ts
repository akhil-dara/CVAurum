/**
 * Small-caps support for the painter.
 *
 * `font-variant: small-caps` is set by six templates (classic, vector,
 * aurum-editorial, ivy, academic, newton) on `.rm-section-title`, and by
 * aurum-editorial on `.rm-name`. NONE of the 118 self-hosted font files
 * carries a real OpenType `smcp` feature (verified by opening every one with
 * fontkit), so Chromium always synthesizes the effect: each lowercase letter
 * is drawn as its UPPERCASE glyph at a reduced font size, while characters
 * with no case — spaces, digits, punctuation, symbols — keep the full size.
 *
 * The exporter ignored the property entirely, so a heading the editor drew as
 * "Sᴜᴍᴍᴀʀʏ" exported as plain "Summary" (2026-08-19 user report).
 *
 * This file answers only the SIZE half: where the run changes size, which is
 * where one text-showing operator has to become two. The CASE half is not a
 * string transform at all — the reduced pieces are drawn with their own
 * lowercase text in a small-caps CUT of the face, whose `cmap` maps each
 * lowercase letter to its capital's glyph (fonts.ts's `smallCapsVariant`). So
 * the drawn shapes are capitals and the extractable text layer keeps the
 * source string in its natural case: an ATS still reads "Summary", and
 * marquee's skill-group label still reads "Languages" rather than announcing
 * a LANGUAGES section.
 */

export interface SmallCapsSegment {
  /** The SOURCE text, in its own case — what is drawn, and what is read. */
  text: string
  /** True when this segment was lowercase in the source: draw it smaller, in
   *  the small-caps cut of the face. */
  reduced: boolean
}

/**
 * Splits text into consecutive runs of "was lowercase" (drawn at the reduced
 * size, in the small-caps cut) and "was not" (drawn as-is at the full size).
 *
 * A letter counts as lowercase when uppercasing it changes it at all —
 * including ß and the ligatures, whose uppercase is more than one character.
 * Those get the reduced SIZE but keep their own shape, because no cmap can
 * express a one-to-two substitution; Chromium draws them small too.
 */
export function smallCapsSegments(text: string): SmallCapsSegment[] {
  const out: SmallCapsSegment[] = []
  for (const ch of text) {
    // A character is "cased lowercase" when uppercasing actually changes it.
    const reduced = ch.toUpperCase() !== ch
    const last = out[out.length - 1]
    if (last && last.reduced === reduced) last.text += ch
    else out.push({ text: ch, reduced })
  }
  return out
}
