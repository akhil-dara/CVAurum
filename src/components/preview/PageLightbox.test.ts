import { describe, it, expect } from 'vitest'
import { isSwipe, stepIndex } from './PageLightbox'

/**
 * The two decisions inside the lightbox that can be wrong without anyone
 * noticing on a desk.
 *
 * The rest of it — the focus trap, Escape, the backdrop, the bottom bar's
 * reach — needs a real DOM and a real pointer, and this repo's runner has
 * neither (vitest.config.ts: environment 'node', no jsdom). Those are checked
 * against the production build with Playwright instead, at 1440x900 and
 * 375x812; see _local/lightbox-probe.cjs.
 */
describe('walking the collection', () => {
  it('wraps at both ends, so neither arrow is ever dead', () => {
    expect(stepIndex(0, 1, 108)).toBe(1)
    expect(stepIndex(107, 1, 108)).toBe(0)
    expect(stepIndex(0, -1, 108)).toBe(107)
  })

  it('stays in range for a collection of one', () => {
    expect(stepIndex(0, 1, 1)).toBe(0)
    expect(stepIndex(0, -1, 1)).toBe(0)
    expect(stepIndex(0, 1, 0)).toBe(0)
  })
})

describe('a swipe on a phone', () => {
  it('takes a clear sideways drag', () => {
    expect(isSwipe(-120, 10)).toBe(true)
    expect(isSwipe(120, -12)).toBe(true)
  })

  it('ignores the sideways drift of a thumb scrolling the page', () => {
    // A flick down the page: far more vertical than horizontal.
    expect(isSwipe(60, 220)).toBe(false)
    // And a diagonal that is not decisively across.
    expect(isSwipe(70, 60)).toBe(false)
  })

  it('ignores a tap that moved a few pixels', () => {
    expect(isSwipe(4, 2)).toBe(false)
    expect(isSwipe(50, 0)).toBe(false)
  })
})
