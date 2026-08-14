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
  it('returns null for keywords it cannot resolve', () => {
    expect(parseColor('none')).toBeNull()
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
