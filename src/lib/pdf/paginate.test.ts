import { describe, it, expect } from 'vitest'
import { paginate, PaginationImpossibleError } from './paginate'
import type { PageBlock } from './paginate'

// Case letters below match task-1-brief.md's Step 1 list (a)-(i) so the
// report can point back at the exact spec'd scenario each test proves.

describe('paginate — (a) single page: content fits within one usable page height', () => {
  it('returns no cuts when content is shorter than the usable page height', () => {
    const blocks: PageBlock[] = [{ kind: 'line', topPx: 0, bottomPx: 50 }]
    const result = paginate({ blocks, contentHeightPx: 50, usablePageHeightPx: 100 })
    expect(result.cutsPx).toEqual([])
    expect(result.pageCount).toBe(1)
  })

  it('returns no cuts when content height exactly equals the usable page height (H <= P)', () => {
    const blocks: PageBlock[] = [{ kind: 'line', topPx: 0, bottomPx: 100 }]
    const result = paginate({ blocks, contentHeightPx: 100, usablePageHeightPx: 100 })
    expect(result.cutsPx).toEqual([])
    expect(result.pageCount).toBe(1)
  })
})

describe('paginate — (b) section boundary preferred: ideal cut inside section 2 snaps up to the section gap', () => {
  it('snaps the cut up to the section-gap midpoint instead of cutting inside section 2', () => {
    const blocks: PageBlock[] = [
      { kind: 'line', topPx: 0, bottomPx: 80 }, // section 1 content
      { kind: 'section-gap', topPx: 80, bottomPx: 100 }, // candidate y = 90
      { kind: 'line', topPx: 100, bottomPx: 190 }, // section 2 content — the naive ideal (105) falls inside this
    ]
    const result = paginate({ blocks, contentHeightPx: 190, usablePageHeightPx: 105 })
    // Ideal boundary is 105 (inside the 100-190 line), well past the section
    // gap at 80-100 — the chooser must still prefer the section-gap.
    expect(result.cutsPx).toEqual([90])
    expect(result.pageCount).toBe(2)
  })
})

describe('paginate — (c) no section gap in the window: falls back to the entry gap', () => {
  it('picks the entry-gap candidate when the only section-gap is outside the search window', () => {
    const blocks: PageBlock[] = [
      { kind: 'line', topPx: 0, bottomPx: 60 },
      { kind: 'section-gap', topPx: 60, bottomPx: 70 }, // candidate y = 65 — too far above the window
      { kind: 'line', topPx: 70, bottomPx: 90 },
      { kind: 'entry-gap', topPx: 90, bottomPx: 100 }, // candidate y = 95 — inside the window
      { kind: 'line', topPx: 100, bottomPx: 190 },
    ]
    const result = paginate({ blocks, contentHeightPx: 190, usablePageHeightPx: 105 })
    expect(result.cutsPx).toEqual([95])
    expect(result.pageCount).toBe(2)
  })
})

describe('paginate — (d) only line gaps available: the lowest (closest-to-ideal) one in the window wins', () => {
  it('picks the line gap nearest the ideal boundary over an earlier, also-in-window line gap', () => {
    const blocks: PageBlock[] = [
      { kind: 'line', topPx: 0, bottomPx: 50 },
      { kind: 'line', topPx: 55, bottomPx: 88 }, // gap vs previous: mid 52.5 — outside the window
      { kind: 'line', topPx: 92, bottomPx: 96 }, // gap vs previous: mid 90 — inside the window
      { kind: 'line', topPx: 100, bottomPx: 190 }, // gap vs previous: mid 98 — inside the window, closer to ideal
    ]
    const result = paginate({ blocks, contentHeightPx: 190, usablePageHeightPx: 105 })
    expect(result.cutsPx).toEqual([98])
    expect(result.pageCount).toBe(2)
  })
})

describe('paginate — (e) keepWithNext widow rule: a heading directly above the ideal cut pushes it above the heading', () => {
  it('rejects the gap right after a keepWithNext heading and uses the earlier legal gap instead', () => {
    const blocks: PageBlock[] = [
      { kind: 'line', topPx: 0, bottomPx: 80 },
      { kind: 'line', topPx: 95, bottomPx: 100, keepWithNext: true }, // section/entry title
      { kind: 'line', topPx: 100, bottomPx: 190 }, // first content line right after the heading
    ]
    const result = paginate({ blocks, contentHeightPx: 190, usablePageHeightPx: 105 })
    // Without the widow rule the nearest in-window candidate would be the gap
    // immediately after the heading (y=100, distance 0 from the ideal 105).
    // That candidate's predecessor is the keepWithNext heading, so it's
    // illegal — the chooser must fall back to the earlier gap at y=87.5,
    // which sits above (before) the heading entirely.
    expect(result.cutsPx).toEqual([87.5])
    expect(result.pageCount).toBe(2)
  })
})

