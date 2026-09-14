/**
 * The example library (/examples).
 *
 * Every sample résumé in the collection, each shown as the document it really
 * is rather than a picture of one, with a search and three facets whose state
 * lives in the query string — a filtered shelf is a link someone can send, and
 * the back button walks it.
 *
 * A card previews the same document "Use this example" starts, because both
 * come from `sampleDoc`.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, ChevronDown, Plus, Search, SlidersHorizontal, X } from 'lucide-react'
import { LIBRARY } from '@/data/library'
import { sampleDoc } from '@/data/library/doc'
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
import { PreviewThumb } from '@/components/preview/PreviewThumb'
import { HoverZoom } from '@/components/preview/HoverZoom'
import { ThumbSkeleton } from '@/components/preview/ThumbSkeleton'
import { useLazyMount } from '@/components/preview/lazyMount'
import { SiteFooter, SiteHeader } from '@/components/site/SiteChrome'
import { NewResumeModal, SamplePicker, useResumeActions } from '@/components/dashboard/newResume'
import { useTitle } from '@/lib/useTitle'
import { useCanonical } from '@/lib/useCanonical'
import { getTemplate } from '@/templates/registry'
import { cn } from '@/lib/utils'

const CANONICAL = 'https://cvaurum.com/examples'

/** The shelves, in the order the chips offer them. */
const CATEGORY_CHOICES = LIBRARY_CATEGORIES.map((value) => ({ value, label: CATEGORY_LABELS[value] }))
const SENIORITY_CHOICES = SENIORITIES.map((value) => ({ value, label: SENIORITY_LABELS[value] }))
const REGION_CHOICES = REGIONS.map((value) => ({ value, label: REGION_LABELS[value] }))

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
  // On a phone the three chip rows stood between the heading and the first
  // example - measured at 375x812, the grid began two screens down. They fold
  // away behind a count there, and are always open from `sm` up, where they
  // cost one row and are worth seeing.
  const [filtersOpen, setFiltersOpen] = useState(false)

  const [params, setParams] = useSearchParams()
  // Keyed on the query STRING: the params object is fresh every render, so
  // memoising on it would re-filter and re-key the grid on every keystroke.
  const search = params.toString()
  const filter = useMemo(() => readLibraryFilter(new URLSearchParams(search)), [search])
  /** Typing REPLACES the history entry; a chip PUSHES one. A pushed entry per
   *  keystroke would make the back button a slow rewind of the search box. */
  const apply = (next: LibraryFilter, replace = false) => setParams(libraryFilterParams(next), { replace })

  const shown = useMemo(() => filterLibrary(LIBRARY, filter), [filter])
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
        action={
          <button className="btn-primary btn-sm" onClick={() => setChooser(true)}>
            <Plus className="h-4 w-4" />
            <span>
              Create<span className="hidden sm:inline"> resume</span>
            </span>
          </button>
        }
      />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {LIBRARY.length} résumé examples, written out in full
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Complete résumés for real jobs — every bullet naming something that happened and what it changed, so there is
          something to copy the shape of rather than a page of placeholder text. Open any one in the editor and put your
          own history in its place. Every name, employer and number below is invented.
        </p>

        <div className="mt-7 space-y-4">
          <label className="relative block max-w-md">
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

          <button
            type="button"
            className="btn-outline btn-sm w-full justify-between sm:hidden"
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

          <div className={cn('space-y-4', !filtersOpen && 'hidden sm:block')}>
          <FacetRow
            legend="Field"
            choices={CATEGORY_CHOICES}
            chosen={filter.categories}
            counts={counts.categories}
            onToggle={(value) => apply({ ...filter, categories: toggleFacet(filter.categories, value) })}
          />
          <FacetRow
            legend="Career stage"
            choices={SENIORITY_CHOICES}
            chosen={filter.seniorities}
            counts={counts.seniorities}
            onToggle={(value) => apply({ ...filter, seniorities: toggleFacet(filter.seniorities, value) })}
          />
          <FacetRow
            legend="Written for"
            choices={REGION_CHOICES}
            chosen={filter.regions}
            counts={counts.regions}
            onToggle={(value) => apply({ ...filter, regions: toggleFacet(filter.regions, value) })}
          />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {active ? `${shown.length} example${shown.length === 1 ? '' : 's'}` : `${LIBRARY.length} examples`}
          </p>
          {active && (
            <button className="btn-ghost btn-xs" onClick={() => apply(EMPTY_LIBRARY_FILTER)}>
              <X className="h-3 w-3" /> Clear filters
            </button>
          )}
        </div>

        {shown.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border px-6 py-16 text-center">
            <p className="text-sm font-medium text-foreground">Nothing matches all of those at once</p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
              Each filter narrows the last, so a field and a career stage that never occur together land here. Drop one
              and the shelf fills again.
            </p>
            <button className="btn-outline btn-sm mt-5" onClick={() => apply(EMPTY_LIBRARY_FILTER)}>
              Clear filters
            </button>
          </div>
        ) : (
          // Two to a row on a phone rather than one. A full-width A4 thumbnail
          // is taller than the screen, which made a hundred and eight of them
          // about a hundred and fifty screens of scrolling; at half the width
          // the page is still recognisable as a shape, which is what a card is
          // for.
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {shown.map((s) => (
              <SampleCard key={s.slug} sample={s} onPick={() => create(true, s.template, s.content, s.tweaks)} />
            ))}
          </div>
        )}
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

