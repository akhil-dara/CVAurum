/**
 * Public template gallery (/templates). Every design in the registry, shown on
 * the SAME sample resume so the layouts can actually be compared, with a
 * search / tag / strictness filter whose state lives in the query string - a
 * filtered view is a link someone can send, and the back button walks it.
 *
 * Clicking a card starts a resume in that design and lands in the editor,
 * exactly as the landing page's showcase strip does.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlignLeft, ArrowRight, Github, Plus, Search } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { createDocument } from '@/data/defaults'
import { applyTemplateToMetadata } from '@/lib/templateApply'
import { TEMPLATES } from '@/templates/registry'
import type { TemplateConfig, TemplateTag } from '@/types/template'
import type { ResumeDocument } from '@/types/document'
import { PreviewThumb } from '@/components/preview/PreviewThumb'
import { HoverZoom } from '@/components/preview/HoverZoom'
import { ThumbSkeleton } from '@/components/preview/ThumbSkeleton'
import { useLazyMount } from '@/components/preview/lazyMount'
import { Logo } from '@/components/ui/Logo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { InstallButton } from '@/components/ui/InstallButton'
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

const REPO_URL = 'https://github.com/akhil-dara/cvaurum'

/** This page's own URL - index.html's head names the home page on every route. */
const CANONICAL = 'https://cvaurum.com/templates'

/** Derived once from the registry - a new tag on a new template gets a chip. */
const TAG_CHOICES = tagChoices(TEMPLATES)

