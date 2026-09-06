import { describe, it, expect, vi } from 'vitest'

// atoms.tsx pulls in the sanitizer for RichText, and the sanitizer wraps a
// DOM purifier that needs a window; this suite runs under plain node.
vi.mock('@/lib/sanitize', () => ({ sanitizeHtml: (html: string) => html }))

import { ringPath } from './atoms'

/** Every arc command in a path as [start, end] points, walking M/L/A. */
function arcs(d: string): { from: [number, number]; to: [number, number] }[] {
  const out: { from: [number, number]; to: [number, number] }[] = []
  let cur: [number, number] = [NaN, NaN]
  for (const seg of d.match(/[MLAZ][^MLAZ]*/g) ?? []) {
    const cmd = seg[0]
    const n = seg.slice(1).trim().split(/\s+/).filter(Boolean).map(Number)
    if (cmd === 'M' || cmd === 'L') cur = [n[0], n[1]]
    else if (cmd === 'A') {
      const to: [number, number] = [n[5], n[6]]
      out.push({ from: cur, to })
      cur = to
    }
  }
  return out
}

/**
 * A ring meter is a FILLED annular arc: an outer arc, a line to the inner
 * radius, an inner arc back and a close, so one svg holds one fill and the
 * painter (one fill per svg) draws it whole. Angles are measured from twelve
 * o'clock, clockwise, so a half ring ends at six.
 */
describe('ringPath', () => {
  it('a full turn is one closed path of two half arcs per radius', () => {
    // An arc whose endpoints coincide is dropped by every renderer, so a
    // full circle must be two halves, the way a <circle> is walked.
    const d = ringPath(30, 30, 24, 0, 360)
    expect(d.startsWith('M ')).toBe(true)
    expect(d.trim().endsWith('Z')).toBe(true)
    const a = arcs(d)
    expect(a.length).toBe(4)
    for (const { from, to } of a) {
      expect(from).not.toEqual(to)
    }
    // Outer: top to bottom and back; inner: the same on the smaller radius.
    expect(d).toMatch(/^M 30 3 A 27 27 0 1 1 30 57 A 27 27 0 1 1 30 3 L 30 9 A 21 21 0 1 0 30 51 A 21 21 0 1 0 30 9 Z$/)
  })

  it('a sweep past a full turn is the full turn', () => {
    expect(ringPath(30, 30, 24, 0, 400)).toBe(ringPath(30, 30, 24, 0, 360))
  })

  it('a half arc has exactly two arc commands and ends at six o clock', () => {
    const d = ringPath(30, 30, 24, 0, 180)
    expect(d.match(/A /g)?.length).toBe(2)
    for (const { from, to } of arcs(d)) {
      expect(from).not.toEqual(to)
    }
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
