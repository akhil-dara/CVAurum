import { describe, expect, it } from 'vitest'
import { createDocument } from '@/data/defaults'
import { hasRailYear, railLabel } from './rail'

/**
 * The rail is the tall year Chronicle prints beside an entry, with a small
 * word beneath it. Both come from the entry itself - the author's own year
 * and word first, then the dates the entry already carries - so the rail can
 * never disagree with the date line it sits beside. "Today" is handed in so
 * a course still ahead never depends on the clock.
 */
const T = '2026-09'
describe('railLabel', () => {
  it('a job: the start year, to now or to the end year', () => {
    expect(railLabel('work', { startDate: '2021-03', endDate: '' }, T)).toEqual({ year: '2021', word: 'to now' })
    expect(railLabel('work', { startDate: '2018-06', endDate: '2021-02' }, T)).toEqual({ year: '2018', word: 'to 2021' })
    expect(railLabel('volunteer', { startDate: '2022', endDate: '2023' }, T)).toEqual({ year: '2022', word: 'to 2023' })
  })
  it('education: Graduated, or Expected when the finish is ahead or the course is under way', () => {
    expect(railLabel('education', { startDate: '2012-08', endDate: '2016-05' }, T)).toEqual({ year: '2012', word: 'Graduated' })
    expect(railLabel('education', { startDate: '2022-08', endDate: '2027-05' }, T)).toEqual({ year: '2022', word: 'Expected' })
    expect(railLabel('education', { startDate: '2022-08', endDate: '', status: 'pursuing' }, T)).toEqual({ year: '2022', word: 'Expected' })
  })
  it('an end-only course shows the end year, expected', () => {
    expect(railLabel('education', { startDate: '', endDate: '2027-05' }, T)).toEqual({ year: '2027', word: 'Expected' })
  })
  it('projects and custom items', () => {
    expect(railLabel('projects', { startDate: '2022', endDate: '' }, T)).toEqual({ year: '2022', word: 'Project' })
    expect(railLabel('custom', { date: '2025' }, T)).toEqual({ year: '2025', word: '' })
  })
  it('the author’s own year and word win, and an empty word means no word', () => {
    expect(railLabel('work', { startDate: '2021-03', rail: { year: '’21', word: 'Ongoing' } }, T)).toEqual({ year: '’21', word: 'Ongoing' })
    expect(railLabel('education', { startDate: '2012', endDate: '2016', rail: { word: '' } }, T)).toEqual({ year: '2012', word: '' })
  })
  it('no date at all means no cell', () => {
    expect(railLabel('projects', { startDate: '', endDate: '' }, T)).toBeNull()
    expect(railLabel('projects', { rail: { word: 'Project' } }, T)).toBeNull()
    expect(railLabel('projects', { rail: { year: '2024' } }, T)).toEqual({ year: '2024', word: 'Project' })
  })
})
describe('hasRailYear', () => {
  it('is true for the sample, false with every date blanked, true again with one expected finish', () => {
    const doc = createDocument({ sample: true })
    expect(hasRailYear(doc.content, T)).toBe(true)
    for (const list of [doc.content.work, doc.content.education, doc.content.projects, doc.content.volunteer]) for (const e of list) { e.startDate = ''; e.endDate = '' }
    for (const s of doc.content.custom) for (const i of s.items) i.date = ''
    expect(hasRailYear(doc.content, T)).toBe(false)
    doc.content.education[0].endDate = '2027-05'
    expect(hasRailYear(doc.content, T)).toBe(true)
  })
})
