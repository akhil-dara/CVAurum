/**
 * Everything the per-template pages need that is NOT React.
 *
 * A single-page app is invisible to anything that does not run JavaScript, and
 * "58 résumé templates" is 58 things people search for by name — so each design
 * gets its own URL (/templates/<id>), its own head, and a block of real HTML
 * that a crawler reads straight out of the file. That HTML is produced here and
 * written into dist/ at build time (see the plugin in vite.config.ts); the same
 * metadata drives the live route's head at runtime. One source, two consumers,
 * so the page a crawler is served and the page a reader gets can never disagree
 * about their title, their description or their canonical URL.
 *
 * Kept pure and dependency-free on purpose: it is imported by a Node build step
 * with no DOM and no browser, and it is the part worth unit-testing.
 */
import { TEMPLATES, TEMPLATE_MAP, galleryOrder } from '@/templates/registry'
import type { TemplateConfig, TemplateTag } from '@/types/template'
import { htmlEscape } from '@/lib/utils'

/** Canonical host. Also written in index.html, robots.txt and the sitemap. */
export const SITE = 'https://cvaurum.com'

/**
 * How long a meta description may be. Google renders roughly 155-160
 * characters of one on desktop and truncates the rest mid-word, so a
 * description is cut here — on a word boundary — rather than by the search
 * results page.
 */
export const DESC_MAX = 155

/** The gallery's own order, so a template page's neighbour list and the
 *  sitemap walk the collection the same way the wall of cards does. */
const ORDERED = galleryOrder(TEMPLATES)

/** The tag that marks the plainest layouts. It reads as a pass/fail verdict
 *  next to the others ("this one is ATS-safe, so the rest are not"), which is
 *  false of every design in the registry — the gallery leaves it off its
 *  pills and so does every sentence built here. */
const STRICT_TAG: TemplateTag = 'ats-safe'

export interface PageMeta {
  /** Route path, always absolute and without a trailing slash. */
  path: string
  title: string
  /** At most DESC_MAX characters, cut on a word boundary. */
  description: string
  /** Site-root-relative path to the link-preview image. */
  image: string
}

/** Is this a design the registry actually holds? Guards the route before any
 *  of the builders below are asked for a page that cannot exist. */
export function isTemplateId(id: string | undefined): id is string {
  return !!id && Object.prototype.hasOwnProperty.call(TEMPLATE_MAP, id)
}

function must(id: string): TemplateConfig {
  const tpl = TEMPLATE_MAP[id]
  if (!tpl) throw new Error(`seoPages: no template named "${id}"`)
  return tpl
}

/**
 * Cut a sentence to `max` characters without cutting a word in half. Whatever
 * punctuation the cut lands on is dropped so the ellipsis reads as a trail-off
 * rather than as ",…" or ".…".
 */
export function trimToWords(text: string, max = DESC_MAX): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  // -1 leaves room for the ellipsis, so the result is never longer than max.
  const cut = clean.slice(0, max - 1)
  const space = cut.lastIndexOf(' ')
  const head = (space > 0 ? cut.slice(0, space) : cut).replace(/[\s,;:.…—–-]+$/, '')
  return `${head}…`
}

