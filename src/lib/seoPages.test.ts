import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { TEMPLATES, TEMPLATE_MAP, getTemplate } from '@/templates/registry'
import { htmlEscape } from '@/lib/utils'
import { PAGE_IMAGE_WIDTH } from '@/data/pageImages'
import { samplePageImage } from '@/lib/seoLibrary'
import {
  DESC_MAX,
  allTemplateIds,
  breadcrumbJsonLd,
  galleryPageMeta,
  galleryStaticHtml,
  imageAlt,
  isTemplateId,
  templatePageImage,
  templatePageImageHeight,
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
  orderedSampleSlugs,
} from '@/lib/seoPages'
import { SITE as COPY } from '@/data/siteCopy'

/** Every /templates/<id> link in a block of HTML, in order. */
const templateLinks = (html: string) => [...html.matchAll(/href="\/templates\/([a-z0-9-]+)"/g)].map((m) => m[1])

/** Every <img …> in a block of HTML, as its raw tag, and one attribute of one. */
const imgTags = (html: string) => [...html.matchAll(/<img\s[^>]*>/g)].map((m) => m[0])
const attr = (tag: string, name: string) => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1]

/** The published folder the pages point into. */
const PUBLIC = fileURLToPath(new URL('../../public/', import.meta.url))

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

  const TOTAL = TEMPLATES.length + orderedSampleSlugs().length + 3

  it('lists the landing page, both collections and every page in them', () => {
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
    expect(locs).toHaveLength(TOTAL)
    expect(locs[0]).toBe('https://cvaurum.com/')
    expect(locs[1]).toBe('https://cvaurum.com/templates')
    const designs = allTemplateIds().map((id) => `https://cvaurum.com/templates/${id}`)
    expect(locs.slice(2, 2 + designs.length)).toEqual(designs)
    expect(locs[2 + designs.length]).toBe('https://cvaurum.com/examples')
    expect(locs.slice(3 + designs.length)).toEqual(
      orderedSampleSlugs().map((slug) => `https://cvaurum.com/examples/${slug}`)
    )
  })

  it('stamps every entry with the day it was generated', () => {
    const stamps = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1])
    expect(stamps).toHaveLength(TOTAL)
    expect(new Set(stamps)).toEqual(new Set(['2026-09-08']))
  })

  /** The <image:loc> values of each <url> block, in document order. */
  const perUrlImages = () =>
    [...xml.matchAll(/<url>[\s\S]*?<\/url>/g)].map((m) => [...m[0].matchAll(/<image:loc>([^<]+)<\/image:loc>/g)].map((i) => i[1]))

  it('declares a picture for every page that has one', () => {
    const imgs = perUrlImages()
    const designs = allTemplateIds()
    const slugs = orderedSampleSlugs()
    // The landing page has no page image of its own; both collections declare
    // everything they list, and every page inside one declares itself.
    expect(imgs[0]).toEqual([])
    expect(imgs[1]).toEqual(designs.map((id) => `https://cvaurum.com${templatePageImage(id)}`))
    for (const [i, id] of designs.entries()) {
      expect(imgs[2 + i], id).toEqual([`https://cvaurum.com${templatePageImage(id)}`])
    }
    expect(imgs[2 + designs.length]).toEqual(slugs.map((s) => `https://cvaurum.com${samplePageImage(s)}`))
    for (const [i, slug] of slugs.entries()) {
      expect(imgs[3 + designs.length + i], slug).toEqual([`https://cvaurum.com${samplePageImage(slug)}`])
    }
  })

  it('gives every image an absolute URL on this site', () => {
    const locs = [...xml.matchAll(/<image:loc>([^<]+)<\/image:loc>/g)].map((m) => m[1])
    expect(locs.length).toBe(2 * (TEMPLATES.length + orderedSampleSlugs().length))
    for (const loc of locs) expect(loc.startsWith('https://cvaurum.com/')).toBe(true)
    expect(xml).toContain('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"')
  })

  it('says nothing Google still reads besides the location', () => {
    // image:title, image:caption, image:geo_location and image:license are
    // gone from the sitemap image documentation; an ignored tag is only bytes.
    for (const gone of ['image:title', 'image:caption', 'image:geo_location', 'image:license']) {
      expect(xml, gone).not.toContain(`<${gone}>`)
    }
  })

  it('ranks the landing page above a collection above a single page in one', () => {
    const p = [...xml.matchAll(/<priority>([^<]+)<\/priority>/g)].map((m) => m[1])
    expect(p[0]).toBe('1.0')
    // Both collection pages rank above the pages inside them.
    expect(p[1]).toBe('0.8')
    expect(p[2 + TEMPLATES.length]).toBe('0.8')
    const inner = p.filter((_, i) => i !== 0 && i !== 1 && i !== 2 + TEMPLATES.length)
    expect(new Set(inner)).toEqual(new Set(['0.6']))
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
  const node = (id: string, type: string) =>
    JSON.parse(breadcrumbJsonLd(id))['@graph'].find((n: { '@type': string }) => n['@type'] === type)

  it('walks home › templates › this design', () => {
    const list = node('atlas', 'BreadcrumbList')
    expect(list.itemListElement.map((i: { item: string }) => i.item)).toEqual([
      'https://cvaurum.com/',
      'https://cvaurum.com/templates',
      'https://cvaurum.com/templates/atlas',
    ])
  })

  // One block, two things to say: which trail the page sits on, and which of
  // the pictures on it is the page's own. Google documents primaryImageOfPage
  // as the way to say the second, and this page lists every other design.
  it('names the page image as the page’s own picture', () => {
    expect(node('atlas', 'WebPage').primaryImageOfPage).toMatchObject({
      '@type': 'ImageObject',
      contentUrl: 'https://cvaurum.com/img/templates/atlas.webp',
      width: PAGE_IMAGE_WIDTH,
      height: templatePageImageHeight('atlas'),
      caption: imageAlt(getTemplate('atlas')),
    })
  })

  it('carries one for every design in the registry', () => {
    for (const tpl of TEMPLATES) {
      expect(node(tpl.id, 'WebPage').primaryImageOfPage.contentUrl, tpl.id).toBe(
        `https://cvaurum.com${templatePageImage(tpl.id)}`
      )
    }
  })
})

