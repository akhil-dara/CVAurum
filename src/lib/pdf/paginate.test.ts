import { describe, it, expect } from 'vitest'
import { paginate, combineColumns, PaginationImpossibleError } from './paginate'
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

describe('paginate — fix round: page 1 gets its OWN (larger) budget via firstPageUsablePageHeightPx', () => {
  // Task 3 fix round: page 1's own leading top padding is already baked into
  // the DOM at offset 0 (paint.ts's assignOpsToPages never spends it again
  // for page 1 the way it does as a real yOffset on pages 2+), so page 1's
  // true budget is bigger than the uniform per-page budget by that top
  // padding. Proven live against a real two-column dark template
  // (`portrait`): the old, uniform-budget code picked a premature first cut,
  // stranding a same-tier entry-gap candidate the corrected (larger) page-1
  // window reaches instead.
  it('an entry that fits within the LARGER page-1 budget, but not the uniform per-page budget, stays on page 1 — the cut lands AFTER it', () => {
    const blocks: PageBlock[] = [
      { kind: 'line', topPx: 0, bottomPx: 90 },
      { kind: 'entry-gap', topPx: 90, bottomPx: 100 }, // candidate y = 95 — the OLD (uniform-budget) premature cut point
      { kind: 'line', topPx: 100, bottomPx: 135 }, // the extra entry that must stay on page 1
      { kind: 'entry-gap', topPx: 135, bottomPx: 145 }, // candidate y = 140 — only reachable under the LARGER page-1 budget
      { kind: 'line', topPx: 145, bottomPx: 190 }, // sized so ONE cut is enough either way (95 or 140 both leave <=100 remaining)
    ]
    const result = paginate({
      blocks,
      contentHeightPx: 190,
      usablePageHeightPx: 100, // pages 2+ budget
      firstPageUsablePageHeightPx: 150, // page 1's own (larger) budget
    })
    // The cut must land AFTER the extra entry (at its trailing gap, y=140),
    // not before it (the old uniform-budget cut at y=95).
    expect(result.cutsPx).toEqual([140])
    expect(result.pageCount).toBe(2)
  })

  it('omitting firstPageUsablePageHeightPx keeps the old uniform-budget behavior exactly (backward compatible)', () => {
    const blocks: PageBlock[] = [
      { kind: 'line', topPx: 0, bottomPx: 90 },
      { kind: 'entry-gap', topPx: 90, bottomPx: 100 },
      { kind: 'line', topPx: 100, bottomPx: 135 },
      { kind: 'entry-gap', topPx: 135, bottomPx: 145 },
      { kind: 'line', topPx: 145, bottomPx: 190 },
    ]
    const result = paginate({ blocks, contentHeightPx: 190, usablePageHeightPx: 100 })
    // No firstPageUsablePageHeightPx given -> page 1 uses the SAME uniform
    // budget as every other page (100), landing on the earlier gap (y=95),
    // exactly like every pre-existing (single-budget) test in this file.
    expect(result.cutsPx).toEqual([95])
    expect(result.pageCount).toBe(2)
  })

  it('a document that fits within the larger page-1 budget but NOT the uniform one stays single-page', () => {
    const blocks: PageBlock[] = [{ kind: 'line', topPx: 0, bottomPx: 120 }]
    // 120 > uniform budget (100) but <= the first-page budget (150) -> must
    // NOT force a page break that the true page-1 budget doesn't need.
    expect(
      paginate({ blocks, contentHeightPx: 120, usablePageHeightPx: 100, firstPageUsablePageHeightPx: 150 })
    ).toEqual({ cutsPx: [], pageCount: 1 })
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

// Task 2b — combineColumns. Case labels below match the task-2b-brief.md
// step list so the report can point back at the exact scenario each proves.

describe('combineColumns — offset ink: a combined gap exists only where EVERY column is clear', () => {
  it("narrows each column's own gap down to the mutual clearing, not wherever either column happens to have one", () => {
    // main's own gap is [60,140] (candidate 100); aside's own gap is
    // [100,180] (candidate 140). Neither column's gap alone is legal for a
    // shared cut — main still has aside's ink under it for [60,100), and
    // aside still has main's ink under it for [140,180) — only the
    // intersection [100,140] is clear in BOTH columns at once.
    const main: PageBlock[] = [
      { kind: 'line', topPx: 0, bottomPx: 60 },
      { kind: 'entry-gap', topPx: 60, bottomPx: 140 },
      { kind: 'line', topPx: 140, bottomPx: 300 },
    ]
    const aside: PageBlock[] = [
      { kind: 'line', topPx: 0, bottomPx: 100 },
      { kind: 'entry-gap', topPx: 100, bottomPx: 180 },
      { kind: 'line', topPx: 180, bottomPx: 300 },
    ]
    expect(combineColumns([main, aside])).toEqual([
      { kind: 'line', topPx: 0, bottomPx: 100 }, // union of main[0,60] and aside[0,100]
      { kind: 'entry-gap', topPx: 100, bottomPx: 140 }, // the mutual clearing only
      { kind: 'line', topPx: 140, bottomPx: 300 }, // union of main[140,300] and aside[180,300]
    ])
  })

  it('a short aside next to a tall main contributes no opinion past its own end — main alone governs there', () => {
    const main: PageBlock[] = [
      { kind: 'line', topPx: 0, bottomPx: 50 },
      { kind: 'section-gap', topPx: 50, bottomPx: 70 },
      { kind: 'line', topPx: 70, bottomPx: 300 },
    ]
    const aside: PageBlock[] = [{ kind: 'line', topPx: 0, bottomPx: 40 }] // ends well before main's gap
    expect(combineColumns([main, aside])).toEqual([
      { kind: 'line', topPx: 0, bottomPx: 50 },
      { kind: 'section-gap', topPx: 50, bottomPx: 70 }, // aside is out of range here: main's own tier stands unweakened
      { kind: 'line', topPx: 70, bottomPx: 300 },
    ])
  })
})

describe('combineColumns — tier conservatism when columns disagree (task-2b brief worked example)', () => {
  it('a section-gap in main overlapping mere line-gap territory in aside downgrades to entry-gap, not the full downgrade to line', () => {
    // main is gapped (section-gap) across the whole [100,300] span. aside is
    // inked everywhere in that span EXCEPT a tiny unmarked line-tier gap at
    // [150,155] between two directly-adjacent blocks — so the only y-range
    // where BOTH columns are clear at once is [150,155], and there the
    // tiers disagree (section vs line): conservatively downgraded ONE tier
    // below the strongest (section -> entry), not collapsed all the way to
    // aside's own weaker line tier.
    const main: PageBlock[] = [
      { kind: 'line', topPx: 0, bottomPx: 100 },
      { kind: 'section-gap', topPx: 100, bottomPx: 300 },
      { kind: 'line', topPx: 300, bottomPx: 350 },
    ]
    const aside: PageBlock[] = [
      { kind: 'line', topPx: 90, bottomPx: 150 },
      { kind: 'line', topPx: 155, bottomPx: 320 },
    ]
    const result = combineColumns([main, aside])
    const gap = result.find((b) => b.topPx === 150 && b.bottomPx === 155)
    expect(gap?.kind).toBe('entry-gap')
    // Nowhere in the result is the disagreement resolved as the naive
    // "strongest tier wins" (section-gap) OR the full "weakest wins" (line) —
    // only the one-notch-conservative middle ground.
    expect(result.some((b) => b.kind === 'section-gap')).toBe(false)
    expect(result.some((b) => b.kind === 'line' && b.topPx >= 100 && b.bottomPx <= 300)).toBe(false)
  })

  it('columns that agree on a tier keep it exactly, with no downgrade at all', () => {
    const main: PageBlock[] = [
      { kind: 'line', topPx: 0, bottomPx: 50 },
      { kind: 'section-gap', topPx: 50, bottomPx: 80 },
      { kind: 'line', topPx: 80, bottomPx: 150 },
    ]
    const aside: PageBlock[] = [
      { kind: 'line', topPx: 0, bottomPx: 50 },
      { kind: 'section-gap', topPx: 50, bottomPx: 80 },
      { kind: 'line', topPx: 80, bottomPx: 150 },
    ]
    expect(combineColumns([main, aside])).toEqual(main)
  })
})

describe('combineColumns — keepWithNext propagation is LAST-CONTRIBUTING-SPAN-PER-COLUMN (fix round, adjudication A)', () => {
  it('propagates when the heading itself is still the trailing-edge contributor right before the gap', () => {
    // main: a title (keepWithNext) then its own entry-gap down to a body
    // line. aside is plain, non-heading ink, but ENDS before main's title
    // does (at y=10, well short of the title's own y=20 end) — so at the
    // micro-interval immediately before the gap ([10,20)), aside is already
    // out of range and main's own title is the ONLY (and therefore also the
    // LAST) active contributor. The combined gap right after must still be
    // rejected as a widow candidate, exactly as a single-column widow rule
    // would protect main's own title.
    const main: PageBlock[] = [
      { kind: 'line', topPx: 0, bottomPx: 20, keepWithNext: true },
      { kind: 'entry-gap', topPx: 20, bottomPx: 50 },
      { kind: 'line', topPx: 50, bottomPx: 100 },
    ]
    const aside: PageBlock[] = [{ kind: 'line', topPx: 0, bottomPx: 10 }]

    const combined = combineColumns([main, aside])
    expect(combined).toEqual([
      { kind: 'line', topPx: 0, bottomPx: 20, keepWithNext: true },
      { kind: 'entry-gap', topPx: 20, bottomPx: 50 },
      { kind: 'line', topPx: 50, bottomPx: 100 },
    ])

    // The entry-gap at [20,50] is the ONLY structural candidate in this
    // document, and it is correctly rejected by the widow rule.
    expect(() => paginate({ blocks: combined, contentHeightPx: 100, usablePageHeightPx: 55 })).toThrow(
      PaginationImpossibleError
    )
  })

  it("reviewer's distinguishing fixture: a LATER, non-heading contributor at the trailing edge overrides an EARLIER heading in the same merged run", () => {
    // main: a heading (keepWithNext) immediately followed by ordinary body
    // content [20,100] BEFORE the entry-gap at [100,150] — so by the time
    // the merged run reaches the gap, main's own trailing-edge block is
    // plain content, not the heading. aside is plain ink [0,50], well short
    // of the gap too. Neither column's block bordering the gap is a
    // heading, so the OLD "OR across the whole run" behavior (which wrongly
    // kept the flag true forever once set) is the ONLY thing that would
    // reject this gap — the FIXED last-contributor rule must NOT.
    const main: PageBlock[] = [
      { kind: 'line', topPx: 0, bottomPx: 20, keepWithNext: true },
      { kind: 'line', topPx: 20, bottomPx: 100 },
      { kind: 'entry-gap', topPx: 100, bottomPx: 150 },
      { kind: 'line', topPx: 150, bottomPx: 200 },
    ]
    const aside: PageBlock[] = [{ kind: 'line', topPx: 0, bottomPx: 50 }]

    const combined = combineColumns([main, aside])
    const runBeforeGap = combined.find((b) => b.topPx === 0)
    expect(runBeforeGap).toEqual({ kind: 'line', topPx: 0, bottomPx: 100 })
    expect(runBeforeGap!.keepWithNext).toBeUndefined() // must NOT carry the earlier heading's flag

    // usable=110: ideal=110, window=[90.2,110]. The entry-gap's candidate
    // (125) sits past the window but is the only structural gap — the
    // downward fallback must find and use it instead of throwing.
    const result = paginate({ blocks: combined, contentHeightPx: 200, usablePageHeightPx: 110 })
    expect(result.cutsPx).toEqual([125])
    expect(result.pageCount).toBe(2)
  })
})

describe('combineColumns — CRITICAL fix round: a mutual line-tier clearing is never swallowed into ink', () => {
  it('two all-line columns sharing a [50,150] clearing stay TWO separate blocks, not one [0,200] ink block', () => {
    // Both columns: a line block, a real 100px gap with NO marker between
    // (implicit line-tier), then another line block — identical shape, so
    // the [50,150] clearing is mutual. The pre-fix bug's `!e.ink &&
    // last.kind === e.tier` check collided here: an ink run's own `kind` is
    // the string 'line', and this gap's `tier` is ALSO the string 'line',
    // so the gap satisfied that check and was silently merged straight into
    // the preceding ink run, then the run after it merged in too —
    // collapsing to one [0,200] ink block with zero candidates anywhere.
    const main: PageBlock[] = [
      { kind: 'line', topPx: 0, bottomPx: 50 },
      { kind: 'line', topPx: 150, bottomPx: 200 },
    ]
    const aside: PageBlock[] = [
      { kind: 'line', topPx: 0, bottomPx: 50 },
      { kind: 'line', topPx: 150, bottomPx: 200 },
    ]

    const combined = combineColumns([main, aside])
    // The [50,150] clearing is represented the SAME way a single column's
    // own raw output represents an implicit line-tier gap: two directly-
    // adjacent ink blocks with real (unmarked) space between them — never
    // a materialized {kind:'line'} gap block, which would read as ink.
    expect(combined).toEqual([
      { kind: 'line', topPx: 0, bottomPx: 50 },
      { kind: 'line', topPx: 150, bottomPx: 200 },
    ])

    // End-to-end: paginate must find and use the [50,150] clearing (implicit
    // line-tier candidate at its midpoint, y=100), not throw.
    const result = paginate({ blocks: combined, contentHeightPx: 200, usablePageHeightPx: 105 })
    expect(result.cutsPx).toEqual([100])
    expect(result.pageCount).toBe(2)
  })
})

describe('combineColumns — single-column passthrough is byte-stable (aside from atomic/line unification)', () => {
  it('round-trips a single column of plain line/gap blocks unchanged', () => {
    const only: PageBlock[] = [
      { kind: 'line', topPx: 0, bottomPx: 20, keepWithNext: true },
      { kind: 'entry-gap', topPx: 20, bottomPx: 30 },
      { kind: 'line', topPx: 30, bottomPx: 80 },
      { kind: 'section-gap', topPx: 80, bottomPx: 100 },
      { kind: 'line', topPx: 100, bottomPx: 150 },
    ]
    expect(combineColumns([only])).toEqual(only)
  })

  it('returns [] for an all-empty column list', () => {
    expect(combineColumns([])).toEqual([])
    expect(combineColumns([[], []])).toEqual([])
  })
})

describe('paginate - forced cuts (page pins, 2026-08-17 plan task 1)', () => {
  const pinBlocks: PageBlock[] = [
    { kind: 'line', topPx: 0, bottomPx: 80 },
    { kind: 'entry-gap', topPx: 80, bottomPx: 90 }, // candidate y = 85
    { kind: 'line', topPx: 90, bottomPx: 170 },
    { kind: 'section-gap', topPx: 170, bottomPx: 190 }, // candidate y = 180
    { kind: 'line', topPx: 190, bottomPx: 260 },
  ]

  it('(a) honors a forced cut at a legal gap exactly', () => {
    const r = paginate({ blocks: pinBlocks, contentHeightPx: 260, usablePageHeightPx: 300, forcedCutsPx: [85] })
    expect(r.cutsPx).toEqual([85])
    expect(r.pageCount).toBe(2)
  })

  it('(a2) forces a second page even when the content fits one page', () => {
    const r = paginate({ blocks: pinBlocks, contentHeightPx: 260, usablePageHeightPx: 1000, forcedCutsPx: [180] })
    expect(r.cutsPx).toEqual([180])
    expect(r.pageCount).toBe(2)
  })

  it('(b) drops a forced cut that falls inside ink and paginates normally', () => {
    const r = paginate({ blocks: pinBlocks, contentHeightPx: 260, usablePageHeightPx: 1000, forcedCutsPx: [120] })
    expect(r.cutsPx).toEqual([])
    expect(r.pageCount).toBe(1)
  })

  it('(b2) drops a forced cut immediately after a keepWithNext block', () => {
    const blocks: PageBlock[] = [
      { kind: 'line', topPx: 0, bottomPx: 40, keepWithNext: true },
      { kind: 'entry-gap', topPx: 40, bottomPx: 50 },
      { kind: 'line', topPx: 50, bottomPx: 120 },
    ]
    const r = paginate({ blocks, contentHeightPx: 120, usablePageHeightPx: 500, forcedCutsPx: [45] })
    expect(r.cutsPx).toEqual([])
    expect(r.pageCount).toBe(1)
  })

  it('(c) auto-paginates a span that is still taller than a page after a forced cut', () => {
    const blocks: PageBlock[] = [
      { kind: 'line', topPx: 0, bottomPx: 40 },
      { kind: 'section-gap', topPx: 40, bottomPx: 60 }, // forced here (y=50)
      { kind: 'line', topPx: 60, bottomPx: 140 },
      { kind: 'entry-gap', topPx: 140, bottomPx: 150 }, // auto candidate y = 145
      { kind: 'line', topPx: 150, bottomPx: 230 },
    ]
    const r = paginate({ blocks, contentHeightPx: 230, usablePageHeightPx: 100, forcedCutsPx: [50] })
    expect(r.cutsPx).toEqual([50, 145])
    expect(r.pageCount).toBe(3)
  })

  it('(d) honors two forced cuts', () => {
    const r = paginate({ blocks: pinBlocks, contentHeightPx: 260, usablePageHeightPx: 1000, forcedCutsPx: [85, 180] })
    expect(r.cutsPx).toEqual([85, 180])
    expect(r.pageCount).toBe(3)
  })

  it('(e) a forced cut equal to the natural choice produces no duplicate', () => {
    const blocks: PageBlock[] = [
      { kind: 'line', topPx: 0, bottomPx: 80 },
      { kind: 'section-gap', topPx: 80, bottomPx: 100 }, // natural + forced both y = 90
      { kind: 'line', topPx: 100, bottomPx: 190 },
    ]
    const r = paginate({ blocks, contentHeightPx: 190, usablePageHeightPx: 105, forcedCutsPx: [90] })
    expect(r.cutsPx).toEqual([90])
    expect(r.pageCount).toBe(2)
  })

  it('(f) ignores forced cuts at or beyond the content bounds', () => {
    const r = paginate({
      blocks: pinBlocks,
      contentHeightPx: 260,
      usablePageHeightPx: 1000,
      forcedCutsPx: [0, 260, 999],
    })
    expect(r.cutsPx).toEqual([])
    expect(r.pageCount).toBe(1)
  })
})

describe('chooseCut never overflows a page when an earlier cut exists', () => {
  // Budget 1000 => ideal 1000, window [820, 1000]. A dense two-column resume
  // can have NO legal cut in that window, because a cut needs both columns
  // clear at the same y. Measured on a real resume: the nearest candidate
  // below was 2242px, so page one was asked to hold 2242px of a 1073px page
  // and 27 skills were painted off the sheet and lost.
  const budget = 1000
  // The paper is taller than the usable budget by the artboard's padding —
  // exactly the slack the downward fallback is allowed to use.
  const paper = 1100

  it('cuts EARLIER rather than past the page budget', () => {
    const blocks: PageBlock[] = [
      { kind: 'line', topPx: 0, bottomPx: 400 },
      { kind: 'section-gap', topPx: 400, bottomPx: 420 }, // the only cut before the ideal
      { kind: 'line', topPx: 420, bottomPx: 1400 }, // unbreakable run across the boundary
      { kind: 'entry-gap', topPx: 1400, bottomPx: 1420 },
      { kind: 'line', topPx: 1420, bottomPx: 2000 },
      { kind: 'entry-gap', topPx: 2000, bottomPx: 2020 },
      { kind: 'line', topPx: 2020, bottomPx: 2600 },
    ]
    const { cutsPx } = paginate({ blocks, contentHeightPx: 2600, usablePageHeightPx: budget, maxPageHeightPx: paper })
    expect(cutsPx[0]).toBeLessThanOrEqual(budget)
    expect(cutsPx[0]).toBeCloseTo(410, 0)
  })

  it('still prefers a candidate inside the ideal window when one exists', () => {
    const blocks: PageBlock[] = [
      { kind: 'line', topPx: 0, bottomPx: 300 },
      { kind: 'section-gap', topPx: 300, bottomPx: 320 },
      { kind: 'line', topPx: 320, bottomPx: 900 },
      { kind: 'section-gap', topPx: 900, bottomPx: 940 }, // inside [820, 1000]
      { kind: 'line', topPx: 940, bottomPx: 1400 },
      { kind: 'entry-gap', topPx: 1400, bottomPx: 1420 },
      { kind: 'line', topPx: 1420, bottomPx: 1900 },
      { kind: 'entry-gap', topPx: 1900, bottomPx: 1920 },
      { kind: 'line', topPx: 1920, bottomPx: 2400 },
    ]
    const { cutsPx } = paginate({ blocks, contentHeightPx: 2400, usablePageHeightPx: budget, maxPageHeightPx: paper })
    expect(cutsPx[0]).toBeCloseTo(920, 0)
  })

  it('cuts AT the paper edge when the page has no legal cut at all', () => {
    // One unbreakable block taller than the paper. This used to cut after the
    // block (1820) on the reasoning that "overflow is unavoidable" — but
    // overflow is not a cosmetic problem: every pixel between the paper's
    // edge and the cut is painted off the sheet and is GONE from the file.
    // Splitting the block at the edge is ugly and lossless, so it wins.
    const blocks: PageBlock[] = [
      { kind: 'atomic', topPx: 0, bottomPx: 1800 },
      { kind: 'section-gap', topPx: 1800, bottomPx: 1820 },
      { kind: 'line', topPx: 1820, bottomPx: 2600 },
    ]
    const { cutsPx } = paginate({ blocks, contentHeightPx: 2600, usablePageHeightPx: budget, maxPageHeightPx: paper })
    expect(cutsPx[0]).toBeLessThanOrEqual(paper)
    expect(cutsPx.every((c, i) => c - (cutsPx[i - 1] ?? 0) <= paper)).toBe(true)
  })

  it('keeps every page within budget for a long gap-poor document', () => {
    const blocks: PageBlock[] = []
    for (let i = 0; i < 26; i++) {
      blocks.push({ kind: 'line', topPx: i * 100, bottomPx: i * 100 + 80 })
      blocks.push({ kind: 'entry-gap', topPx: i * 100 + 80, bottomPx: (i + 1) * 100 })
    }
    const { cutsPx } = paginate({ blocks, contentHeightPx: 2600, usablePageHeightPx: budget, maxPageHeightPx: paper })
    let top = 0
    for (const cut of cutsPx) {
      expect(cut - top).toBeLessThanOrEqual(budget + 1)
      top = cut
    }
  })
})

describe('chooseCut last resort: no ink may straddle the paper edge', () => {
  // A gap-poor sidebar can leave a page with no legal cut at all. Clamping to
  // the paper edge stopped the bulk of the loss, but a line straddling that
  // edge still had its baseline pushed off-sheet: measured with skills in a
  // 0.38 sidebar, one bullet's tail ("...ation cycle. Outcome 13.") was the
  // last string still missing from the export.
  it('cuts at the top of the block that crosses the paper edge', () => {
    const blocks: PageBlock[] = [
      { kind: 'line', topPx: 0, bottomPx: 1050 },
      { kind: 'line', topPx: 1050, bottomPx: 2000 }, // straddles paper (1100)
    ]
    const { cutsPx } = paginate({ blocks, contentHeightPx: 2000, usablePageHeightPx: 1000, maxPageHeightPx: 1100 })
    expect(cutsPx[0]).toBe(1050)
  })

  it('still splits a single block that is taller than the paper on its own', () => {
    const blocks: PageBlock[] = [{ kind: 'atomic', topPx: 0, bottomPx: 3000 }]
    const { cutsPx } = paginate({ blocks, contentHeightPx: 3000, usablePageHeightPx: 1000, maxPageHeightPx: 1100 })
    expect(cutsPx[0]).toBe(1100)
  })
})

describe('combineColumns — a heading flag must survive the merge (2026-08-23)', () => {
  // Measured on a real two-column export: the aside's own block list carried
  // a skill-group name with keepWithNext and the COMBINED list came back
  // without it, so the cut chooser saw nothing to protect and ended the page
  // on the group name with its keywords overleaf.
  //
  // The discriminator is the main column inking slightly PAST the aside's
  // label. Merging overwrote the whole run's flag from that last sliver,
  // where only the main column has ink and therefore only its "no" was
  // heard - although the aside had not moved on to anything, it was simply
  // in the gap between the label and its chips.
  it('keeps the flag when only the OTHER column inks past the label', () => {
    const main: PageBlock[] = [
      { kind: 'line', topPx: 1000, bottomPx: 1016 },
      { kind: 'line', topPx: 1020, bottomPx: 1100 },
    ]
    const aside: PageBlock[] = [
      { kind: 'line', topPx: 1000, bottomPx: 1015, keepWithNext: true },
      { kind: 'atomic', topPx: 1020, bottomPx: 1080 },
    ]
    const owner = combineColumns([main, aside]).find((b) => b.topPx <= 1005 && b.bottomPx >= 1015)
    expect(owner).toBeDefined()
    expect(owner!.keepWithNext).toBe(true)
  })

  it('releases the flag once the label’s OWN column moves on to content', () => {
    // The existing last-contributing-span rule must still hold: a heading
    // does not veto a later, unrelated gap once its own column has content.
    const main: PageBlock[] = [{ kind: 'line', topPx: 1000, bottomPx: 1100 }]
    const aside: PageBlock[] = [
      { kind: 'line', topPx: 1000, bottomPx: 1015, keepWithNext: true },
      { kind: 'atomic', topPx: 1020, bottomPx: 1100 },
    ]
    const owner = combineColumns([main, aside]).find((b) => b.bottomPx >= 1100)
    expect(owner!.keepWithNext).toBeUndefined()
  })
})

describe('paginate — stepping above a CHAIN of keep-with-next blocks', () => {
  // Taken from a real export (sapphire, 22% sidebar): a skill-group label at
  // 772-806 introduces its keywords at 808-1090, and the block above the
  // label is keepWithNext as well. Stepping up a single block moves the cut
  // off the straddling block and straight onto the label's own bottom edge,
  // which stranded "ETL, Automation & Integration" at the foot of the page
  // with its keywords overleaf. The step has to follow the whole chain.
  it('never lands a cut between a keep-with-next block and what it introduces', () => {
    const blocks: PageBlock[] = [
      { kind: 'line', topPx: 0, bottomPx: 595 },
      { kind: 'line', topPx: 597, bottomPx: 770, keepWithNext: true },
      { kind: 'line', topPx: 772, bottomPx: 806, keepWithNext: true }, // the label
      { kind: 'line', topPx: 808, bottomPx: 1090, keepWithNext: true }, // its keywords
      { kind: 'line', topPx: 1092, bottomPx: 1129 }, // straddles the paper edge
    ]
    const { cutsPx } = paginate({ blocks, contentHeightPx: 1400, usablePageHeightPx: 1000, maxPageHeightPx: 1123 })
    expect(cutsPx[0]).not.toBeGreaterThan(806)
  })
})

describe('paginate — the paper-edge clamp must not strand a label either', () => {
  // From a real export (sapphire, 34% sidebar, chip skills). The sidebar inks
  // straight through the main column's gaps, so the combined list offers no
  // candidate at all and the clamp fires. It returned the paper edge, which
  // fell exactly on the boundary after an entry label - stranding it with its
  // first body line overleaf. Cutting EARLIER than the edge can never lose
  // content (it only moves content to the next page), so the clamp can afford
  // to step above the label; only cutting LATER is destructive.
  it('steps above a keep-with-next block rather than clamping onto its edge', () => {
    const blocks: PageBlock[] = [
      { kind: 'line', topPx: 0, bottomPx: 898 },
      { kind: 'line', topPx: 898, bottomPx: 1123, keepWithNext: true }, // label
      { kind: 'line', topPx: 1123, bottomPx: 1442 }, // the body it introduces
    ]
    const { cutsPx } = paginate({ blocks, contentHeightPx: 1442, usablePageHeightPx: 1000, maxPageHeightPx: 1123 })
    expect(cutsPx[0]).toBe(898)
  })

  it('still clamps at the paper edge when stepping up would empty the page', () => {
    const blocks: PageBlock[] = [
      { kind: 'line', topPx: 0, bottomPx: 1123, keepWithNext: true }, // taller than the floor allows
      { kind: 'line', topPx: 1123, bottomPx: 1442 },
    ]
    const { cutsPx } = paginate({ blocks, contentHeightPx: 1442, usablePageHeightPx: 1000, maxPageHeightPx: 1123 })
    expect(cutsPx[0]).toBe(1123)
  })
})
