import { describe, it, expect } from 'vitest'
import {
  canonicalLanguage,
  currentYearMonth,
  DATE_LANGUAGE_OPTIONS,
  dateProgress,
  entryDateOptions,
  formatDate,
  formatDateRange,
  formatDuration,
  monthNames,
  sectionDateOptions,
} from './utils'

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
    expect(monthNames('de')[2]).toBe('März')
    expect(monthNames('fr', 'long')[0]).toBe('janvier')
    expect(monthNames('xx')).toEqual(monthNames('en'))
  })

  it('names a month the way a date prints it, not the standalone way', () => {
    // A locale can spell a month one way on its own and another beside a
    // year: German's standalone March is "Mar" while a date reads "Marz".
    // A picker offering one while the page prints the other is one document
    // spelling the same month two ways, so the list comes from the formatter
    // that prints the dates.
    for (const language of ['de', 'fr', 'pl', 'sv']) {
      for (const month of ['short', 'long'] as const) {
        expect(formatDate('2021-03', { month, language })).toBe(`${monthNames(language, month)[2]} 2021`)
      }
    }
  })
})

describe('canonicalLanguage', () => {
  // The tag every date reads in: the canonical form the runtime can format,
  // or English. An unknown tag would otherwise fall back to whatever locale
  // the machine runs in, and one document would print different month names
  // on different computers - or, in the PDF, declare a language no reader
  // can act on.
  it('canonicalises a tag the runtime can format and falls back to English', () => {
    expect(canonicalLanguage()).toBe('en')
    expect(canonicalLanguage('   ')).toBe('en')
    expect(canonicalLanguage('en')).toBe('en')
    expect(canonicalLanguage('de-de')).toBe('de-DE')
    expect(canonicalLanguage('fr-CA')).toBe('fr-CA')
    expect(canonicalLanguage('xx')).toBe('en')
    expect(canonicalLanguage('not a tag!')).toBe('en')
  })

  it('answers a repeated tag the same way, from the memo', () => {
    expect(canonicalLanguage('de-de')).toBe(canonicalLanguage('de-de'))
    expect(canonicalLanguage('not a tag!')).toBe(canonicalLanguage('not a tag!'))
  })
})

