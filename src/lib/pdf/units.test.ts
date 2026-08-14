import { describe, it, expect } from 'vitest'
import { PT_PER_PX, pxToPt, flipY } from './units'

describe('units', () => {
  it('converts CSS px to PDF points', () => {
    expect(PT_PER_PX).toBeCloseTo(0.75, 5)
    expect(pxToPt(96)).toBeCloseTo(72, 5)
    expect(pxToPt(0)).toBe(0)
  })

  it('flips the y axis from DOM (top-down) to PDF (bottom-up)', () => {
    expect(flipY(0, 842)).toBeCloseTo(842, 5)
    expect(flipY(842, 842)).toBeCloseTo(0, 5)
    expect(flipY(100, 842)).toBeCloseTo(742, 5)
  })

  it('maps an A4 page height from px to pt', () => {
    // 297mm at 96dpi = 1122.5px -> 841.9pt, the standard A4 height.
    expect(pxToPt(1122.52)).toBeCloseTo(841.89, 1)
  })
})
