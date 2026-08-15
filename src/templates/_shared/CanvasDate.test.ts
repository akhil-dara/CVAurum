import { describe, expect, it } from 'vitest'
import { nextRangeEnd } from './CanvasDate'

// Fixed "now" so the granularity/comparison logic is deterministic regardless
// of the day the suite actually runs.
const NOW = new Date(2026, 7, 15) // August 15, 2026

describe('nextRangeEnd', () => {
  it('advances a past month-granularity start to the current year-month', () => {
    // start (May 2020) + 1 month is still long before "now" -> clamp to now.
    expect(nextRangeEnd('2020-05', NOW)).toBe('2026-08')
  })

  it('advances a future month-granularity start by one month', () => {
    // This is the user's reported trap: start Oct 2028, Present ticked.
    // start + 1 month (Nov 2028) is later than "now" -> use start + 1 month.
    expect(nextRangeEnd('2028-10', NOW)).toBe('2028-11')
  })

  it('rolls a December month-granularity start into January of the next year', () => {
    expect(nextRangeEnd('2028-12', NOW)).toBe('2029-01')
  })

  it('advances a past year-only start to the current year', () => {
    expect(nextRangeEnd('2020', NOW)).toBe('2026')
  })

  it('advances a future year-only start by one year', () => {
    expect(nextRangeEnd('2028', NOW)).toBe('2029')
  })

  it('falls back to the current year-month for an empty start', () => {
    expect(nextRangeEnd('', NOW)).toBe('2026-08')
  })

  it('always returns a value distinct from start (never re-triggers single-date mode)', () => {
    for (const start of ['', '2020-05', '2028-10', '2028-12', '2020', '2028', '2026-08']) {
      expect(nextRangeEnd(start, NOW)).not.toBe(start)
    }
  })
})
