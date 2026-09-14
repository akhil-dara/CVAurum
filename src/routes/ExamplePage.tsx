/**
 * One example, one URL (/examples/<slug>).
 *
 * The library is a single page holding every sample, which is one page a
 * search engine can rank for "resume examples" and nothing it can rank for
 * "data analyst resume example India" — the phrase people actually type. This
 * route gives every sample a page of its own: the job it is written for, the
 * résumé at a size that can be read, a panel counting how it is built, one
 * button that starts a résumé from it, and the samples nearest it.
 *
 * The head is set from the same `samplePageMeta` the build step writes into
 * the pre-rendered file, so what a crawler is served and what a reader gets
 * can never disagree (src/lib/seoPages.ts, and the SEO plugin in
 * vite.config.ts).
 */
import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, ChevronRight, Wand2 } from 'lucide-react'
import { getSample } from '@/data/library'
import { sampleDoc } from '@/data/library/doc'
import { relatedSamples, sampleShape } from '@/data/library/related'
import { CATEGORY_LABELS, REGION_LABELS, SENIORITY_LABELS, type LibrarySample } from '@/data/library/types'
import { getTemplate } from '@/templates/registry'
import { PreviewThumb } from '@/components/preview/PreviewThumb'
import { SiteFooter, SiteHeader } from '@/components/site/SiteChrome'
import { useResumeActions } from '@/components/dashboard/newResume'
import { useSeo } from '@/lib/useSeo'
import { HOST, sampleBreadcrumbJsonLd, samplePageMeta } from '@/lib/seoLibrary'

export function ExamplePage() {
  const { slug } = useParams<{ slug: string }>()
  const sample = getSample(slug)
  if (!sample) return <UnknownExample slug={slug} />
  // Keyed on the slug so React rebuilds the page (and its preview) when a
  // reader walks from one example to the next through the related row.
  return <Example key={sample.slug} sample={sample} />
}

