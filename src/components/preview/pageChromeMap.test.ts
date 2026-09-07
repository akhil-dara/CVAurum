import { describe, it, expect } from 'vitest'
import type { PageBlock } from '@/lib/pdf/paginate'
import { mapCutToEditAnchor, type SectionAnchors } from './pageChromeMap'

/**
 * `locateStructural` names the entry a cut falls in by COUNTING gap blocks,
 * on the standing promise that walk.ts emits exactly one `entry-gap` per
 * entry - entry 0 included. A section that lays its title BESIDE its content
 * (the `side` heading placement) has no empty span between the title and the
 * first entry to measure, so walk.ts joins the two runs into one block and
 * emits a ZERO-HEIGHT `entry-gap` in place of the missing span. Drop that
 * marker and every entry from 1 on is named one entry too early: the canvas
 * opens its page gap above the wrong entry while the export cuts where it
 * always did, which is the preview/export disagreement this whole mapping
 * exists to prevent. walk.test.ts pins the block shape below.
 */
function fakeSection(withTitle = true): Element {
  const title = { getBoundingClientRect: () => ({ height: 18 }) }
  return {
    querySelector: (sel: string) => (withTitle && sel === '.rm-section-title' ? title : null),
  } as unknown as Element
}

function fakeEntry(name: string): Element {
  return { name } as unknown as Element
}

describe('pageChromeMap - side-heading sections', () => {
  // One `.sec-side` section, three entries. The title has been folded into
  // entry 0's own first row (they share the grid row), so the leading gap is
  // the zero-height marker at 120.
  const blocks: PageBlock[] = [
    { kind: 'line', topPx: 100, bottomPx: 120, keepWithNext: true }, // title + entry 0's first row
    { kind: 'entry-gap', topPx: 120, bottomPx: 120 }, // entry 0's marker
    { kind: 'line', topPx: 125, bottomPx: 140 }, // entry 0's body line
    { kind: 'entry-gap', topPx: 140, bottomPx: 150 },
    { kind: 'line', topPx: 150, bottomPx: 170 }, // entry 1
    { kind: 'line', topPx: 175, bottomPx: 190 },
    { kind: 'entry-gap', topPx: 190, bottomPx: 200 },
    { kind: 'line', topPx: 200, bottomPx: 220 }, // entry 2
  ]

  const printEntries = [fakeEntry('print-0'), fakeEntry('print-1'), fakeEntry('print-2')]
  const editEntries = [fakeEntry('edit-0'), fakeEntry('edit-1'), fakeEntry('edit-2')]
  const printAnchors: SectionAnchors[] = [{ key: 'experience', section: fakeSection(), entries: printEntries }]
  const editAnchorsByKey = new Map<string, SectionAnchors>([
    ['experience', { key: 'experience', section: fakeSection(), entries: editEntries }],
  ])

  it('names entry 1 for a cut in the gap that precedes entry 1', () => {
    expect(mapCutToEditAnchor(blocks, 145, printAnchors, editAnchorsByKey)).toBe(editEntries[1])
  })

  it('names entry 2 for a cut in the gap that precedes entry 2', () => {
    expect(mapCutToEditAnchor(blocks, 195, printAnchors, editAnchorsByKey)).toBe(editEntries[2])
  })

  it('gives up rather than guess when the section has no measurable title', () => {
    const noTitle: SectionAnchors[] = [{ key: 'experience', section: fakeSection(false), entries: printEntries }]
    expect(mapCutToEditAnchor(blocks, 145, noTitle, editAnchorsByKey)).toBe(null)
  })
})
