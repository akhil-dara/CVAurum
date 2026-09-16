/**
 * The example library (/examples).
 *
 * Every sample résumé in the collection, with a search and three facets whose
 * state lives in the query string — a filtered shelf is a link someone can
 * send, and the back button walks it.
 *
 * A card shows the PICTURE of that sample's exported page, not a live render
 * of it: 108 live résumés cost 10.5s of main-thread task time to browse and
 * still left 61 of the cards as grey sketches (measured on the production
 * build, 2026-09-15). See PagePicture for the whole measurement. The picture
 * is made from the same sample "Use this example" starts, so the two still
 * agree — and clicking it opens the page full size.
 *
 * A card loads the 520px twin (sampleThumbImage), not the 1200px file: 3.90 MB
 * for all 108 against 10.74 MB, for cards 172 CSS px wide on a phone. The
 * lightbox below still opens the big one.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronDown, Plus, Search, SlidersHorizontal, Wand2, X } from 'lucide-react'
import { LIBRARY } from '@/data/library'
import {
  CATEGORY_LABELS,
  LIBRARY_CATEGORIES,
  REGION_LABELS,
  REGIONS,
  SENIORITIES,
  SENIORITY_LABELS,
  type LibrarySample,
} from '@/data/library/types'
import {
  EMPTY_LIBRARY_FILTER,
  facetCounts,
  filterLibrary,
  isLibraryFilterActive,
  libraryFilterParams,
  readLibraryFilter,
  toggleFacet,
  type LibraryFilter,
} from '@/lib/libraryFilter'
import { PagePicture } from '@/components/preview/PagePicture'
import { PageLightbox, type LightboxItem } from '@/components/preview/PageLightbox'
import {
  samplePageImage,
  samplePageImageHeight,
  sampleImageAlt,
  sampleThumbImage,
  sampleThumbHeight,
} from '@/lib/seoLibrary'
import { PAGE_THUMB_WIDTH } from '@/data/pageThumbs'
import { SiteFooter, SiteHeader } from '@/components/site/SiteChrome'
import { NewResumeModal, SamplePicker, useResumeActions } from '@/components/dashboard/newResume'
import { useTitle } from '@/lib/useTitle'
import { useCanonical } from '@/lib/useCanonical'
import { getTemplate } from '@/templates/registry'
import { cn } from '@/lib/utils'

const CANONICAL = 'https://cvaurum.com/examples'

/** The shelves, in the order the rail offers them. */
const CATEGORY_CHOICES = LIBRARY_CATEGORIES.map((value) => ({ value, label: CATEGORY_LABELS[value] }))
const SENIORITY_CHOICES = SENIORITIES.map((value) => ({ value, label: SENIORITY_LABELS[value] }))
const REGION_CHOICES = REGIONS.map((value) => ({ value, label: REGION_LABELS[value] }))

/** What the collection is, in numbers, so the claim above it can be checked. */
const FACTS: { value: string; label: string; good?: boolean }[] = [
  { value: String(LIBRARY_CATEGORIES.length), label: 'fields' },
  { value: String(SENIORITIES.length), label: 'career stages' },
  { value: String(REGIONS.length), label: 'countries' },
  { value: String(new Set(LIBRARY.map((s) => s.template)).size), label: 'designs used' },
  { value: '0', label: 'real people', good: true },
]

type SortKey = 'shelf' | 'az'
const SORTS: { value: SortKey; label: string }[] = [
  { value: 'shelf', label: 'By field' },
  { value: 'az', label: 'Job title A–Z' },
]

