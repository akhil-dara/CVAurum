import { describe, expect, it } from 'vitest'
import { GUIDES } from '@/data/guides'
import { LIBRARY } from '@/data/library'
import { htmlEscape } from '@/lib/utils'
import { GUIDE_GROUPS, GUIDES_HUB, guideKind } from '@/data/guideHub'
import { examplesItemListJsonLd, examplesJsonLd, sampleBreadcrumbJsonLd, sampleStaticHtml } from '@/lib/seoLibrary'
import {
  DESC_MAX,
  allTemplateIds,
  breadcrumbJsonLd,
  galleryJsonLd,
  guideByline,
  guideJsonLd,
  guideMarkdown,
  guideStaticHtml,
  guidesHubJsonLd,
  guidesHubMarkdown,
  guidesHubPageMeta,
  guidesHubStaticHtml,
  landingStaticHtml,
  lastmodEntry,
  llmsTxt,
  orderedSampleSlugs,
  promptsJsonLd,
  publicUrlPaths,
  siteUrls,
  sitemapXml,
  staticHtml,
} from './seoPages'

/**
 * The guides as a set: a hub at /guides that lists them, a trail from each
 * one back to it, a way in from every design and example page, and an author
 * on the pages that are writing advice (SEO audit, 2026-11-07: /guides was a
 * 404 and each guide had about twelve inbound links).
 */
const links = (html: string) => [...html.matchAll(/<a\s+href="([^"]+)"/g)].map((m) => m[1])
const GUIDE_PATHS = new Set(GUIDES.map((g) => `/${g.slug}`))
const graphOf = (json: string) => JSON.parse(json)['@graph'] as Record<string, any>[]
const WRITING = GUIDES.filter((g) => guideKind(g.slug) === 'writing')
const TOOLS = GUIDES.filter((g) => guideKind(g.slug) === 'tool')

describe('the guides hub', () => {
  it('is a public URL, between the prompt library and the guides, with a sitemap entry and a lastmod', () => {
    const paths = publicUrlPaths()
    expect(paths).toContain('/guides')
    expect(paths.indexOf('/guides')).toBe(paths.indexOf('/prompts') + 1)
    expect(paths.indexOf('/guides')).toBeLessThan(paths.indexOf(`/${GUIDES[0].slug}`))
    expect(sitemapXml('2026-01-01')).toContain('<loc>https://cvaurum.com/guides</loc>')
    expect(lastmodEntry('/guides')).not.toBeNull()
    expect(siteUrls()).toContain('https://cvaurum.com/guides')
    expect(llmsTxt()).toContain('https://cvaurum.com/guides')
  })

  it('groups the eight writing guides apart from the three tool pages', () => {
    expect(WRITING).toHaveLength(8)
    expect(TOOLS.map((g) => g.slug)).toEqual(['free-resume-builder', 'ats-resume-checker', 'resume-builder-no-sign-up'])
    expect(guideKind('about')).toBe('about')
    expect(GUIDE_GROUPS.map((g) => g.guides.map((x) => x.slug))).toEqual([WRITING.map((g) => g.slug), TOOLS.map((g) => g.slug)])
  })

  it('lists every guide with its name and description, and links About', () => {
    const html = guidesHubStaticHtml()
    const l = links(html)
    for (const g of GUIDES) expect(l, g.slug).toContain(`/${g.slug}`)
    for (const g of [...WRITING, ...TOOLS]) {
      expect(html, g.slug).toContain(`>${htmlEscape(g.short)}</a>`)
      expect(html, g.slug).toContain(htmlEscape(g.description))
    }
    expect(html.match(/<h1>/g)).toHaveLength(1)
    const md = guidesHubMarkdown()
    for (const g of GUIDES) expect(md, g.slug).toContain(`https://cvaurum.com/${g.slug}`)
  })

  it('has a head of its own within the limits', () => {
    const meta = guidesHubPageMeta()
    expect(meta.path).toBe('/guides')
    expect(meta.title).toBe(GUIDES_HUB.title)
    expect(meta.description.length).toBeLessThanOrEqual(DESC_MAX)
    expect(new Set([...GUIDES.map((g) => g.title), meta.title]).size).toBe(GUIDES.length + 1)
  })

  it('declares itself a collection with an ItemList of the guides, like the gallery', () => {
    const graph = graphOf(guidesHubJsonLd())
    expect(graph.map((n) => n['@type'])).toEqual(['CollectionPage', 'BreadcrumbList', 'ItemList'])
    expect(graph[0].url).toBe('https://cvaurum.com/guides')
    expect(graph[1].itemListElement.map((c: { item: string }) => c.item)).toEqual([
      'https://cvaurum.com/',
      'https://cvaurum.com/guides',
    ])
    const items = graph[2].itemListElement as { position: number; url: string; name: string }[]
    expect(graph[2].numberOfItems).toBe(WRITING.length + TOOLS.length)
    expect(items.map((i) => i.url)).toEqual([...WRITING, ...TOOLS].map((g) => `https://cvaurum.com/${g.slug}`))
    expect(items.map((i) => i.position)).toEqual(items.map((_, i) => i + 1))
  })

  it('is linked from the landing page for a reader with no script', () => {
    expect(links(landingStaticHtml())).toContain('/guides')
  })
})

