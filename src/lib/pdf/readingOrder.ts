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

/**
 * Per PAGE, put the sidebar's text first when doing so REJOINS a section the
 * page break split - and only then.
 *
 * `mainColumnTextFirst` is right about page one: the candidate's name has to
 * be the first thing a parser reads. Applied to every page it has a cost that
 * only shows up in multi-page documents. Measured on a real two-column resume
 * at line-height 1.95, the text layer read
 *
 *   ... SKILLS, <half the skills>, | EDUCATION, <education>, <rest of skills>
 *
 * so the tail of the skills list arrives AFTER the EDUCATION heading, and a
 * parser - which files text under the last heading it saw - files those skills
 * under Education. That is the "skills and experience all mixed up" report:
 * the characters are all present and in the right columns, but they are
 * attributed to the wrong section.
 *
 * Emitting the sidebar first on that page joins the two halves of the skills
 * list back together, and costs nothing on the main column because the main
 * column opens with its own heading.
 *
 * The rule is deliberately narrow. A page is reordered only when
 *   - it is not the first page (page one must lead with the name), AND
 *   - the sidebar's first text there is NOT a heading - it continues a
 *     section that began on an earlier page, so it has something to rejoin.
 *
 * Working through what each order costs, with K for a sidebar section and E
 * for a main one, both split across the break:
 *
 *   main first    S E1 K1 | E2 D K2 L    E2 misfiled, K2 misfiled
 *   sidebar first S E1 K1 | K2 L E2 D    K2 rejoins K1; E2 still misfiled
 *
 * The main column's continuation is misfiled either way - nothing can put it
 * next to its own first half, because the other column's page-one text sits
 * between them and page order is fixed. So flipping is never worse, and is
 * better whenever the sidebar is the column that continues. When the sidebar
 * instead starts a fresh section on the page there is nothing to rejoin and
 * the page is left alone.
 *
 * Pages that are not reordered are returned by REFERENCE, so anything that
 * does not meet both conditions is byte-identical to before.
 */
export function sidebarFirstOnContinuationPages(pages: DrawOp[][]): DrawOp[][] {
  const isMainText = (op: DrawOp) => op.kind === 'text' && op.column !== 'aside' && !op.run.isDecorative
  const isHeading = (op: DrawOp) => op.kind === 'text' && op.role === 'H2'

  let changed = false
  const out = pages.map((ops, pageIndex) => {
    if (pageIndex === 0) return ops
    const firstAside = ops.find(isAsideText)
    if (!firstAside || isHeading(firstAside)) return ops
    if (!ops.some(isMainText)) return ops

    // Move ONLY the sidebar's own text, and only as far as the main column's
    // first text - so every rect, image and decoration keeps both its place
    // and its painting order relative to the text that sits on it.
    const aside = ops.filter(isAsideText)
    const kept = ops.filter((op) => !isAsideText(op))
    const insertAt = kept.findIndex(isMainText)
    changed = true
    return [...kept.slice(0, insertAt), ...aside, ...kept.slice(insertAt)]
  })
  return changed ? out : pages
}