/** 'two-column' reads as a slug; the chip says it in words. */
const tagLabel = (tag: TemplateTag) => {
  const words = tag.replace(/-/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
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
  const library = useAppStore((s) => s.library)
  const { create, importFile, importPdf } = useResumeActions()
  const fileRef = useRef<HTMLInputElement>(null)
  const pdfRef = useRef<HTMLInputElement>(null)
  const [chooser, setChooser] = useState(false)
  const [sampleOpen, setSampleOpen] = useState(false)

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

  const shown = useMemo(() => filterTemplates(TEMPLATES, filter), [filter])
  const filtered = isFilterActive(filter)

  // One sample resume, rendered in every design - the same document the
  // landing strip previews, so the cards differ only by their template.
  const base = useMemo(() => createDocument({ sample: true }), [])

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

      {/* nav - the landing page's chrome in its off-hero (theme glass) state,
          which is the only state a page without a dark hero ever has */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <Logo to="/" />
          {/* The landing sections are fragment targets, and a client-side
              navigation to another route's fragment does not scroll to it -
              only a real one does. These are plain anchors so the section a
              reader asked for is the section they land on. */}
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a className="transition hover:text-foreground" href="/#how">
              How it works
            </a>
            <span className="font-medium text-foreground" aria-current="page">
              Templates
            </span>
            <a className="transition hover:text-foreground" href="/#compare">
              Compare
            </a>
            <a className="transition hover:text-foreground" href="/#privacy">
              Privacy
            </a>
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <a
              className="btn-ghost btn-sm hidden sm:inline-flex"
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              title="View source on GitHub"
            >
              <Github className="h-4 w-4" /> GitHub
            </a>
            <InstallButton />
            <ThemeToggle />
            <Link className={library.length ? 'btn-outline btn-sm' : 'btn-ghost btn-sm'} to="/app">
              <span className="sm:hidden">Resumes</span>
              <span className="hidden sm:inline">My resumes{library.length ? ` (${library.length})` : ''}</span>
            </Link>
            <button className="btn-primary btn-sm" onClick={() => setChooser(true)}>
              <Plus className="h-4 w-4" />
              <span>
                Create<span className="hidden sm:inline"> resume</span>
              </span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {TEMPLATES.length} résumé templates, all free
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Every design below is shown on the same example résumé, so what changes between cards is the layout and
          nothing else. Pick one to start editing — your content carries over if you switch later.
        </p>

        <FilterRow
          filter={filter}
          onQuery={(query) => apply({ ...filter, query }, true)}
          onToggleTag={toggleTag}
          onAts={(atsOnly) => apply({ ...filter, atsOnly })}
        />

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {filtered ? `${shown.length} match${shown.length === 1 ? '' : 'es'}` : `${TEMPLATES.length} designs`}
          </p>
          {filtered && (
            <button className="btn-ghost btn-xs" onClick={() => apply(EMPTY_FILTER)}>
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
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {shown.map((tpl) => (
              <TemplateCard key={tpl.id} tpl={tpl} base={base} onPick={() => create(true, tpl.id)} />
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs text-muted-foreground sm:flex-row">
          <span className="inline-flex items-center gap-1.5">
            <Logo compact to="/" /> · Built for everyone job hunting.
          </span>
          <span className="inline-flex items-center gap-3">
            <Link className="transition hover:text-foreground" to="/">
              Home
            </Link>
            <a className="transition hover:text-foreground" href={REPO_URL} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <span>100% local · MIT licensed</span>
          </span>
        </div>
      </footer>

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
            create(true, p.template, p.content, p.tweaks)
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
  return (
    <div className="mt-8 flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-72">
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
            className="input pl-9"
            placeholder="Search designs…"
            value={filter.query}
            onChange={(e) => onQuery(e.target.value)}
          />
        </div>
        {/* Not "ATS-safe only": every design in the registry exports selectable
            text, so labelling this one as the ATS verdict would tell a reader
            the other 30 designs fail - which the editor and the rest of the
            site both contradict. It narrows to the plainest layouts. */}
        <label
          className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-[13px] font-medium text-foreground shadow-soft"
          title="Every design exports selectable text; this narrows to the plainest single-column layouts, the safest bet with a strict parser."
        >
          <input
            type="checkbox"
            className="h-3.5 w-3.5 accent-primary"
            checked={filter.atsOnly}
            onChange={(e) => onAts(e.target.checked)}
          />
          <AlignLeft className="h-4 w-4 text-muted-foreground" aria-hidden />
          Strictest layouts
        </label>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by style">
        {TAG_CHOICES.map((tag) => {
          const on = filter.tags.includes(tag)
          return (
            <button
              key={tag}
              type="button"
              aria-pressed={on}
              onClick={() => onToggleTag(tag)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition',
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
 * One design. The thumbnail is a full resume render, so 52 of them mounting at
 * once is the storm the shared idle queue exists to prevent: the card holds its
 * exact page-shaped box with the accent sketch until useLazyMount grants it a
 * turn, and only then does the artboard mount.
 */
function TemplateCard({ tpl, base, onPick }: { tpl: TemplateConfig; base: ResumeDocument; onPick: () => void }) {
  const [thumbRef, seen] = useLazyMount<HTMLDivElement>()
  const doc = useMemo<ResumeDocument>(
    () => ({ ...base, metadata: applyTemplateToMetadata(base.metadata, tpl.defaults) }),
    [base, tpl.defaults]
  )

  return (
    <HoverZoom doc={doc} label={tpl.name}>
      <button
        onClick={onPick}
        aria-label={`Start a résumé in ${tpl.name} — ${tpl.description}`}
        title={`Use the ${tpl.name} template`}
        className="group flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-surface text-left shadow-soft transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-card"
      >
        {/* The preview is the sample resume's text, which is not this page's
            content - keep it out of search snippets, as the landing strip does.
            The card's own copy below stays indexable. */}
        <div
          ref={thumbRef}
          data-nosnippet
          className="aspect-[210/297] shrink-0 overflow-hidden border-b border-border bg-white"
        >
          {seen ? <PreviewThumb doc={doc} width={260} /> : <ThumbSkeleton accent={tpl.defaults.theme.primary} />}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-foreground">{tpl.name}</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
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
      </button>
    </HoverZoom>
  )
}
