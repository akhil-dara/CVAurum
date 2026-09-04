/**
 * The public gallery's filtering, kept pure so it can be tested without a DOM
 * and shared with the query string that drives it.
 *
 * Semantics - the three filters combine with AND, so each control only ever
 * narrows and the count beside them is the honest answer to all three:
 *
 *  - text: every whitespace-separated term must appear, case-insensitively,
 *    somewhere in the name or the description. Terms AND together, because a
 *    reader who types a second word is refining the first, not asking for
 *    more results. Each term matches as a plain substring rather than a whole
 *    word, so "col" still finds "two-column" and a half-typed word keeps
 *    narrowing instead of emptying the grid mid-keystroke.
 *
 *  - tags: a design must carry EVERY selected tag. Chips narrow too - picking
 *    'photo' after 'two-column' asks for the designs that are both. Two tags
 *    nothing carries together (say 'single-column' + 'two-column') therefore
 *    land on the empty state, which offers the way out.
 *
 *  - strict layouts: see isStrictLayout.
 */
import type { TemplateConfig, TemplateTag } from '@/types/template'

export interface TemplateFilter {
  /** Raw text as typed; empty means "no text filter". */
  query: string
  /** Tags that must ALL be present. */
  tags: readonly TemplateTag[]
  /** Narrow to the strictest layouts - see isStrictLayout. */
  atsOnly: boolean
}

export const EMPTY_FILTER: TemplateFilter = { query: '', tags: [], atsOnly: false }

/**
 * The tag the "strictest layouts" toggle owns. The registry spells it
 * 'ats-safe', but what it actually marks is the plainest single-column
 * designs, not a pass/fail verdict - every entry in the registry is ATS-ready.
 *
 * It is deliberately kept out of the chip row: a chip and a toggle that
 * filtered identically would be two controls for one idea, and the reader
 * could set them against each other.
 */
export const STRICT_TAG: TemplateTag = 'ats-safe'

/**
 * Is this one of the strictest layouts - the plain single-column designs that
 * are the safest bet with an unusually literal parser?
 *
 * This is NOT "is this design ATS-safe": the registry marks every one of its
 * entries `atsSafe: true` - the product's claim that all of them export
 * selectable text a parser can read - so that field alone removes nothing. The
 * discriminating signal is the tag, which only the plainest designs carry.
 * Both are required, so an entry added later with `atsSafe: false` is excluded
 * even if it were mis-tagged.
 */
export function isStrictLayout(t: TemplateConfig): boolean {
  return t.atsSafe && t.tags.includes(STRICT_TAG)
}

/**
 * The chips to offer, derived from the registry rather than a hand-kept list -
 * a template added with a new tag gets a chip for free. Ordered by how many
 * designs carry the tag (then alphabetically, so the order is stable), which
 * puts the structural tags a reader actually chooses between first.
 */
export function tagChoices(templates: readonly TemplateConfig[]): TemplateTag[] {
  const counts = new Map<TemplateTag, number>()
  for (const t of templates) {
    for (const tag of t.tags) {
      if (tag === STRICT_TAG) continue
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([tag]) => tag)
}

/** The search terms a query asks for; whitespace-only asks for nothing. */
function terms(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean)
}

export function matchesTemplateFilter(t: TemplateConfig, filter: TemplateFilter): boolean {
  if (filter.atsOnly && !isStrictLayout(t)) return false
  if (!filter.tags.every((tag) => t.tags.includes(tag))) return false
  const haystack = `${t.name} ${t.description}`.toLowerCase()
  return terms(filter.query).every((term) => haystack.includes(term))
}

export function filterTemplates(templates: readonly TemplateConfig[], filter: TemplateFilter): TemplateConfig[] {
  return templates.filter((t) => matchesTemplateFilter(t, filter))
}

/** Is anything narrowing the grid? Drives the "clear filters" affordance. */
export function isFilterActive(filter: TemplateFilter): boolean {
  return filter.atsOnly || filter.tags.length > 0 || terms(filter.query).length > 0
}

/**
 * Read the filter back out of a shared link. Tags that are not in `known` are
 * dropped rather than kept: a stale or mistyped tag would otherwise match
 * nothing and hand the reader an empty page they cannot explain.
 */
export function readTemplateFilter(params: URLSearchParams, known: readonly TemplateTag[]): TemplateFilter {
  const tags = params.getAll('tag').filter((tag): tag is TemplateTag => (known as readonly string[]).includes(tag))
  return {
    query: params.get('q') ?? '',
    // A link that names the same tag twice still asks for it once.
    tags: [...new Set(tags)],
    atsOnly: params.get('ats') === '1',
  }
}

/**
 * The query string for a filter - omitting everything that is at its default,
 * so an unfiltered gallery has a clean URL. The text is carried EXACTLY as
 * typed, spaces included: dropping whitespace-only text here would make the
 * search box swallow the space between two words as it is typed. Whether that
 * text narrows anything is isFilterActive's question, not this one's.
 */
export function templateFilterParams(filter: TemplateFilter): URLSearchParams {
  const params = new URLSearchParams()
  if (filter.query) params.set('q', filter.query)
  for (const tag of filter.tags) params.append('tag', tag)
  if (filter.atsOnly) params.set('ats', '1')
  return params
}
