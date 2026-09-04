import { describe, expect, it } from 'vitest'
import {
  EMPTY_FILTER,
  STRICT_TAG,
  filterTemplates,
  isFilterActive,
  isStrictLayout,
  readTemplateFilter,
  tagChoices,
  templateFilterParams,
  type TemplateFilter,
} from './templateFilter'
import { TEMPLATES } from '@/templates/registry'
import type { TemplateConfig, TemplateTag } from '@/types/template'

/** A registry entry with only the fields the filter reads. */
const tpl = (id: string, name: string, description: string, tags: TemplateTag[], atsSafe = true): TemplateConfig =>
  ({ id, name, description, tags, atsSafe }) as unknown as TemplateConfig

const CATALOG: TemplateConfig[] = [
  tpl('plain', 'Plainly', 'A quiet single-column layout for a careful reader.', [
    STRICT_TAG,
    'single-column',
    'minimal',
  ]),
  tpl('rail', 'Railcar', 'A two-column design with a photo rail down the side.', ['two-column', 'photo', 'modern']),
  tpl('gala', 'Gala', 'A creative two-column poster of a resume, photo and all.', ['two-column', 'photo', 'creative']),
  tpl('ledger', 'Ledger', 'A classic single-column sheet with ruled headings.', [
    STRICT_TAG,
    'single-column',
    'classic',
  ]),
  // Tagged strict but not marked safe: the belt-and-braces case for isStrictLayout.
  tpl('impostor', 'Impostor', 'Claims the tag it has not earned.', [STRICT_TAG, 'single-column'], false),
]

const filter = (over: Partial<TemplateFilter> = {}): TemplateFilter => ({ ...EMPTY_FILTER, ...over })
const ids = (list: TemplateConfig[]) => list.map((t) => t.id)

describe('filterTemplates - text search', () => {
  it('an empty query keeps the whole catalog', () => {
    expect(ids(filterTemplates(CATALOG, EMPTY_FILTER))).toEqual(['plain', 'rail', 'gala', 'ledger', 'impostor'])
  })

  it('matches the name, case-insensitively', () => {
    expect(ids(filterTemplates(CATALOG, filter({ query: 'GALA' })))).toEqual(['gala'])
  })

  it('matches the description too', () => {
    expect(ids(filterTemplates(CATALOG, filter({ query: 'ruled headings' })))).toEqual(['ledger'])
  })

  it('matches part of a word, so a half-typed term still narrows', () => {
    expect(ids(filterTemplates(CATALOG, filter({ query: 'col' })))).toEqual(['plain', 'rail', 'gala', 'ledger'])
  })

  it('ANDs the terms - a second word refines the first, wherever each one sits', () => {
    // 'photo' is in both descriptions; 'creative' only in Gala's tags-worth of prose.
    expect(ids(filterTemplates(CATALOG, filter({ query: 'photo creative' })))).toEqual(['gala'])
    // Terms may straddle the name and the description.
    expect(ids(filterTemplates(CATALOG, filter({ query: 'railcar photo' })))).toEqual(['rail'])
  })

  it('does not search the tags - the chips are the tag control', () => {
    expect(ids(filterTemplates(CATALOG, filter({ query: 'minimal' })))).toEqual([])
  })

  it('whitespace alone is not a filter, but is still carried so a space can be typed', () => {
    expect(filterTemplates(CATALOG, filter({ query: '   ' }))).toHaveLength(CATALOG.length)
    expect(isFilterActive(filter({ query: '   ' }))).toBe(false)
    expect(templateFilterParams(filter({ query: 'photo ' })).get('q')).toBe('photo ')
  })
})

describe('filterTemplates - tag chips', () => {
  it('one tag keeps every design carrying it', () => {
    expect(ids(filterTemplates(CATALOG, filter({ tags: ['two-column'] })))).toEqual(['rail', 'gala'])
  })

  it('two tags AND together - the designs that are both', () => {
    expect(ids(filterTemplates(CATALOG, filter({ tags: ['two-column', 'creative'] })))).toEqual(['gala'])
  })

  it('mutually exclusive tags select nothing rather than everything', () => {
    expect(filterTemplates(CATALOG, filter({ tags: ['single-column', 'two-column'] }))).toEqual([])
  })
})