/** 'two-column' is a slug; a sentence says it in words. */
export function tagLabel(tag: string): string {
  const words = tag.replace(/-/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** The design's style tags as one readable line: "Single column · Modern". */
export function tagSentence(tags: readonly string[]): string {
  return tags
    .filter((t) => t !== STRICT_TAG)
    .map(tagLabel)
    .join(' · ')
}

/** The head a single template's page wants. */
export function templatePageMeta(id: string): PageMeta {
  const tpl = must(id)
  return {
    path: `/templates/${tpl.id}`,
    title: `${tpl.name} résumé template — free, ATS-ready · CVAurum`,
    description: trimToWords(tpl.description),
    image: `/og/${tpl.id}.jpg`,
  }
}

/** The gallery's own head, built from the same registry count as its heading. */
export function galleryPageMeta(): PageMeta {
  return {
    path: '/templates',
    title: `All ${TEMPLATES.length} Résumé Templates — Free & ATS-Ready · CVAurum`,
    description: trimToWords(GALLERY_INTRO),
    image: '/og.png',
  }
}

/** The gallery's visible intro sentence — kept here so the pre-rendered file
 *  and the live page say the same thing. */
export const GALLERY_INTRO =
  'Every design is shown on the same example résumé, so what changes between them is the layout and nothing else. Free, ATS-ready, and yours to edit in the browser.'

/**
 * The designs closest to this one: most shared style tags first, ties broken by
 * the gallery's order so the answer is stable between builds.
 */
export function relatedTemplateIds(id: string, limit = 6): string[] {
  const tpl = must(id)
  const mine = new Set(tpl.tags)
  return ORDERED.filter((t) => t.id !== id)
    .map((t, i) => ({ id: t.id, shared: t.tags.filter((tag) => mine.has(tag)).length, i }))
    .sort((a, b) => b.shared - a.shared || a.i - b.i)
    .slice(0, limit)
    .map((t) => t.id)
}

/** One <li> per design, name and href, for the crawler's navigation block. */
function linkList(list: readonly TemplateConfig[]): string {
  return list
    .map(
      (t) =>
        `      <li><a href="/templates/${t.id}">${htmlEscape(t.name)} résumé template</a></li>`
    )
    .join('\n')
}

/**
 * The HTML a crawler reads for one template page WITHOUT running a line of
 * JavaScript. It is injected inside <div id="root">, which React's createRoot
 * empties the instant the app boots — so a reader never sees it and a crawler
 * that renders the page sees the real one. Everything a search engine needs is
 * here: the heading, the full description, what the design is good for, and a
 * path onward to every other page in the set.
 */
export function staticHtml(id: string): string {
  const tpl = must(id)
  const others = ORDERED.filter((t) => t.id !== id)
  return `<main class="seo-static">
    <p><a href="/templates">Résumé templates</a> › ${htmlEscape(tpl.name)}</p>
    <h1>${htmlEscape(tpl.name)} résumé template</h1>
    <p>${htmlEscape(tpl.description)}</p>
    <p>Best for: ${htmlEscape(tagSentence(tpl.tags))}. Free to use, exports selectable text a résumé parser can read, and edits entirely in your browser — no account and no upload.</p>
    <p><a href="/app">Start a résumé in this design</a> · <a href="/templates">Browse all ${TEMPLATES.length} résumé templates</a></p>
    <nav aria-label="Every other résumé template">
      <h2>The other ${others.length} designs</h2>
      <ul>
${linkList(others)}
      </ul>
    </nav>
  </main>`
}

/** The same crawler-readable block for the gallery itself. */
export function galleryStaticHtml(): string {
  return `<main class="seo-static">
    <h1>${TEMPLATES.length} résumé templates, all free</h1>
    <p>${htmlEscape(GALLERY_INTRO)}</p>
    <nav aria-label="Every résumé template">
      <h2>Every design</h2>
      <ul>
${linkList(ORDERED)}
      </ul>
    </nav>
  </main>`
}

function urlEntry(loc: string, lastmod: string, changefreq: string, priority: string): string {
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
}

/**
 * Every public URL the site has: the landing page, the gallery, and one entry
 * per design. `today` is passed in (rather than read from the clock) so the
 * function stays pure and the file it writes is reproducible.
 */
export function sitemapXml(today: string): string {
  const entries = [
    urlEntry(`${SITE}/`, today, 'weekly', '1.0'),
    urlEntry(`${SITE}/templates`, today, 'weekly', '0.8'),
    ...ORDERED.map((t) => urlEntry(`${SITE}/templates/${t.id}`, today, 'monthly', '0.6')),
  ]
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!--
    The landing page, the template gallery, and one page per design. /app,
    /tracker, /resume/:id and /print/:id are private, account-free shells with
    no shareable content and are deliberately excluded (and Disallowed in
    robots.txt). Generated — see src/lib/seoPages.ts and the SEO plugin in
    vite.config.ts; edit those, not this file.
  -->
${entries.join('\n')}
</urlset>
`
}

/** Breadcrumb structured data for one template page. Data, never script. */
export function breadcrumbJsonLd(id: string): string {
  const tpl = must(id)
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Résumé templates', item: `${SITE}/templates` },
      { '@type': 'ListItem', position: 3, name: `${tpl.name} résumé template`, item: `${SITE}/templates/${tpl.id}` },
    ],
  })
}

/** Every id, in gallery order — what the build step iterates. */
export function allTemplateIds(): string[] {
  return ORDERED.map((t) => t.id)
}
