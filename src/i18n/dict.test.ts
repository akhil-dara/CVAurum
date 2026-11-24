/**
 * The two dictionaries, checked against each other.
 *
 * TypeScript already refuses a missing key (`fa` is typed
 * `Record<MsgKey, string>`). What types cannot see: a Persian string that is
 * empty, one still holding the English sentence because it was copied and not
 * translated, and a `{n}` on one side with no counterpart on the other — a
 * figure that would silently print as "{n}" in one language.
 */
import { describe, expect, it } from 'vitest'
import { en } from './en'
import { fa } from './fa'
import { LOCALE_CHIP, LOCALE_NAME, dirOf, isLocale, translate } from './index'

const keys = Object.keys(en) as (keyof typeof en)[]
const figures = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

describe('the interface dictionaries', () => {
  it('holds the same keys in both languages', () => {
    expect(Object.keys(fa).sort()).toEqual([...keys].sort())
  })

  it('says something in every language', () => {
    for (const key of keys) {
      expect(en[key].trim(), key).not.toBe('')
      expect(fa[key].trim(), key).not.toBe('')
    }
  })

  it('carries the same {figures} on both sides of a sentence', () => {
    for (const key of keys) expect(figures(fa[key]), key).toEqual(figures(en[key]))
  })

  it('writes Persian in Persian', () => {
    // Letters of the Arabic-Persian script somewhere in the sentence; a row
    // that is all Latin ("ATS", "GitHub", "PDF") is a name, not a translation.
    // A row that is a NAME in both languages stands as it is: GitHub keeps its
    // name in Persian, and so does the Signature collection.
    const names = new Set<keyof typeof en>([
      'nav.github',
      'land.signature',
      // The gallery's chip for the Signature collection: a collection's name,
      // not a word to translate.
      'gallery.tag.signature',
    ])
    const persian = /[\u0600-\u06FF]/
    for (const key of keys) {
      if (names.has(key)) continue
      const english = en[key]
      if (!persian.test(english) && persian.test(fa[key])) continue
      if (/^[^a-z]*$/.test(english)) continue // punctuation-only, like ' · '
      expect(persian.test(fa[key]), `${key}: ${fa[key]}`).toBe(true)
    }
  })
})

describe('the language itself', () => {
  it('runs right to left in Persian and left to right in English', () => {
    expect(dirOf('fa')).toBe('rtl')
    expect(dirOf('en')).toBe('ltr')
  })

  it('names each language in its own script', () => {
    expect(LOCALE_NAME.fa).toBe('فارسی')
    expect(LOCALE_CHIP.fa).toBe('EN') // the language you are not reading
    expect(LOCALE_CHIP.en).toBe('فا')
  })

  it('takes only the two languages it ships', () => {
    expect(isLocale('fa')).toBe(true)
    expect(isLocale('fr')).toBe(false)
    expect(isLocale(undefined)).toBe(false)
  })

  it('fills figures and leaves no {slot} behind', () => {
    expect(translate('en', 'common.myResumesCount', { n: 3 })).toBe('My resumes (3)')
    expect(translate('fa', 'common.myResumesCount', { n: 3 })).toBe('رزومه‌های من (3)')
    expect(translate('fa', 'top.downloadPdf', { n: 3 })).not.toContain('{')
  })
})
