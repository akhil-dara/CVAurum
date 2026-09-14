/**
 * The example library's filtering, kept pure so it can be tested without a DOM
 * and shared with the query string that drives it.
 *
 * Semantics — within one facet the choices OR, across facets they AND. A
 * sample has exactly one category, so treating two chosen categories as AND
 * would empty the grid the moment a reader picked a second shelf; picking
 * "Software" and then "Data" plainly asks for both. Narrowing across facets is
 * the opposite: "Software" plus "Entry level" asks for the overlap.
 *
 * Text is matched as plain substrings, every term having to appear somewhere,
 * so a half-typed word keeps narrowing instead of emptying the grid
 * mid-keystroke — the same rule the design gallery's search follows.
 */
import type { LibraryCategory, LibrarySample, Region, Seniority } from '@/data/library/types'
import { LIBRARY_CATEGORIES, REGIONS, SENIORITIES } from '@/data/library/types'

export interface LibraryFilter {
  /** Raw text as typed; empty means "no text filter". */
  query: string
  categories: readonly LibraryCategory[]
  seniorities: readonly Seniority[]
  regions: readonly Region[]
}

export const EMPTY_LIBRARY_FILTER: LibraryFilter = { query: '', categories: [], seniorities: [], regions: [] }

/** The search terms a query asks for; whitespace-only asks for nothing. */
function terms(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean)
}

/**
 * Everything a reader could reasonably type to find this sample: the job it is
 * written for, what it shows, the words it was filed under, and the person's
 * own job title. Not the résumé's full text — a search for "Python" should
 * find the samples filed under Python, not every one that mentions it once.
 */
function haystack(s: LibrarySample): string {
  return [s.role, s.blurb, s.keywords.join(' '), s.content.basics.label ?? '', s.category, s.seniority, s.region]
    .join(' ')
    .toLowerCase()
}

export function matchesLibraryFilter(s: LibrarySample, filter: LibraryFilter): boolean {
  if (filter.categories.length && !filter.categories.includes(s.category)) return false
  if (filter.seniorities.length && !filter.seniorities.includes(s.seniority)) return false
  if (filter.regions.length && !filter.regions.includes(s.region)) return false
  const text = haystack(s)
  return terms(filter.query).every((term) => text.includes(term))
}

export function filterLibrary(samples: readonly LibrarySample[], filter: LibraryFilter): LibrarySample[] {
  return samples.filter((s) => matchesLibraryFilter(s, filter))
}

/** Is anything narrowing the grid? Drives the "clear filters" affordance. */
export function isLibraryFilterActive(filter: LibraryFilter): boolean {
  return (
    filter.categories.length > 0 ||
    filter.seniorities.length > 0 ||
    filter.regions.length > 0 ||
    terms(filter.query).length > 0
  )
}

/** Which value of each facet a sample holds. */
const FACET_VALUE: Record<'categories' | 'seniorities' | 'regions', (s: LibrarySample) => string> = {
  categories: (s) => s.category,
  seniorities: (s) => s.seniority,
  regions: (s) => s.region,
}

/**
 * How many samples each value of a facet would leave, with the REST of the
 * filter still applied.
 *
 * A chip that said how many samples exist would be lying the moment another
 * facet is narrowing: pick "India", and "Healthcare (9)" might show two. The
 * rest of the filter is applied and the facet's own choices are not, which is
 * also why picking a second value inside one facet never changes its
 * neighbours' counts.
 */
export function facetCounts(
  samples: readonly LibrarySample[],
  filter: LibraryFilter,
  facet: 'categories' | 'seniorities' | 'regions'
): Record<string, number> {
  const valueOf = FACET_VALUE[facet]
  const rest = { ...filter, [facet]: [] } as LibraryFilter
  const out: Record<string, number> = {}
  for (const s of samples) {
    if (!matchesLibraryFilter(s, rest)) continue
    const key = valueOf(s)
    out[key] = (out[key] ?? 0) + 1
  }
  return out
}

/**
 * Read the filter back out of a shared link. Values that are not real are
 * dropped rather than kept: a stale or mistyped one would otherwise match
 * nothing and hand the reader an empty page they cannot explain.
 */
export function readLibraryFilter(params: URLSearchParams): LibraryFilter {
  const pick = <T extends string>(key: string, known: readonly T[]): T[] => [
    ...new Set(params.getAll(key).filter((v): v is T => (known as readonly string[]).includes(v))),
  ]
  return {
    query: params.get('q') ?? '',
    categories: pick('c', LIBRARY_CATEGORIES),
    seniorities: pick('level', SENIORITIES),
    regions: pick('region', REGIONS),
  }
}

/**
 * The query string for a filter — omitting everything at its default, so an
 * unfiltered library has a clean URL. The text is carried EXACTLY as typed,
 * spaces included: dropping whitespace-only text here would make the search
 * box swallow the space between two words as it is typed.
 */
export function libraryFilterParams(filter: LibraryFilter): URLSearchParams {
  const params = new URLSearchParams()
  if (filter.query) params.set('q', filter.query)
  for (const c of filter.categories) params.append('c', c)
  for (const l of filter.seniorities) params.append('level', l)
  for (const r of filter.regions) params.append('region', r)
  return params
}

/** Toggle one value of a facet, leaving the rest of the filter alone. */
export function toggleFacet<T extends string>(current: readonly T[], value: T): T[] {
  return current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
}
