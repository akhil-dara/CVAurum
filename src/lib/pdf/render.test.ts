import { describe, it, expect } from 'vitest'
import {
  resolveDecoBoxesGlobal,
  verticalPaddingPx,
  computeUsablePageHeightPx,
  paginateOrThrow,
  PdfMultiPageUnsupportedError,
} from './render'
import { PaginationImpossibleError } from './paginate'
import type { PageBlock } from './paginate'
import type { DecoBox } from './types'

describe('resolveDecoBoxesGlobal (task 15 fix round — no stale capture data across renders)', () => {
  it('capturing true: resolves to exactly the boxes collected for this render', () => {
    const boxes: DecoBox[] = [{ xPx: 1, yPx: 2, wPx: 3, hPx: 4 }]
    expect(resolveDecoBoxesGlobal(true, boxes)).toBe(boxes)
  })

  it('capturing false: resolves to undefined', () => {
    expect(resolveDecoBoxesGlobal(false, undefined)).toBeUndefined()
  })

  it("transition — capture on, then off: the second render must NOT leave the first render's boxes visible", () => {
    // Mirrors exactly how renderResumePdf uses this: each render assigns
    // `window.__cvaLastDecoBoxes = resolveDecoBoxesGlobal(capturing, decoBoxes)`
    // unconditionally. The bug this guards against was `if (capturing)
    // window.__cvaLastDecoBoxes = decoBoxes` — which only ever WROTE when
    // capturing was true, so turning capture off for a later render left the
    // PRIOR render's boxes sitting there unchanged (stale data).
    const win: { __cvaLastDecoBoxes?: DecoBox[] } = {}

    // Render 1: capture ON, one decorative box found.
    const decoBoxesRender1: DecoBox[] = [{ xPx: 10, yPx: 20, wPx: 5, hPx: 6 }]
    win.__cvaLastDecoBoxes = resolveDecoBoxesGlobal(true, decoBoxesRender1)
    expect(win.__cvaLastDecoBoxes).toEqual(decoBoxesRender1)

    // Render 2: capture OFF (harness cleared the flag before this render) —
    // must clear the global, not keep render 1's boxes around.
    win.__cvaLastDecoBoxes = resolveDecoBoxesGlobal(false, undefined)
    expect(win.__cvaLastDecoBoxes).toBeUndefined()
  })

  it('transition — capture on, then on again with zero decorative runs: still overwrites (not stale), just with an empty array', () => {
    const win: { __cvaLastDecoBoxes?: DecoBox[] } = {}
    win.__cvaLastDecoBoxes = resolveDecoBoxesGlobal(true, [{ xPx: 1, yPx: 1, wPx: 1, hPx: 1 }])
    expect(win.__cvaLastDecoBoxes?.length).toBe(1)

    win.__cvaLastDecoBoxes = resolveDecoBoxesGlobal(true, [])
    expect(win.__cvaLastDecoBoxes).toEqual([])
  })
})

describe('verticalPaddingPx (native-multipage-pdf plan, task 3 — spec 3 usable-page-height input)', () => {
  it('parses paddingTop/paddingBottom CSS px strings into plain numbers', () => {
    expect(verticalPaddingPx({ paddingTop: '48px', paddingBottom: '48px' })).toEqual({ topPx: 48, bottomPx: 48 })
  })

  it('handles asymmetric top/bottom padding independently', () => {
    expect(verticalPaddingPx({ paddingTop: '30px', paddingBottom: '12px' })).toEqual({ topPx: 30, bottomPx: 12 })
  })

  it('defaults an unparseable/empty padding to 0 (parsePx behavior)', () => {
    expect(verticalPaddingPx({ paddingTop: '', paddingBottom: 'auto' })).toEqual({ topPx: 0, bottomPx: 0 })
  })
})

describe('computeUsablePageHeightPx', () => {
  it('subtracts top+bottom padding from the full A4 page height', () => {
    expect(computeUsablePageHeightPx(1123, { topPx: 48, bottomPx: 48 })).toBe(1123 - 96)
  })

  it('applies the SAME subtraction regardless of asymmetric top/bottom split', () => {
    expect(computeUsablePageHeightPx(1000, { topPx: 30, bottomPx: 12 })).toBe(958)
  })

  it('returns the full page height unchanged when padding is zero', () => {
    expect(computeUsablePageHeightPx(1123, { topPx: 0, bottomPx: 0 })).toBe(1123)
  })
})

describe('paginateOrThrow — wraps PaginationImpossibleError as PdfMultiPageUnsupportedError (task 3)', () => {
  it('returns the normal Pagination result unchanged when a legal break exists', () => {
    const blocks: PageBlock[] = [
      { kind: 'line', topPx: 0, bottomPx: 80 },
      { kind: 'section-gap', topPx: 80, bottomPx: 100 },
      { kind: 'line', topPx: 100, bottomPx: 190 },
    ]
    const result = paginateOrThrow({ blocks, contentHeightPx: 190, usablePageHeightPx: 105 })
    expect(result).toEqual({ cutsPx: [90], pageCount: 2 })
  })

  it('a single-page document (no overflow) returns no cuts, unchanged', () => {
    const blocks: PageBlock[] = [{ kind: 'line', topPx: 0, bottomPx: 50 }]
    expect(paginateOrThrow({ blocks, contentHeightPx: 50, usablePageHeightPx: 100 })).toEqual({
      cutsPx: [],
      pageCount: 1,
    })
  })

  it('wraps PaginationImpossibleError (a block taller than a page, no internal gap) as PdfMultiPageUnsupportedError', () => {
    const blocks: PageBlock[] = [{ kind: 'atomic', topPx: 0, bottomPx: 150 }]
    expect(() => paginateOrThrow({ blocks, contentHeightPx: 150, usablePageHeightPx: 100 })).toThrow(
      PdfMultiPageUnsupportedError
    )
  })

  it('the wrapped error is NOT an instance of PaginationImpossibleError — genuinely a different, exported error type', () => {
    const blocks: PageBlock[] = [{ kind: 'atomic', topPx: 0, bottomPx: 150 }]
    let caught: unknown
    try {
      paginateOrThrow({ blocks, contentHeightPx: 150, usablePageHeightPx: 100 })
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(PdfMultiPageUnsupportedError)
    expect(caught).not.toBeInstanceOf(PaginationImpossibleError)
  })
})
