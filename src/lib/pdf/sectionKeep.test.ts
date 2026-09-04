import { describe, it, expect } from 'vitest'
import { keepShortSectionsWhole, keepEntryWhole } from './sectionKeep'
import type { PageBlock } from './paginate'

const line = (topPx: number, bottomPx: number): PageBlock => ({ kind: 'line', topPx, bottomPx })
const gap = (topPx: number, bottomPx: number): PageBlock => ({ kind: 'section-gap', topPx, bottomPx })
const entryGap = (topPx: number, bottomPx: number): PageBlock => ({ kind: 'entry-gap', topPx, bottomPx })
const keeps = (bs: PageBlock[]) => bs.map((b) => b.keepWithNext === true)

describe('keepShortSectionsWhole', () => {
  it('makes a short section unbreakable, flagging every block but its last', () => {
    const blocks = [line(0, 40), entryGap(40, 50), line(50, 90), gap(90, 110), line(110, 900)]
    const out = keepShortSectionsWhole(blocks, 1000, 0.4)
    expect(keeps(out.slice(0, 3))).toEqual([true, true, false])
  })

  it('leaves a section that could never fit a page alone - flagging it stranrds whole pages', () => {
    const blocks = [line(0, 900), gap(900, 920), line(920, 960)]
    const out = keepShortSectionsWhole(blocks, 1000, 0.4)
    expect(out[0].keepWithNext).toBeUndefined()
  })

  it('never flags a section GAP - the break between two sections is the best break there is', () => {
    const blocks = [line(0, 40), gap(40, 60), line(60, 100)]
    const out = keepShortSectionsWhole(blocks, 1000, 0.4)
    expect(out[1].keepWithNext).not.toBe(true)
  })

  it('keeps flags that were already there', () => {
    const blocks: PageBlock[] = [{ kind: 'line', topPx: 0, bottomPx: 900, keepWithNext: true }]
    expect(keepShortSectionsWhole(blocks, 1000, 0.4)[0].keepWithNext).toBe(true)
  })

  it('does not mutate the blocks it was given', () => {
    const blocks = [line(0, 40), entryGap(40, 50), line(50, 90)]
    keepShortSectionsWhole(blocks, 1000, 0.4)
    expect(blocks[0].keepWithNext).toBeUndefined()
  })

  it('is a no-op without a usable page height', () => {
    const blocks = [line(0, 40), entryGap(40, 50), line(50, 90)]
    expect(keepShortSectionsWhole(blocks, 0, 0.4)).toBe(blocks)
  })
})

describe('keepEntryWhole', () => {
  it('holds one entry together, flagging every block but its last', () => {
    // A title row and two body lines: the two gaps inside the entry become
    // illegal cuts, the gap that follows the entry stays legal.
    const blocks = [line(0, 20), line(24, 40), line(44, 60)]
    const out = keepEntryWhole(blocks, 1000)
    expect(keeps(out)).toEqual([true, true, false])
  })

  it('leaves an entry taller than the ceiling alone - holding it would strand a page', () => {
    const blocks = [line(0, 300), line(304, 700)]
    expect(keepEntryWhole(blocks, 1000, 0.6)).toBe(blocks)
  })

  it('holds an entry that sits exactly on the ceiling', () => {
    const blocks = [line(0, 300), line(300, 600)]
    expect(keeps(keepEntryWhole(blocks, 1000, 0.6))).toEqual([true, false])
  })

  it('leaves a one-block entry alone - there is no cut inside it to ban', () => {
    const blocks = [line(0, 20)]
    expect(keepEntryWhole(blocks, 1000)).toBe(blocks)
  })

  it('is a no-op without a usable page height', () => {
    const blocks = [line(0, 20), line(24, 40)]
    expect(keepEntryWhole(blocks, 0)).toBe(blocks)
  })

  it('does not mutate the blocks it was given', () => {
    const blocks = [line(0, 20), line(24, 40)]
    keepEntryWhole(blocks, 1000)
    expect(blocks[0].keepWithNext).toBeUndefined()
  })
})
