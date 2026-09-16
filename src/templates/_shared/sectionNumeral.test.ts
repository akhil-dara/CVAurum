import { describe, expect, it } from 'vitest'
import { sectionNumeral } from './sectionNumeral'

/**
 * The running numeral a numbered heading opens with, in the four shapes the
 * document can ask for. The index handed in is the section's own - zero for
 * the first section on the page - and what comes back is what the page draws.
 *
 * Every case here is a string the Deco atom will carry, so nothing in it may
 * depend on the design: the same index and style read the same on all of
 * them, and the numeral never reaches the text a parser reads.
 */
describe('sectionNumeral', () => {
  it('pads to two figures by default, and stops padding once it has two', () => {
    expect(sectionNumeral(0, 'padded')).toBe('01')
    expect(sectionNumeral(1, 'padded')).toBe('02')
    expect(sectionNumeral(8, 'padded')).toBe('09')
    expect(sectionNumeral(9, 'padded')).toBe('10')
    expect(sectionNumeral(13, 'padded')).toBe('14')
    // A résumé with a hundred sections is not a thing, but a number that
    // grew a third figure must still be that number and not a truncation.
    expect(sectionNumeral(99, 'padded')).toBe('100')
  })

  it('writes the bare figure for plain', () => {
    expect(sectionNumeral(0, 'plain')).toBe('1')
    expect(sectionNumeral(1, 'plain')).toBe('2')
    expect(sectionNumeral(9, 'plain')).toBe('10')
    expect(sectionNumeral(13, 'plain')).toBe('14')
  })

  it('writes the figure with a full stop after it for dot', () => {
    expect(sectionNumeral(0, 'dot')).toBe('1.')
    expect(sectionNumeral(1, 'dot')).toBe('2.')
    expect(sectionNumeral(9, 'dot')).toBe('10.')
    expect(sectionNumeral(13, 'dot')).toBe('14.')
  })

  it('writes upper-case roman, subtractive where roman is', () => {
    expect(sectionNumeral(0, 'roman')).toBe('I')
    expect(sectionNumeral(1, 'roman')).toBe('II')
    expect(sectionNumeral(2, 'roman')).toBe('III')
    expect(sectionNumeral(3, 'roman')).toBe('IV')
    expect(sectionNumeral(4, 'roman')).toBe('V')
    expect(sectionNumeral(5, 'roman')).toBe('VI')
    expect(sectionNumeral(8, 'roman')).toBe('IX')
    expect(sectionNumeral(9, 'roman')).toBe('X')
    expect(sectionNumeral(13, 'roman')).toBe('XIV')
    expect(sectionNumeral(38, 'roman')).toBe('XXXIX')
    expect(sectionNumeral(48, 'roman')).toBe('XLIX')
  })

  it('never hands the page an empty or nonsense numeral', () => {
    // The caller passes an array index, so a negative or fractional one is a
    // caller bug rather than a document state - but a heading with nothing in
    // front of its words, or with "NaN" in front of them, is the worst way to
    // find out. Every style floors to the first section.
    for (const style of ['padded', 'plain', 'dot', 'roman'] as const) {
      expect(sectionNumeral(-3, style)).toBe(sectionNumeral(0, style))
      expect(sectionNumeral(2.7, style)).toBe(sectionNumeral(2, style))
      expect(sectionNumeral(Number.NaN, style)).toBe(sectionNumeral(0, style))
    }
  })
})
