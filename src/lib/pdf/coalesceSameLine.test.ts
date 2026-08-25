import { describe, it, expect } from 'vitest'
import { coalesceSameLineBlocks } from './walk'
import type { PageBlock } from './paginate'

const line = (topPx: number, bottomPx: number, keepWithNext?: true): PageBlock => ({
  kind: 'line',
  topPx,
  bottomPx,
  ...(keepWithNext ? { keepWithNext } : {}),
})
const spans = (bs: PageBlock[]) => bs.map((b) => `${b.topPx}-${b.bottomPx}`)

describe('coalesceSameLineBlocks', () => {
  it('merges two segments that share a line, even at different sizes', () => {
    // A bold label beside its value: the boxes OVERLAP vertically.
    expect(spans(coalesceSameLineBlocks([line(100, 120), line(102, 118)]))).toEqual(['100-120'])
  })

  it('keeps stacked lines apart - touching is not sharing a line', () => {
    // Wrapped text: each line's top IS the previous line's bottom. Merging
    // these turns a whole paragraph into one indivisible block, and a cut
    // needs EVERY column clear at one y - so one column's merged paragraph
    // deletes every break point the OTHER column offers for its whole height.
    // Measured on a real two-column resume: the sidebar's skill groups became
    // single blocks up to 194px, the document was left with 4 legal breaks in
    // total, and page one ended 14% full.
    expect(spans(coalesceSameLineBlocks([line(100, 120), line(120, 140), line(140, 160)])))
      .toEqual(['100-120', '120-140', '140-160'])
  })

  it('still tolerates sub-pixel rounding between stacked lines', () => {
    expect(spans(coalesceSameLineBlocks([line(100, 120.3), line(120, 140)]))).toEqual(['100-120.3', '120-140'])
  })

  it('carries keepWithNext when it does merge', () => {
    expect(coalesceSameLineBlocks([line(100, 120, true), line(102, 118)])[0].keepWithNext).toBe(true)
  })

  it('never merges across a gap block', () => {
    const blocks: PageBlock[] = [line(100, 120), { kind: 'entry-gap', topPx: 120, bottomPx: 130 }, line(130, 150)]
    expect(spans(coalesceSameLineBlocks(blocks))).toEqual(['100-120', '120-130', '130-150'])
  })
})
