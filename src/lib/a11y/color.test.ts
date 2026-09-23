import { describe, expect, it } from 'vitest'
import { luminance, mixRgba, over, parseColor, quantise, ratio, toHex, type Rgba } from './color'
import { colorAt, groundsUnder, parseGradient, spanUnder, splitLayers } from './gradient'
import { isLargeText, ptFromPx, requiredRatio, drawnPt, fails, coverage, boxContains } from './geometry'
import { contrastRatio } from '@/lib/elementColors'

const hex = (s: string) => parseColor(s) as Rgba

describe('parseColor', () => {
  it('reads every form a computed style hands back', () => {
    expect(parseColor('rgb(37, 99, 235)')).toEqual([37, 99, 235, 1])
    expect(parseColor('rgba(37, 99, 235, 0.5)')).toEqual([37, 99, 235, 0.5])
    expect(parseColor('#2563eb')).toEqual([37, 99, 235, 1])
    expect(parseColor('#fff')).toEqual([255, 255, 255, 1])
    expect(parseColor('color(srgb 0 0.5 1 / 0.25)')).toEqual([0, 127.5, 255, 0.25])
  })

  it('reads transparent as a colour with no alpha, not as a failure', () => {
    expect(parseColor('transparent')).toEqual([0, 0, 0, 0])
    expect(parseColor('none')).toBeNull()
    expect(parseColor('')).toBeNull()
  })
})

describe('the ratio', () => {
  it('agrees with the derivation side for the same pair', () => {
    for (const [a, b] of [
      ['#1a1a1a', '#ffffff'],
      ['#5b6472', '#ffffff'],
      ['#2563eb', '#ffffff'],
      ['#e2e8f0', '#0f172a'],
    ]) {
      expect(ratio(hex(a), hex(b))).toBeCloseTo(contrastRatio(a, b), 6)
    }
  })

  it('is 21 for black on white and 1 for a colour on itself', () => {
    expect(ratio(hex('#000'), hex('#fff'))).toBeCloseTo(21, 6)
    expect(ratio(hex('#2563eb'), hex('#2563eb'))).toBeCloseTo(1, 6)
  })
})

describe('alpha', () => {
  it('resolves an ink against what is behind it', () => {
    // Half-strength black on white is the grey a browser paints, not black.
    const painted = quantise(over([0, 0, 0, 0.5], [255, 255, 255, 1]))
    expect(toHex(painted)).toBe('#808080')
    expect(ratio(painted, hex('#ffffff'))).toBeLessThan(ratio(hex('#000'), hex('#fff')))
  })

  it('leaves an opaque ink exactly where it was', () => {
    expect(over([12, 34, 56, 1], [255, 255, 255, 1])).toEqual([12, 34, 56, 1])
  })
})

