import { describe, it, expect } from 'vitest'
import { currentYearMonth, formatDateRange, formatDuration, sectionDateOptions } from './utils'

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
    expect(formatDateRange('2019-01', '2021-03', { duration: true, language: 'fr' })).toBe(
      'Jan 2019 — Mar 2021 (2 ans 3 mois)'
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
