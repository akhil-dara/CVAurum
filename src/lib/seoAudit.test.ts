import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { TEMPLATES, TEMPLATE_COUNT, TEMPLATE_MAP, templatePath } from '@/templates/registry'
import { SAMPLE_COUNT } from '@/data/library/count'
import { LIBRARY } from '@/data/library'
import { GUIDES, SHOWCASE_TEMPLATE_IDS } from '@/data/guides'
import { CUSTOMIZE } from '@/data/customize'
import {
  TITLE_MAX,
  examplesPageMeta,
  galleryGroups,
  galleryJsonLd,
  galleryMarkdown,
  galleryPageMeta,
  galleryStaticHtml,
  guideMarkdown,
  guidePageMeta,
  guideStaticHtml,
  guidesHubMarkdown,
  guidesHubPageMeta,
  landingStaticHtml,
  llmsFullTxt,
  llmsTxt,
  promptsMarkdown,
  promptsPageMeta,
  samplePageMeta,
  shellHtml,
  staticHtml,
  templateKeyword,
  templateMarkdown,
  templatePageMeta,
} from './seoPages'

/**
 * The fixes from the SEO audit of 2026-11-07: the text every template page
 * repeated, descriptions built from each design's own facts, titles a result
 * page shows whole, a gallery grouped by style, shells that do not point at
 * the home page, an llms.txt that is an index, and designs on the two thin
 * guides.
 */
const read = (rel: string) => fs.readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8')
const PUBLIC = fileURLToPath(new URL('../../public/', import.meta.url))
const templateLinks = (html: string) => [...html.matchAll(/href="\/templates\/([a-z0-9-]+)"/g)].map((m) => m[1])

describe('what every template page says about changing the design', () => {
  it('is the switch line and one sentence naming the controls, nothing more', () => {
    expect(Object.keys(CUSTOMIZE).sort()).toEqual(['controls', 'switchLine'])
    expect(CUSTOMIZE.switchLine).toContain(`${TEMPLATE_COUNT} templates`)
    // one sentence
    expect(CUSTOMIZE.controls.split(/[.!?](\s|$)/).filter((s) => s && s.trim()).length).toBe(1)
    for (const control of ['Colours', 'fonts', 'photo', 'section headings', 'dates', 'columns', 'spacing', 'page size', 'Magic fit'])
      expect(CUSTOMIZE.controls).toContain(control)
  })

  it('is the same short block in all three copies of a template page', () => {
    const tpl = TEMPLATES[0]
    const html = staticHtml(tpl.id)
    const md = templateMarkdown(tpl.id)
    const route = read('../routes/TemplatePage.tsx')
    for (const copy of [html, md]) {
      expect(copy).toContain(CUSTOMIZE.switchLine)
      expect(copy).toContain(CUSTOMIZE.controls)
      expect(copy).not.toContain('Everything on this design can be changed')
    }
    expect(route).toContain('CUSTOMIZE.switchLine')
    expect(route).toContain('CUSTOMIZE.controls')
    expect(route).not.toContain('CUSTOMIZE.items')
  })
})

describe('a template page description', () => {
  it('is built from the design: keyword, name, layout from its tags, then the offer', () => {
    const descriptions = new Set<string>()
    for (const tpl of TEMPLATES) {
      const { description } = templatePageMeta(tpl.id)
      expect(description.startsWith(`${templateKeyword(tpl)} resume template (${tpl.name}): `), tpl.id).toBe(true)
      expect(description.length, tpl.id).toBeLessThanOrEqual(155)
      expect(description, tpl.id).toContain(tpl.tags.includes('two-column') ? 'two columns' : 'one column')
      if (tpl.tags.includes('photo')) expect(description, tpl.id).toContain('photo')
      if (!description.endsWith('…')) expect(description, tpl.id).toMatch(/Free PDF and Word download, no sign-up\.$/)
      descriptions.add(description)
    }
    expect(descriptions.size).toBe(TEMPLATES.length)
  })

  // Every design exports text an ATS reads word for word, so no tagline may
  // read as if some designs fail.
  it('comes from a registry with no ATS verdicts in its taglines', () => {
    for (const tpl of TEMPLATES)
      expect(tpl.description, tpl.id).not.toMatch(/ATS[- ]?(perfect|safe|friendly|clean|proof|ready|optimi[sz]ed)|maximally ATS|nothing an ATS|reads clean for ATS/i)
  })
})