describe('paginate — (f) an oversized entry (atomic + line blocks together taller than one page) is cut at an internal line gap', () => {
  it('cuts inside the oversized entry at the internal line gap, never through the atomic block or a line', () => {
    const blocks: PageBlock[] = [
      { kind: 'atomic', topPx: 0, bottomPx: 20 }, // e.g. a logo/image
      { kind: 'line', topPx: 25, bottomPx: 90 }, // gap vs previous: mid 22.5
      { kind: 'line', topPx: 95, bottomPx: 160 }, // gap vs previous: mid 92.5 — inside the window
    ]
    const result = paginate({ blocks, contentHeightPx: 160, usablePageHeightPx: 105 })
    expect(result.cutsPx).toEqual([92.5])
    expect(result.pageCount).toBe(2)
  })
})

describe('paginate — (g) a block taller than a full page with no internal gaps throws', () => {
  it('throws PaginationImpossibleError when no legal candidate exists anywhere', () => {
    const blocks: PageBlock[] = [{ kind: 'atomic', topPx: 0, bottomPx: 150 }]
    expect(() => paginate({ blocks, contentHeightPx: 150, usablePageHeightPx: 100 })).toThrow(PaginationImpossibleError)
  })
})

describe("paginate — (h) three-page document: two cuts, page 2's window measured from cut 1", () => {
  it('computes each successive ideal boundary from the previous cut, not from the document start', () => {
    const blocks: PageBlock[] = [
      { kind: 'line', topPx: 0, bottomPx: 90 },
      { kind: 'section-gap', topPx: 90, bottomPx: 100 }, // candidate y = 95
      { kind: 'line', topPx: 100, bottomPx: 173 },
      { kind: 'section-gap', topPx: 173, bottomPx: 183 }, // candidate y = 178
      { kind: 'line', topPx: 183, bottomPx: 270 },
    ]
    const result = paginate({ blocks, contentHeightPx: 270, usablePageHeightPx: 100 })
    // Page 2's ideal boundary is cut1 (95) + 100 = 195, whose window
    // ([177, 195]) reaches the second section gap at 178. A buggy
    // implementation computing the ideal from the document start (2 * 100 =
    // 200, window [182, 200]) would MISS 178 entirely and produce a
    // different (wrong) cut here.
    expect(result.cutsPx).toEqual([95, 178])
    expect(result.pageCount).toBe(3)
  })
})

describe('paginate — (i) search window ratio is respected: a candidate just outside it is ignored, downward fallback used', () => {
  it('ignores an in-range-but-outside-window candidate and falls forward to the next legal gap past the ideal boundary', () => {
    const blocks: PageBlock[] = [
      { kind: 'line', topPx: 0, bottomPx: 74 },
      { kind: 'line', topPx: 84, bottomPx: 125 }, // gap vs previous: mid 79 — outside the 0.18*P window (low=82)
      { kind: 'line', topPx: 130, bottomPx: 220 }, // gap vs previous: mid 127.5 — past the ideal, used by fallback
    ]
    const result = paginate({ blocks, contentHeightPx: 220, usablePageHeightPx: 100 })
    expect(result.cutsPx).toEqual([127.5])
    expect(result.pageCount).toBe(2)
  })

  it('honors an explicit non-default searchWindowRatio', () => {
    // Same shape as above, but a wider window (0.3 * 100 = 30, low = 70) now
    // legally reaches the y=79 candidate instead of falling through to
    // 127.5. Content is shortened vs. the previous case so a single cut at
    // 79 is still enough to fit the remainder on page 2.
    const blocks: PageBlock[] = [
      { kind: 'line', topPx: 0, bottomPx: 74 },
      { kind: 'line', topPx: 84, bottomPx: 125 },
      { kind: 'line', topPx: 130, bottomPx: 170 },
    ]
    const result = paginate({
      blocks,
      contentHeightPx: 170,
      usablePageHeightPx: 100,
      searchWindowRatio: 0.3,
    })
    expect(result.cutsPx).toEqual([79])
    expect(result.pageCount).toBe(2)
  })
})

