import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { LIBRARY } from '@/data/library'
import { REGION_LABELS, SENIORITY_LABELS } from '@/data/library/types'
import { PAGE_IMAGE_HEIGHT, PAGE_IMAGE_WIDTH } from '@/data/pageImages'
import { TEMPLATE_MAP } from '@/templates/registry'
import {
  examplesItemListJsonLd,
  examplesPageMeta,
  examplesStaticHtml,
  orderedSampleSlugs,
  sampleBreadcrumbJsonLd,
  sampleImageAlt,
  sampleMarkdown,
  samplePageImage,
  samplePageImageHeight,
  samplePageMeta,
  sampleShareCard,
  sampleStaticHtml,
} from '@/lib/seoLibrary'

const SLUGS = orderedSampleSlugs()
const PUBLIC = fileURLToPath(new URL('../../public/', import.meta.url))

/** Every <img …> in a block of HTML, as its raw tag. */
const imgTags = (html: string) => [...html.matchAll(/<img\s[^>]*>/g)].map((m) => m[0])
const attr = (tag: string, name: string) => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1]

/** The basenames of one published folder, without their extension. */
function published(dir: string, ext: string): Set<string> {
  const here = path.join(PUBLIC, dir)
  const files = fs.readdirSync(here).filter((f) => f.endsWith(ext))
  return new Set(files.map((f) => f.slice(0, -ext.length)))
}

describe('the picture an example page points at', () => {
  it('gives every sample its own share card, not the design it happens to use', () => {
    for (const slug of SLUGS) expect(samplePageMeta(slug).image, slug).toBe(`/og/examples/${slug}.jpg`)
    const images = SLUGS.map((slug) => samplePageMeta(slug).image)
    // 108 pages used to advertise 58 pictures of somebody else's résumé.
    expect(new Set(images).size).toBe(SLUGS.length)
  })

  it('never offers a WebP as the link preview', () => {
    // The link-preview readers document JPG/PNG/GIF between them and one
    // has been measured failing on WebP: og:image stays JPEG whatever the
    // page itself shows.
    for (const slug of SLUGS) expect(samplePageMeta(slug).image.endsWith('.webp'), slug).toBe(false)
    expect(examplesPageMeta().image.endsWith('.webp')).toBe(false)
  })

  it('gives the shelf itself a card about examples, not the site-wide one', () => {
    // /examples used to fall back to /og.png, a drawing made before the
    // example library existed: the card a link to the shelf showed said
    // nothing about examples and carried no count.
    const { image } = examplesPageMeta()
    expect(image).toBe('/og/examples.jpg')
    expect(fs.existsSync(path.join(PUBLIC, image.slice(1)))).toBe(true)
    expect(fs.statSync(path.join(PUBLIC, image.slice(1))).size / 1024).toBeLessThan(90)
  })

  it('shows the page itself, at the width it was rendered', () => {
    for (const slug of SLUGS) {
      expect(samplePageImage(slug), slug).toBe(`/img/examples/${slug}.webp`)
      expect(samplePageImageHeight(slug), slug).toBe(PAGE_IMAGE_HEIGHT[`examples/${slug}`])
      expect(samplePageImageHeight(slug), slug).toBeGreaterThan(PAGE_IMAGE_WIDTH)
    }
  })
})

/**
 * The test the site was missing. Nine template pages shipped an og:image that
 * was a 404 for months because nothing ever asked whether the file referenced
 * by a page exists — a set comparison, so a missing picture and an orphaned
 * one both fail.
 */
describe('the files those URLs name', () => {
  it('publishes one page image per sample, and no picture of anything else', () => {
    expect(published('img/examples', '.webp')).toEqual(new Set(SLUGS))
  })

  it('publishes one share card per sample, and no more', () => {
    expect(published('og/examples', '.jpg')).toEqual(new Set(SLUGS))
  })

  it('references nothing outside those two folders', () => {
    for (const slug of SLUGS) {
      expect(fs.existsSync(path.join(PUBLIC, samplePageImage(slug).slice(1))), slug).toBe(true)
      expect(fs.existsSync(path.join(PUBLIC, sampleShareCard(slug).slice(1))), slug).toBe(true)
    }
  })
})

describe('the alt text one helper writes for the whole library', () => {
  const slug = 'data-analyst'
  const sample = LIBRARY.find((s) => s.slug === slug)!

  it('describes the picture: the job, the career stage, the country, the design', () => {
    const alt = sampleImageAlt(slug)
    expect(alt).toContain(sample.role)
    expect(alt).toContain(SENIORITY_LABELS[sample.seniority].toLowerCase())
    expect(alt).toContain(REGION_LABELS[sample.region])
    expect(alt).toContain(TEMPLATE_MAP[sample.template]!.name)
  })

  it('never pastes the résumé’s own bullets into an alt', () => {
    for (const s of LIBRARY) {
      const alt = sampleImageAlt(s.slug)
      expect(alt.length, s.slug).toBeGreaterThan(20)
      expect(alt.length, s.slug).toBeLessThan(180)
      const bullet = s.content.work[0]?.highlights?.[0]
      if (bullet) expect(alt.includes(bullet), s.slug).toBe(false)
    }
  })
})

