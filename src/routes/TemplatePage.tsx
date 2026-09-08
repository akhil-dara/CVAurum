/**
 * One design, one URL (/templates/<id>).
 *
 * The gallery is a single page holding 58 designs, which is one page a search
 * engine can rank for "resume template" and nothing it can rank for
 * "Broadsheet resume template" — the phrase people actually type. This route
 * gives every design a page of its own: its name as the heading, its full
 * description, what it is good for, a preview big enough to judge, one button
 * that starts a résumé in it, and links onward to the designs nearest it.
 *
 * The head is set from the same `templatePageMeta` the build step writes into
 * the pre-rendered file, so what a crawler is served and what a reader gets can
 * never disagree (see src/lib/seoPages.ts and the SEO plugin in vite.config.ts).
 */
import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, ChevronRight, Github, Wand2 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { createDocument } from '@/data/defaults'
import { applyTemplateToMetadata } from '@/lib/templateApply'
import { getTemplate } from '@/templates/registry'
import type { ResumeDocument } from '@/types/document'
import { PreviewThumb } from '@/components/preview/PreviewThumb'
import { Logo } from '@/components/ui/Logo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { InstallButton } from '@/components/ui/InstallButton'
// The one code path that starts a résumé and lands in the editor — the same
// one the gallery card and the landing strip call, so a design started here is
// a design started there.
import { useResumeActions } from '@/components/dashboard/newResume'
import { useSeo } from '@/lib/useSeo'
import { SITE, breadcrumbJsonLd, isTemplateId, relatedTemplateIds, tagSentence, templatePageMeta } from '@/lib/seoPages'

const REPO_URL = 'https://github.com/akhil-dara/cvaurum'

export function TemplatePage() {
  const { id } = useParams<{ id: string }>()
  if (!isTemplateId(id)) return <UnknownDesign id={id} />
  // Keyed on the id so React rebuilds the page (and its preview) when a reader
  // walks from one design to the next through the related row.
  return <Design key={id} id={id} />
}

