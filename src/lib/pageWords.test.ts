import { describe, expect, it } from 'vitest'
import { KICKER_LABEL, kickerPlace, kickerWords, pageFootText } from './pageWords'

/**
 * The words the decorative page furniture prints: the line above the name and
 * the page foot. All decoration - none of it reaches a parser - but the
 * exporter and the canvas must agree on it to the character, and every word
 * of it is either the author's own or read from their content. Nothing is
 * invented: an early cut printed a made-up "case file" number and signed the
 * last page off as the "end of file" (removed 2026-09-27).
 */
describe('pageFootText', () => {
  it('numbers every page of a longer document', () => {
    expect(pageFootText(1, 2)).toBe('1 / 2')
    expect(pageFootText(2, 2)).toBe('2 / 2')
  })
  it('says nothing on a single page', () => {
    expect(pageFootText(1, 1)).toBe('')
    expect(pageFootText(1, 1, 'of')).toBe('')
  })
  it('writes the number the way the author picked', () => {
    expect(pageFootText(2, 3, 'slash')).toBe('2 / 3')
    expect(pageFootText(2, 3, 'of')).toBe('Page 2 of 3')
    expect(pageFootText(2, 3, 'plain')).toBe('2')
    expect(pageFootText(2, 3, 'none')).toBe('')
  })
  it('reads an unknown style as the default', () => {
    expect(pageFootText(1, 2, 'bogus' as never)).toBe('1 / 2')
  })
})

describe('the line above the name', () => {
  const basics = { location: { city: 'Hyderabad', region: 'Telangana', countryCode: 'IN' } }

  it('places the author as the contact line does, with the year', () => {
    expect(kickerPlace({ city: 'San Francisco', region: 'CA', countryCode: 'US' }, 2026)).toBe('San Francisco, CA · 2026')
    expect(kickerPlace({ city: 'Pune', countryCode: 'IN' }, 2026)).toBe('Pune, IN · 2026')
    expect(kickerPlace({}, 2026)).toBe('2026')
    expect(kickerPlace(undefined, 2026)).toBe('2026')
  })

  it('defaults to a plain label and the place, read from the document', () => {
    expect(kickerWords(undefined, basics, 2026)).toEqual({ left: KICKER_LABEL, right: 'Hyderabad, Telangana · 2026' })
  })

  it('prints the author’s own words, and leaves a side they cleared empty', () => {
    expect(kickerWords({ left: 'Portfolio 2026', right: 'Open to relocation' }, basics, 2026)).toEqual({
      left: 'Portfolio 2026',
      right: 'Open to relocation',
    })
    expect(kickerWords({ right: '' }, basics, 2026)).toEqual({ left: KICKER_LABEL, right: '' })
  })

  it('draws nothing when the author turns the line off', () => {
    expect(kickerWords({ show: false }, basics, 2026)).toEqual({ left: '', right: '' })
  })
})