describe('the languages the date block offers', () => {
  // One table holds both halves of a language: the name the panel shows and
  // the words a time span is counted in. Two lists would let the panel offer
  // a language whose spans silently print in English.
  it('offers English first and a name for every language', () => {
    expect(DATE_LANGUAGE_OPTIONS[0]).toEqual({ value: 'en', label: 'English' })
    expect(DATE_LANGUAGE_OPTIONS.every((o) => !!o.label && !!o.value)).toBe(true)
  })

  it('counts a span in its own words for every language offered', () => {
    const english = formatDuration('2019-01', '2021-03')
    for (const { value } of DATE_LANGUAGE_OPTIONS) {
      const span = formatDuration('2019-01', '2021-03', { language: value })
      expect(span).not.toBe('')
      if (value !== 'en') expect(span).not.toBe(english)
    }
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

  it('carries the language, so the span reads in the document\'s own words', () => {
    // The whole string in one language: the month names and the span alike.
    const opts = sectionDateOptions({ showDuration: true }, '2024-08', dates)
    expect(formatDateRange('2019-01', '2021-03', opts)).toBe('Januar 2019 to März 2021 (2 J. 3 Mon.)')
  })
})

/**
 * A course that has not finished yet. An end date still ahead of the caller's
 * today used to print as though it had already happened - "Aug 2022 — May
 * 2027" on a resume written in 2026 hands the reader a degree two years
 * early. The words come from the document's own date settings and the today
 * is handed in, exactly as a time span is, so nothing here reads the clock.
 */
describe('formatDateRange for studies still under way', () => {
  const now = '2026-09'

  it('marks an end still ahead of today as expected', () => {
    expect(formatDateRange('2022-08', '2027-05', { progress: 'auto', now })).toBe('Aug 2022 — Expected May 2027')
    // The author's own answer needs no calendar.
    expect(formatDateRange('2022-08', '2027-05', { progress: 'pursuing', now })).toBe('Aug 2022 — Expected May 2027')
    // A lone end (no start) is the whole date.
    expect(formatDateRange('', '2027-05', { progress: 'auto', now })).toBe('Expected May 2027')
    expect(formatDateRange('2027-05', '2027-05', { progress: 'auto', now })).toBe('Expected May 2027')
  })

  it('reads a course with no end as one word', () => {
    expect(formatDateRange('2022-08', '', { progress: 'pursuing', now })).toBe('Pursuing')
    expect(formatDateRange('2022-08', 'Present', { progress: 'pursuing', now })).toBe('Pursuing')
    expect(formatDateRange('', '', { progress: 'pursuing', now })).toBe('Pursuing')
  })

  it('takes both words from the document', () => {
    expect(formatDateRange('2022-08', '2027-05', { progress: 'auto', now, expected: 'Expected graduation' })).toBe(
      'Aug 2022 — Expected graduation May 2027'
    )
    expect(formatDateRange('2022-08', '', { progress: 'pursuing', now, pursuing: 'In progress' })).toBe('In progress')
    // Blank settings fall back to the words the page has always had.
    expect(formatDateRange('2022-08', '2027-05', { progress: 'auto', now, expected: '  ' })).toBe(
      'Aug 2022 — Expected May 2027'
    )
  })

  it('keeps the rest of the document\'s date settings', () => {
    expect(formatDateRange('2022-08', '2027-05', { progress: 'auto', now, month: 'long', separator: 'hyphen' })).toBe(
      'August 2022 - Expected May 2027'
    )
    // A bare year is ahead while the year it names has not been reached.
    expect(formatDateRange('2023', '2027', { progress: 'auto', now })).toBe('2023 — Expected 2027')
    // One year with no month shown is that year, once - still expected.
    expect(formatDateRange('2027-01', '2027-09', { progress: 'auto', now, month: 'none' })).toBe('Expected 2027')
    expect(formatDateRange('2022-08', '2027-05', { progress: 'auto', now, duration: true })).toBe(
      'Aug 2022 — Expected May 2027 (4 yrs 10 mos)'
    )
  })

  it('leaves every other range exactly as it was', () => {
    // A finished course, with today handed in and nothing claimed.
    expect(formatDateRange('2019-09', '2023-05', { progress: 'auto', now })).toBe('Sep 2019 — May 2023')
    // The author saying "completed" beats the calendar.
    expect(formatDateRange('2022-08', '2027-05', { progress: 'completed', now })).toBe('Aug 2022 — May 2027')
    // No progress asked for at all: the string every other section prints.
    expect(formatDateRange('2022-08', '2027-05', { now })).toBe('Aug 2022 — May 2027')
    expect(formatDateRange('2019-01', '2021-03')).toBe('Jan 2019 — Mar 2021')
    // An open end still reads Present unless the author said otherwise.
    expect(formatDateRange('2022-08', '', { progress: 'auto', now })).toBe('Aug 2022 — Present')
    expect(formatDateRange('2022-08', 'Present', { progress: 'completed', now })).toBe('Aug 2022 — Present')
    expect(formatDateRange('2023-06', '', { duration: true, now: '2024-08' })).toBe('Jun 2023 — Present (1 yr 3 mos)')
    // Free text at the end cannot be compared with a calendar.
    expect(formatDateRange('2022-08', 'Summer 2027', { progress: 'auto', now })).toBe('Aug 2022 — Summer 2027')
    // No today to read against, so nothing is ahead of it.
    expect(formatDateRange('2022-08', '2027-05', { progress: 'auto' })).toBe('Aug 2022 — May 2027')
  })
})

describe('dateProgress', () => {
  it('takes the author\'s own answer first', () => {
    expect(dateProgress('pursuing', '2019-05', '2026-09')).toBe('pursuing')
    expect(dateProgress('completed', '2027-05', '2026-09')).toBe('completed')
  })

  it('reads the end date when nothing was said', () => {
    expect(dateProgress(undefined, '2027-05', '2026-09')).toBe('pursuing')
    expect(dateProgress(undefined, '2023-05', '2026-09')).toBe('completed')
    expect(dateProgress(undefined, '', '2026-09')).toBe('completed')
  })
})

describe('entryDateOptions', () => {
  it('adds the entry\'s progress and today to the section\'s own options', () => {
    const dates = { month: 'long' as const, present: 'Current' }
    expect(entryDateOptions(dates, 'pursuing', '2026-09')).toEqual({ ...dates, progress: 'pursuing', now: '2026-09' })
    // Nothing stored means the end date decides.
    expect(entryDateOptions(dates, undefined, '2026-09')).toEqual({ ...dates, progress: 'auto', now: '2026-09' })
    expect(entryDateOptions(undefined, 'completed', '2026-09')).toEqual({ progress: 'completed', now: '2026-09' })
    // A section that asked for a time span keeps it.
    expect(entryDateOptions({ duration: true, now: '2026-09' }, undefined, '2026-09')).toEqual({
      duration: true,
      progress: 'auto',
      now: '2026-09',
    })
  })
})
