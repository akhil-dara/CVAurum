/**
 * ATS reading order for two-column layouts (2026-08-19).
 *
 * A two-column résumé is painted in DOM order, so a LEFT-sidebar template
 * emits the sidebar's text first — and the text layer is what an applicant
 * tracking system reads. Measured on our own export: an ATS parsing a
 * sapphire résumé saw
 *
 *   "SKILLS / Languages / TypeScript / Go / Python / …"
 *
 * before the candidate's name. A reference two-column résumé from a
 * commercial builder (measured the same way) extracts main column first —
 * name, title, summary, experience — and only then the sidebar, per page.
 *
 * Fixing this is pure bookkeeping: every op carries absolute coordinates, so
 * moving the sidebar's TEXT after the main column's text changes what a
 * parser reads without moving a single glyph on the page. Only text is
 * reordered; backgrounds, rules and other decoration keep their positions,
 * so anything that must paint UNDER the sidebar's text still does.
 *
 * Page assignment happens later and is stable, so per page the order stays
 * main-then-aside for multi-page documents too.
 */
import type { DrawOp } from './types'

/** True for a real-content text op that belongs to the sidebar column. */
function isAsideText(op: DrawOp): boolean {
  return op.kind === 'text' && op.column === 'aside' && !op.run.isDecorative
}

/**
 * Returns `ops` with sidebar text moved after everything else, preserving
 * relative order within both groups. Returns the SAME array reference when
 * there is no sidebar text at all (every single-column document), so the
 * common path allocates nothing and stays byte-identical.
 */
export function mainColumnTextFirst(ops: DrawOp[]): DrawOp[] {
  let found = false
  for (const op of ops) {
    if (isAsideText(op)) {
      found = true
      break
    }
  }
  if (!found) return ops
  const rest: DrawOp[] = []
  const aside: DrawOp[] = []
  for (const op of ops) (isAsideText(op) ? aside : rest).push(op)
  return [...rest, ...aside]
}
