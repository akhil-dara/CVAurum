import { describe, expect, it } from 'vitest'
import { looksLikeAddress, profileFromTyped, withProfileAddresses } from './profileAddress'
import { safeHref } from './utils'

/**
 * "linkedin.com/in/priya" typed into a profile's "Goes to" was stored as a
 * USERNAME, so the page showed it and no link was ever made - the PDF carried
 * no LinkedIn link, and the ATS tab asked to "trim" an address that was
 * already short (usability test, 2026-09-26).
 */
describe('profile addresses', () => {
  it('knows an address typed without a scheme', () => {
    for (const s of ['linkedin.com/in/priya-raghavan-dev', 'github.com/priyaraghavan', 'www.behance.net/anita', 'priya.dev']) expect(looksLikeAddress(s)).toBe(true)
    for (const s of ['priyaraghavan', '@priya', 'Priya Raghavan', 'linkedin', '']) expect(looksLikeAddress(s)).toBe(false)
  })

  it('stores what is typed as the address when it reads as one, and as a handle otherwise', () => {
    expect(profileFromTyped('linkedin.com/in/priya')).toEqual({ url: 'linkedin.com/in/priya', username: '' })
    expect(profileFromTyped('https://github.com/priya')).toEqual({ url: 'https://github.com/priya', username: '' })
    expect(profileFromTyped('@priya')).toEqual({ url: '', username: '@priya' })
  })

  it('an address stored bare still makes a working link', () => {
    expect(safeHref('linkedin.com/in/priya')).toBe('https://linkedin.com/in/priya')
  })

  it('moves an address a saved résumé stored as a username, and leaves real handles alone', () => {
    const c = {
      basics: {
        profiles: [
          { id: 'a', network: 'LinkedIn', username: 'linkedin.com/in/priya', url: '' },
          { id: 'b', network: 'GitHub', username: 'priya', url: '' },
          { id: 'c', network: 'Site', username: 'x.dev', url: 'https://kept.dev' },
        ],
      },
    }
    withProfileAddresses(c)
    expect(c.basics.profiles[0]).toMatchObject({ url: 'linkedin.com/in/priya', username: '' })
    expect(c.basics.profiles[1]).toMatchObject({ url: '', username: 'priya' })
    expect(c.basics.profiles[2]).toMatchObject({ url: 'https://kept.dev', username: 'x.dev' })
  })
})
