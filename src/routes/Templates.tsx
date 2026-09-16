/**
 * Public template gallery (/templates). Every design in the registry, shown on
 * the SAME sample resume so the layouts can actually be compared, with a
 * search / tag / strictness filter whose state lives in the query string - a
 * filtered view is a link someone can send, and the back button walks it.
 *
 * Each card is the PICTURE of that design's exported page (see PagePicture),
 * not a live render of one: 68 live résumés cost 7.7s of main-thread task time
 * to browse on a desk and 9.9s on a phone, measured on the production build,
 * 2026-09-15. A card loads the 520px twin of that picture (pageThumb below),
 * not the 1200px file: 2.03 MB for the whole wall against 6.50 MB.
 * Clicking the picture opens it full size, where "Use this design"
 * is one of the two actions; the "Use" button beside the name is unchanged and
 * still starts a résumé in one click.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlignLeft, ArrowRight, ChevronDown, Plus, Search, SlidersHorizontal } from 'lucide-react'
import { TEMPLATES, galleryOrder } from '@/templates/registry'
import type { TemplateConfig, TemplateTag } from '@/types/template'
import { PagePicture } from '@/components/preview/PagePicture'
import { HoverZoom } from '@/components/preview/HoverZoom'
import { PageLightbox, type LightboxItem } from '@/components/preview/PageLightbox'
import { PAGE_IMAGE_HEIGHT, PAGE_IMAGE_WIDTH } from '@/data/pageImages'
import { PAGE_THUMB_WIDTH, pageThumbHeight as thumbHeight } from '@/data/pageThumbs'
import { SiteFooter, SiteHeader } from '@/components/site/SiteChrome'
import { useResumeActions, NewResumeModal, SamplePicker } from '@/components/dashboard/newResume'
import { useTitle } from '@/lib/useTitle'
import { useCanonical } from '@/lib/useCanonical'
import { cn } from '@/lib/utils'
import {
  EMPTY_FILTER,
  STRICT_TAG,
  filterTemplates,
  isFilterActive,
  readTemplateFilter,
  tagChoices,
  templateFilterParams,
  type TemplateFilter,
} from '@/lib/templateFilter'

/** This page's own URL - index.html's head names the home page on every route. */
const CANONICAL = 'https://cvaurum.com/templates'

/** Derived once from the registry - a new tag on a new template gets a chip. */
const TAG_CHOICES = tagChoices(TEMPLATES)
// the signature collection leads the wall
const GALLERY = galleryOrder(TEMPLATES)

