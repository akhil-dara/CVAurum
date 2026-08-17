/**
 * Shared reorder helpers (inline-reorder spec, Task A): one implementation the
 * side panel, canvas arrows, and canvas drag all route through, so control
 * surfaces can never diverge on how an order mutation behaves.
 */
import { describe, it, expect } from 'vitest'
import { moveSection, moveSectionTo, moveEntry } from './sections'
import type { Metadata } from '@/types/metadata'
import type { ResumeContent } from '@/types/document'

type Layout = Metadata['layout']

const layout = (main: string[], aside: string[] = [], columns: 1 | 2 = 2): Layout =>
  ({ columns, main, aside, hidden: [], sidebarWidth: 0.32 }) as unknown as Layout

describe('moveSection (within column)', () => {
  it('moves a main section up and down', () => {
    const l = layout(['summary', 'work', 'education'])
    moveSection(l, 'work', -1)
    expect(l.main).toEqual(['work', 'summary', 'education'])
    moveSection(l, 'work', 1)
    expect(l.main).toEqual(['summary', 'work', 'education'])
  })

  it('moves an aside section', () => {
    const l = layout(['summary'], ['skills', 'languages'])
    moveSection(l, 'languages', -1)
    expect(l.aside).toEqual(['languages', 'skills'])
    expect(l.main).toEqual(['summary'])
  })

  it('clamps at both edges (no-op)', () => {
    const l = layout(['summary', 'work'])
    moveSection(l, 'summary', -1)
    expect(l.main).toEqual(['summary', 'work'])
    moveSection(l, 'work', 1)
    expect(l.main).toEqual(['summary', 'work'])
  })

  it('adopts a key missing from both arrays into main, then moves it', () => {
    // resolveOrder appends content-bearing sections missing from the layout;
    // the first explicit move must materialize that implicit position.
    const l = layout(['summary', 'work'])
    moveSection(l, 'projects', -1)
    expect(l.main).toEqual(['summary', 'projects', 'work'])
  })
})

describe('moveSectionTo (cross-column / indexed)', () => {
  it('moves main -> aside at an index', () => {
    const l = layout(['summary', 'work', 'education'], ['skills'])
    moveSectionTo(l, 'work', 'aside', 0)
    expect(l.main).toEqual(['summary', 'education'])
    expect(l.aside).toEqual(['work', 'skills'])
  })

  it('reorders within the same column via index', () => {
    const l = layout(['summary', 'work', 'education'])
    moveSectionTo(l, 'education', 'main', 0)
    expect(l.main).toEqual(['education', 'summary', 'work'])
  })

  it('clamps an out-of-range index to the end', () => {
    const l = layout(['summary'], ['skills'])
    moveSectionTo(l, 'summary', 'aside', 99)
    expect(l.aside).toEqual(['skills', 'summary'])
    expect(l.main).toEqual([])
  })
})

const content = (): ResumeContent =>
  ({
    work: [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
      { id: 'c', name: 'C' },
    ],
    custom: [
      {
        id: 'x1',
        name: 'Side quests',
        items: [
          { id: 'p', name: 'P' },
          { id: 'q', name: 'Q' },
        ],
      },
    ],
  }) as unknown as ResumeContent

describe('moveEntry', () => {
  it('moves a work entry to an index', () => {
    const c = content()
    moveEntry(c, 'work', 'c', 0)
    expect(c.work.map((w) => w.id)).toEqual(['c', 'a', 'b'])
  })

  it('moves inside a custom section', () => {
    const c = content()
    moveEntry(c, 'custom-x1', 'q', 0)
    expect(c.custom[0].items.map((i) => i.id)).toEqual(['q', 'p'])
  })

  it('clamps the target index', () => {
    const c = content()
    moveEntry(c, 'work', 'a', 99)
    expect(c.work.map((w) => w.id)).toEqual(['b', 'c', 'a'])
  })

  it('ignores an unknown id or section', () => {
    const c = content()
    moveEntry(c, 'work', 'nope', 0)
    moveEntry(c, 'awards', 'a', 0)
    expect(c.work.map((w) => w.id)).toEqual(['a', 'b', 'c'])
  })
})