describe('every guide points back to the hub', () => {
  it('links /guides and /prompts from its static HTML and its Markdown twin', () => {
    for (const g of GUIDES) {
      const l = links(guideStaticHtml(g.slug))
      expect(l, g.slug).toContain('/guides')
      expect(l, g.slug).toContain('/prompts')
      expect(guideMarkdown(g.slug), g.slug).toContain('https://cvaurum.com/guides')
    }
  })

  it('puts Guides in the trail of every guide, in the HTML and the structured data', () => {
    for (const g of [...WRITING, ...TOOLS]) {
      expect(guideStaticHtml(g.slug), g.slug).toContain('<a href="/">CVAurum</a> › <a href="/guides">Guides</a> ›')
      const crumbs = graphOf(guideJsonLd(g.slug)).find((n) => n['@type'] === 'BreadcrumbList')!
      expect(crumbs.itemListElement.map((c: { item: string }) => c.item), g.slug).toEqual([
        'https://cvaurum.com/',
        'https://cvaurum.com/guides',
        `https://cvaurum.com/${g.slug}`,
      ])
    }
  })
})

describe('design and example pages link to the guides', () => {
  const guideLinks = (html: string) => links(html).filter((h) => GUIDE_PATHS.has(h))

  it('gives every design page at least two guide links', () => {
    for (const id of allTemplateIds()) expect(guideLinks(staticHtml(id)).length, id).toBeGreaterThanOrEqual(2)
    expect(guideLinks(staticHtml(allTemplateIds()[0]))).toEqual(['/how-to-write-a-resume', '/resume-format', '/resume-template-word'])
  })

  it('gives every example page at least two, and a UK sample the CV guide', () => {
    for (const slug of orderedSampleSlugs()) expect(guideLinks(sampleStaticHtml(slug)).length, slug).toBeGreaterThanOrEqual(2)
    const uk = LIBRARY.find((s) => s.region === 'uk')!
    const us = LIBRARY.find((s) => s.region === 'us')!
    expect(guideLinks(sampleStaticHtml(uk.slug))).toContain('/cv-template')
    expect(guideLinks(sampleStaticHtml(us.slug))).not.toContain('/cv-template')
    expect(guideLinks(sampleStaticHtml(us.slug))).toEqual(['/resume-summary-examples', '/resume-skills', '/resume-action-verbs'])
  })
})

describe('guide authorship', () => {
  it('declares every writing guide an Article by the author, published by the site', () => {
    for (const g of WRITING) {
      const graph = graphOf(guideJsonLd(g.slug))
      const article = graph.find((n) => n['@type'] === 'Article')
      expect(article, g.slug).toBeTruthy()
      expect(article!.headline).toBe(g.heading)
      expect(article!.author).toEqual({
        '@type': 'Person',
        '@id': 'https://cvaurum.com/#author',
        name: 'Akhil Dara',
        url: 'https://github.com/akhil-dara',
      })
      expect(article!.publisher).toEqual({ '@id': 'https://cvaurum.com/#org' })
      expect(article!.mainEntityOfPage).toEqual({ '@id': `https://cvaurum.com/${g.slug}` })
      expect(article!.image).toBe('https://cvaurum.com/og.png')
      expect(article!.dateModified).toBe(lastmodEntry(`/${g.slug}`)!.lastmod)
    }
  })

  it('keeps the tool pages WebPages and makes /about an AboutPage about the organisation', () => {
    for (const g of TOOLS) {
      const types = graphOf(guideJsonLd(g.slug)).map((n) => n['@type'])
      expect(types, g.slug).toContain('WebPage')
      expect(types, g.slug).not.toContain('Article')
    }
    const about = graphOf(guideJsonLd('about'))
    expect(about[0]['@type']).toBe('AboutPage')
    expect(about[0].mainEntity).toEqual({ '@id': 'https://cvaurum.com/#org' })
  })

  it('shows a byline with the lastmod date on writing guides only', () => {
    for (const g of WRITING) {
      const by = guideByline(g.slug)
      expect(by, g.slug).not.toBeNull()
      expect(by!.date).toBe(lastmodEntry(`/${g.slug}`)!.lastmod)
      const html = guideStaticHtml(g.slug)
      expect(html, g.slug).toMatch(/<h1>[^<]*<\/h1>\s*<p class="byline">By <a href="https:\/\/github\.com\/akhil-dara" rel="author">Akhil Dara<\/a> · Updated <time datetime="\d{4}-\d{2}-\d{2}">\d{1,2} [A-Z][a-z]+ \d{4}<\/time><\/p>/)
      expect(guideMarkdown(g.slug), g.slug).toContain(`By Akhil Dara · Updated ${by!.label}`)
    }
    for (const g of [...TOOLS, GUIDES.find((x) => x.slug === 'about')!]) {
      expect(guideByline(g.slug), g.slug).toBeNull()
      expect(guideStaticHtml(g.slug), g.slug).not.toContain('class="byline"')
    }
  })
})

describe('structured data carries no Markdown', () => {
  /** Every string anywhere in a JSON-LD document. */
  const strings = (v: unknown): string[] =>
    typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : []

  it('has no [label](href) link left in any text, on any public page', () => {
    const docs = [
      ...GUIDES.map((g) => guideJsonLd(g.slug)),
      guidesHubJsonLd(),
      galleryJsonLd(),
      promptsJsonLd(),
      examplesJsonLd(),
      examplesItemListJsonLd(),
      ...allTemplateIds().map((id) => breadcrumbJsonLd(id)),
      ...orderedSampleSlugs().map((slug) => sampleBreadcrumbJsonLd(slug)),
    ]
    for (const doc of docs) for (const s of strings(JSON.parse(doc))) expect(s).not.toContain('](')
  })

  it('keeps the words of an answer that had a link in it', () => {
    const faq = graphOf(guideJsonLd('about')).find((n) => n['@type'] === 'FAQPage')!
    const answer = faq.mainEntity.find((q: { name: string }) => q.name.startsWith('How do I report'))
    expect(answer.acceptedAnswer.text).toContain('Open an issue on the source repository')
  })
})
