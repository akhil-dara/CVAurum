import { describe, it, expect } from 'vitest'
import { resolveDecoBoxesGlobal } from './render'
import type { DecoBox } from './types'

describe('resolveDecoBoxesGlobal (task 15 fix round — no stale capture data across renders)', () => {
  it('capturing true: resolves to exactly the boxes collected for this render', () => {
    const boxes: DecoBox[] = [{ xPx: 1, yPx: 2, wPx: 3, hPx: 4 }]
    expect(resolveDecoBoxesGlobal(true, boxes)).toBe(boxes)
  })

  it('capturing false: resolves to undefined', () => {
    expect(resolveDecoBoxesGlobal(false, undefined)).toBeUndefined()
  })

  it('transition — capture on, then off: the second render must NOT leave the first render\'s boxes visible', () => {
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