describe('page titles', () => {
  /**
   * Titles that cannot reach TITLE_MAX even with every suffix dropped,
   * because the role alone is that long and shortening it would make it a
   * different job. Listed by name so a new one is a decision, not a drift.
   */
  const TOO_LONG: Record<string, string> = {
    // 67 characters with no suffix at all: the role carries its level and
    // field, which is what tells this example from a junior one.
    '/examples/healthcare-administrator': 'the role alone is "Healthcare Administrator (VP, Ambulatory Operations)"',
  }

  const titles = (): [string, string][] => {
    const home = read('../../index.html').match(/<title>([^<]*)<\/title>/)![1]
    return [
      ['/', home],
      ['/templates', galleryPageMeta().title],
      ...TEMPLATES.map((t): [string, string] => [templatePath(t), templatePageMeta(t.id).title]),
      ['/examples', examplesPageMeta().title],
      ...LIBRARY.map((s): [string, string] => [`/examples/${s.slug}`, samplePageMeta(s.slug).title]),
      ['/prompts', promptsPageMeta().title],
      ['/guides', guidesHubPageMeta().title],
      ...GUIDES.map((g): [string, string] => [`/${g.slug}`, guidePageMeta(g.slug).title]),
    ]
  }

  it(`keeps every public page title to ${65} characters`, () => {
    expect(TITLE_MAX).toBe(65)
    const long = titles().filter(([path, t]) => t.length > TITLE_MAX && !(path in TOO_LONG))
    expect(long).toEqual([])
  })

  it('keeps the exceptions honest: each is still too long, and still a public page', () => {
    const all = new Map(titles())
    for (const path of Object.keys(TOO_LONG)) {
      expect(all.has(path), path).toBe(true)
      expect(all.get(path)!.length, path).toBeGreaterThan(TITLE_MAX)
    }
  })

  it('leads with the keyword and stays distinct', () => {
    for (const t of TEMPLATES) expect(templatePageMeta(t.id).title.startsWith(`${templateKeyword(t)} Resume Template: ${t.name}`), t.id).toBe(true)
    for (const s of LIBRARY) expect(samplePageMeta(s.slug).title.startsWith(s.role), s.slug).toBe(true)
    const all = titles().map(([, t]) => t)
    expect(new Set(all).size).toBe(all.length)
  })

  it('drops the suffix for a long name instead of cutting the keyword', () => {
    const t = templatePageMeta(TEMPLATES[0].id).title
    expect(t.endsWith(' · CVAurum') || t.length <= TITLE_MAX).toBe(true)
    expect(TEMPLATES.some((x) => templatePageMeta(x.id).title.endsWith(' — Free & Editable · CVAurum'))).toBe(true)
  })

  it('names the example library by its count', () => {
    expect(examplesPageMeta().title).toBe(`${SAMPLE_COUNT} Resume Examples by Job — Free to Edit · CVAurum`)
  })
})

describe('an example page description', () => {
  it('says which job it is first, then the blurb, within the limit', () => {
    for (const s of LIBRARY) {
      const { description } = samplePageMeta(s.slug)
      const noun = s.region === 'uk' ? 'CV example' : 'resume example'
      expect(description.startsWith(`${s.role} ${noun}: `), s.slug).toBe(true)
      expect(description.length, s.slug).toBeLessThanOrEqual(155)
    }
  })
})

describe('the template gallery', () => {
  it('describes itself with the count and the kinds of design', () => {
    expect(galleryPageMeta().description).toBe(
      `${TEMPLATE_COUNT} free resume templates — simple, modern, two-column and creative — each on the same resume. PDF and Word download, no sign-up.`
    )
  })

  it('groups the designs by style under headings, each design exactly once', () => {
    const groups = galleryGroups()
    expect(groups.length).toBeGreaterThan(3)
    const ids = groups.flatMap((g) => g.designs.map((d) => d.id))
    expect(ids.sort()).toEqual(TEMPLATES.map((t) => t.id).sort())
    for (const g of groups) expect(g.designs.length, g.heading).toBeGreaterThan(0)
    const html = galleryStaticHtml()
    for (const g of groups) expect(html).toContain(`<h2>${g.heading}</h2>`)
    const cards = templateLinks(html)
    expect(cards).toHaveLength(TEMPLATE_COUNT)
    expect(new Set(cards).size).toBe(TEMPLATE_COUNT)
  })

  it('lists the ItemList in the order the cards are shown', () => {
    const graph = JSON.parse(galleryJsonLd())['@graph'] as Record<string, any>[]
    const list = graph.find((n) => n['@type'] === 'ItemList')!
    expect(list.numberOfItems).toBe(TEMPLATE_COUNT)
    const order = galleryGroups().flatMap((g) => g.designs.map((d) => `https://cvaurum.com${templatePath(d)}`))
    expect(list.itemListElement.map((i: { url: string }) => i.url)).toEqual(order)
    expect(list.itemListElement.map((i: { position: number }) => i.position)).toEqual(order.map((_, i) => i + 1))
    const cards = templateLinks(galleryStaticHtml()).map((slug) => `https://cvaurum.com/templates/${slug}`)
    expect(cards).toEqual(order)
  })
})

