/**
 * Widow/orphan control for paginated résumés (2026-08-23 user report: a page
 * break split a three-line paragraph and left the single word "Excel." alone
 * at the top of page 3).
 */
import { describe, it, expect } from 'vitest'
import { keepFlagsForParagraph } from './widows'

/** Which internal cuts a flag set still allows: a cut after line i is legal
 *  when flags[i] is false and i is not the paragraph's last line. */
const legalCuts = (flags: boolean[]) => flags.map((f, i) => (!f && i < flags.length - 1 ? i : -1)).filter((i) => i >= 0)

describe('keepFlagsForParagraph', () => {
  it('never splits a two-line paragraph', () => {
    expect(legalCuts(keepFlagsForParagraph(2))).toEqual([])
  })

  it('never splits a three-line paragraph — the reported "Excel." case', () => {
    // Lines: "Project: ITSM Analytics…", "Environment: … ServiceNow,", "Excel."
    // Cutting before the last line would strand one word on the next page.
    expect(legalCuts(keepFlagsForParagraph(3))).toEqual([])
  })

  // Changed 2026-08-23. Two lines either side meets the typographic minimum,
  // but this is precisely the split that was reported: a four-line bullet cut
  // 2/2 at a page boundary, which on a two-column page put the ENTIRE sidebar
  // between the halves in the copied text, because each page emits its main
  // column then its sidebar. A bullet this short should move whole instead.
  it('does NOT split a four-line paragraph — it fits a page on its own', () => {
    expect(legalCuts(keepFlagsForParagraph(4))).toEqual([])
  })

  it('allows a paragraph past the bound to split, two lines either side', () => {
    // The bound is what makes the rule universal: any run the reader sees as
    // one value moves whole. Past it, the original rule takes over, because
    // refusing to split a genuinely long paragraph would strand whole pages.
    expect(legalCuts(keepFlagsForParagraph(13))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('keeps at least two lines on both sides of any cut', () => {
    for (let n = 1; n <= 12; n++) {
      for (const i of legalCuts(keepFlagsForParagraph(n))) {
        expect(i + 1).toBeGreaterThanOrEqual(2) // lines left behind
        expect(n - i - 1).toBeGreaterThanOrEqual(2) // lines carried over
      }
    }
  })

  it('never binds the LAST line, so a cut after a whole paragraph stays legal', () => {
    for (let n = 1; n <= 8; n++) expect(keepFlagsForParagraph(n)[n - 1]).toBe(false)
  })

  it('leaves a single-line paragraph completely unconstrained', () => {
    expect(keepFlagsForParagraph(1)).toEqual([false])
  })

  it('honours a stricter minimum when asked', () => {
    // minLines 3 => a cut needs three lines on each side. Measured above the
    // keep-whole bound, since at or below it nothing splits at all.
    expect(legalCuts(keepFlagsForParagraph(14, 3))).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(legalCuts(keepFlagsForParagraph(13, 12))).toEqual([])
  })

  it('is empty for a zero-line paragraph rather than throwing', () => {
    expect(keepFlagsForParagraph(0)).toEqual([])
  })
})

/**
 * The rule reaches the paginator through `keepWithNext`, so prove it there
 * too: a three-line paragraph straddling the page budget must move WHOLE
 * rather than leave its last line stranded (the reported "Excel." break).
 */
import { paginate, type PageBlock } from './paginate'

function paragraph(topPx: number, lineCount: number, lineH = 14): PageBlock[] {
  const keep = keepFlagsForParagraph(lineCount)
  return Array.from({ length: lineCount }, (_, i) => ({
    kind: 'line' as const,
    topPx: topPx + i * lineH,
    bottomPx: topPx + i * lineH + lineH - 2,
    ...(keep[i] ? { keepWithNext: true as const } : {}),
  }))
}

describe('paginate honours the widow rule', () => {
  // A page of filler lines, then a 3-line paragraph that straddles the budget.
  const budget = 300
  const filler = paragraph(0, 20) // 20 lines * 14px = 280px, ends at 278
  const para = paragraph(282, 3) // lines at 282, 296, 310 — the budget cuts it
  const blocks = [...filler, ...para]
  const contentHeightPx = 340

  it('does not cut between the paragraph lines, so no single line is stranded', () => {
    const { cutsPx } = paginate({ blocks, contentHeightPx, usablePageHeightPx: budget })
    for (const cut of cutsPx) {
      const above = para.filter((l) => l.topPx < cut).length
      const below = para.length - above
      if (above > 0 && below > 0) {
        expect(above).toBeGreaterThanOrEqual(2)
        expect(below).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it('WOULD strand a line without the rule — proving the flags are what prevent it', () => {
    // Same geometry, flags removed: the paginator is then free to cut between
    // the paragraph's 2nd and 3rd lines.
    const unflagged = blocks.map(({ keepWithNext, ...b }) => {
      void keepWithNext
      return b
    })
    const { cutsPx } = paginate({ blocks: unflagged, contentHeightPx, usablePageHeightPx: budget })
    const stranded = cutsPx.some((cut) => {
      const above = para.filter((l) => l.topPx < cut).length
      const below = para.length - above
      return above > 0 && below > 0 && (above < 2 || below < 2)
    })
    expect(stranded).toBe(true)
  })
})

describe('keepFlagsForParagraph — a short paragraph is not split at all (2026-08-23)', () => {
  // Reported against a real two-column export: a bullet was torn in half at a
  // page boundary, so the ENTIRE sidebar sat between its two halves in the
  // copied text - "...cutting manual" [30 lines of skills] "reporting effort
  // by ~40%...". Per-page column order is right and cannot put the sidebar
  // anywhere else, so the fix is not to break the bullet.
  //
  // Two lines either side satisfies the typographic minimum but still allows
  // exactly that split. A paragraph short enough to fit a page on its own
  // should move whole instead.
  it('flags every line but the last, so a short paragraph can only break after it', () => {
    expect(keepFlagsForParagraph(3)).toEqual([true, true, false])
    expect(keepFlagsForParagraph(4)).toEqual([true, true, true, false])
  })

  it('still allows a LONG paragraph to split, with two lines either side', () => {
    // Past the keep-whole bound; refusing to split these would strand pages.
    const flags = keepFlagsForParagraph(15)
    expect(flags[0]).toBe(true)
    expect(flags[1]).toBe(false)
    expect(flags[12]).toBe(false)
    expect(flags[13]).toBe(true)
    expect(flags[14]).toBe(false)
  })
})
