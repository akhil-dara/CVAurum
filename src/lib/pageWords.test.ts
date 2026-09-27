import { describe, expect, it } from 'vitest'
import { fileReference, kickerPlace, pageFootText } from './pageWords'

/**
 * The words the decorative page furniture prints: the page foot's number and
 * the kicker line over the name (Flare, Dossier and the designs after them).
 * All decoration - none of it reaches a parser - but the exporter and the
 * canvas must agree on it to the character.
 */
describe('pageFootText', () => {
  it('numbers every page of a longer document', () => {
    expect(pageFootText(1, 2)).toBe('1 / 2')
    expect(pageFootText(2, 2)).toBe('2 / 2')
  })
  it('says nothing on a single page, unless the design has a closing word', () => {
    expect(pageFootText(1, 1)).toBe('')
    expect(pageFootText(1, 1, { end: 'End of file' })).toBe('End of file')
  })
  it('puts the closing word on the last page only, and a leading word on every one', () => {
    expect(pageFootText(1, 3, { end: 'End of file' })).toBe('1 / 3')
    expect(pageFootText(3, 3, { end: 'End of file' })).toBe('End of file · 3 / 3')
    expect(pageFootText(2, 3, { page: 'Sheet' })).toBe('Sheet 2 / 3')
    expect(pageFootText(1, 1, { page: 'Sheet' })).toBe('Sheet 1 / 1')
  })
})

describe('the kicker line', () => {
  it('places the author by city and country, with the year', () => {
    expect(kickerPlace({ city: 'Hyderabad', countryCode: 'IN' }, 2026)).toBe('Hyderabad, IN · 2026')
    expect(kickerPlace({ city: 'Pune' }, 2026)).toBe('Pune · 2026')
    expect(kickerPlace({}, 2026)).toBe('2026')
    expect(kickerPlace(undefined, 2026)).toBe('2026')
  })
  it('files the author under a reference drawn from the name, the same one every time', () => {
    const ref = fileReference('Priya Raman Iyer', 2026)
    expect(ref).toMatch(/^PRI-2026-\d{4}$/)
    expect(fileReference('Priya Raman Iyer', 2026)).toBe(ref)
    expect(fileReference('Alex Morgan', 2026)).toMatch(/^AM-2026-\d{4}$/)
    expect(fileReference('', 2026)).toMatch(/^CV-2026-\d{4}$/)
    expect(fileReference('José Álvarez', 2026)).toMatch(/^JA-2026-/)
  })
})