describe('a fade', () => {
  it('splits the layers of a background-image without breaking its brackets', () => {
    const img = 'linear-gradient(135deg, rgb(1, 2, 3) 0%, rgb(4, 5, 6) 100%), url("a.png")'
    expect(splitLayers(img)).toEqual(['linear-gradient(135deg, rgb(1, 2, 3) 0%, rgb(4, 5, 6) 100%)', 'url("a.png")'])
  })

  it('spreads the positions a stop did not name', () => {
    const g = parseGradient('linear-gradient(to right, rgb(0, 0, 0), rgb(128, 128, 128), rgb(255, 255, 255))')
    expect(g?.angle).toBe(90)
    expect(g?.stops.map((s) => s.at)).toEqual([0, 0.5, 1])
  })

  it('is DARKER in the middle than at either end when the ends match in lightness', () => {
    // The fact elementColors.ts gradientGrounds records from the other side:
    // a lerp in sRGB is not a lerp in luminance, so the stops are not the
    // extremes of the ground and a checker that measured the stops alone
    // would miss the belly of the fade.
    const g = parseGradient('linear-gradient(to right, rgb(180, 0, 0) 0%, rgb(0, 0, 255) 100%)')!
    const mid = colorAt(g.stops, 0.5)
    expect(luminance(mid)).toBeLessThan(Math.min(luminance(g.stops[0].color), luminance(g.stops[1].color)))
  })

  it('samples only the stretch that is under the words', () => {
    const g = parseGradient('linear-gradient(to right, rgb(0, 0, 0) 0%, rgb(255, 255, 255) 100%)')!
    const band = { x: 0, y: 0, w: 400, h: 100 }
    // A name at the left edge stands on the dark end and nowhere near the
    // light one: measuring it against the far end reports a failure the file
    // cannot see, because the file samples the ground under the span.
    const left = { x: 4, y: 20, w: 60, h: 20 }
    const [lo, hi] = spanUnder(g, band, left)
    expect(lo).toBeCloseTo(0.01, 2)
    expect(hi).toBeCloseTo(0.16, 2)
    const under = groundsUnder(g, band, left)
    expect(Math.max(...under.map(luminance))).toBeLessThan(luminance([255, 255, 255, 1]) * 0.05)
  })

  it('reads a vertical fade as running down the page', () => {
    const g = parseGradient('linear-gradient(rgb(0, 0, 0), rgb(255, 255, 255))')!
    expect(g.angle).toBe(180)
    const band = { x: 0, y: 0, w: 100, h: 100 }
    expect(spanUnder(g, band, { x: 0, y: 90, w: 100, h: 10 })[0]).toBeCloseTo(0.9, 5)
  })

  it('mixes in sRGB, the space a plain fade interpolates in', () => {
    expect(mixRgba([0, 0, 0, 1], [10, 20, 30, 1], 0.5)).toEqual([5, 10, 15, 1])
  })
})

describe('the size rule', () => {
  it('measures points, not pixels', () => {
    expect(ptFromPx(24)).toBe(18)
    // 18px is 13.5pt: small text, and a checker reading pixels would wave it
    // through at 3:1.
    expect(isLargeText(ptFromPx(18), 400)).toBe(false)
    expect(requiredRatio(ptFromPx(18), 400)).toBe(4.5)
  })

  it('takes 14pt bold and 18pt plain as large text', () => {
    expect(requiredRatio(14, 700)).toBe(3)
    expect(requiredRatio(14, 400)).toBe(4.5)
    expect(requiredRatio(18, 400)).toBe(3)
  })

  it('does not fault a pair that is short by a rounding', () => {
    expect(fails(4.4999, 4.5)).toBe(false)
    expect(fails(4.49, 4.5)).toBe(true)
  })
})

describe('boxes', () => {
  it('knows a layer that covers the words from one that only clips them', () => {
    const words = { x: 10, y: 10, w: 100, h: 20 }
    expect(boxContains({ x: 0, y: 0, w: 200, h: 50 }, words)).toBe(true)
    expect(boxContains({ x: 0, y: 0, w: 60, h: 50 }, words)).toBe(false)
    expect(coverage({ x: 0, y: 0, w: 60, h: 50 }, words)).toBeCloseTo(0.5, 5)
  })
})

describe('small capitals', () => {
  it('holds the run to the size its lowercase letters are DRAWN at', () => {
    // No bundled face ships a real small-capitals feature, so a name set at
    // 24pt draws "lex" at the reduced size - small text at 4.5:1, not large
    // text at 3:1. Measured against the computed 24pt, a gold name passed
    // here at 3.62:1 while the file faulted it.
    expect(drawnPt(24, 'Alex', 0.716)).toBeCloseTo(17.18, 2)
    expect(requiredRatio(drawnPt(24, 'Alex', 0.716), 400)).toBe(4.5)
    // A run already in capitals has nothing reduced.
    expect(drawnPt(24, 'ALEX', 0.716)).toBe(24)
    expect(requiredRatio(drawnPt(24, 'ALEX', 0.716), 400)).toBe(3)
    // ...and a run that is not in small capitals is never reduced.
    expect(drawnPt(24, 'Alex', 0)).toBe(24)
    expect(drawnPt(24, 'Alex', undefined)).toBe(24)
  })
})
