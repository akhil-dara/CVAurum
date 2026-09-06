import { describe, it, expect, vi } from 'vitest'

// atoms.tsx pulls in the sanitizer for RichText, and the sanitizer wraps a
// DOM purifier that needs a window; this suite runs under plain node.
vi.mock('@/lib/sanitize', () => ({ sanitizeHtml: (html: string) => html }))

import { ringPath } from './atoms'

/**
 * A ring meter is a FILLED annular arc: an outer arc, a line to the inner
 * radius, an inner arc back and a close, so one svg holds one fill and the
 * painter (one fill per svg) draws it whole. Angles are measured from twelve
 * o'clock, clockwise, so a half ring ends at six.
 */
describe('ringPath', () => {
  it('a full arc is one closed path', () => {
    const d = ringPath(30, 30, 24, 0, 359.999)
    expect(d.startsWith('M ')).toBe(true)
    expect(d.trim().endsWith('Z')).toBe(true)
  })

  it('a half arc has exactly two arc commands and ends at six o clock', () => {
    const d = ringPath(30, 30, 24, 0, 180)
    expect(d.match(/A /g)?.length).toBe(2)
    // Outer radius 27 straight down from the centre: x stays 30, y is 57.
    expect(d).toContain('30 57')
    // Inner radius 21: back up to 51 on the same vertical.
    expect(d).toContain('30 51')
    // Half a turn is not the large arc.
    expect(d).not.toMatch(/A 27 27 0 1/)
  })

  it('more than half a turn takes the large arc', () => {
    expect(ringPath(30, 30, 24, 0, 270)).toMatch(/A 27 27 0 1 1/)
  })

  it('an empty sweep is no path at all', () => {
    expect(ringPath(30, 30, 24, 0, 0)).toBe('')
    expect(ringPath(30, 30, 24, 90, 45)).toBe('')
  })
})
