/**
 * Tagged-PDF structure derivation (2026-08-19). Pure halves only — the
 * content-stream half is asserted in paint.test.ts and the whole thing is
 * validated end-to-end against veraPDF's PDF/UA-2 profile by
 * _local/gate-pdfa.cjs.
 */
import { describe, it, expect } from 'vitest'
import { roleForElement, buildStructure, type TaggedMark } from './tagging'

/** Minimal element stub — roleForElement only reads classList/tagName/parent. */
function el(spec: string, parent: Element | null = null): Element {
  const [tag, ...classes] = spec.split('.')
  const set = new Set(classes)
  return {
    tagName: (tag || 'DIV').toUpperCase(),
    classList: { contains: (c: string) => set.has(c) },
    parentElement: parent,
  } as unknown as Element
}

describe('roleForElement', () => {
  it('maps the resume name to a level-1 heading', () => {
    expect(roleForElement(el('h1.rm-name'))).toBe('H1')
  })

  it('maps section titles to level-2 headings', () => {
    expect(roleForElement(el('div.rm-section-title'))).toBe('H2')
  })

  it('maps entry titles to level-3 headings', () => {
    expect(roleForElement(el('div.rm-item-title'))).toBe('H3')
  })

  it('resolves through nested inline markup to the semantic block', () => {
    const heading = el('div.rm-section-title')
    const span = el('span.rm-section-title-text', heading)
    const strong = el('strong', span)
    expect(roleForElement(strong)).toBe('H2')
  })

  it('treats bullets as list items, by class or by tag', () => {
    expect(roleForElement(el('div.rm-bullet-row'))).toBe('LI')
    expect(roleForElement(el('li'))).toBe('LI')
  })

  it('falls back to a paragraph for ordinary body text', () => {
    expect(roleForElement(el('span.rm-item-subtitle'))).toBe('P')
    expect(roleForElement(null)).toBe('P')
  })

  it('stops at the root instead of walking out of the resume', () => {
    const root = el('div.rm-root')
    const inner = el('span', root)
    expect(roleForElement(inner, root)).toBe('P')
  })
})

describe('buildStructure', () => {
  const mark = (role: TaggedMark['role'], mcid: number, pageIndex = 0): TaggedMark => ({ role, mcid, pageIndex })

  it('emits one element per mark, in reading order', () => {
    const tree = buildStructure([mark('H1', 0), mark('P', 1), mark('H2', 2)])
    expect(tree.map((n) => n.role)).toEqual(['H1', 'P', 'H2'])
    expect(tree.map((n) => n.mcids[0])).toEqual([0, 1, 2])
  })

  it('wraps consecutive list items in a single list element', () => {
    const tree = buildStructure([mark('H2', 0), mark('LI', 1), mark('LI', 2), mark('LI', 3), mark('P', 4)])
    expect(tree.map((n) => n.role)).toEqual(['H2', 'L', 'P'])
    expect(tree[1].children!.map((c) => c.role)).toEqual(['LI', 'LI', 'LI'])
    expect(tree[1].children!.map((c) => c.mcids[0])).toEqual([1, 2, 3])
  })

  it('starts a new list when bullets resume after other content', () => {
    const tree = buildStructure([mark('LI', 0), mark('P', 1), mark('LI', 2)])
    expect(tree.map((n) => n.role)).toEqual(['L', 'P', 'L'])
  })

  it('never lets a list span two pages', () => {
    const tree = buildStructure([mark('LI', 0, 0), mark('LI', 1, 1)])
    expect(tree.map((n) => n.role)).toEqual(['L', 'L'])
    expect(tree.map((n) => n.pageIndex)).toEqual([0, 1])
  })

  it('keeps artifacts out of the tree entirely', () => {
    const tree = buildStructure([mark('Artifact', 0), mark('P', 1), mark('Artifact', 2)])
    expect(tree.map((n) => n.role)).toEqual(['P'])
  })

  it('carries alternate text through for figures', () => {
    const tree = buildStructure([{ role: 'Figure', mcid: 0, pageIndex: 0, alt: 'Company logo' }])
    expect(tree[0].alt).toBe('Company logo')
  })
})

