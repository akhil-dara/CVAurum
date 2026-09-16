import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { TEMPLATES, TEMPLATE_MAP, getTemplate } from '@/templates/registry'
import { htmlEscape } from '@/lib/utils'
import { PAGE_IMAGE_WIDTH } from '@/data/pageImages'
import { examplesPageMeta, samplePageImage } from '@/lib/seoLibrary'
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
  PROMPTS,
  PROMPTS_INTRO,
  PROMPTS_SCHEMA_NOTE,
  SCHEMA_DOC,
  documentSections,
  documentShape,
  documentShapeMarkdown,
  promptsMarkdown,
  promptsPageMeta,
  promptsStaticHtml,
  promptsJsonLd,
  galleryJsonLd,
  lastmodEntry,
  publicUrlPaths,
  publicUrls,
  skillMd,
} from '@/lib/seoPages'
import { ResumeContentSchema } from '@/types/document'
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

  // Home, the gallery, the example shelf and the prompt library, plus one
  // page per design and one per example.
  const TOTAL = TEMPLATES.length + orderedSampleSlugs().length + 4

  it('lists the landing page, both collections and every page in them', () => {
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
    expect(locs).toHaveLength(TOTAL)
    expect(locs[0]).toBe('https://cvaurum.com/')
    expect(locs[1]).toBe('https://cvaurum.com/templates')
    const designs = allTemplateIds().map((id) => `https://cvaurum.com/templates/${id}`)
    expect(locs.slice(2, 2 + designs.length)).toEqual(designs)
    expect(locs[2 + designs.length]).toBe('https://cvaurum.com/examples')
    expect(locs.slice(3 + designs.length, -1)).toEqual(
      orderedSampleSlugs().map((slug) => `https://cvaurum.com/examples/${slug}`)
    )
    expect(locs[locs.length - 1]).toBe('https://cvaurum.com/prompts')
  })

  /**
   * It used to stamp the day of the build on all 180 URLs, which tells a
   * crawler that every page changed every deploy — and a lastmod that always
   * moves is one that stops being read. Each entry now carries the day THAT
   * page's sources last changed (src/data/lastmod.json, kept honest by
   * src/data/lastmod.test.ts); the argument is only the fallback for a URL
   * with no entry yet.
   */
  it('gives every entry the day its own sources last changed', () => {
    const stamps = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1])
    expect(stamps).toHaveLength(TOTAL)
    expect(stamps).toEqual(publicUrlPaths().map((p) => lastmodEntry(p)!.lastmod))
    for (const s of stamps) expect(s).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('does not reach for the day of the build while every URL has an entry', () => {
    expect(sitemapXml('2099-12-31')).not.toContain('<lastmod>2099-12-31</lastmod>')
  })

  it('walks the same URL list the lastmod file and IndexNow walk', () => {
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
    expect(locs).toEqual(publicUrlPaths().map((p) => `https://cvaurum.com${p}`))
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
    // The prompt library is words, not pictures; it declares none rather than
    // borrowing the site's default card as though it were page content.
    expect(imgs[imgs.length - 1]).toEqual([])
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
    // Every collection page ranks above the pages inside it; the prompt
    // library is one too, and is the last entry.
    expect(p[1]).toBe('0.8')
    expect(p[2 + TEMPLATES.length]).toBe('0.8')
    expect(p[p.length - 1]).toBe('0.8')
    const collections = new Set([0, 1, 2 + TEMPLATES.length, p.length - 1])
    const inner = p.filter((_, i) => !collections.has(i))
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
    // public/og holds the designs' cards and the two collection cards; the
    // library's per-example cards live one folder deeper, and the site's own
    // default is /og.png.
    expect(published('og', '.jpg')).toEqual(new Set([...allTemplateIds(), 'templates', 'examples']))
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

/**
 * The three cards that are not about one design or one example: the site card
 * and the two collections. /examples and /templates both used to fall back to
 * the site card, which was a drawing that predated the example library, named
 * a template count in typed text, and went stale the moment a design was
 * added. They are built by scripts/make-og.cjs now, from the real page images
 * and the real counts, and these are the checks that file cannot make itself.
 */
describe('the cards the site itself unfurls into', () => {
  /** Pixel size straight out of the file header - PNG IHDR, JPEG SOFn - so
   *  the test measures the shipped card rather than trusting what wrote it. */
  const imageSize = (rel: string): { w: number; h: number; kb: number } => {
    const b = fs.readFileSync(path.join(PUBLIC, rel))
    const kb = b.length / 1024
    if (b.subarray(0, 4).toString('hex') === '89504e47') return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), kb }
    for (let i = 2; i < b.length; ) {
      if (b[i] !== 0xff) {
        i++
        continue
      }
      const marker = b[i + 1]
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7), kb }
      }
      i += 2 + b.readUInt16BE(i + 2)
    }
    throw new Error(`neither PNG nor JPEG: ${rel}`)
  }

  it('gives each collection its own card instead of the site-wide one', () => {
    expect(galleryPageMeta().image).toBe('/og/templates.jpg')
    expect(examplesPageMeta().image).toBe('/og/examples.jpg')
  })

  it('ships all three at the 1200x630 every unfurler crops to, inside the card budget', () => {
    // The per-design and per-example cards keep 90 KB with one page on them;
    // these carry four page pictures, a gradient and the glow, and 150 KB is
    // a fifth of what the hand-drawn card weighed. Over it is a composition
    // mistake, not a compression one.
    for (const rel of ['og.png', 'og/templates.jpg', 'og/examples.jpg']) {
      const { w, h, kb } = imageSize(rel)
      expect([rel, w, h]).toEqual([rel, 1200, 630])
      expect(kb, rel).toBeLessThan(150)
    }
  })

  it('keeps the head pointing at the site card it actually ships', () => {
    const head = fs.readFileSync(path.join(PUBLIC, '..', 'index.html'), 'utf8')
    const meta = (prop: string) => head.match(new RegExp(`<meta property="${prop}" content="([^"]*)"`))?.[1]
    expect(meta('og:image')).toBe('https://cvaurum.com/og.png')
    expect(meta('og:image:secure_url')).toBe('https://cvaurum.com/og.png')
    expect(meta('og:image:type')).toBe('image/png')
    // The declared box has to be the real one: an unfurler that trusts these
    // and gets a different picture crops it itself.
    const { w, h } = imageSize('og.png')
    expect(meta('og:image:width')).toBe(String(w))
    expect(meta('og:image:height')).toBe(String(h))
    expect(head).toContain('<meta name="twitter:image" content="https://cvaurum.com/og.png" />')
    // Never WebP, on any of the three, for the reason above.
    for (const m of head.matchAll(/(og:image|twitter:image)" content="([^"]*)"/g)) {
      expect(m[2].endsWith('.webp'), m[0]).toBe(false)
    }
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
    // Home, the gallery, one line per design, the library's shelf and the
    // prompt library - the library's own pages live in the sitemap and
    // examples.md, not here.
    expect(siteUrls()).toHaveLength(TEMPLATES.length + 4)
    for (const u of siteUrls()) expect(t).toContain(`- ${u}`)
    expect(t).not.toMatch(/best|beast|world-class|#1/i)
  })
  // The question people ask about a designed résumé is whether the decoration
  // lands in the text a parser reads. The answer is measured, so it has to be
  // findable in the file an assistant reads, not only on the page.
  it('carries the measured account of what reaches the text layer', () => {
    for (const t of [llmsTxt(), llmsFullTxt()]) {
      expect(t).toContain("## What reaches the exported file's text layer")
      for (const line of COPY.textLayer) expect(t).toContain(line)
    }
    expect(landingStaticHtml()).toContain(htmlEscape(COPY.textLayer[0]).replace(/"/g, '&quot;'))
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

/**
 * The prompt library at /prompts.
 *
 * A prompt that names a field the importer does not read produces an answer
 * that silently loses half a résumé, so the field names are the thing worth
 * testing: they are generated from the same Zod schemas io.ts validates
 * against, and no prompt is allowed to spell one out itself.
 */
describe('the document shape an assistant is handed', () => {
  it('lists every top-level section the importer reads', () => {
    expect(documentSections()).toEqual(Object.keys(ResumeContentSchema.shape))
    const md = documentShapeMarkdown()
    for (const section of documentSections()) expect(md, section).toContain(`\`${section}\``)
  })

  it('reads the field names out of the schema, never a copy of them', () => {
    const lines = documentShape()
    const work = lines.find((l) => l.path === 'work[]')!
    expect(work.fields).toEqual(Object.keys(ResumeContentSchema.shape.work._def.innerType.element.shape))
    // Nested objects and arrays-of-objects get their own line, or a prompt
    // that mentions basics.location would be pointing at nothing.
    expect(lines.map((l) => l.path)).toEqual(
      expect.arrayContaining(['basics', 'basics.location', 'basics.profiles[]', 'custom[]', 'custom[].items[]'])
    )
  })

  it('is published where the prompts point, inside SKILL.md', () => {
    const skill = skillMd()
    expect(SCHEMA_DOC).toBe('https://cvaurum.com/skills/cvaurum/SKILL.md')
    expect(skill).toContain('## The document shape')
    expect(skill).toContain(documentShapeMarkdown())
    expect(skill).toContain('/prompts')
  })
})

describe('the prompt library', () => {
  it('covers the jobs people bring, each a complete piece of writing', () => {
    expect(PROMPTS.length).toBeGreaterThanOrEqual(5)
    expect(new Set(PROMPTS.map((p) => p.id)).size).toBe(PROMPTS.length)
    for (const p of PROMPTS) {
      expect(p.id, p.id).toMatch(/^[a-z0-9-]+$/)
      expect(p.title.length, p.id).toBeGreaterThan(10)
      expect(p.when.length, p.id).toBeGreaterThan(30)
      expect(p.prompt.length, p.id).toBeGreaterThan(300)
      expect(p.after.length, p.id).toBeGreaterThan(30)
    }
  })

  // The whole point of the format choice: an answer that is JSON Resume is an
  // answer this app imports. A prompt that forgot to ask for it is a prompt
  // whose answer has to be retyped.
  it('asks for JSON Resume and points at the generated field list', () => {
    const needsSchema = PROMPTS.filter((p) => /JSON Resume document/.test(p.prompt))
    expect(needsSchema.length).toBeGreaterThanOrEqual(4)
    for (const p of PROMPTS) expect(p.prompt, p.id).toMatch(/JSON Resume/)
    expect(PROMPTS.filter((p) => p.prompt.includes(SCHEMA_DOC)).length).toBeGreaterThanOrEqual(3)
  })

  // A prompt is where an assistant is told what it may not do, and this is
  // the thing it must not do.
  it('forbids inventing experience where a prompt could produce it', () => {
    // The prohibition is spelled differently in each prompt because each one
    // is written, not templated — what every one of them has to carry is an
    // explicit refusal to add something the person did not give it.
    const refusal = /\b(do not (invent|guess|add)|may not invent|without adding anything|only what (is in|I told you|the résumé)|built only from)\b/i
    for (const p of PROMPTS) expect(p.prompt, p.id).toMatch(refusal)
  })

  // Every field name a prompt mentions has to exist, or the answer arrives
  // with that part of the résumé dropped on import.
  it('never names a field the schema does not have', () => {
    const known = new Set<string>(['meta', 'meta.cvaurum'])
    for (const line of documentShape()) {
      const base = line.path.replace(/\[\]/g, '')
      known.add(base)
      for (const f of line.fields) {
        known.add(f)
        known.add(`${base}.${f}`)
      }
    }
    // Every dotted or bracketed word in a prompt that LOOKS like a field path.
    for (const p of PROMPTS) {
      const mentioned = [...p.prompt.matchAll(/\b([a-z]+(?:\[\])?(?:\.[a-zA-Z]+)+)\b/g)]
        .map((m) => m[1].replace(/\[\]/g, ''))
        // 'jsonresume.org' and the like are addresses, not paths.
        .filter((s) => !/^(www|https?|jsonresume|cvaurum)\b/.test(s) && !/\.(org|com|md|json|txt)$/.test(s))
      for (const path of mentioned) expect(known.has(path), `${p.id}: ${path}`).toBe(true)
    }
  })

  it('gives the page a head, a crawler block and a Markdown twin that agree', () => {
    const meta = promptsPageMeta()
    expect(meta.path).toBe('/prompts')
    expect(meta.description.length).toBeLessThanOrEqual(DESC_MAX)
    expect(meta.image.endsWith('.webp')).toBe(false)

    const html = promptsStaticHtml()
    const md = promptsMarkdown()
    expect(html).toContain(`<h1>${PROMPTS.length} résumé prompts for an AI assistant</h1>`)
    expect(html).toContain(htmlEscape(PROMPTS_INTRO))
    expect(md.startsWith(`# ${PROMPTS.length} résumé prompts`)).toBe(true)
    for (const p of PROMPTS) {
      // The prompt itself is the page's content: a crawler and an assistant
      // both get the whole text, not a title and a button.
      expect(html, p.id).toContain(`id="${p.id}"`)
      expect(html, p.id).toContain(htmlEscape(p.prompt))
      expect(md, p.id).toContain(p.prompt)
      expect(md, p.id).toContain(`## ${p.title}`)
    }
    expect(html).not.toMatch(/<script/i)
  })

  /**
   * The page leads with ONE line. It used to lead with four sentences, a
   * three-step strip and a paragraph about the schema, which on a 375x812
   * phone put the first thing a reader could press 536px down the page.
   * The line is short enough to be the head's description whole, so the
   * sentence a person reads first and the sentence a search result shows are
   * the same sentence rather than one being a truncation of the other.
   */
  it('leads with one line, short enough to be the description uncut', () => {
    expect(PROMPTS_INTRO.length).toBeLessThanOrEqual(DESC_MAX)
    expect(promptsPageMeta().description).toBe(PROMPTS_INTRO)
    expect(PROMPTS_INTRO).not.toContain('…')
    // The loop, in the order it is walked: copy, paste it there, paste it back.
    expect(PROMPTS_INTRO).toMatch(/copy.+paste.+paste/i)
  })

  // The schema is a footnote, not the opening. One sentence, in both twins,
  // pointing at the generated field list rather than spelling fields out.
  it('says the format once, at the foot, in both twins', () => {
    expect(PROMPTS_SCHEMA_NOTE.split('. ').length).toBeLessThanOrEqual(2)
    expect(promptsStaticHtml()).toContain(htmlEscape(PROMPTS_SCHEMA_NOTE))
    expect(promptsMarkdown()).toContain(PROMPTS_SCHEMA_NOTE)
    expect(promptsMarkdown()).toContain(SCHEMA_DOC)
  })

  // The page is a list of six titles you open one at a time; the crawler's
  // block and the Markdown twin carry that list too, or the shape a person
  // navigates and the shape a machine reads stop being the same page.
  it('indexes the six titles before the six prompts', () => {
    const html = promptsStaticHtml()
    const md = promptsMarkdown()
    PROMPTS.forEach((p, i) => {
      expect(html, p.id).toContain(`<li><a href="#${p.id}">${htmlEscape(p.title)}</a></li>`)
      expect(md, p.id).toContain(`${i + 1}. ${p.title}`)
      // The index comes first, so a reader meets the titles before the walls
      // of prompt text - which is the whole point of the change.
      expect(html.indexOf(`href="#${p.id}"`), p.id).toBeLessThan(html.indexOf(`<section id="${p.id}"`))
    })
  })

  it('is listed among the pages and in the sitemap a machine reader is given', () => {
    const t = llmsTxt()
    expect(t).toContain('https://cvaurum.com/prompts')
    expect(siteUrls()).toContain('https://cvaurum.com/prompts')
    expect(sitemapXml('2026-09-08')).toContain('<loc>https://cvaurum.com/prompts</loc>')
  })
})

/**
 * The hubs used to be the weak link in the markup: every design page declared
 * a crumb trail and a picture while the page that lists all 68 declared
 * nothing at all, and the prompt library declared nothing either. A collection
 * page that says nothing about itself is 68 unrelated documents to a results
 * page.
 */
describe('the collection pages describe themselves', () => {
  const graphOf = (json: string) => JSON.parse(json)['@graph'] as Record<string, unknown>[]
  const node = (json: string, type: string) => graphOf(json).find((n) => n['@type'] === type) as Record<string, any>

  it('says what the gallery is, where it sits and what is on it', () => {
    const page = node(galleryJsonLd(), 'CollectionPage')
    expect(page.url).toBe('https://cvaurum.com/templates')
    expect(page.name).toBe(`${TEMPLATES.length} résumé templates`)
    expect(page.description.length).toBeLessThanOrEqual(DESC_MAX)

    const crumbs = node(galleryJsonLd(), 'BreadcrumbList').itemListElement
    expect(crumbs.map((c: { item: string }) => c.item)).toEqual([
      'https://cvaurum.com/',
      'https://cvaurum.com/templates',
    ])
    expect(crumbs.map((c: { position: number }) => c.position)).toEqual([1, 2])

    const list = node(galleryJsonLd(), 'ItemList')
    expect(list.numberOfItems).toBe(TEMPLATES.length)
    expect(list.itemListElement).toHaveLength(TEMPLATES.length)
    // Each entry names the design's own page picture, not the share card, so
    // the collection is described with the pictures the page carries.
    expect(list.itemListElement.map((i: { url: string }) => i.url)).toEqual(
      allTemplateIds().map((id) => `https://cvaurum.com/templates/${id}`)
    )
    expect(list.itemListElement.map((i: { image: string }) => i.image)).toEqual(
      allTemplateIds().map((id) => `https://cvaurum.com${templatePageImage(id)}`)
    )
  })

  it('says the same for the prompt library, without claiming a picture it has none of', () => {
    const page = node(promptsJsonLd(), 'CollectionPage')
    expect(page.url).toBe('https://cvaurum.com/prompts')
    expect(page.description.length).toBeLessThanOrEqual(DESC_MAX)
    expect(promptsJsonLd()).not.toContain('primaryImageOfPage')
    expect(promptsJsonLd()).not.toContain('.jpg')

    expect(node(promptsJsonLd(), 'BreadcrumbList').itemListElement.map((c: { item: string }) => c.item)).toEqual([
      'https://cvaurum.com/',
      'https://cvaurum.com/prompts',
    ])
    const list = node(promptsJsonLd(), 'ItemList')
    expect(list.numberOfItems).toBe(PROMPTS.length)
    // Each prompt is addressable on the page it lives on.
    expect(list.itemListElement.map((i: { url: string }) => i.url)).toEqual(
      PROMPTS.map((p) => `https://cvaurum.com/prompts#${p.id}`)
    )
  })

  it('is valid JSON on both, with the context declared once', () => {
    for (const json of [galleryJsonLd(), promptsJsonLd()]) {
      const parsed = JSON.parse(json)
      expect(parsed['@context']).toBe('https://schema.org')
      expect(Array.isArray(parsed['@graph'])).toBe(true)
      // One <script> carries the lot, so the context belongs to the document,
      // not to each node in it.
      expect(json.match(/@context/g)).toHaveLength(1)
    }
  })
})

/**
 * A crawler that runs no JavaScript walks <a href> and nothing else. Every
 * public page has to be reachable that way, and the collections have to reach
 * each other — /examples and its 108 pages were once only reachable from the
 * landing page by way of /prompts.
 */
describe('the crawl path without JavaScript', () => {
  const links = (html: string) => new Set([...html.matchAll(/<a\s+href="([^"]+)"/g)].map((m) => m[1]))

  it('reaches every collection from the landing page in one hop', () => {
    const l = links(landingStaticHtml())
    for (const hub of ['/templates', '/examples', '/prompts', '/app']) expect(l.has(hub), hub).toBe(true)
  })

  it('reaches every design from the gallery in one hop', () => {
    const l = links(galleryStaticHtml())
    for (const id of allTemplateIds()) expect(l.has(`/templates/${id}`), id).toBe(true)
  })

  it('links the gallery sideways to the other collections', () => {
    const l = links(galleryStaticHtml())
    expect(l.has('/')).toBe(true)
    expect(l.has('/examples')).toBe(true)
    expect(l.has('/prompts')).toBe(true)
  })

  it('links every design page up, sideways and across', () => {
    for (const id of allTemplateIds().slice(0, 5)) {
      const l = links(staticHtml(id))
      expect(l.has('/templates'), id).toBe(true)
      expect(l.has('/examples'), id).toBe(true)
      // …and to every other design, which is what makes 68 pages one set.
      expect(templateLinks(staticHtml(id)), id).toHaveLength(TEMPLATES.length - 1)
    }
  })

  it('links the prompt library back to the pages it sends people to', () => {
    const l = links(promptsStaticHtml())
    for (const hub of ['/', '/app', '/templates', '/examples']) expect(l.has(hub), hub).toBe(true)
  })
})

describe('the one list of public URLs', () => {
  it('is the sitemap order, as paths and as absolute URLs', () => {
    const paths = publicUrlPaths()
    expect(paths[0]).toBe('/')
    expect(paths[1]).toBe('/templates')
    expect(paths[paths.length - 1]).toBe('/prompts')
    expect(paths).toHaveLength(TEMPLATES.length + orderedSampleSlugs().length + 4)
    expect(publicUrls()).toEqual(paths.map((p) => `https://cvaurum.com${p}`))
  })

  it('holds no duplicate and no private route', () => {
    const paths = publicUrlPaths()
    expect(new Set(paths).size).toBe(paths.length)
    for (const p of paths) expect(/^\/(app|tracker|resume|print|r)\b/.test(p), p).toBe(false)
  })
})
