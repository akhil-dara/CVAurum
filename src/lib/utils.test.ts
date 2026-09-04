import { describe, it, expect } from 'vitest'
import { currentYearMonth, formatDate, formatDateRange, formatDuration, monthNames, sectionDateOptions } from './utils'

/**
 * Time spans on date ranges (opt-in, per section). The length of a range is
 * counted in whole months, both ends inclusive, the way a reader counts a
 * job that ran January to March as three months, not two. "Present" is read
 * against the today the caller hands in, so nothing in here touches the
 * clock: the page, the Word file and the ATS text all pass the same month
 * and print the same words.
 */
describe('formatDuration', () => {
  it('counts years and months, both ends inclusive', () => {
    expect(formatDuration('2019-01', '2021-03')).toBe('2 yrs 3 mos')
    expect(formatDuration('2021-01', '2021-01')).toBe('1 mo')
    expect(formatDuration('2021-01', '2021-02')).toBe('2 mos')
    expect(formatDuration('2020-03', '2021-02')).toBe('1 yr')
    expect(formatDuration('2020-03', '2021-03')).toBe('1 yr 1 mo')
    expect(formatDuration('2010-01', '2011-12')).toBe('2 yrs')
  })

  it('ignores the day of a full date', () => {
    expect(formatDuration('2019-01-15', '2021-03-02')).toBe('2 yrs 3 mos')
  })

  it('reads Present against the today it is handed, never the clock', () => {
    expect(formatDuration('2023-06', '', { now: '2024-08' })).toBe('1 yr 3 mos')
    expect(formatDuration('2023-06', 'Present', { now: '2024-08' })).toBe('1 yr 3 mos')
    expect(formatDuration('2023-06', 'present', { now: '2023-06' })).toBe('1 mo')
    // No today, no answer: guessing would make an export drift by the day.
    expect(formatDuration('2023-06', '')).toBe('')
  })

  it('prints nothing it cannot count', () => {
    // A year on its own has no month to count from.
    expect(formatDuration('2019', '2021')).toBe('')
    expect(formatDuration('2019', '2021-03')).toBe('')
    expect(formatDuration('2019-01', '2021')).toBe('')
    // A range that ends before it starts is an authoring slip, not a span.
    expect(formatDuration('2021-03', '2019-01')).toBe('')
    expect(formatDuration('', '2021-03')).toBe('')
    expect(formatDuration('Summer 2020', '2021-03')).toBe('')
  })

  it('speaks the language it is asked for and falls back to English', () => {
    expect(formatDuration('2019-01', '2021-03', { language: 'de' })).toBe('2 J. 3 Mon.')
    expect(formatDuration('2019-01', '2021-03', { language: 'fr' })).toBe('2 ans 3 mois')
    expect(formatDuration('2020-03', '2021-03', { language: 'it' })).toBe('1 anno 1 mese')
    expect(formatDuration('2019-01', '2021-03', { language: 'xx' })).toBe('2 yrs 3 mos')
    // A region tag narrows to its language.
    expect(formatDuration('2019-01', '2021-03', { language: 'en-GB' })).toBe('2 yrs 3 mos')
    expect(formatDuration('2019-01', '2021-03', { language: 'fr-CA' })).toBe('2 ans 3 mois')
  })
})

describe('formatDateRange with a time span', () => {
  it('appends the span in parentheses only when asked', () => {
    expect(formatDateRange('2019-01', '2021-03')).toBe('Jan 2019 — Mar 2021')
    expect(formatDateRange('2019-01', '2021-03', { duration: true })).toBe('Jan 2019 — Mar 2021 (2 yrs 3 mos)')
    expect(formatDateRange('2023-06', '', { duration: true, now: '2024-08' })).toBe('Jun 2023 — Present (1 yr 3 mos)')
    // One language for the whole string: the month names and the span words.
    expect(formatDateRange('2019-01', '2021-03', { duration: true, language: 'fr' })).toBe(
      'janv. 2019 — mars 2021 (2 ans 3 mois)'
    )
  })

  it('leaves a single date and an uncountable range alone', () => {
    expect(formatDateRange('2021', '2021', { duration: true, now: '2024-08' })).toBe('2021')
    expect(formatDateRange('2021-03', '2021-03', { duration: true })).toBe('Mar 2021')
    expect(formatDateRange('2019', '2021', { duration: true, now: '2024-08' })).toBe('2019 — 2021')
    expect(formatDateRange('2023-06', '', { duration: true })).toBe('Jun 2023 — Present')
  })
})

describe('sectionDateOptions', () => {
  it('asks for a span only when the section opted in', () => {
    expect(sectionDateOptions(undefined, '2024-08')).toBeUndefined()
    expect(sectionDateOptions({}, '2024-08')).toBeUndefined()
    expect(sectionDateOptions({ showDuration: false }, '2024-08')).toBeUndefined()
    expect(sectionDateOptions({ showDuration: true }, '2024-08')).toEqual({ duration: true, now: '2024-08' })
  })
})

describe('currentYearMonth', () => {
  it('is the YYYY-MM the formatter reads Present against', () => {
    expect(currentYearMonth(new Date(2024, 7, 1))).toBe('2024-08')
    expect(currentYearMonth(new Date(2024, 11, 31))).toBe('2024-12')
    expect(currentYearMonth()).toMatch(/^\d{4}-\d{2}$/)
  })
})

/**
 * The document's date settings: how a month is spelled, what sits between
 * the two ends of a range, the word for an open-ended one, and the language
 * the month names and the span words are in. Every option has a default that
 * reproduces what the page always printed, so a document that never chose
 * reads exactly as before.
 */
