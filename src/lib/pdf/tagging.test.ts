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