describe('the HTML a crawler reads for one example', () => {
  const slug = SLUGS[0]
  const html = sampleStaticHtml(slug)
  const img = imgTags(html)[0]

  it('carries a picture at all — an image in CSS or in og:image alone is never indexed', () => {
    expect(img).toBeTruthy()
    expect(attr(img, 'src')).toBe(samplePageImage(slug))
  })

  it('reserves the box it will fill, so nothing under it jumps', () => {
    expect(attr(img, 'width')).toBe(String(PAGE_IMAGE_WIDTH))
    expect(attr(img, 'height')).toBe(String(samplePageImageHeight(slug)))
  })

  it('describes it, and loads it at once — it is the page’s hero', () => {
    expect(attr(img, 'alt')).toBe(sampleImageAlt(slug))
    expect(attr(img, 'alt')!.length).toBeGreaterThan(20)
    expect(attr(img, 'loading')).toBe('eager')
    expect(attr(img, 'decoding')).toBe('async')
  })

  it('sits high on the page, beside the heading it belongs to', () => {
    // Google asks for a picture near the text that explains it; here that is
    // the h1, and the whole résumé follows below.
    expect(html.indexOf('<img')).toBeGreaterThan(html.indexOf('<h1>'))
    expect(html.indexOf('<img')).toBeLessThan(html.indexOf('<article>'))
    expect(html).toContain('<figcaption>')
  })

  it('gives every sample the same treatment, with its own file', () => {
    const srcs = SLUGS.map((s) => attr(imgTags(sampleStaticHtml(s))[0], 'src'))
    expect(new Set(srcs).size).toBe(SLUGS.length)
    for (const s of SLUGS) {
      const tag = imgTags(sampleStaticHtml(s))[0]
      expect(attr(tag, 'alt'), s).toBeTruthy()
      expect(attr(tag, 'width'), s).toBe(String(PAGE_IMAGE_WIDTH))
      expect(attr(tag, 'height'), s).toBe(String(samplePageImageHeight(s)))
    }
  })
})

describe('the shelf a crawler reads for the whole library', () => {
  const html = examplesStaticHtml()
  const tags = imgTags(html)

  it('shows every sample, once', () => {
    expect(tags).toHaveLength(SLUGS.length)
    expect(new Set(tags.map((t) => attr(t, 'src')))).toEqual(new Set(SLUGS.map(samplePageImage)))
  })

  it('loads them lazily — 108 eager résumés on one page would be a disaster', () => {
    for (const t of tags) expect(attr(t, 'loading')).toBe('lazy')
  })

  it('still gives each one its dimensions and a real alt', () => {
    for (const t of tags) {
      expect(attr(t, 'width')).toBe(String(PAGE_IMAGE_WIDTH))
      expect(Number(attr(t, 'height'))).toBeGreaterThan(0)
      expect(attr(t, 'alt')!.length).toBeGreaterThan(20)
    }
  })

  it('keeps the links it always had', () => {
    for (const slug of SLUGS) expect(html).toContain(`href="/examples/${slug}"`)
  })
})

describe('the structured data an example page carries', () => {
  const slug = 'data-analyst'
  const data = JSON.parse(sampleBreadcrumbJsonLd(slug))
  const node = (type: string) => data['@graph'].find((n: { '@type': string }) => n['@type'] === type)

  it('still walks home › examples › this example', () => {
    expect(node('BreadcrumbList').itemListElement.map((i: { item: string }) => i.item)).toEqual([
      'https://cvaurum.com/',
      'https://cvaurum.com/examples',
      `https://cvaurum.com/examples/${slug}`,
    ])
  })

  it('names which of the page’s pictures is the page’s own', () => {
    const image = node('WebPage').primaryImageOfPage
    expect(image['@type']).toBe('ImageObject')
    expect(image.contentUrl).toBe(`https://cvaurum.com${samplePageImage(slug)}`)
    expect(image.width).toBe(PAGE_IMAGE_WIDTH)
    expect(image.height).toBe(samplePageImageHeight(slug))
    expect(image.caption).toBe(sampleImageAlt(slug))
  })

  it('answers for every sample in the library', () => {
    for (const s of SLUGS) {
      const g = JSON.parse(sampleBreadcrumbJsonLd(s))['@graph']
      const page = g.find((n: { '@type': string }) => n['@type'] === 'WebPage')
      expect(page.primaryImageOfPage.contentUrl, s).toBe(`https://cvaurum.com${samplePageImage(s)}`)
    }
  })

  it('shows the collection with the same pictures the shelf shows', () => {
    const list = JSON.parse(examplesItemListJsonLd())
    expect(list.itemListElement.map((i: { image: string }) => i.image)).toEqual(
      SLUGS.map((s) => `https://cvaurum.com${samplePageImage(s)}`)
    )
  })
})

describe('the Markdown twin', () => {
  it('shows the same picture the page does, with the same words', () => {
    const slug = SLUGS[0]
    expect(sampleMarkdown(slug)).toContain(`![${sampleImageAlt(slug)}](https://cvaurum.com${samplePageImage(slug)})`)
  })
})