/** 'two-column' reads as a slug; the chip says it in words. */
const tagLabel = (tag: TemplateTag) => {
  const words = tag.replace(/-/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/**
 * The picture of a résumé page in this design, and what to call it.
 *
 * Deliberately NOT `templatePageImage`/`imageAlt` from lib/seoPages, which say
 * exactly this: seoPages imports lib/seoLibrary, which imports the 108-résumé
 * library — a 476 KB chunk (measured in dist, 2026-09-15) that this route has
 * no other reason to load, and does not load today. The words below are the
 * same words those helpers produce, tag for tag; if one side changes, the
 * template pages and this wall would disagree, so change both.
 */
export const pageImage = (tpl: TemplateConfig) => `/img/templates/${tpl.id}.webp`
/** A4 at 1200px wide, for a design whose entry the generated map is missing. */
const FALLBACK_HEIGHT = Math.round((PAGE_IMAGE_WIDTH * 297) / 210)
export const pageImageHeight = (tpl: TemplateConfig) => PAGE_IMAGE_HEIGHT[`templates/${tpl.id}`] ?? FALLBACK_HEIGHT
/**
 * The twin the CARDS load: the same page at 520px, lossy (see data/pageThumbs
 * for the width and scripts/make-page-images.cjs for the format). The 1200px
 * file above is still what the lightbox opens and what this design's own page
 * shows. Spelled out here for the same reason `pageImage` is — lib/seoPages
 * says exactly this, and reaching it would pull the 108-résumé library into
 * this route; if one side moves, move both.
 */
export const pageThumb = (tpl: TemplateConfig) => `/img/templates/thumb/${tpl.id}.webp`
export const pageThumbHeight = (tpl: TemplateConfig) => thumbHeight(pageImageHeight(tpl))
const tagWords = (tpl: TemplateConfig) => tpl.tags.filter((t) => t !== STRICT_TAG).map(tagLabel).join(' · ')
export const pageImageAlt = (tpl: TemplateConfig) => {
  const tags = tagWords(tpl).toLowerCase()
  return `A full résumé page in the ${tpl.name} template${tags ? `: ${tags}` : ''}`
}

export function Templates() {
  useTitle(`All ${TEMPLATES.length} Résumé Templates — Free & ATS-Ready · CVAurum`)
  useCanonical(CANONICAL)
  // A reader clicking through from the middle of the landing page must land on
  // the heading and the filters, not somewhere in the middle of the grid: a
  // client-side navigation keeps the scroll position, and this page is tall
  // enough to hold one.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])
  const { create, importFile, importPdf } = useResumeActions()
  const fileRef = useRef<HTMLInputElement>(null)
  const pdfRef = useRef<HTMLInputElement>(null)
  const [chooser, setChooser] = useState(false)
  const [sampleOpen, setSampleOpen] = useState(false)
  /** An index into what is currently shown: prev/next walk the filtered wall,
   *  which is the collection the reader is looking through. */
  const [bigIndex, setBigIndex] = useState<number | null>(null)

  const [params, setParams] = useSearchParams()
  // Keyed on the query STRING, not the params object: the object is fresh on
  // every render, so memoising on it would re-filter (and re-key the grid) on
  // every keystroke elsewhere on the page.
  const search = params.toString()
  const filter = useMemo(() => readTemplateFilter(new URLSearchParams(search), TAG_CHOICES), [search])
  /**
   * Typing REPLACES the history entry and a chip or the toggle PUSHES one.
   * A pushed entry per keystroke would make the back button a slow rewind of
   * the search box; a discrete choice is exactly what someone expects back to
   * undo.
   */
  const apply = (next: TemplateFilter, replace = false) => setParams(templateFilterParams(next), { replace })

  const shown = useMemo(() => filterTemplates(GALLERY, filter), [filter])
  const filtered = isFilterActive(filter)

  // Filtering while a card is open would leave the index on a different
  // design than the one being read; close instead.
  useEffect(() => setBigIndex(null), [shown])

  const big: LightboxItem[] = useMemo(
    () =>
      shown.map((tpl) => ({
        src: pageImage(tpl),
        height: pageImageHeight(tpl),
        alt: pageImageAlt(tpl),
        title: tpl.name,
        caption: tagWords(tpl),
        aboutHref: `/templates/${tpl.id}`,
        aboutLabel: 'About this design',
        useLabel: 'Use this design',
        onUse: () => create(true, tpl.id),
      })),
    [shown, create]
  )

  const toggleTag = (tag: TemplateTag) =>
    apply({
      ...filter,
      tags: filter.tags.includes(tag) ? filter.tags.filter((t) => t !== tag) : [...filter.tags, tag],
    })

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
        current="templates"
        action={
          <button className="btn-primary btn-sm" onClick={() => setChooser(true)}>
            <Plus className="h-4 w-4" />
            <span>
              Create<span className="hidden sm:inline"> resume</span>
            </span>
          </button>
        }
      />

      {/* py-6 on a phone, py-10 from sm up. Measured at 375x812 before the
          change: the header, the heading, the intro and the filter apparatus
          pushed the first card to 940px, so more than a screen of a gallery
          page was everything except the gallery. */}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <h1 className="text-[1.7rem] font-semibold leading-[1.15] tracking-tight sm:text-4xl sm:leading-tight">
          {TEMPLATES.length} résumé templates, all free
        </h1>
        <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:mt-3">
          Every design below is shown on the same example résumé, so what changes between cards is the layout and
          nothing else. Pick one to start editing — your content carries over if you switch later.
        </p>

        <FilterRow
          filter={filter}
          onQuery={(query) => apply({ ...filter, query }, true)}
          onToggleTag={toggleTag}
          onAts={(atsOnly) => apply({ ...filter, atsOnly })}
        />

        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3 sm:mt-4 sm:pt-4">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {filtered ? `${shown.length} match${shown.length === 1 ? '' : 'es'}` : `${TEMPLATES.length} designs`}
          </p>
          {filtered && (
            <button className="btn-ghost btn-xs h-9 sm:h-7" onClick={() => apply(EMPTY_FILTER)}>
              Clear filters
            </button>
          )}
        </div>

        {shown.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border px-6 py-16 text-center">
            <p className="text-sm font-medium text-foreground">No design matches those filters</p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
              Every filter has to hold at once, and some tags never appear together — a design is single-column or
              two-column, not both.
            </p>
            <button className="btn-outline btn-sm mt-5" onClick={() => apply(EMPTY_FILTER)}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {shown.map((tpl, i) => (
              <TemplateCard
                key={tpl.id}
                tpl={tpl}
                eager={i < 4}
                onOpen={() => setBigIndex(i)}
                onPick={() => create(true, tpl.id)}
              />
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

/** Search, tag chips and the strictness toggle. Wraps at every width - nothing
 *  here is allowed to give the page a sideways scrollbar on a phone. */
function FilterRow({
  filter,
  onQuery,
  onToggleTag,
  onAts,
}: {
  filter: TemplateFilter
  onQuery: (query: string) => void
  onToggleTag: (tag: TemplateTag) => void
  onAts: (atsOnly: boolean) => void
}) {
  // Open from `sm` up, where the chips cost two rows and are worth seeing.
  const [chipsOpen, setChipsOpen] = useState(false)
  const active = filter.tags.length + (filter.atsOnly ? 1 : 0)
  return (
    <div className="mt-5 flex flex-col gap-3 sm:mt-8 sm:gap-4">
      {/* One row on a phone, not two. The search box and the fold button used
          to be stacked full-width blocks: 88px of a 375x812 screen spent on a
          search nobody had asked for yet, above a gallery that then started
          at 940px. Side by side they cost 44. */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
          <label className="sr-only" htmlFor="tpl-search">
            Search templates by name or description
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            id="tpl-search"
            type="search"
            // h-11 on a phone: the shared .input is h-9 (36px), under the 44px
            // a finger needs, and this is the one field on the page.
            className="input h-11 pl-9 sm:h-9"
            placeholder="Search designs…"
            value={filter.query}
            onChange={(e) => onQuery(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="btn-outline h-11 shrink-0 px-3.5 sm:hidden"
          aria-expanded={chipsOpen}
          onClick={() => setChipsOpen((v) => !v)}
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          Filters
          {active > 0 && (
            <span className="rounded-full bg-primary/10 px-1.5 text-[11px] font-semibold text-primary">{active}</span>
          )}
          <ChevronDown className={cn('h-4 w-4 transition-transform', chipsOpen && 'rotate-180')} aria-hidden />
        </button>
        <StrictToggle on={filter.atsOnly} onAts={onAts} className="hidden sm:inline-flex" />
      </div>
      <div
        className={cn('flex flex-wrap gap-2 sm:flex', !chipsOpen && 'hidden')}
        role="group"
        aria-label="Filter by style"
      >
        <StrictToggle on={filter.atsOnly} onAts={onAts} className="inline-flex sm:hidden" />
        {TAG_CHOICES.map((tag) => {
          const on = filter.tags.includes(tag)
          return (
            <button
              key={tag}
              type="button"
              aria-pressed={on}
              onClick={() => onToggleTag(tag)}
              // min-h-[44px] while the fold is open on a phone: fifteen chips
              // at 26px, two per thumb-width, is a row you cannot hit.
              className={cn(
                'inline-flex min-h-[44px] items-center rounded-full border px-3.5 text-[13px] font-medium transition sm:min-h-0 sm:px-3 sm:py-1 sm:text-xs',
                on
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-surface text-muted-foreground hover:border-primary/50 hover:text-foreground'
              )}
            >
              {tagLabel(tag)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Narrow to the plainest single-column layouts.
 *
 * Deliberately not called "ATS-safe only": every design in the registry
 * exports selectable text, so labelling this one as the ATS verdict would
 * tell a reader the other designs fail - which the editor and the rest of
 * the site both contradict.
 *
 * Rendered twice, because it belongs beside the search on a desk and inside
 * the folded filters on a phone; one component so the two cannot drift.
 */
function StrictToggle({
  on,
  onAts,
  className,
}: {
  on: boolean
  onAts: (atsOnly: boolean) => void
  className?: string
}) {
  return (
    <label
      className={cn(
        // min-h-[44px] below sm for the same reason the tag chips carry it:
        // on a phone this sits inside the folded filters, where every control
        // is hit with a thumb.
        'min-h-[44px] cursor-pointer items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-[13px] font-medium text-foreground shadow-soft sm:min-h-0 sm:px-3',
        className
      )}
      title="Every design exports selectable text; this narrows to the plainest single-column layouts, the safest bet with a strict parser."
    >
      <input type="checkbox" className="h-3.5 w-3.5 accent-primary" checked={on} onChange={(e) => onAts(e.target.checked)} />
      <AlignLeft className="h-4 w-4 text-muted-foreground" aria-hidden />
      Strictest layouts
    </label>
  )
}

/**
 * One design, as the picture of a résumé page set in it.
 *
 * The card is a plain box, not a button: interactive content inside a button
 * is not valid HTML and a parser may unwrap it, and this card holds three
 * controls — the picture, the name's link, and "Use".
 *
 * The picture used to START a résumé on click. It opens the page full size
 * now: a 260px card cannot be judged, and clicking the only thing on the card
 * that shows the design in order to leave the page was the wrong default. Both
 * actions live inside the lightbox, and "Use" beside the name is untouched.
 */
function TemplateCard({
  tpl,
  onPick,
  onOpen,
  eager,
}: {
  tpl: TemplateConfig
  onPick: () => void
  onOpen: () => void
  eager?: boolean
}) {
  // The card and its flyout load the 520px twin; the lightbox (`big` above)
  // keeps the 1200px picture, which is the one worth a full-screen look.
  const src = pageThumb(tpl)
  const height = pageThumbHeight(tpl)

  return (
    <HoverZoom src={src} height={height} srcWidth={PAGE_THUMB_WIDTH} label={tpl.name}>
      <div className="group flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-surface text-left shadow-soft transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-card">
        {/* The preview is the sample resume's text, which is not this page's
            content - keep it out of search snippets, as the landing strip does.
            The card's own copy below stays indexable. */}
        <button
          type="button"
          data-nosnippet
          onClick={onOpen}
          aria-label={`See the ${tpl.name} design full size`}
          title={`See ${tpl.name} full size`}
          className="block w-full shrink-0 cursor-zoom-in border-b border-border"
        >
          <PagePicture
            src={src}
            width={PAGE_THUMB_WIDTH}
            height={height}
            alt={pageImageAlt(tpl)}
            accent={tpl.defaults.theme.primary}
            eager={eager}
          />
        </button>
        <div className="flex flex-1 flex-col gap-2 p-3">
          <div className="flex items-center justify-between gap-2">
            {/* The name is the design's own page (/templates/<id>):
                "Broadsheet résumé template" is a thing people search for and
                a link is how they — and a crawler — reach it. */}
            <Link
              to={`/templates/${tpl.id}`}
              title={`About the ${tpl.name} template`}
              className="text-sm font-semibold text-foreground transition hover:text-primary hover:underline"
            >
              {tpl.name}
            </Link>
            <button
              type="button"
              onClick={onPick}
              aria-label={`Start a résumé in ${tpl.name} — ${tpl.description}`}
              title={`Use the ${tpl.name} template`}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition hover:border-primary/50 hover:text-primary"
            >
              Use <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
          <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">{tpl.description}</p>
          {/* The strict tag is left off the pills for the same reason it is
              left off the chip row: on 22 of 52 cards it would read as a
              verdict the other 30 had failed. */}
          <div className="mt-auto flex flex-wrap gap-1 pt-1">
            {tpl.tags
              .filter((tag) => tag !== STRICT_TAG)
              .map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                >
                  {tagLabel(tag)}
                </span>
              ))}
          </div>
        </div>
      </div>
    </HoverZoom>
  )
}
