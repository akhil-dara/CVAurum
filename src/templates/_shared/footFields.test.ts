import { describe, expect, it } from 'vitest'
import { footNumberStatus } from './PageWordsFields'

/**
 * Whether the page foot will print a number is the question an author could
 * not answer: a one-page résumé shows no number, and nothing said so. The
 * foot's settings now say it in words, from the page count the canvas last
 * measured.
 */
describe('the page number, in words', () => {
  it('says a one-page résumé prints no number yet, and when it will', () => {
    expect(footNumberStatus('slash', 1)).toMatch(/one page.*no number/i)
    expect(footNumberStatus('slash', undefined)).toMatch(/no number/i)
  })
  it('shows what a longer one prints, in the style picked', () => {
    expect(footNumberStatus('slash', 3)).toBe('Prints on all 3 pages: 1 / 3 … 3 / 3.')
    expect(footNumberStatus('of', 2)).toBe('Prints on all 2 pages: Page 1 of 2 … Page 2 of 2.')
    expect(footNumberStatus('plain', 2)).toBe('Prints on all 2 pages: 1 … 2.')
  })
  it('says so when there is no number at all', () => {
    expect(footNumberStatus('none', 4)).toBe('No page number.')
  })
})