function Example({ sample }: { sample: LibrarySample }) {
  const meta = samplePageMeta(sample.slug)
  useSeo({
    title: meta.title,
    description: meta.description,
    image: `${HOST}${meta.image}`,
    url: `${HOST}${meta.path}`,
  })
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [sample.slug])
  // Breadcrumb rich result: a data block, not executable script, so it is
  // welcome under the site's script-src 'self' policy. A pre-rendered page
  // already carries the build's block; reuse it rather than adding a second
  // BreadcrumbList beside it.
  useEffect(() => {
    const existing = document.getElementById('ld-breadcrumb') as HTMLScriptElement | null
    const el = existing ?? document.createElement('script')
    if (!existing) {
      el.type = 'application/ld+json'
      el.id = 'ld-breadcrumb'
      document.head.appendChild(el)
    }
    el.textContent = sampleBreadcrumbJsonLd(sample.slug)
    return () => el.remove()
  }, [sample.slug])

  const { create } = useResumeActions()
  const doc = useMemo(() => sampleDoc(sample), [sample])
  const shape = useMemo(() => sampleShape(sample), [sample])
  const related = useMemo(() => relatedSamples(sample.slug), [sample.slug])
  const tpl = getTemplate(sample.template)

  return (
    <div className="min-h-full bg-background">
      <SiteHeader current="examples" />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link className="transition hover:text-foreground" to="/examples">
            Examples
          </Link>
          <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />
          <span className="font-medium text-foreground" aria-current="page">
            {sample.role}
          </span>
        </nav>

        <div className="mt-6 grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* What it is and the one button, first on every width. */}
          <div className="order-1 lg:order-2">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{sample.role} résumé example</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{sample.blurb}</p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                className="btn-primary"
                onClick={() => create(true, sample.template, sample.content, sample.tweaks, `${sample.role} resume`)}
              >
                <Wand2 className="h-4 w-4" /> Use this example
              </button>
              <Link className="btn-outline" to="/examples">
                All examples
              </Link>
            </div>
          </div>

          {/* Then the résumé itself. On a phone it used to come after every
              word below, which put the thing the visitor searched for a full
              screen past the fold. */}
          <div className="order-2 min-w-0 lg:order-1 lg:row-span-2">
            {/* The sample's own words are not this page's content — keep them
                out of a search snippet, as the gallery cards do. */}
            <div
              data-nosnippet
              className="aspect-[210/297] w-full overflow-hidden rounded-xl border border-border bg-white shadow-card"
            >
              <PreviewThumb doc={doc} width={560} />
            </div>
            <p className="mt-2.5 text-center text-[11px] text-muted-foreground">
              Shown in the {tpl.name} design. Switching design later keeps every word.
            </p>
          </div>

          <div className="order-3">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Opens the editor with this résumé in place — replace the words with your own. Free, no account, and
              everything stays in this browser. Every name, employer and number in it is invented.
            </p>

            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-5 text-sm">
              <Fact label="Field" value={CATEGORY_LABELS[sample.category]} />
              <Fact label="Career stage" value={SENIORITY_LABELS[sample.seniority]} />
              <Fact label="Written for" value={REGION_LABELS[sample.region]} />
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Design</dt>
                <dd className="mt-0.5 font-medium">
                  <Link className="text-primary hover:underline" to={`/templates/${tpl.id}`}>
                    {tpl.name}
                  </Link>
                </dd>
              </div>
            </dl>

            {/* Counted from the document rather than claimed, so these figures
                cannot drift from the résumé shown beside them. */}
            <section className="mt-7 rounded-xl border border-border bg-card p-4">
              <h2 className="text-sm font-semibold tracking-tight">How this one is built</h2>
              <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
                {shape.roles > 0 && (
                  <li>
                    <strong className="font-medium text-foreground">{shape.roles}</strong> role
                    {shape.roles === 1 ? '' : 's'} in the history, carrying{' '}
                    <strong className="font-medium text-foreground">{shape.bullets}</strong> bullet
                    {shape.bullets === 1 ? '' : 's'} between them.
                  </li>
                )}
                {shape.bullets > 0 && (
                  <li>
                    <strong className="font-medium text-foreground">{shape.quantified}</strong> of those bullets name a
                    figure — a number is the difference between a claim and an achievement.
                  </li>
                )}
                {shape.skillGroups > 0 && (
                  <li>
                    Skills are grouped into{' '}
                    <strong className="font-medium text-foreground">{shape.skillGroups}</strong> named sets rather than
                    one long list, so a reader can find the one they came for.
                  </li>
                )}
                <li>
                  About <strong className="font-medium text-foreground">{shape.words}</strong> words of prose, across{' '}
                  {shape.sections.join(', ')}.
                </li>
              </ul>
            </section>

            <div className="mt-5 flex flex-wrap gap-1.5">
              {sample.keywords.map((k) => (
                <span
                  key={k}
                  className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                >
                  {k}
                </span>
              ))}
            </div>
          </div>

        </div>

        {related.length > 0 && (
          <section className="mt-14 border-t border-border pt-8">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-tight">Nearby examples</h2>
              <Link className="inline-flex items-center gap-1 text-sm text-primary hover:underline" to="/examples">
                See all examples <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link
                    to={`/examples/${r.slug}`}
                    className="group block overflow-hidden rounded-lg border border-border bg-surface shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-card"
                  >
                    <div data-nosnippet className="aspect-[210/297] overflow-hidden border-b border-border bg-white">
                      <RelatedThumb sample={r} />
                    </div>
                    <span className="block px-2 py-2 text-xs font-medium text-foreground group-hover:text-primary">
                      {r.role}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  )
}

/** A neighbour's thumbnail. Its own component so the six documents are built
 *  once each and a hover on one never re-renders the page around it. */
function RelatedThumb({ sample }: { sample: LibrarySample }) {
  const doc = useMemo(() => sampleDoc(sample), [sample])
  return <PreviewThumb doc={doc} width={200} />
}

/** A slug nobody wrote. Not the app's 404 — the reader is plainly looking for
 *  an example, and the shelf is one click away. */
function UnknownExample({ slug }: { slug?: string }) {
  return (
    <div className="min-h-full bg-background">
      <SiteHeader current="examples" />
      <main className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">No example called “{slug}”</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          It may have been renamed. The library has one for most jobs — search it for the title you were after.
        </p>
        <Link className="btn-primary mt-6" to="/examples">
          Browse the examples <ArrowRight className="h-4 w-4" />
        </Link>
      </main>
      <SiteFooter />
    </div>
  )
}
