/**
 * The guides hub (/guides): every guide on one page, the writing guides apart
 * from the pages about the tools, and About on its own line.
 *
 * The words and the grouping live in src/data/guideHub.ts, because the
 * pre-rendered HTML, the Markdown twin and the structured data
 * (src/lib/seoPages.ts) have to say the same thing as this page.
 */
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { SiteFooter, SiteHeader } from '@/components/site/SiteChrome'
import { ABOUT_GUIDE, GUIDE_GROUPS, GUIDES_HUB } from '@/data/guideHub'
import { SITE, guidesHubPageMeta } from '@/lib/seoPages'
import { useSeo } from '@/lib/useSeo'
import { TEMPLATE_COUNT } from '@/templates/registry'
import { SAMPLE_COUNT } from '@/data/library/count'

export function Guides() {
  const meta = guidesHubPageMeta()
  useSeo({
    title: meta.title,
    description: meta.description,
    image: `${SITE}${meta.image}`,
    url: `${SITE}${meta.path}`,
  })
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="min-h-full bg-background">
      <SiteHeader
        action={
          <Link className="btn-primary btn-sm hidden sm:inline-flex" to="/app">
            Start a resume
          </Link>
        }
      />

      <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
        <div className="max-w-3xl">
          <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
            <Link className="hover:text-foreground" to="/">
              CVAurum
            </Link>{' '}
            › Guides
          </nav>
          <h1 className="mt-3 text-[1.6rem] font-semibold leading-[1.15] tracking-tight sm:text-[2.4rem] sm:leading-[1.12]">
            {GUIDES_HUB.heading}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-foreground">{GUIDES_HUB.intro}</p>

          {GUIDE_GROUPS.map((grp) => (
            <section key={grp.heading} className="mt-10">
              <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{grp.heading}</h2>
              <ul className="mt-3 divide-y divide-border rounded-2xl border border-border bg-surface">
                {grp.guides.map((g) => (
                  <li key={g.slug}>
                    <Link className="group flex items-start gap-3 p-4 transition hover:bg-muted/50" to={`/${g.slug}`}>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-medium text-foreground group-hover:text-primary">
                          {g.short}
                        </span>
                        <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{g.description}</span>
                      </span>
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {ABOUT_GUIDE && (
            <p className="mt-10 text-sm leading-relaxed text-muted-foreground">
              <Link className="font-medium text-primary hover:underline" to={`/${ABOUT_GUIDE.slug}`}>
                About CVAurum
              </Link>{' '}
              — {ABOUT_GUIDE.description}
            </p>
          )}

          <p className="mt-10 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <Link className="text-primary hover:underline" to="/templates">
              Browse the {TEMPLATE_COUNT} resume templates
            </Link>
            <Link className="text-primary hover:underline" to="/examples">
              Read {SAMPLE_COUNT} complete resume examples
            </Link>
            <Link className="text-primary hover:underline" to="/prompts">
              Prompts for an AI assistant
            </Link>
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
