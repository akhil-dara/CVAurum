/**
 * Widow and orphan control for page breaks.
 *
 * A wrapped paragraph reaches the paginator as one `line` block per visual
 * line, and any gap between two of them is a legal cut — so a break could
 * leave a single line stranded. Reported 2026-08-23 against a real résumé: a
 * three-line paragraph was split before its last line, putting the lone word
 * "Excel." at the top of page 3.
 *
 * Rather than teach the paginator about paragraphs, this expresses the rule
 * in the vocabulary it already has: `keepWithNext`, which means "this block
 * must not be separated from the next one". That flag is honoured by
 * `buildCandidates` AND propagated by `combineColumns`, so the rule holds for
 * two-column résumés — where the reported break happened — for free.
 */

/** Typographic minimum: never fewer than this many lines of a paragraph on
 *  either side of a page break. Two is the standard floor. */
export const MIN_PARAGRAPH_LINES = 2

/**
 * A paragraph of at most this many lines is never split at all.
 *
 * Two lines either side satisfies the typographic minimum, but on a
 * two-column page it still allows a bullet to be torn in half at a page
 * boundary - and because each page's text layer emits its main column then
 * its sidebar, the ENTIRE sidebar then sits between the two halves when the
 * PDF is copied or parsed: "...cutting manual" [30 lines of skills]
 * "reporting effort by ~40%...". The column order is correct and has nowhere
 * else to put the sidebar, so the fix is not to break the bullet.
 *
 * Bounded deliberately: refusing to split a LONG paragraph would strand whole
 * pages, so anything above this keeps the two-lines-either-side rule.
 */
export const KEEP_WHOLE_MAX_LINES = 4

/**
 * For a paragraph of `lineCount` visual lines, returns a flag per line:
 * `true` means a page break must NOT fall immediately after that line.
 *
 * The last line is never flagged — breaking after a COMPLETE paragraph is
 * always fine, and flagging it would glue the paragraph to whatever follows.
 */
export function keepFlagsForParagraph(lineCount: number, minLines = MIN_PARAGRAPH_LINES): boolean[] {
  const flags: boolean[] = []
  const keepWhole = lineCount <= KEEP_WHOLE_MAX_LINES
  for (let i = 0; i < lineCount; i++) {
    const isLast = i === lineCount - 1
    const linesBefore = i + 1
    const linesAfter = lineCount - linesBefore
    if (isLast) {
      flags.push(false)
      continue
    }
    flags.push(keepWhole || linesBefore < minLines || linesAfter < minLines)
  }
  return flags
}
