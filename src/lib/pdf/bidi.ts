// The Unicode Bidi Algorithm (UAX#9) for the native PDF renderer, via bidi-js.
//
// This is the only module that imports bidi-js. Callers on the export path load
// it dynamically, and only when a document has Arabic-script text, so a resume
// without it never pays for the bidi tables.
import bidiFactory from 'bidi-js'

/** A stretch of text, in logical order, whose characters all resolve to one direction. */
export type BidiRun = { start: number; end: number; rtl: boolean }

const bidi = bidiFactory()

/**
 * Splits `text` into maximal runs of equal embedding-level parity, in logical
 * order, covering the text exactly. Offsets are UTF-16 indices, so
 * `text.slice(run.start, run.end)` is the run's text.
 */
export function bidiRuns(text: string, base: 'rtl' | 'ltr'): BidiRun[] {
  if (text.length === 0) return []
  const { levels } = bidi.getEmbeddingLevels(text, base)
  const runs: BidiRun[] = []
  let start = 0
  let rtl = (levels[0] & 1) === 1
  for (let i = 1; i < text.length; i++) {
    const here = (levels[i] & 1) === 1
    if (here !== rtl) {
      runs.push({ start, end: i, rtl })
      start = i
      rtl = here
    }
  }
  runs.push({ start, end: text.length, rtl })
  return runs
}

/** Swaps each Bidi_Mirrored character for its mirror, as an rtl run needs before it is reversed. */
export function mirrorForRtl(text: string): string {
  let out = ''
  for (const ch of text) out += bidi.getMirroredCharacter(ch) ?? ch
  return out
}

/** True when `text` holds a strong right-to-left character (bidi class R or AL). */
export function hasStrongRtl(text: string): boolean {
  for (const ch of text) {
    const type = bidi.getBidiCharTypeName(ch)
    if (type === 'R' || type === 'AL') return true
  }
  return false
}