describe('filterTemplates - strictest layouts only', () => {
  it('off by default, so nothing is hidden', () => {
    expect(filterTemplates(CATALOG, EMPTY_FILTER)).toHaveLength(CATALOG.length)
  })

  it('on, it keeps only designs both marked and tagged strict', () => {
    expect(ids(filterTemplates(CATALOG, filter({ atsOnly: true })))).toEqual(['plain', 'ledger'])
    expect(isStrictLayout(CATALOG[4])).toBe(false) // tagged, but atsSafe: false
  })

  it('narrows the real registry - the toggle is not a no-op', () => {
    const safe = filterTemplates(TEMPLATES, filter({ atsOnly: true }))
    expect(safe.length).toBeGreaterThan(0)
    expect(safe.length).toBeLessThan(TEMPLATES.length)
  })
})

describe('filterTemplates - combined, and the empty case', () => {
  it('all three narrow together', () => {
    expect(ids(filterTemplates(CATALOG, filter({ query: 'photo', tags: ['creative'] })))).toEqual(['gala'])
    expect(filterTemplates(CATALOG, filter({ query: 'photo', tags: ['two-column'], atsOnly: true }))).toEqual([])
  })

  it('a query nothing matches empties the grid, and the filter reads as active', () => {
    expect(filterTemplates(CATALOG, filter({ query: 'letterpress' }))).toEqual([])
    expect(isFilterActive(filter({ query: 'letterpress' }))).toBe(true)
    expect(isFilterActive(EMPTY_FILTER)).toBe(false)
    expect(isFilterActive(filter({ tags: ['photo'] }))).toBe(true)
    expect(isFilterActive(filter({ atsOnly: true }))).toBe(true)
  })
})

describe('tagChoices', () => {
  it('derives the chips from the catalog, commonest first, minus the strict tag', () => {
    expect(tagChoices(CATALOG)).toEqual([
      'single-column', // 3
      'photo', // 2, alphabetically ahead of the other 2
      'two-column', // 2
      'classic', // 1
      'creative', // 1
      'minimal', // 1
      'modern', // 1
    ])
  })

  it('covers every tag the real registry uses, and offers no dead chip', () => {
    const chips = tagChoices(TEMPLATES)
    expect(chips).not.toContain(STRICT_TAG)
    expect(new Set(chips).size).toBe(chips.length)
    for (const tag of chips) expect(filterTemplates(TEMPLATES, filter({ tags: [tag] })).length).toBeGreaterThan(0)
    for (const t of TEMPLATES) for (const tag of t.tags) expect(tag === STRICT_TAG || chips.includes(tag)).toBe(true)
  })
})

describe('the query string round-trips', () => {
  const known = tagChoices(CATALOG)

  it('an unfiltered gallery has a clean URL', () => {
    expect(templateFilterParams(EMPTY_FILTER).toString()).toBe('')
  })

  it('carries text, tags and the toggle', () => {
    const f = filter({ query: 'photo rail', tags: ['two-column', 'photo'], atsOnly: true })
    const params = templateFilterParams(f)
    expect(params.toString()).toBe('q=photo+rail&tag=two-column&tag=photo&ats=1')
    expect(readTemplateFilter(params, known)).toEqual(f)
  })

  it('drops tags the registry no longer has, instead of showing an unexplainable empty page', () => {
    const params = new URLSearchParams('q=gala&tag=two-column&tag=letterpress&tag=two-column')
    expect(readTemplateFilter(params, known)).toEqual({
      query: 'gala',
      tags: ['two-column'],
      atsOnly: false,
    })
  })

  it('a URL with nothing in it reads as the default filter', () => {
    expect(readTemplateFilter(new URLSearchParams(''), known)).toEqual(EMPTY_FILTER)
  })
})