/**
 * The picture a design page shows and the card it shares are two different
 * files, and both have to exist: nine designs shipped an og:image that was a
 * 404 for months, because nothing ever asked.
 */
describe('the two pictures each design has', () => {
  const published = (dir: string, ext: string) =>
    new Set(
      fs
        .readdirSync(path.join(PUBLIC, dir))
        .filter((f) => f.endsWith(ext))
        .map((f) => f.slice(0, -ext.length))
    )

  it('publishes one page image per design, and no orphan', () => {
    expect(published('img/templates', '.webp')).toEqual(new Set(allTemplateIds()))
  })

  it('publishes one share card per design, and no orphan', () => {
    // public/og holds the designs' cards only; the library's live one folder
    // deeper, and the site's own default is /og.png.
    expect(published('og', '.jpg')).toEqual(new Set(allTemplateIds()))
  })

  it('keeps the share card a JPEG — og:image is never a WebP', () => {
    // The link-preview readers document JPG/PNG/GIF between them and one
    // has been measured failing on WebP, whatever the page itself shows.
    for (const tpl of TEMPLATES) {
      const { image } = templatePageMeta(tpl.id)
      expect(image, tpl.id).toBe(`/og/${tpl.id}.jpg`)
      expect(image.endsWith('.webp'), tpl.id).toBe(false)
      expect(fs.existsSync(path.join(PUBLIC, image.slice(1))), tpl.id).toBe(true)
    }
    expect(galleryPageMeta().image.endsWith('.webp')).toBe(false)
  })
})

describe('the picture in the HTML a crawler reads', () => {
  it('shows the page image, eagerly, with the box it will fill', () => {
    const img = imgTags(staticHtml('atlas'))[0]
    expect(attr(img, 'src')).toBe('/img/templates/atlas.webp')
    expect(attr(img, 'width')).toBe(String(PAGE_IMAGE_WIDTH))
    expect(attr(img, 'height')).toBe(String(templatePageImageHeight('atlas')))
    expect(attr(img, 'alt')).toBe(imageAlt(getTemplate('atlas')))
    expect(attr(img, 'alt')!.length).toBeGreaterThan(20)
    expect(attr(img, 'loading')).toBe('eager')
    expect(attr(img, 'decoding')).toBe('async')
  })

  it('puts it beside the heading, before everything else', () => {
    const html = staticHtml('atlas')
    expect(html.indexOf('<img')).toBeGreaterThan(html.indexOf('<h1>'))
    expect(html.indexOf('<img')).toBeLessThan(html.indexOf('<nav'))
  })

  it('gives the gallery every design as a lazy thumbnail', () => {
    const tags = imgTags(galleryStaticHtml())
    expect(tags).toHaveLength(TEMPLATES.length)
    expect(new Set(tags.map((t) => attr(t, 'src')))).toEqual(new Set(allTemplateIds().map((id) => `/img/templates/${id}.webp`)))
    for (const t of tags) {
      expect(attr(t, 'loading')).toBe('lazy')
      expect(attr(t, 'width')).toBe(String(PAGE_IMAGE_WIDTH))
      expect(Number(attr(t, 'height'))).toBeGreaterThan(0)
      expect(attr(t, 'alt')!.length).toBeGreaterThan(20)
    }
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
    // Home, the gallery, one line per design, and the library's shelf - the
    // library's own pages live in the sitemap and examples.md, not here.
    expect(siteUrls()).toHaveLength(TEMPLATES.length + 3)
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