/** One facet: a legend and its chips, each saying how many it would leave. */
function FacetRow<T extends string>({
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
    <fieldset className="flex flex-wrap items-center gap-1.5">
      <legend className="sr-only">{legend}</legend>
      <span className="mr-1 w-full text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:w-auto">
        {legend}
      </span>
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
              'rounded-full border px-2.5 py-1 text-xs font-medium transition',
              on
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
              // A chip that would empty the grid still works — it is how a
              // reader swaps one choice for another — but it says so first.
              !on && n === 0 && 'opacity-45'
            )}
          >
            {label}
            <span className="ml-1 tabular-nums opacity-60">{n}</span>
          </button>
        )
      })}
    </fieldset>
  )
}

/**
 * One example. The thumbnail is a real résumé render, so a hundred of them
 * mounting at once would cost a hundred layouts — `useLazyMount` holds each
 * one until it is nearly on screen and a skeleton stands in until then.
 */
function SampleCard({ sample, onPick }: { sample: LibrarySample; onPick: () => void }) {
  const [thumbRef, seen] = useLazyMount<HTMLDivElement>()
  // Built only once the card is worth rendering: a document per sample up
  // front is a hundred documents nobody has scrolled to yet.
  const doc = useMemo(() => (seen ? sampleDoc(sample) : null), [seen, sample])
  const accent = getTemplate(sample.template).defaults.theme.primary

  const card = (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:border-primary/40 hover:shadow-lg">
      <div ref={thumbRef} className="aspect-[1/1.294] w-full overflow-hidden border-b border-border bg-white">
        {doc ? <PreviewThumb doc={doc} width={260} /> : <ThumbSkeleton accent={accent} />}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <Link
            to={`/examples/${sample.slug}`}
            title={`Read the ${sample.role} example`}
            className="text-sm font-semibold text-foreground transition hover:text-primary hover:underline"
          >
            {sample.role}
          </Link>
          <button
            type="button"
            onClick={onPick}
            aria-label={`Start a résumé from the ${sample.role} example`}
            title="Start a résumé from this example"
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition hover:border-primary/50 hover:text-primary"
          >
            Use <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
        <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">{sample.blurb}</p>
        <div className="mt-auto flex flex-wrap gap-1 pt-1">
          {[CATEGORY_LABELS[sample.category], SENIORITY_LABELS[sample.seniority], REGION_LABELS[sample.region]].map(
            (label) => (
              <span
                key={label}
                className="rounded-full border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                {label}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  )

  // The zoom needs the document; before the card has mounted one there is
  // nothing to zoom into, and the plain card is what stands in.
  return doc ? (
    <HoverZoom doc={doc} label={sample.role}>
      {card}
    </HoverZoom>
  ) : (
    card
  )
}