function Design({ id }: { id: string }) {
  const tpl = getTemplate(id)
  const meta = templatePageMeta(id)
  useSeo({
    title: meta.title,
    description: meta.description,
    image: `${SITE}${meta.image}`,
    url: `${SITE}${meta.path}`,
  })
  // A client-side navigation keeps the scroll position, and the related row
  // sits near the bottom — without this, clicking a neighbour lands the reader
  // in that page's footer.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [id])
  // Breadcrumb rich result. A data block, not executable script, so it is
  // welcome under the site's script-src 'self' policy.
  useEffect(() => {
    const el = document.createElement('script')
    el.type = 'application/ld+json'
    el.textContent = breadcrumbJsonLd(id)
    document.head.appendChild(el)
    return () => el.remove()
  }, [id])

  const library = useAppStore((s) => s.library)
  const { create } = useResumeActions()

  // The gallery's example résumé, laid out in this design — the same document
  // every card on /templates shows, so the pages compare like for like.
  const doc = useMemo<ResumeDocument>(() => {
    const base = createDocument({ sample: true })
    return { ...base, metadata: applyTemplateToMetadata(base.metadata, tpl.defaults) }
  }, [tpl.defaults])

  const related = useMemo(() => relatedTemplateIds(id).map((rid) => getTemplate(rid)), [id])

  return (
    <div className="min-h-full bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <Logo to="/" />
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a className="transition hover:text-foreground" href="/#how">
              How it works
            </a>
            <Link className="font-medium text-foreground transition hover:text-foreground" to="/templates">
              Templates
            </Link>
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
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link className="transition hover:text-foreground" to="/templates">
            Templates
          </Link>
          <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />
          <span className="font-medium text-foreground" aria-current="page">
            {tpl.name}
          </span>
        </nav>

        {/*
          The copy comes first in the DOM (its <h1> is the page's heading, and a
          preview is a full résumé render carrying headings of its own), and
          `order` puts the preview on the left from the large breakpoint up.

          grid-cols-1 is not decoration: without an explicit single-column track
          the implicit one sizes to max-content, and a résumé page's intrinsic
          width is ~560px — which gave a 375px phone a 578px document and a
          sideways scrollbar.
        */}
        <div className="mt-5 grid grid-cols-1 gap-8 lg:grid-cols-[560px_minmax(0,1fr)] lg:gap-12">
          <div className="order-1 min-w-0 lg:order-2 lg:pt-2">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{tpl.name} résumé template</h1>
            <p className="mt-1.5 text-sm font-medium text-primary">{tagSentence(tpl.tags)}</p>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{tpl.description}</p>

            <button className="btn-primary mt-6 w-full sm:w-auto" onClick={() => create(true, tpl.id)}>
              <Wand2 className="h-4 w-4" />
              Use this template
            </button>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Opens the editor with an example résumé in this design — replace the words with your own. Free, no
              account, and everything stays in this browser. Switching designs later keeps your content.
            </p>

            <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-6 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Layout</dt>
                <dd className="mt-0.5 font-medium">
                  {tpl.defaults.layout.columns === 2 ? 'Two column' : 'Single column'}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Photo</dt>
                <dd className="mt-0.5 font-medium">{tpl.defaults.layout.showPhoto ? 'Optional' : 'No photo'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Exports</dt>
                <dd className="mt-0.5 font-medium">PDF · Word · JSON</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Price</dt>
                <dd className="mt-0.5 font-medium">Free, MIT licensed</dd>
              </div>
            </dl>
          </div>

          <div className="order-2 min-w-0 lg:order-1">
            {/* The sample résumé's own words are not this page's content —
                keep them out of a search snippet, as the gallery cards do. */}
            <div
              data-nosnippet
              className="aspect-[210/297] w-full overflow-hidden rounded-xl border border-border bg-white shadow-card"
            >
              <PreviewThumb doc={doc} width={560} />
            </div>
            <p className="mt-2.5 text-center text-[11px] text-muted-foreground">
              Shown on the same example résumé every design in the gallery uses.
            </p>
          </div>
        </div>

        <section className="mt-14 border-t border-border pt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Related designs</h2>
            <Link className="inline-flex items-center gap-1 text-sm text-primary hover:underline" to="/templates">
              See all templates <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {related.map((r) => (
              <li key={r.id}>
                <Link
                  to={`/templates/${r.id}`}
                  className="group block overflow-hidden rounded-lg border border-border bg-surface shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-card"
                >
                  <div data-nosnippet className="aspect-[210/297] overflow-hidden border-b border-border bg-white">
                    <RelatedThumb id={r.id} />
                  </div>
                  <span className="block px-2 py-2 text-xs font-medium text-foreground group-hover:text-primary">
                    {r.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
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
            <Link className="transition hover:text-foreground" to="/templates">
              Templates
            </Link>
            <a className="transition hover:text-foreground" href={REPO_URL} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <span>100% local · MIT licensed</span>
          </span>
        </div>
      </footer>
    </div>
  )
}

/** A neighbour's thumbnail. Its own component so the six documents are built
 *  once each and a hover on one never re-renders the page around it. */
function RelatedThumb({ id }: { id: string }) {
  const doc = useMemo<ResumeDocument>(() => {
    const base = createDocument({ sample: true })
    return { ...base, metadata: applyTemplateToMetadata(base.metadata, getTemplate(id).defaults) }
  }, [id])
  return <PreviewThumb doc={doc} width={150} />
}

/** A /templates/<id> that names no design in the registry — a mistyped URL, or
 *  a design that was renamed. Say so plainly and point at the gallery rather
 *  than showing the app's "this part didn't load", which would blame the
 *  network for a page that simply does not exist. */
function UnknownDesign({ id }: { id?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <h1 className="text-lg font-semibold text-foreground">No design called “{id}”</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        That template link doesn’t match anything in the collection — it may have been renamed. Every design is on the
        gallery page.
      </p>
      <Link className="btn-primary" to="/templates">
        Browse all templates
      </Link>
    </div>
  )
}