describe('buildStructure — logical reading order', () => {
  const m = (role: TaggedMark['role'], mcid: number, column?: 'main' | 'aside', pageIndex = 0): TaggedMark => ({
    role,
    mcid,
    pageIndex,
    column,
  })

  it('puts main-column content before the sidebar, whatever the paint order', () => {
    // A left-sidebar template paints the aside first, so the name (H1) would
    // otherwise follow a sidebar H2 — which PDF/UA-1 7.4.2 rejects and a
    // screen reader would read as "Skills" before the candidate's name.
    const tree = buildStructure([m('H2', 0, 'aside'), m('P', 1, 'aside'), m('H1', 2, 'main'), m('H2', 3, 'main')])
    expect(tree.map((n) => n.role)).toEqual(['H1', 'H2', 'H2', 'P'])
    expect(tree[0].mcids).toEqual([2])
  })

  it('keeps each column in its own paint order', () => {
    const tree = buildStructure([m('P', 0, 'aside'), m('P', 1, 'main'), m('P', 2, 'aside'), m('P', 3, 'main')])
    expect(tree.map((n) => n.mcids[0])).toEqual([1, 3, 0, 2])
  })

  // Changed 2026-08-23: the tree now orders by COLUMN across the whole
  // document, not within each page. The invariant this test was guarding -
  // that an element keeps its own page - never depended on tree order:
  // every element names its own /Pg individually. Ordering across pages is
  // what lets a structure-aware reader take the entire main column before
  // the entire sidebar, instead of having the sidebar interrupt a job's
  // bullets at every page boundary.
  it('carries each element’s own page, whatever the tree order', () => {
    const marks = [m('P', 0, 'aside', 0), m('P', 0, 'main', 1), m('P', 1, 'main', 0)]
    const tree = buildStructure(marks)
    // main column first, each column in page order; pages travel with them.
    expect(tree.map((n) => `${n.pageIndex}:${n.mcids[0]}`)).toEqual(['0:1', '1:0', '0:0'])
  })

  it('leaves single-column documents exactly as painted', () => {
    const tree = buildStructure([m('H1', 0), m('H2', 1), m('P', 2)])
    expect(tree.map((n) => n.mcids[0])).toEqual([0, 1, 2])
  })
})

describe('buildStructure — reading order spans pages (2026-08-23)', () => {
  const mk = (role: TaggedMark['role'], mcid: number, column: 'main' | 'aside', pageIndex: number): TaggedMark => ({
    pageIndex,
    mcid,
    role,
    column,
  })

  // A page's CONTENT STREAM can only hold that page's own text, so a copied
  // two-column PDF necessarily reads main-then-sidebar, page by page - which
  // puts the whole sidebar in the middle of a job's bullets. The structure
  // tree has no such limit: it states the logical order independently, and
  // every element names its own page, so ordering it across pages keeps /Pg
  // correct. A structure-aware reader then gets the entire main column, then
  // the entire sidebar.
  it('reads every page of the main column before any of the sidebar', () => {
    const marks = [
      mk('P', 0, 'main', 0),
      mk('H2', 1, 'aside', 0),
      mk('P', 2, 'main', 1),
      mk('P', 3, 'aside', 1),
    ]
    const nodes = buildStructure(marks)
    expect(nodes.map((n) => `${n.pageIndex}:${n.mcids[0]}`)).toEqual(['0:0', '1:2', '0:1', '1:3'])
  })

  it('keeps each column in page order', () => {
    const marks = [mk('P', 5, 'aside', 1), mk('P', 4, 'aside', 0), mk('P', 1, 'main', 1), mk('P', 0, 'main', 0)]
    const nodes = buildStructure(marks)
    expect(nodes.map((n) => n.mcids[0])).toEqual([0, 1, 4, 5])
  })
})
