/**
 * A justified paragraph whose spaces stretch past the limit on any line but
 * its last is set ragged instead. The decision is pure arithmetic over the
 * measured lines, so it is tested here; the measuring is checked in a real
 * browser (_local/probe-loose.cjs).
 */
import { describe, it, expect } from 'vitest'
import { looseRatio, LOOSE_GAP_LIMIT } from './looseLines'

describe('looseRatio', () => {
  it('is the widest average gap of any line but the last, over the natural space', () => {
    // natural 4px; line 1 gaps average 6 (1.5x), line 2 average 9 (2.25x), last line ignored
    const lines = [[6, 6, 6], [9, 9], [20]]
    expect(looseRatio(lines, 4)).toBeCloseTo(2.25, 5)
  })

  it('ignores the last line, which a justified paragraph never stretches', () => {
    expect(looseRatio([[4, 4], [40]], 4)).toBeCloseTo(1, 5)
  })

  it('treats a one-line paragraph as never loose', () => {
    expect(looseRatio([[30, 30]], 4)).toBe(1)
  })

  it('skips lines with no gaps (one long word) and a missing natural width', () => {
    expect(looseRatio([[], [5, 5], []], 4)).toBeCloseTo(1.25, 5)
    expect(looseRatio([[9], []], 0)).toBe(1)
  })

  it('has a limit loose enough for ordinary justification, tight enough to catch rivers', () => {
    expect(LOOSE_GAP_LIMIT).toBeGreaterThan(1.4)
    expect(LOOSE_GAP_LIMIT).toBeLessThan(2.2)
  })
})
