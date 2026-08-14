import { describe, it, expect } from 'vitest'
import { resolveFontKey } from './fonts'

const INDEX = { 'inter|400': 'a.ttf', 'inter|700': 'b.ttf', 'playfair-display|500': 'c.ttf' }

describe('resolveFontKey', () => {
  it('finds an exact family and weight', () => {
    expect(resolveFontKey(INDEX, 'Inter', 400)).toBe('inter|400')
  })
  it('normalises a CSS font-family stack to the first family', () => {
    expect(resolveFontKey(INDEX, '"Playfair Display", Georgia, serif', 500)).toBe('playfair-display|500')
  })
  it('falls back to the nearest weight in the same family', () => {
    expect(resolveFontKey(INDEX, 'Inter', 600)).toBe('inter|700')
    expect(resolveFontKey(INDEX, 'Inter', 300)).toBe('inter|400')
  })
  it('returns null when the family is absent', () => {
    expect(resolveFontKey(INDEX, 'Comic Sans MS', 400)).toBeNull()
  })
})
