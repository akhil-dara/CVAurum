import { describe, expect, it } from 'vitest'
import { TEMPLATES, TEMPLATE_MAP, getTemplate } from '@/templates/registry'
import { htmlEscape } from '@/lib/utils'
import {
  DESC_MAX,
  allTemplateIds,
  breadcrumbJsonLd,
  galleryStaticHtml,
  isTemplateId,
  relatedTemplateIds,
  sitemapXml,
  staticHtml,
  tagSentence,
  templatePageMeta,
  trimToWords,
  landingStaticHtml,
  shellHtml,
  llmsTxt,
  llmsFullTxt,
  siteUrls,
} from '@/lib/seoPages'
import { SITE as COPY } from '@/data/siteCopy'

/** Every /templates/<id> link in a block of HTML, in order. */
const templateLinks = (html: string) => [...html.matchAll(/href="\/templates\/([a-z0-9-]+)"/g)].map((m) => m[1])

describe('the head each template page asks for', () => {
  it('names the design, its path and its preview image', () => {
    const meta = templatePageMeta('broadsheet')
    expect(meta.path).toBe('/templates/broadsheet')
    expect(meta.title).toBe('Broadsheet résumé template — free, ATS-ready · CVAurum')
    expect(meta.image).toBe('/og/broadsheet.jpg')
  })

  // A description longer than this is cut mid-word by the search result page
  // instead of by us, so no page is allowed to ship one.
  it('keeps every description inside the length a result page shows', () => {
    for (const tpl of TEMPLATES) {
      const { description } = templatePageMeta(tpl.id)
      expect(description.length, tpl.id).toBeLessThanOrEqual(DESC_MAX)
      expect(description.length, tpl.id).toBeGreaterThan(20)
    }
  })

  it('carries the registry description through when it already fits', () => {
    const short = TEMPLATES.find((t) => t.description.length <= DESC_MAX)!
    expect(templatePageMeta(short.id).description).toBe(short.description)
  })

  it('cuts a long one on a word boundary, never mid-word', () => {
    const long = TEMPLATES.find((t) => t.description.length > DESC_MAX)!
    const cut = templatePageMeta(long.id).description
    expect(cut.endsWith('…')).toBe(true)
    // The kept part is a prefix of the original — nothing invented, no half word.
    const head = cut.slice(0, -1)
    expect(long.description.startsWith(head)).toBe(true)
    expect(long.description[head.length]).toMatch(/[\s,;:.—–-]/)
  })

  it('gives every design a distinct title and path', () => {
    const titles = new Set(TEMPLATES.map((t) => templatePageMeta(t.id).title))
    const paths = new Set(TEMPLATES.map((t) => templatePageMeta(t.id).path))
    expect(titles.size).toBe(TEMPLATES.length)
    expect(paths.size).toBe(TEMPLATES.length)
  })

  it('refuses an id the registry does not hold', () => {
    expect(isTemplateId('broadsheet')).toBe(true)
    expect(isTemplateId('not-a-design')).toBe(false)
    expect(isTemplateId(undefined)).toBe(false)
    expect(() => templatePageMeta('not-a-design')).toThrow()
  })
})

describe('trimToWords', () => {
  it('leaves a short line alone', () => {
    expect(trimToWords('A short line.', 40)).toBe('A short line.')
  })

  it('never exceeds the budget, ellipsis included', () => {
    const long = 'word '.repeat(80)
    expect(trimToWords(long, 30).length).toBeLessThanOrEqual(30)
  })

  it('drops the punctuation the cut landed on', () => {
    expect(trimToWords('Alpha, beta, gamma delta', 12)).toBe('Alpha…')
  })
})

describe('the HTML a crawler reads without running the app', () => {
  const html = staticHtml('broadsheet')

  it('leads with the design as a heading', () => {
    expect(html).toContain('<h1>Broadsheet résumé template</h1>')
  })

  it('links to every OTHER design in the collection', () => {
    const linked = templateLinks(html)
    expect(linked).toHaveLength(TEMPLATES.length - 1)
    expect(new Set(linked).size).toBe(TEMPLATES.length - 1)
    expect(linked).not.toContain('broadsheet')
    for (const id of linked) expect(TEMPLATE_MAP[id]).toBeTruthy()
  })

  it('offers the way back to the gallery and into the app', () => {
    expect(html).toContain('href="/templates"')
    expect(html).toContain('href="/app"')
  })

  it('says what the design is best for, from its own tags', () => {
    expect(html).toContain(`Best for: ${tagSentence(getTemplate('broadsheet').tags)}.`)
    // 'ats-safe' reads as a verdict on the designs that lack it — it never
    // appears in a sentence built for a reader.
    expect(html).not.toContain('Ats safe')
  })

  it('escapes the description instead of pasting raw markup into the page', () => {
    for (const tpl of TEMPLATES) {
      expect(staticHtml(tpl.id), tpl.id).toContain(htmlEscape(tpl.description))
    }
    // At least one description carries a character that must be escaped, so
    // the check above is testing something real.
    const risky = TEMPLATES.find((t) => htmlEscape(t.description) !== t.description)!
    expect(risky).toBeTruthy()
    expect(staticHtml(risky.id)).not.toContain(risky.description)
  })

  it('gives the gallery its own block listing all of them', () => {
    const gallery = galleryStaticHtml()
    expect(gallery).toContain(`<h1>${TEMPLATES.length} résumé templates, all free</h1>`)
    expect(templateLinks(gallery)).toHaveLength(TEMPLATES.length)
  })
})