describe('paginate — fix round: downward fallback is tier-first, not nearest-of-any-tier', () => {
  it('a farther section gap past the ideal beats a nearer line gap past the ideal', () => {
    // Nothing qualifies inside the window [82, 100] at any tier (the closest
    // upstream line gap, mid 72.5, sits below the window's low edge; nothing
    // else is <= the ideal 100), so this falls all the way through to the
    // downward fallback. Past the ideal (100) there are two candidates: a
    // NEARBY line gap at 105 and a FARTHER section gap at 140. Tier
    // preference must still win in the fallback the same way it wins in the
    // primary window scan — the fallback is not a plain "nearest wins" scan.
    // Content is sized so BOTH the correct cut (140) and the wrong
    // nearest-wins cut (105) leave <= 100px remaining afterward — a single
    // cut either way — so a tier-first vs. nearest-wins implementation
    // disagrees on the cut value itself, not on how many cuts follow.
    const blocks: PageBlock[] = [
      { kind: 'line', topPx: 0, bottomPx: 70 },
      { kind: 'line', topPx: 75, bottomPx: 105 }, // gap vs previous: mid 72.5 — below the window
      { kind: 'line', topPx: 105, bottomPx: 115 }, // gap vs previous: mid 105 — nearby, past the ideal
      { kind: 'section-gap', topPx: 115, bottomPx: 165 }, // candidate y = 140 — farther, past the ideal
      { kind: 'line', topPx: 165, bottomPx: 200 },
    ]
    const result = paginate({ blocks, contentHeightPx: 200, usablePageHeightPx: 100 })
    expect(result.cutsPx).toEqual([140])
    expect(result.pageCount).toBe(2)
  })
})

describe('paginate — fallsInsideInk guard: a candidate overlapping malformed/overlapping ink is rejected', () => {
  it('skips a section-gap candidate whose midpoint lands inside an overlapping line block, choosing the next legal candidate instead', () => {
    // Malformed/overlapping input: the first line block (70-120) overlaps
    // the section-gap that follows it (80-100, candidate midpoint 90) — 90
    // falls strictly inside the line block's own ink (70 < 90 < 120). The
    // guard must drop that candidate entirely rather than ever returning a
    // cut through it, leaving only the later (legal) entry-gap candidate.
    const blocks: PageBlock[] = [
      { kind: 'line', topPx: 70, bottomPx: 120 }, // overlaps the section-gap below — malformed on purpose
      { kind: 'section-gap', topPx: 80, bottomPx: 100 }, // candidate y = 90, but 90 is inside the line block above
      { kind: 'line', topPx: 120, bottomPx: 130 },
      { kind: 'entry-gap', topPx: 130, bottomPx: 140 }, // candidate y = 135 — legal, not inside any ink
      { kind: 'line', topPx: 140, bottomPx: 160 },
    ]
    const result = paginate({ blocks, contentHeightPx: 160, usablePageHeightPx: 100 })
    // If the guard failed to reject y=90, that section-gap candidate would
    // win the primary scan outright (tier 1) — the fact that the result is
    // 135 (a tier-2 candidate reached only via fallback) proves 90 was
    // dropped before tier preference was even applied.
    expect(result.cutsPx).toEqual([135])
    expect(result.pageCount).toBe(2)
  })
})

describe('paginate — keepWithNext good case: a legal cut directly BEFORE a keepWithNext heading is accepted', () => {
  it('accepts the gap immediately preceding a keepWithNext heading — the rule only blocks the gap AFTER it', () => {
    const blocks: PageBlock[] = [
      { kind: 'line', topPx: 0, bottomPx: 80 },
      { kind: 'section-gap', topPx: 80, bottomPx: 100 }, // candidate y = 90 — legal: its successor has keepWithNext, but that doesn't matter
      { kind: 'line', topPx: 100, bottomPx: 110, keepWithNext: true }, // heading
      { kind: 'line', topPx: 110, bottomPx: 190 }, // gap right after the heading (mid 110) stays illegal, per the (e) case above
    ]
    const result = paginate({ blocks, contentHeightPx: 190, usablePageHeightPx: 105 })
    expect(result.cutsPx).toEqual([90])
    expect(result.pageCount).toBe(2)
  })
})
