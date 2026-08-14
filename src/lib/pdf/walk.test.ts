import { describe, it, expect } from 'vitest'
import { parseLinearGradient, pseudoContentText } from './walk'

describe('pseudoContentText', () => {
  it('unwraps a quoted content string', () => {
    expect(pseudoContentText('"|"')).toBe('|')
    expect(pseudoContentText("'-'")).toBe('-')
  })
  it('treats none/normal as empty', () => {
    expect(pseudoContentText('none')).toBe('')
    expect(pseudoContentText('normal')).toBe('')
  })
  it('ignores non-string content like counters and images', () => {
    expect(pseudoContentText('counter(x)')).toBe('')
    expect(pseudoContentText('url("a.png")')).toBe('')
  })
  it('decodes an escaped unicode glyph', () => {
    expect(pseudoContentText('"\\2022"')).toBe('\u2022')
  })
})

describe('parseLinearGradient', () => {
  // Real getComputedStyle().backgroundImage strings, captured from the
  // actual creative/spotlight templates (task-10c report) — not invented.
  it('parses an explicit-angle gradient with rgb() stops (spotlight header banner)', () => {
    const g = parseLinearGradient('linear-gradient(120deg, rgb(79, 70, 229), color(srgb 0.85098 0.27451 0.545098))')
    expect(g).toEqual({
      angleDeg: 120,
      stops: [
        { r: 79 / 255, g: 70 / 255, b: 229 / 255, a: 1 },
        { r: 0.85098, g: 0.27451, b: 0.545098, a: 1 },
      ],
    })
  })

  it('defaults to 180deg when Chromium elides the angle (creative sidebar)', () => {
    // 180deg ("to bottom") is linear-gradient()'s own default direction —
    // Chromium's computed-style serializer omits it entirely when the
    // gradient was authored with an explicit 180deg, confirmed empirically
    // (see the report): this was the actual bug that left the sidebar
    // background unpainted even after the header banner's (non-default
    // angle, never elided) gradient started working.
    const g = parseLinearGradient('linear-gradient(rgb(109, 40, 217), color(srgb 0.299216 0.109804 0.595686))')
    expect(g?.angleDeg).toBe(180)
    expect(g?.stops[0]).toEqual({ r: 109 / 255, g: 40 / 255, b: 217 / 255, a: 1 })
  })

  it('returns null for a plain color / none (the overwhelming common case)', () => {
    expect(parseLinearGradient('none')).toBeNull()
    expect(parseLinearGradient('')).toBeNull()
  })

  it('returns null for gradient shapes it does not claim to support (radial, keyword direction, 3+ stops)', () => {
    expect(parseLinearGradient('radial-gradient(circle, red, blue)')).toBeNull()
    expect(parseLinearGradient('linear-gradient(to right, rgb(0, 0, 0), rgb(255, 255, 255))')).toBeNull()
    expect(parseLinearGradient('linear-gradient(90deg, rgb(0, 0, 0), rgb(128, 128, 128), rgb(255, 255, 255))')).toBeNull()
  })
})
