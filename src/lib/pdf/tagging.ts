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
  /** Column of origin; drives logical ordering (see `buildStructure`). */
  column?: 'main' | 'aside'
  /** The logical block (paragraph, bullet, heading) this mark belongs to.
   *  Shared by every visual line of that block - see `buildStructure`. */
  blockId?: number
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
 * Logical reading order, which is NOT always paint order.
 *
 * On a left-sidebar template the aside column is painted first, so the
 * document's first heading would be a sidebar H2 and the person's name (H1)
 * would come after it — a screen reader would read "Skills" before the
 * candidate's name, and PDF/UA-1 7.4.2 rejects it outright ("heading level 1
 * is skipped"). The structure tree exists precisely to state the logical
 * order independently of the visual one, so main-column content leads.
 *
 * That ordering spans the WHOLE DOCUMENT, not each page (2026-08-23). A
 * page's content stream can only hold that page's own text, so a copied
 * two-column PDF necessarily reads main-then-sidebar page by page - which
 * drops the entire sidebar into the middle of a job's bullets, and reads as
 * the experience section being interrupted. The structure tree has no such
 * limit, and ordering it across pages does NOT disturb /Pg: every element
 * names its own page individually. A structure-aware reader therefore gets
 * the whole main column, then the whole sidebar.
 *
 * Naive extractors - most ATS, `pdftotext`, pdf.js's getTextContent - read
 * the content stream and are unaffected; this is for readers that honour the
 * tree, which is what the tagging exists for.
 *
 * Stable within each column, so each keeps its own page-then-paint order.
 */
function readingOrder(marks: TaggedMark[]): TaggedMark[] {
  const byPage = (a: TaggedMark, b: TaggedMark) => a.pageIndex - b.pageIndex
  const stable = (list: TaggedMark[]) =>
    list
      .map((m, i) => ({ m, i }))
      .sort((x, y) => byPage(x.m, y.m) || x.i - y.i)
      .map((x) => x.m)
  return [...stable(marks.filter((m) => m.column !== 'aside')), ...stable(marks.filter((m) => m.column === 'aside'))]
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
  let lastBlockId: number | undefined
  for (const m of readingOrder(marks)) {
    if (m.role === 'Artifact') continue // never in the tree
    if (m.role === 'LI') {
      // One list item per BULLET, not per visual line. A bullet wraps, and
      // carries bold runs inside it, so it arrives as several marks; giving
      // each its own LI turned one bullet into three ("Designed and own the"
      // / "Operational View" / "dashboards in Spotfire"). Bullets are most of
      // a resume, so this is where per-line tagging hurts most.
      const open = list && list.pageIndex === m.pageIndex ? list.children![list.children!.length - 1] : undefined
      if (open && m.blockId !== undefined && lastBlockId === m.blockId) {
        open.mcids.push(m.mcid)
        continue
      }
      lastBlockId = m.blockId
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
    // One element per PARAGRAPH, not per visual line. A wrapped paragraph
    // reaches here as one mark per line; emitting an element for each told
    // readers that every line was its own paragraph, so Acrobat's copy and
    // reflow - and any structure-aware parser - broke the sentence at each
    // wrap. Measured on a real export: 128 `/P` for ~25 paragraphs.
    //
    // Merging stops at a page boundary because a structure element names ONE
    // page (/Pg) and MCIDs are numbered per page, and at a role change so a
    // heading never absorbs the text beneath it.
    const prev = out[out.length - 1]
    if (
      prev &&
      m.blockId !== undefined &&
      lastBlockId === m.blockId &&
      prev.role === m.role &&
      prev.pageIndex === m.pageIndex &&
      !prev.children
    ) {
      prev.mcids.push(m.mcid)
      continue
    }
    lastBlockId = m.blockId
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