describe('the sitemap', () => {
  const xml = sitemapXml('2026-09-08')

  it('lists the landing page, the gallery and every design', () => {
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
    expect(locs).toHaveLength(TEMPLATES.length + 2)
    expect(locs[0]).toBe('https://cvaurum.com/')
    expect(locs[1]).toBe('https://cvaurum.com/templates')
    expect(locs.slice(2)).toEqual(allTemplateIds().map((id) => `https://cvaurum.com/templates/${id}`))
  })

  it('stamps every entry with the day it was generated', () => {
    const stamps = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1])
    expect(stamps).toHaveLength(TEMPLATES.length + 2)
    expect(new Set(stamps)).toEqual(new Set(['2026-09-08']))
  })

  it('ranks the landing page above the gallery above a single design', () => {
    const p = [...xml.matchAll(/<priority>([^<]+)<\/priority>/g)].map((m) => m[1])
    expect(p[0]).toBe('1.0')
    expect(p[1]).toBe('0.8')
    expect(new Set(p.slice(2))).toEqual(new Set(['0.6']))
  })
})

describe('related designs', () => {
  it('offers six neighbours, never the page itself', () => {
    const related = relatedTemplateIds('broadsheet')
    expect(related).toHaveLength(6)
    expect(related).not.toContain('broadsheet')
    expect(new Set(related).size).toBe(6)
  })

  it('puts the designs sharing the most tags first', () => {
    const mine = new Set(getTemplate('clarity').tags)
    const shared = relatedTemplateIds('clarity').map((id) => getTemplate(id).tags.filter((t) => mine.has(t)).length)
    expect(shared).toEqual([...shared].sort((a, b) => b - a))
    expect(shared[0]).toBeGreaterThan(0)
  })

  it('answers for every design in the registry', () => {
    for (const tpl of TEMPLATES) expect(relatedTemplateIds(tpl.id).length, tpl.id).toBe(6)
  })
})

describe('breadcrumb structured data', () => {
  it('walks home › templates › this design', () => {
    const data = JSON.parse(breadcrumbJsonLd('atlas'))
    expect(data['@type']).toBe('BreadcrumbList')
    expect(data.itemListElement.map((i: { item: string }) => i.item)).toEqual([
      'https://cvaurum.com/',
      'https://cvaurum.com/templates',
      'https://cvaurum.com/templates/atlas',
    ])
  })
})

describe('the landing page for whoever does not run scripts', () => {
  it('carries the page: h1, rows, FAQ, signature links', () => {
    const html = landingStaticHtml()
    expect(html).toContain('<h1')
    for (const r of COPY.comparison) expect(html).toContain(htmlEscape(r.capability))
    for (const f of COPY.faq) expect(html).toContain(htmlEscape(f.q).replace(/"/g, '&quot;'))
    for (const id of ['broadsheet', 'marquee', 'atlas', 'chronicle', 'folio-noir', 'terrace']) expect(html).toContain(`/templates/${id}`)
    expect(html).not.toMatch(/<script/i)
  })
  it('gives an app route a shell with its own title, a noindex and nothing in #root', () => {
    const shell = shellHtml('<html><head><title>Old</title></head><body><div id="root"></div></body></html>', 'Your Resumes · CVAurum')
    expect(shell).toContain('<title>Your Resumes · CVAurum</title>')
    expect(shell).toContain('<meta name="robots" content="noindex" />')
    expect(shell).toContain('<div id="root"></div>')
  })
})

describe('llms.txt', () => {
  it('is the convention: H1, summary quote, links', () => {
    const t = llmsTxt()
    expect(t.startsWith('# CVAurum')).toBe(true)
    expect(t).toMatch(/\n> /)
    expect(t).toContain('https://cvaurum.com/templates')
    expect(t).toContain('/llms-full.txt')
  })
  it('carries the facts, the limits, every template and the sitemap, without superlatives', () => {
    const t = llmsTxt()
    for (const f of COPY.facts) expect(t).toContain(`- ${f.label}: `)
    for (const l of COPY.limits) expect(t).toContain(l)
    for (const tpl of TEMPLATES) expect(t).toContain(`https://cvaurum.com/templates/${tpl.id}`)
    expect(t).toContain('https://cvaurum.com/sitemap.xml')
    expect(t).toContain('https://cvaurum.com/robots.txt')
    expect(siteUrls()).toHaveLength(TEMPLATES.length + 2)
    for (const u of siteUrls()) expect(t).toContain(`- ${u}`)
    expect(t).not.toMatch(/best|beast|world-class|#1/i)
  })
  it('the full text names every template with its page, without superlatives', () => {
    const t = llmsFullTxt()
    for (const tpl of TEMPLATES) expect(t).toContain(`https://cvaurum.com/templates/${tpl.id}`)
    expect(t).not.toMatch(/best|beast|world-class|#1/i)
    expect(t).toContain(COPY.oneLiner)
    for (const r of COPY.comparison) expect(t).toContain(`| ${r.capability} |`)
    for (const f of COPY.faq) expect(t).toContain(`**${f.q}**`)
    expect(t).toContain('## Sitemap')
  })
})