export function Examples() {
  useTitle(`${LIBRARY.length} Résumé Examples for Real Jobs — Free to Copy · CVAurum`)
  useCanonical(CANONICAL)
  // Arriving from a link in the middle of another page keeps that page's
  // scroll position, and this page is tall enough to hold one.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const { create, importFile, importPdf } = useResumeActions()
  const fileRef = useRef<HTMLInputElement>(null)
  const pdfRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [chooser, setChooser] = useState(false)
  const [sampleOpen, setSampleOpen] = useState(false)
  // The rail is permanent from `lg` up, where it costs a column nothing else
  // wanted. Below that it folds: on a 375px phone three facet groups stood
  // between the heading and the first example, which began two screens down.
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sort, setSort] = useState<SortKey>('shelf')
  /** Which card is open full size, as an index into what is currently shown —
   *  prev/next walk the filtered shelf, not the whole library, because that is
   *  the collection the reader is actually looking through. */
  const [bigIndex, setBigIndex] = useState<number | null>(null)

  const [params, setParams] = useSearchParams()
  // Keyed on the query STRING: the params object is fresh every render, so
  // memoising on it would re-filter and re-key the grid on every keystroke.
  const search = params.toString()
  const filter = useMemo(() => readLibraryFilter(new URLSearchParams(search)), [search])
  /** Typing REPLACES the history entry; a chip PUSHES one. A pushed entry per
   *  keystroke would make the back button a slow rewind of the search box. */
  const apply = (next: LibraryFilter, replace = false) => setParams(libraryFilterParams(next), { replace })

  const shown = useMemo(() => {
    const matched = filterLibrary(LIBRARY, filter)
    return sort === 'az' ? [...matched].sort((a, b) => a.role.localeCompare(b.role)) : matched
  }, [filter, sort])
  // Filtering while a card is open would leave the index pointing at a
  // different résumé than the one being read; close instead.
  useEffect(() => setBigIndex(null), [shown])

  const big: LightboxItem[] = useMemo(
    () =>
      shown.map((s) => {
        const tpl = getTemplate(s.template)
        return {
          src: samplePageImage(s.slug),
          height: samplePageImageHeight(s.slug),
          alt: sampleImageAlt(s.slug),
          title: s.role,
          caption: `${SENIORITY_LABELS[s.seniority]} · written for ${REGION_LABELS[s.region]} · set in the ${tpl.name} design`,
          aboutHref: `/examples/${s.slug}`,
          aboutLabel: 'Read it in full',
          useLabel: 'Use this example',
          onUse: () => create(true, s.template, s.content, s.tweaks, `${s.role} resume`),
        }
      }),
    [shown, create]
  )

  const active = isLibraryFilterActive(filter)
  const chosenCount = filter.categories.length + filter.seniorities.length + filter.regions.length
  const counts = useMemo(
    () => ({
      categories: facetCounts(LIBRARY, filter, 'categories'),
      seniorities: facetCounts(LIBRARY, filter, 'seniorities'),
      regions: facetCounts(LIBRARY, filter, 'regions'),
    }),
    [filter]
  )

  /** Every chosen value, so each can be taken off on its own — a reader who
   *  over-narrowed wants the last choice back, not a cleared page. */
  const chosen: { key: string; label: string; drop: () => void }[] = [
    ...filter.categories.map((c) => ({
      key: `c-${c}`,
      label: CATEGORY_LABELS[c],
      drop: () => apply({ ...filter, categories: filter.categories.filter((x) => x !== c) }),
    })),
    ...filter.seniorities.map((s) => ({
      key: `l-${s}`,
      label: SENIORITY_LABELS[s],
      drop: () => apply({ ...filter, seniorities: filter.seniorities.filter((x) => x !== s) }),
    })),
    ...filter.regions.map((r) => ({
      key: `r-${r}`,
      label: REGION_LABELS[r],
      drop: () => apply({ ...filter, regions: filter.regions.filter((x) => x !== r) }),
    })),
  ]

  // "/" jumps to the search box, the shortcut every list of this size has —
  // but never while the reader is already typing somewhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
      const el = document.activeElement
      if (el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return
      e.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="min-h-full bg-background">
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => importFile(e.target.files?.[0])}
      />
      <input
        ref={pdfRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => importPdf(e.target.files?.[0])}
      />

      <SiteHeader
        current="examples"
        onCreate={() => setChooser(true)}
        action={
          <button className="btn-primary btn-sm" onClick={() => setChooser(true)}>
            <Plus className="h-4 w-4" />
            <span>
              Create<span className="hidden sm:inline"> resume</span>
            </span>
          </button>
        }
      />

      <main className="mx-auto max-w-6xl px-4 py-9 sm:px-6 sm:py-10">
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-[2.4rem] sm:leading-[1.12]">
          {LIBRARY.length} résumé examples, written out in full
        </h1>
        <p className="mt-3.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Complete résumés for real jobs — every bullet naming something that happened and what it changed. Open any one
          in the editor and put your own history in its place.
        </p>

        {/* The claim above, in numbers. */}
        <dl className="mt-6 flex flex-wrap items-start gap-x-7 gap-y-4 border-b border-border pb-6">
          {FACTS.map((f) => (
            <div key={f.label}>
              <dd className={cn('text-xl font-semibold leading-none tabular-nums', f.good && 'text-success')}>
                {f.value}
              </dd>
              <dt className="mt-1 text-xs text-muted-foreground">{f.label}</dt>
            </div>
          ))}
        </dl>

        <div className="mt-6 grid gap-x-10 lg:grid-cols-[13.5rem_minmax(0,1fr)]">
          {/* The toggle is the rail's header on a phone and absent from `lg` up. */}
          <button
            type="button"
            className="btn-outline btn-sm mb-3 w-full justify-between lg:hidden"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((v) => !v)}
          >
            <span className="inline-flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {chosenCount > 0 && (
                <span className="rounded-full bg-primary/10 px-1.5 text-[11px] font-semibold text-primary">
                  {chosenCount}
                </span>
              )}
            </span>
            <ChevronDown className={cn('h-4 w-4 transition-transform', filtersOpen && 'rotate-180')} />
          </button>

          <aside className={cn('mb-6 lg:mb-0 lg:block', !filtersOpen && 'hidden lg:block')}>
            <div className="hidden items-center justify-between lg:flex">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Filters</span>
              {active && (
                <button className="text-xs text-primary hover:underline" onClick={() => apply(EMPTY_LIBRARY_FILTER)}>
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-col gap-6 lg:mt-4">
              <FacetGroup
                legend="Field"
                choices={CATEGORY_CHOICES}
                chosen={filter.categories}
                counts={counts.categories}
                onToggle={(value) => apply({ ...filter, categories: toggleFacet(filter.categories, value) })}
              />
              <FacetGroup
                legend="Career stage"
                choices={SENIORITY_CHOICES}
                chosen={filter.seniorities}
                counts={counts.seniorities}
                onToggle={(value) => apply({ ...filter, seniorities: toggleFacet(filter.seniorities, value) })}
              />
              <FacetGroup
                legend="Written for"
                choices={REGION_CHOICES}
                chosen={filter.regions}
                counts={counts.regions}
                onToggle={(value) => apply({ ...filter, regions: toggleFacet(filter.regions, value) })}
              />
            </div>
          </aside>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <label className="relative min-w-[13rem] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={searchRef}
                  type="search"
                  value={filter.query}
                  onChange={(e) => apply({ ...filter, query: e.target.value }, true)}
                  placeholder="Search a job title, a skill, a field…"
                  aria-label="Search the examples"
                  className="input h-10 w-full pl-9 pr-3"
                />
              </label>
              <label className="inline-flex h-10 items-center gap-2 rounded-md border border-input bg-surface px-3 text-sm shadow-soft">
                <span className="text-muted-foreground">Sort</span>
                <select
                  className="bg-transparent font-medium text-foreground focus-visible:outline-none"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  aria-label="Sort the examples"
                >
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-3.5 flex flex-wrap items-center gap-2">
              <p className="text-sm text-muted-foreground" aria-live="polite">
                <strong className="font-semibold tabular-nums text-foreground">{shown.length}</strong> example
                {shown.length === 1 ? '' : 's'}
              </p>
              {chosen.map((c) => (
                <button
                  key={c.key}
                  onClick={c.drop}
                  className="inline-flex items-center gap-1 rounded-full border border-primary/35 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary transition hover:bg-primary/15"
                  aria-label={`Remove the ${c.label} filter`}
                >
                  {c.label}
                  <X className="h-3 w-3" />
                </button>
              ))}
              {filter.query.trim() && (
                <button
                  onClick={() => apply({ ...filter, query: '' })}
                  className="inline-flex items-center gap-1 rounded-full border border-primary/35 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary transition hover:bg-primary/15"
                  aria-label="Clear the search"
                >
                  “{filter.query.trim()}”
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {shown.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-dashed border-border px-6 py-16 text-center">
                <p className="text-sm font-medium text-foreground">Nothing matches all of those at once</p>
                <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
                  Each filter narrows the last, so a field and a career stage that never occur together land here. Drop
                  one and the shelf fills again.
                </p>
                <button className="btn-outline btn-sm mt-5" onClick={() => apply(EMPTY_LIBRARY_FILTER)}>
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
                {shown.map((s, i) => (
                  <SampleCard
                    key={s.slug}
                    sample={s}
                    eager={i < 4}
                    onOpen={() => setBigIndex(i)}
                    onPick={() => create(true, s.template, s.content, s.tweaks, `${s.role} resume`)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <SiteFooter />

      {chooser && (
        <NewResumeModal
          onBlank={() => {
            setChooser(false)
            create(false)
          }}
          onExample={() => {
            setChooser(false)
            setSampleOpen(true)
          }}
          onImport={() => {
            setChooser(false)
            fileRef.current?.click()
          }}
          onImportPdf={() => {
            setChooser(false)
            pdfRef.current?.click()
          }}
          onClose={() => setChooser(false)}
        />
      )}
      {bigIndex !== null && big[bigIndex] && (
        <PageLightbox items={big} index={bigIndex} onIndex={setBigIndex} onClose={() => setBigIndex(null)} />
      )}
      {sampleOpen && (
        <SamplePicker
          onClose={() => setSampleOpen(false)}
          onPick={(p) => {
            setSampleOpen(false)
            create(true, p.template, p.content, p.tweaks, `${p.role} resume`)
          }}
        />
      )}
    </div>
  )
}

/** One facet: a legend and its values, each saying how many it would leave. */
function FacetGroup<T extends string>({
  legend,
  choices,
  chosen,
  counts,
  onToggle,
}: {
  legend: string
  choices: readonly { value: T; label: string }[]
  chosen: readonly T[]
  counts: Record<string, number>
  onToggle: (value: T) => void
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-xs font-semibold text-foreground">{legend}</legend>
      <div className="flex flex-col gap-0.5">
        {choices.map(({ value, label }) => {
          const on = chosen.includes(value)
          const n = counts[value] ?? 0
          return (
            <button
              key={value}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(value)}
              className={cn(
                'group -mx-1.5 flex items-center gap-2 rounded px-1.5 py-1 text-left text-[13px] transition hover:bg-muted',
                // A value that would empty the shelf still works — it is how a
                // reader swaps one choice for another — but it says so first.
                !on && n === 0 && 'opacity-45'
              )}
            >
              <span
                className={cn(
                  'flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-[4px] border transition',
                  on ? 'border-primary bg-primary text-primary-foreground' : 'border-input group-hover:border-primary/50'
                )}
                aria-hidden
              >
                {on && (
                  <svg
                    viewBox="0 0 24 24"
                    className="h-2.5 w-2.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={3.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </span>
              <span className={cn('min-w-0 flex-1 truncate text-foreground', on && 'font-medium')}>{label}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{n}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

/**
 * One example. The picture is the file (see PagePicture); the card's own
 * behaviours are unchanged — the hover/focus actions, the title link, the
 * facts line — with one gained: the picture itself now opens the page full
 * size, which is the only "see it big" a phone has ever been offered here.
 *
 * Both ways in still live on the card: reading it in full and starting from it
 * are different intentions, and a card offering only one made the reader guess
 * which one the whole card did.
 */
function SampleCard({
  sample,
  onPick,
  onOpen,
  eager,
}: {
  sample: LibrarySample
  onPick: () => void
  onOpen: () => void
  eager?: boolean
}) {
  const accent = getTemplate(sample.template).defaults.theme.primary
  const facts = [CATEGORY_LABELS[sample.category], SENIORITY_LABELS[sample.seniority], REGION_LABELS[sample.region]]

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-soft transition hover:border-primary/50 hover:shadow-card">
      <div className="relative border-b border-border">
        {/* A picture that opens a picture: a button, so a keyboard reaches it
            and a screen reader is told what it does. The overlay below sits on
            top of it and passes clicks through everywhere but its own two
            controls, so the whole card face stays one target. */}
        <button
          type="button"
          onClick={onOpen}
          aria-label={`See the ${sample.role} example full size`}
          className="block w-full cursor-zoom-in"
        >
          <PagePicture
            src={sampleThumbImage(sample.slug)}
            width={PAGE_THUMB_WIDTH}
            height={sampleThumbHeight(sample.slug)}
            alt={sampleImageAlt(sample.slug)}
            accent={accent}
            eager={eager}
            className="w-full"
          />
        </button>
        {/* Revealed by a pointer, and revealed by a keyboard too: the actions
            are real controls, not a hover-only secret. `group-focus-within`
            is what makes tabbing to them show them. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-end gap-2 bg-gradient-to-t from-foreground/85 via-foreground/25 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            type="button"
            onClick={onPick}
            className="pointer-events-auto inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-primary text-[13px] font-semibold text-primary-foreground shadow-soft transition hover:brightness-110"
          >
            <Wand2 className="h-3.5 w-3.5" />
            Use this example
          </button>
          <Link
            to={`/examples/${sample.slug}`}
            className="pointer-events-auto inline-flex h-8 items-center justify-center rounded-md bg-surface/95 text-[13px] font-medium text-foreground transition hover:bg-surface"
          >
            Read it in full
          </Link>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <Link
          to={`/examples/${sample.slug}`}
          title={`Read the ${sample.role} example`}
          className="text-sm font-semibold leading-snug text-foreground transition group-hover:text-primary"
        >
          {sample.role}
        </Link>
        <p className="text-xs leading-relaxed text-muted-foreground">{facts.join(' · ')}</p>
      </div>
    </div>
  )
}
