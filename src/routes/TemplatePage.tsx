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
import { ArrowRight, Check, ChevronRight, Wand2 } from 'lucide-react'
import { createDocument } from '@/data/defaults'
import { CUSTOMIZE } from '@/data/customize'
// Written beside the images themselves, so the size in the markup is the size
// of the file on disk and a page never reserves the wrong box for it.
import { PAGE_IMAGE_WIDTH } from '@/data/pageImages'
import { applyTemplateToMetadata } from '@/lib/templateApply'
import { getTemplate } from '@/templates/registry'
import type { ResumeDocument } from '@/types/document'
import { PreviewThumb } from '@/components/preview/PreviewThumb'
import { SiteFooter, SiteHeader } from '@/components/site/SiteChrome'
// The one code path that starts a résumé and lands in the editor — the same
// one the gallery card and the landing strip call, so a design started here is
// a design started there.
import { useResumeActions } from '@/components/dashboard/newResume'
import { useSeo } from '@/lib/useSeo'
import {
  SITE,
  breadcrumbJsonLd,
  imageAlt,
  isTemplateId,
  relatedTemplateIds,
  tagSentence,
  templatePageImage,
  templatePageImageHeight,
  templatePageMeta,
} from '@/lib/seoPages'


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
  // A pre-rendered page already carries the build's block (id
  // "ld-breadcrumb"); reuse it rather than adding a second BreadcrumbList
  // beside it. Once the app has booted this effect owns the block, so it
  // goes on leaving the page with the page, whoever created it.
  useEffect(() => {
    const existing = document.getElementById('ld-breadcrumb') as HTMLScriptElement | null
    const el = existing ?? document.createElement('script')
    if (!existing) {
      el.type = 'application/ld+json'
      el.id = 'ld-breadcrumb'
      document.head.appendChild(el)
    }
    el.textContent = breadcrumbJsonLd(id)
    return () => el.remove()
  }, [id])

  const { create } = useResumeActions()

  const related = useMemo(() => relatedTemplateIds(id).map((rid) => getTemplate(rid)), [id])

  return (
    <div className="min-h-full bg-background">
      <SiteHeader current="templates" />

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
              account, and everything stays in this browser.
            </p>
            <p className="mt-4 rounded-lg border border-primary/30 bg-primary/5 px-3.5 py-3 text-sm leading-relaxed text-foreground">
              {CUSTOMIZE.switchLine}
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
                {/* Every design can carry a photo (Design → Show photo); some
                    turn it on from the start. "No photo" read as "cannot". */}
                <dd className="mt-0.5 font-medium">{tpl.defaults.layout.showPhoto ? 'On by default' : 'Optional'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Exports</dt>
                <dd className="mt-0.5 font-medium">PDF · Word · JSON</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Price</dt>
                <dd className="mt-0.5 font-medium">Free, open source (AGPL-3.0)</dd>
              </div>
            </dl>
          </div>

          <div className="order-2 min-w-0 lg:order-1">
            {/* The design, as the picture the export actually produces.

                The page image, not the share card and not a rendering.
                /og/<id>.jpg is 1200x630 landscape - the résumé inside it is
                430x560, with body type about six pixels tall, which is a link
                preview and not something anyone can read. This is the whole
                page at 1200px wide, shown at about 560: finer than the
                rendering that used to sit here, free of the render, and the
                only thing on the page an image index can picture.

                The height is read rather than assumed: A4 and US Letter give
                different aspect ratios, so it is recorded per design when the
                pictures are drawn. */}
            <figure className="overflow-hidden rounded-xl border border-border bg-white shadow-card">
              <img
                src={templatePageImage(tpl.id)}
                width={PAGE_IMAGE_WIDTH}
                height={templatePageImageHeight(tpl.id)}
                alt={imageAlt(tpl)}
                className="block h-auto w-full"
                loading="eager"
                decoding="async"
              />
            </figure>
            <p className="mt-2.5 text-center text-[11px] text-muted-foreground">
              Shown on the same example résumé every design in the gallery uses.
            </p>
          </div>
        </div>

        {/* A visitor from a search judges the design by one picture; say
            plainly that the colour, photo and columns they may not like are
            all switches, before they leave for that reason. */}
        <section className="mt-14 border-t border-border pt-8">
          <h2 className="text-lg font-semibold tracking-tight">{CUSTOMIZE.heading}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{CUSTOMIZE.intro}</p>
          <ul className="mt-5 grid grid-cols-1 gap-x-8 gap-y-2.5 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {CUSTOMIZE.items.map((item) => (
              <li key={item} className="flex gap-2 leading-relaxed">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <button className="btn-primary mt-6" onClick={() => create(true, tpl.id)}>
            <Wand2 className="h-4 w-4" />
            Open it and make it yours
          </button>
        </section>

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

      <SiteFooter />
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
