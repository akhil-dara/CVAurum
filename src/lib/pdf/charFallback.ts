/**
 * Substitutes characters the embedded fonts cannot draw with equivalents they
 * can, so nothing is silently dropped from the exported text.
 *
 * Measured against a real export: a certificate named with a NON-BREAKING
 * HYPHEN - what Word and LinkedIn produce when you paste - came out as
 * "PL300" in the text layer, the hyphen simply gone, and in the author's own
 * file as U+FFFE, a noncharacter. Either way "PL-300" matches nothing a
 * recruiter or an ATS searches for, which is the defect that started this
 * whole line of work.
 *
 * Substitution rather than a font fallback because the glyph is the smaller
 * half of the problem: a character absent from the subset has no ToUnicode
 * entry either, so it leaves the text layer whatever is drawn in its place.
 * Mapping it to the ASCII equivalent fixes the drawing AND the text together.
 *
 * Runs on the print DOM only. The preview renders with system fonts that carry
 * these characters, so it needs nothing; and the author's own data is never
 * modified.
 */

/** Confirmed by probing a real export: U+2013 en dash, U+2212 minus, accented
 *  letters and curly quotes all survive. These do not. */
const SUBSTITUTIONS: Array<[RegExp, string]> = [
  // Hyphens the subsets lack, all of which mean "-" to a reader.
  [/[\u2010\u2011\u2012\u2043]/g, '-'],
  // Spaces that are not U+0020. A no-break space already degrades to a space;
  // making it explicit keeps the text layer identical to what is drawn.
  [/[\u00a0\u2007\u2008\u2009\u200a\u202f]/g, ' '],
  // Invisible marks: a soft hyphen is a break HINT, never a character, and the
  // zero-width family only ever adds noise to extracted text - except the
  // joiners inside Arabic-script words (`keepJoiner` below).
  [/[\u00ad\u200b\u200c\u200d\ufeff]/g, ''],
]

/** Arabic-script letters and digits (the BOM, U+FEFF, excluded). */
const ARABIC_SCRIPT = /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\ufb50-\ufdff\ufe70-\ufefc]/

/**
 * A zero-width non-joiner (U+200C) or joiner (U+200D) right beside an
 * Arabic-script letter is part of how the word is SPELT, not noise: in
 * "\u0646\u0648\u0631\u06cc\u200c\u0632\u0627\u062f\u0647" the ZWNJ is what keeps \u06cc from joining \u0632. Dropping it from the
 * print DOM made the browser join the two letters, the walker measured the
 * joined word, and the file read "\u0646\u0648\u0631\u06cc\u0632\u0627\u062f\u0647". The painter draws it at zero
 * width (directedText.ts). Next to anything else it goes as before, so a
 * resume with no Arabic script is untouched.
 */
function keepJoiner(text: string, at: number): boolean {
  const ch = text.charCodeAt(at)
  if (ch !== 0x200c && ch !== 0x200d) return false
  return ARABIC_SCRIPT.test(text.charAt(at - 1)) || ARABIC_SCRIPT.test(text.charAt(at + 1))
}

/** True when `text` contains anything this module would change. */
export function needsFallback(text: string): boolean {
  return SUBSTITUTIONS.some(([re]) => {
    re.lastIndex = 0
    return re.test(text)
  })
}

/** The text with every unsupported character replaced. */
export function applyCharFallback(text: string): string {
  let out = text
  for (const [re, to] of SUBSTITUTIONS) {
    out = to === '' ? out.replace(re, (m: string, at: number, all: string) => (keepJoiner(all, at) ? m : '')) : out.replace(re, to)
  }
  return out
}

/** Rewrites every text node under `root` in place. */
export function substituteUnsupportedChars(root: Element): void {
  const doc = root.ownerDocument
  if (!doc) return
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node: Node | null
  while ((node = walker.nextNode())) {
    const text = node as Text
    if (!needsFallback(text.data)) continue
    // A Persian word's joiners pass the test above and survive the rewrite;
    // a node the rewrite leaves as it was is left alone.
    const next = applyCharFallback(text.data)
    if (next !== text.data) text.data = next
  }
}
