import { describe, expect, it } from 'vitest'
import type { LibrarySample } from '@/data/library/types'
import {
  EMPTY_LIBRARY_FILTER,
  facetCounts,
  filterLibrary,
  isLibraryFilterActive,
  libraryFilterParams,
  matchesLibraryFilter,
  readLibraryFilter,
  toggleFacet,
  type LibraryFilter,
} from './libraryFilter'

/** A sample with only the fields the filter reads. The person's own job title
 *  follows the role, as it does in a real sample - a fixture that gave them all
 *  the same title would put that title in every haystack. */
function sample(over: Partial<LibrarySample> & Pick<LibrarySample, 'slug'>): LibrarySample {
  const role = over.role ?? 'Backend Engineer'
  return {
    category: 'software',
    seniority: 'mid',
    region: 'us',
    template: 'plainsong',
    blurb: 'A resume built on work that can be checked.',
    keywords: ['resume example'],
    ...over,
    role,
    content: { basics: { label: role } } as LibrarySample['content'],
  } as LibrarySample
}

const LIB: LibrarySample[] = [
  sample({ slug: 'a', category: 'software', seniority: 'mid', region: 'us', role: 'Backend Engineer' }),
  sample({ slug: 'b', category: 'software', seniority: 'entry', region: 'india', role: 'Frontend Engineer' }),
  sample({ slug: 'c', category: 'data', seniority: 'mid', region: 'india', role: 'Data Analyst' }),
  sample({ slug: 'd', category: 'design', seniority: 'senior', region: 'uk', role: 'Product Designer' }),
]

const slugs = (filter: Partial<LibraryFilter>) =>
  filterLibrary(LIB, { ...EMPTY_LIBRARY_FILTER, ...filter }).map((s) => s.slug)

describe('filtering the example library', () => {
  it('shows everything when nothing is chosen', () => {
    expect(slugs({})).toEqual(['a', 'b', 'c', 'd'])
    expect(isLibraryFilterActive(EMPTY_LIBRARY_FILTER)).toBe(false)
  })

  it('ORs the choices inside one facet', () => {
    // A sample has exactly one category, so ANDing two would empty the grid
    // the moment a reader picked a second shelf.
    expect(slugs({ categories: ['software', 'data'] })).toEqual(['a', 'b', 'c'])
  })

  it('ANDs across facets', () => {
    expect(slugs({ categories: ['software'], regions: ['india'] })).toEqual(['b'])
    expect(slugs({ categories: ['design'], regions: ['india'] })).toEqual([])
  })

  it('needs every typed term, anywhere a reader would look', () => {
    expect(slugs({ query: 'data' })).toEqual(['c'])
    expect(slugs({ query: 'engineer' })).toEqual(['a', 'b'])
    // Terms AND: a second word refines the first.
    expect(slugs({ query: 'backend engineer' })).toEqual(['a'])
    expect(slugs({ query: 'backend designer' })).toEqual([])
  })

  it('keeps narrowing on a half-typed word rather than emptying', () => {
    expect(slugs({ query: 'desig' })).toEqual(['d'])
  })

  it('treats whitespace as no filter at all', () => {
    expect(isLibraryFilterActive({ ...EMPTY_LIBRARY_FILTER, query: '   ' })).toBe(false)
    expect(slugs({ query: '   ' })).toEqual(['a', 'b', 'c', 'd'])
  })
})

describe('what the chips are allowed to claim', () => {
  it('counts each value against the REST of the filter, not the whole library', () => {
    const counts = facetCounts(LIB, { ...EMPTY_LIBRARY_FILTER, regions: ['india'] }, 'categories')
    expect(counts).toEqual({ software: 1, data: 1 })
  })

  it("ignores a facet's own choices when counting it", () => {
    // Picking Software must not make Data read zero — the reader has to be
    // able to see what adding it would bring in.
    const counts = facetCounts(LIB, { ...EMPTY_LIBRARY_FILTER, categories: ['software'] }, 'categories')
    expect(counts).toEqual({ software: 2, data: 1, design: 1 })
  })
})

describe('a filtered library is a link someone can send', () => {
  it('round-trips through the query string', () => {
    const filter: LibraryFilter = {
      query: 'data analyst',
      categories: ['data'],
      seniorities: ['mid', 'senior'],
      regions: ['india'],
    }
    expect(readLibraryFilter(libraryFilterParams(filter))).toEqual(filter)
  })

  it('leaves a clean URL when nothing is chosen', () => {
    expect(libraryFilterParams(EMPTY_LIBRARY_FILTER).toString()).toBe('')
  })

  it('carries the text exactly as typed, spaces included', () => {
    // Trimming here would make the search box swallow the space between two
    // words as they are typed.
    const params = libraryFilterParams({ ...EMPTY_LIBRARY_FILTER, query: 'data ' })
    expect(readLibraryFilter(params).query).toBe('data ')
  })

  it('drops a value that no longer exists instead of emptying the page', () => {
    const params = new URLSearchParams('c=software&c=astrology&level=wizard&region=mars')
    expect(readLibraryFilter(params)).toEqual({
      query: '',
      categories: ['software'],
      seniorities: [],
      regions: [],
    })
  })

  it('asks for a value once however many times a link names it', () => {
    expect(readLibraryFilter(new URLSearchParams('c=data&c=data')).categories).toEqual(['data'])
  })
})

describe('toggling one chip', () => {
  it('adds what is missing and removes what is there', () => {
    expect(toggleFacet(['software'], 'data')).toEqual(['software', 'data'])
    expect(toggleFacet(['software', 'data'], 'software')).toEqual(['data'])
  })
})

describe('matching one sample', () => {
  it('is the same answer the grid gives', () => {
    const filter: LibraryFilter = { ...EMPTY_LIBRARY_FILTER, categories: ['data'] }
    expect(matchesLibraryFilter(LIB[2], filter)).toBe(true)
    expect(matchesLibraryFilter(LIB[0], filter)).toBe(false)
  })
})