describe('the app shells', () => {
  it('carry no canonical, og:url or hreflang that would point a noindex page at the home page', () => {
    const index = read('../../index.html')
    expect(index).toContain('<link rel="canonical"')
    const shell = shellHtml(index, 'Page not found · CVAurum')
    expect(shell).toContain('<meta name="robots" content="noindex" />')
    expect(shell).not.toMatch(/rel="canonical"/)
    expect(shell).not.toMatch(/property="og:url"/)
    expect(shell).not.toMatch(/hreflang=/)
    expect(shell).toContain('<title>Page not found · CVAurum</title>')
  })
})

describe('llms.txt is an index', () => {
  it('keeps the summary, the facts and the section links, and leaves the long lists to llms-full.txt', () => {
    const t = llmsTxt()
    for (const path of ['/guides', '/templates', '/examples', '/prompts', '/about', '/llms-full.txt'])
      expect(t, path).toContain(`https://cvaurum.com${path}`)
    expect(t).not.toContain('## Every template')
    expect(t).not.toContain('## Sitemap')
    expect(new TextEncoder().encode(t).length).toBeLessThan(16 * 1024)
    const full = llmsFullTxt()
    for (const tpl of TEMPLATES) expect(full).toContain(`https://cvaurum.com${templatePath(tpl)}`)
    expect(full).toContain('## Sitemap')
    for (const tpl of TEMPLATES) expect(galleryMarkdown()).toContain(`https://cvaurum.com${templatePath(tpl)}`)
  })
})

describe('the Markdown twins', () => {
  it('send "About CVAurum" to the about page, not to llms.txt', () => {
    const twins = [galleryMarkdown(), promptsMarkdown(), guidesHubMarkdown(), ...GUIDES.map((g) => guideMarkdown(g.slug))]
    for (const md of twins) {
      expect(md).not.toContain('About CVAurum: https://cvaurum.com/llms.txt')
      expect(md).toMatch(/About CVAurum(: |\]\()https:\/\/cvaurum\.com\/about/)
    }
  })
})

describe('the comparison column', () => {
  it('is headed the way the home page heads it', () => {
    expect(landingStaticHtml()).toContain('<th>Ask of any other builder</th>')
    expect(landingStaticHtml()).not.toContain('<th>Most builders</th>')
    expect(llmsFullTxt()).toContain('| Capability | CVAurum | Ask of any other builder |')
    expect(llmsFullTxt()).not.toContain('| Most builders |')
  })
})

describe('designs on the thin guides', () => {
  const SHOWN = ['free-resume-builder', 'resume-builder-no-sign-up']

  it('is a field on those two guides and no other', () => {
    expect(GUIDES.filter((g) => g.showcase).map((g) => g.slug)).toEqual(SHOWN)
    expect(SHOWCASE_TEMPLATE_IDS).toHaveLength(6)
    for (const id of SHOWCASE_TEMPLATE_IDS) {
      expect(TEMPLATE_MAP[id], id).toBeTruthy()
      expect(fs.existsSync(`${PUBLIC}img/templates/thumb/${id}.webp`), id).toBe(true)
    }
  })

  it('shows six thumbnails linking to their pages, and the way to all of them', () => {
    for (const slug of SHOWN) {
      const html = guideStaticHtml(slug)
      for (const id of SHOWCASE_TEMPLATE_IDS) {
        expect(html, id).toContain(`<img src="/img/templates/thumb/${id}.webp"`)
        expect(html, id).toContain(`href="${templatePath(TEMPLATE_MAP[id])}"`)
      }
      expect(html).toContain(`<a href="/templates">See all ${TEMPLATE_COUNT} templates</a>`)
    }
    const route = read('../routes/Guide.tsx')
    expect(route).toContain('g.showcase')
    for (const g of GUIDES.filter((x) => !x.showcase)) expect(guideStaticHtml(g.slug)).not.toContain('/img/templates/thumb/')
  })
})
