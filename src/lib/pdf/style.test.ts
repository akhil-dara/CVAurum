import { describe, it, expect } from 'vitest'
import { parseColor, parseFontWeight, parsePx } from './style'

describe('parseColor', () => {
  it('parses rgb()', () => {
    expect(parseColor('rgb(255, 0, 128)')).toEqual({ r: 1, g: 0, b: 128 / 255, a: 1 })
  })
  it('parses rgba() with alpha', () => {
    expect(parseColor('rgba(0, 0, 0, 0.5)')).toEqual({ r: 0, g: 0, b: 0, a: 0.5 })
  })
  it('treats transparent as fully transparent', () => {
    expect(parseColor('rgba(0, 0, 0, 0)')?.a).toBe(0)
  })
  it('returns null for keywords it cannot resolve in a non-browser environment', () => {
    // vitest's environment is 'node' (see vitest.config.ts) — no `document`,
    // so the last-resort canvas fallback is unreachable here and this must
    // return null rather than throw (task 13's explicit non-browser guard).
    expect(parseColor('none')).toBeNull()
  })

  // task 13: Chromium resolves color-mix(in srgb, X N%, transparent) — our
  // chip/dot/meter/pill/badge tints and several muted-text colors are all
  // authored that way — to this CSS Color 4 `color(srgb ...)` function
  // instead of rgb()/rgba(). Real getComputedStyle strings, captured from
  // the actual aurum template (task-13 report): a chip background and a
  // section-icon chip background.
  describe('color(srgb ...) — CSS Color 4, the color-mix() serialization', () => {
    it('parses color(srgb R G B) with 0..1 float channels, defaulting alpha to 1', () => {
      expect(parseColor('color(srgb 0.85098 0.27451 0.545098)')).toEqual({ r: 0.85098, g: 0.27451, b: 0.545098, a: 1 })
    })
    it('parses color(srgb R G B / A) with an explicit 0..1 alpha (aurum chip bg)', () => {
      expect(parseColor('color(srgb 0.752941 0.564706 0.184314 / 0.15)')).toEqual({
        r: 0.752941, g: 0.564706, b: 0.184314, a: 0.15,
      })
    })
    it('parses color(srgb ...) with percentage R/G/B channels', () => {
      expect(parseColor('color(srgb 50% 25% 75%)')).toEqual({ r: 0.5, g: 0.25, b: 0.75, a: 1 })
    })
    it('parses color(srgb ...) with a percentage alpha channel', () => {
      expect(parseColor('color(srgb 0.1 0.1 0.1 / 50%)')).toEqual({ r: 0.1, g: 0.1, b: 0.1, a: 0.5 })
    })
    it('parses color(srgb ...) mixing float channels with a percentage alpha (section-icon chip bg)', () => {
      expect(parseColor('color(srgb 0.109804 0.101961 0.0901961 / 0.14)')).toEqual({
        r: 0.109804, g: 0.101961, b: 0.0901961, a: 0.14,
      })
    })
    it('returns null for a malformed color() function rather than a garbage partial match', () => {
      expect(parseColor('color(display-p3 1 0 0)')).toBeNull() // not srgb
      expect(parseColor('color(srgb 1 0)')).toBeNull() // missing a channel
    })
  })

  it('falls through unrecognized forms (oklch/oklab/named colors) to null without a browser canvas', () => {
    // These SHOULD resolve via the canvas last-resort in a real browser
    // (verified live against the dev server — see the task-13 report) but
    // vitest has no `document`, so parseColor must degrade to null, not throw.
    expect(parseColor('oklch(60% 0.15 250)')).toBeNull()
    expect(parseColor('rebeccapurple')).toBeNull()
  })
})

describe('parseFontWeight', () => {
  it('maps keywords and numbers', () => {
    expect(parseFontWeight('bold')).toBe(700)
    expect(parseFontWeight('normal')).toBe(400)
    expect(parseFontWeight('600')).toBe(600)
  })
})

describe('parsePx', () => {
  it('reads a px length', () => {
    expect(parsePx('12.5px')).toBeCloseTo(12.5, 5)
    expect(parsePx('')).toBe(0)
  })
})
