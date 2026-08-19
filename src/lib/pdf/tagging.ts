/**
 * Tagged-PDF structure (2026-08-19 user request: "fully accessible").
 *
 * A tagged PDF carries a STRUCTURE TREE alongside the painted marks: a
 * document outline of headings, paragraphs and lists whose leaves point at
 * the exact pieces of the content stream that draw them. Screen readers use
 * it to announce "heading level 2, Experience" instead of guessing from font
 * sizes, and it is what PDF/UA (and PDF/A level A) require.
 *
 * Two halves live in two places, joined by an MCID (marked-content id):
 *  - the CONTENT STREAM half — `/H2 <</MCID 4>> BDC … EMC` around the drawing
 *    operators, or `/Artifact BDC … EMC` for decoration a reader must skip
 *    (paint.ts);
 *  - the TREE half — StructTreeRoot -> Document -> H1/H2/P/L/LI/Figure
 *    elements, each naming its page and its MCIDs, plus the ParentTree that
 *    lets a reader walk back from a mark to its element (this file).
 *
 * Role derivation is deliberately DOM-driven rather than heuristic: the
 * templates already carry the semantics we need in their class names, so a
 * heading is whatever the résumé renders as a heading, on all 52 templates.
 */
import type { TagRole } from './types'

/** Class names the templates use, mapped to the structure type they mean. */
const ROLE_BY_CLASS: { cls: string; role: TagRole }[] = [
  { cls: 'rm-name', role: 'H1' },
  { cls: 'rm-section-title', role: 'H2' },
  { cls: 'rm-item-title', role: 'H3' },
  { cls: 'rm-bullet-row', role: 'LI' },
]

/**
 * The structure type for the element that paints a run of text.
 *
 * Walks up from the text node's own element, so nested markup (a `<strong>`
 * inside a bullet, a `<span>` inside a heading) still resolves to the
 * semantic block it belongs to. Anything unrecognised is a paragraph, which
 * is the correct conservative default: a reader announces it as body text.
 */
export function roleForElement(el: Element | null, root: Element | null = null): TagRole {
  for (let cur: Element | null = el; cur && cur !== root?.parentElement; cur = cur.parentElement) {
    const list = cur.classList
    for (const { cls, role } of ROLE_BY_CLASS) if (list.contains(cls)) return role
    if (cur.tagName === 'LI') return 'LI'
    if (cur.tagName === 'H1') return 'H1'
    if (cur.tagName === 'H2') return 'H2'
    if (cur.tagName === 'H3' || cur.tagName === 'H4') return 'H3'
  }
  return 'P'
}

/** One tagged piece of a page's content stream. */
export interface TaggedMark {
  pageIndex: number
  mcid: number
  role: TagRole
  /** Alternate text — required on Figure, ignored elsewhere. */
  alt?: string
}

/** A structure element ready to be written: its type, page, and the marks it
 *  owns. Kept as plain data so the tree can be built and asserted without a
 *  PDF document. */
export interface StructNode {
  role: TagRole
  pageIndex: number
  mcids: number[]
  alt?: string
  children?: StructNode[]
}

/**
 * Groups marks into the tree a reader walks: consecutive LI marks on a page
 * collapse into one L (list) with an LI per mark, and everything else becomes
 * one element per mark. Order is paint order, which is DOM order, which is
 * the reading order the ATS harness already asserts.
 */
export function buildStructure(marks: TaggedMark[]): StructNode[] {
  const out: StructNode[] = []
  let list: StructNode | null = null
  for (const m of marks) {
    if (m.role === 'Artifact') continue // never in the tree
    if (m.role === 'LI') {
      const li: StructNode = { role: 'LI', pageIndex: m.pageIndex, mcids: [m.mcid] }
      if (list && list.pageIndex === m.pageIndex) {
        list.children!.push(li)
      } else {
        list = { role: 'L', pageIndex: m.pageIndex, mcids: [], children: [li] }
        out.push(list)
      }
      continue
    }
    list = null
    out.push({ role: m.role, pageIndex: m.pageIndex, mcids: [m.mcid], alt: m.alt })
  }
  return out
}

/**
 * The painter's view of the tagger: it opens a marked-content sequence before
 * an op is drawn and closes it after, without knowing anything about
 * structure trees. Implemented by `createTagSink` in structure.ts.
 */
export interface TagSink {
  startPage(pageIndex: number): void
  /** Opens the sequence; returns a token to pass back to `end`, or null when
   *  the op should not be marked at all. */
  begin(page: unknown, op: unknown): object | null
  end(page: unknown, token: object): void
}
