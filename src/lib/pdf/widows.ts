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
 * For a paragraph of `lineCount` visual lines, returns a flag per line:
 * `true` means a page break must NOT fall immediately after that line.
 *
 * The last line is never flagged — breaking after a COMPLETE paragraph is
 * always fine, and flagging it would glue the paragraph to whatever follows.
 */
export function keepFlagsForParagraph(lineCount: number, minLines = MIN_PARAGRAPH_LINES): boolean[] {
  const flags: boolean[] = []
  for (let i = 0; i < lineCount; i++) {
    const isLast = i === lineCount - 1
    const linesBefore = i + 1
    const linesAfter = lineCount - linesBefore
    flags.push(isLast ? false : linesBefore < minLines || linesAfter < minLines)
  }
  return flags
}
