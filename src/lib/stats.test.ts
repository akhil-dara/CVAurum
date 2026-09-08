import { describe, expect, it } from 'vitest'
import { createDocument } from '@/data/defaults'
import { deriveStat, deriveStats, resolveStatTiles, type StatKind } from './stats'

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
      { value: '3.2k', label: 'stars' },
      { value: '20', label: 'skills' },
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
    expect(deriveStats(c, '2026-09')[2]).toEqual({ value: '12k', label: 'downloads' })
  })
  it('never borrows a thousands suffix from the word after the number', () => {
    const c = createDocument({ sample: true }).content
    c.projects = [{ ...c.projects[0], description: '', highlights: ['Serves 30 key customers'] }]
    expect(deriveStats(c, '2026-09')[2]).toEqual({ value: '30', label: 'customers' })
  })
})

/**
 * A tile names which number it draws; the author may rename it, type over
 * the value, add one of their own, reorder them and turn them off. The
 * resolver is where all of that lands, so the band and its editor never
 * disagree about what the document says.
 */
describe('deriveStat', () => {
  const c = createDocument({ sample: true }).content
  it('derives each kind from the sample, and nothing for custom', () => {
    expect(deriveStat('years', c, '2026-09')).toEqual({ value: '8+', label: 'years' })
    expect(deriveStat('companies', c, '2026-09')).toEqual({ value: '2', label: 'companies' })
    expect(deriveStat('projects', c, '2026-09')).toEqual({ value: '1', label: 'projects' })
    expect(deriveStat('certifications', c, '2026-09')).toEqual({ value: String(c.certificates.filter((x) => x.name).length), label: 'certifications' })
    expect(deriveStat('languages', c, '2026-09')).toEqual({ value: String(c.languages.filter((x) => x.language).length), label: 'languages' })
    expect(deriveStat('headline', c, '2026-09')).toEqual({ value: '3.2k', label: 'stars' })
    expect(deriveStat('skills', c, '2026-09')).toEqual({ value: '20', label: 'skills' })
    expect(deriveStat('custom', c, '2026-09')).toBeNull()
  })
  it('is null for a kind the content has nothing for', () => {
    const empty = createDocument({}).content
    for (const k of ['years', 'companies', 'projects', 'certifications', 'languages', 'headline', 'skills'] as const) {
      expect(deriveStat(k, empty, '2026-09')).toBeNull()
    }
  })
})

describe('resolveStatTiles', () => {
  const c = createDocument({ sample: true }).content
  it('with no list draws exactly what deriveStats draws', () => {
    expect(resolveStatTiles(c, undefined, '2026-09')).toEqual(deriveStats(c, '2026-09'))
  })
  it('follows the list: order, renames, typed values, custom tiles', () => {
    expect(
      resolveStatTiles(
        c,
        [
          { id: 'a', kind: 'companies', label: 'employers' },
          { id: 'b', kind: 'years' },
          { id: 'c', kind: 'custom', value: '3', label: 'internships' },
          { id: 'd', kind: 'skills', value: '25' },
        ],
        '2026-09'
      )
    ).toEqual([
      { value: '2', label: 'employers' },
      { value: '8+', label: 'years' },
      { value: '3', label: 'internships' },
      { value: '25', label: 'skills' },
    ])
  })
  it('drops a tile with nothing to show, keeps a bare number, and stops at five', () => {
    const empty = createDocument({}).content
    expect(resolveStatTiles(empty, [{ id: 'a', kind: 'years' }, { id: 'b', kind: 'custom' }], '2026-09')).toEqual([])
    expect(resolveStatTiles(empty, [{ id: 'a', kind: 'years', value: '4+' }], '2026-09')).toEqual([{ value: '4+', label: 'years' }])
    expect(resolveStatTiles(empty, [{ id: 'a', kind: 'custom', value: '7', label: '' }], '2026-09')).toEqual([{ value: '7', label: '' }])
    const six = ['years', 'companies', 'projects', 'certifications', 'languages', 'skills'].map((kind, i) => ({ id: String(i), kind: kind as StatKind }))
    expect(resolveStatTiles(c, six, '2026-09')).toHaveLength(5)
  })
  it('ignores blank overrides', () => {
    expect(resolveStatTiles(c, [{ id: 'a', kind: 'years', label: '  ', value: '' }], '2026-09')).toEqual([{ value: '8+', label: 'years' }])
  })
})
