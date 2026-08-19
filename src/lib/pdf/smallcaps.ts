/**
 * Synthetic small-caps support for the painter.
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
 * Only the VISIBLE layer changes. The extractable text layer keeps the source
 * string in its natural case ("Summary"), exactly as `innerText` reports it —
 * so what an ATS reads is unchanged by this file.
 */

export interface SmallCapsSegment {
  /** Always uppercase — what the painter actually draws. */
  text: string
  /** True when this segment was lowercase in the source: draw it smaller. */
  reduced: boolean
}

/**
 * Splits text into consecutive runs of "was lowercase" (drawn as uppercase at
 * the reduced size) and "was not" (drawn as-is at the full size).
 */
export function smallCapsSegments(text: string): SmallCapsSegment[] {
  const out: SmallCapsSegment[] = []
  for (const ch of text) {
    // A character is "cased lowercase" when uppercasing actually changes it.
    const upper = ch.toUpperCase()
    const reduced = upper !== ch
    const last = out[out.length - 1]
    if (last && last.reduced === reduced) last.text += upper
    else out.push({ text: upper, reduced })
  }
  return out
}
