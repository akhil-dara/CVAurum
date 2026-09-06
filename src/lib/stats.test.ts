import { describe, expect, it } from 'vitest'
import { createDocument } from '@/data/defaults'
import { deriveStats } from './stats'

/**
 * The stats band shows a few numbers a reader takes in at a glance. They
 * are derived from the content rather than typed a second time, so the
 * band can never disagree with the entries below it. Each fact is skipped
 * when absent, and "today" is handed in so the years never depend on the
 * clock.
 */
describe('deriveStats', () => {
  it('reads the sample resume as four facts', () => {
    const c = createDocument({ sample: true }).content
    expect(deriveStats(c, '2026-09')).toEqual([
      { value: '8+', label: 'years' },
      { value: '2', label: 'companies' },
      { value: '20', label: 'skills' },
      { value: '3.2k', label: 'stars' },
    ])
  })
  it('yields nothing for an empty document', () => {
    expect(deriveStats(createDocument({}).content, '2026-09')).toEqual([])
  })
  it('rounds years down and skips a headline number it cannot find', () => {
    const c = createDocument({ sample: true }).content
    c.projects = []
    c.work = [{ ...c.work[0], startDate: '2024-01', endDate: '' }]
    expect(deriveStats(c, '2026-09')).toEqual([
      { value: '2+', label: 'years' },
      { value: '1', label: 'companies' },
      { value: '20', label: 'skills' },
    ])
  })
  it('finds a headline number wrapped in rich-text markup', () => {
    const c = createDocument({ sample: true }).content
    c.projects = [{ ...c.projects[0], description: '', highlights: ['<strong>12k</strong> monthly downloads'] }]
    expect(deriveStats(c, '2026-09').at(-1)).toEqual({ value: '12k', label: 'downloads' })
  })
  it('never borrows a thousands suffix from the word after the number', () => {
    const c = createDocument({ sample: true }).content
    c.projects = [{ ...c.projects[0], description: '', highlights: ['Serves 30 key customers'] }]
    expect(deriveStats(c, '2026-09').at(-1)).toEqual({ value: '30', label: 'customers' })
  })
})