describe('formatDate with the month style and the language', () => {
  it('spells the month short by default, long, as a number, or not at all', () => {
    expect(formatDate('2021-01')).toBe('Jan 2021')
    expect(formatDate('2021-01', { month: 'short' })).toBe('Jan 2021')
    expect(formatDate('2021-01', { month: 'long' })).toBe('January 2021')
    expect(formatDate('2021-01', { month: 'numeric' })).toBe('01/2021')
    expect(formatDate('2021-11', { month: 'numeric' })).toBe('11/2021')
    expect(formatDate('2021-01', { month: 'none' })).toBe('2021')
  })

  it('a bare year has no month to spell in any style', () => {
    expect(formatDate('2021', { month: 'long' })).toBe('2021')
    expect(formatDate('2021', { month: 'numeric' })).toBe('2021')
  })

  it('names the month in the language asked for', () => {
    expect(formatDate('2021-03', { month: 'long', language: 'de' })).toBe('März 2021')
    expect(formatDate('2021-01', { month: 'long', language: 'fr' })).toBe('janvier 2021')
    expect(formatDate('2021-01', { month: 'short', language: 'fr' })).toBe('janv. 2021')
    // The locale's own order of month and year, not a fixed English one.
    expect(formatDate('2021-01', { month: 'long', language: 'ja' })).toBe('2021年1月')
    // A region tag narrows to its language; an unknown tag reads as English.
    expect(formatDate('2021-01', { month: 'long', language: 'de-AT' })).toBe('Jänner 2021')
    expect(formatDate('2021-01', { month: 'long', language: 'xx' })).toBe('January 2021')
    expect(formatDate('2021-01', { month: 'long', language: 'not a tag!' })).toBe('January 2021')
  })

  it('a numeric month is the same digits in every language', () => {
    expect(formatDate('2021-01', { month: 'numeric', language: 'de' })).toBe('01/2021')
  })

  it('prints the word for an open-ended range, falling back to Present', () => {
    expect(formatDate('Present', { present: 'Current' })).toBe('Current')
    expect(formatDate('present')).toBe('Present')
    expect(formatDate('Present', { present: '  ' })).toBe('Present')
  })

  it('leaves free text alone whatever the options', () => {
    expect(formatDate('Summer 2020', { month: 'long', language: 'de' })).toBe('Summer 2020')
  })
})

describe('formatDateRange with a separator, a present word and a month style', () => {
  it('sets the glyph the author chose between the ends, a spaced em dash by default', () => {
    expect(formatDateRange('2019-01', '2021-03')).toBe('Jan 2019 — Mar 2021')
    expect(formatDateRange('2019-01', '2021-03', { separator: 'emdash' })).toBe('Jan 2019 — Mar 2021')
    expect(formatDateRange('2019-01', '2021-03', { separator: 'endash' })).toBe('Jan 2019 – Mar 2021')
    expect(formatDateRange('2019-01', '2021-03', { separator: 'hyphen' })).toBe('Jan 2019 - Mar 2021')
    expect(formatDateRange('2019-01', '2021-03', { separator: 'to' })).toBe('Jan 2019 to Mar 2021')
  })

  it('ends an open range with the author\'s word, Present when there is none', () => {
    expect(formatDateRange('2021-01', '', { present: 'Current' })).toBe('Jan 2021 — Current')
    expect(formatDateRange('2021-01', 'Present', { present: 'Now', separator: 'endash' })).toBe('Jan 2021 – Now')
    expect(formatDateRange('2021-01', '', { present: '' })).toBe('Jan 2021 — Present')
    expect(formatDateRange('', '', { present: 'Current' })).toBe('Current')
  })

  it('spells both ends in the chosen style and language, span words included', () => {
    expect(formatDateRange('2019-01', '2021-03', { month: 'long' })).toBe('January 2019 — March 2021')
    expect(formatDateRange('2019-01', '2021-03', { month: 'numeric', separator: 'hyphen' })).toBe('01/2019 - 03/2021')
    expect(formatDateRange('2019-01', '2021-03', { month: 'long', language: 'fr', duration: true })).toBe(
      'janvier 2019 — mars 2021 (2 ans 3 mois)'
    )
  })

  it('with no month shown, a range inside one year prints that year once', () => {
    expect(formatDateRange('2019-01', '2021-03', { month: 'none' })).toBe('2019 — 2021')
    expect(formatDateRange('2021-03', '2021-09', { month: 'none' })).toBe('2021')
    // The span still counts the months the data holds.
    expect(formatDateRange('2021-03', '2021-09', { month: 'none', duration: true })).toBe('2021 (7 mos)')
  })
})

describe('monthNames', () => {
  // The one month list every picker shares, in the document's language, so
  // the popover on the canvas offers the names the page prints.
  it('lists the twelve months, short by default', () => {
    expect(monthNames()).toEqual(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'])
    expect(monthNames('en', 'long')[0]).toBe('January')
    expect(monthNames('en', 'long')).toHaveLength(12)
  })

  it('speaks the language asked for and falls back to English', () => {
    expect(monthNames('de')[2]).toBe('Mär')
    expect(monthNames('fr', 'long')[0]).toBe('janvier')
    expect(monthNames('xx')).toEqual(monthNames('en'))
  })
})

describe('sectionDateOptions carries the document\'s date settings', () => {
  const dates = { month: 'long' as const, separator: 'to' as const, present: 'Current', language: 'de' }

  it('hands them through unchanged when the section shows no span', () => {
    expect(sectionDateOptions(undefined, '2024-08', dates)).toEqual(dates)
    expect(sectionDateOptions({ showDuration: false }, '2024-08', dates)).toEqual(dates)
  })

  it('adds the span request beside them when the section asks', () => {
    expect(sectionDateOptions({ showDuration: true }, '2024-08', dates)).toEqual({ ...dates, duration: true, now: '2024-08' })
  })
})
