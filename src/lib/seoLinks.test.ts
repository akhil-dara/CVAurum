import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { LIBRARY } from '@/data/library'
import { EXAMPLES_BY_TEMPLATE } from '@/data/library/byTemplate'
import { TEMPLATES, templatePath } from '@/templates/registry'
import { htmlEscape } from '@/lib/utils'
import { ALL_GUIDES_LINK, TOOL_PATHS, sampleEditLabel, templateUseLabel } from '@/data/pageLinks'
import {
  allTemplateIds,
  breadcrumbJsonLd,
  examplesJsonLd,
  examplesStaticHtml,
  galleryJsonLd,
  galleryStaticHtml,
  lastmodEntry,
  orderedSampleSlugs,
  promptsStaticHtml,
  sampleBreadcrumbJsonLd,
  sampleMarkdown,
  samplePageMeta,
  sampleStaticHtml,
  staticHtml,
  templateMarkdown,
  templatePageMeta,
} from './seoPages'

/**
 * How the public pages link each other (SEO audit, 2026-11-09): the three
 * tool pages were linked from 13 of 200 pages, /guides from the home page
 * and the guides only, and the two buttons every design and example page
 * carries said "Start a resume in this design" and "Use this example" -
 * 183 anchors that named nothing.
 */
const links = (html: string) => [...html.matchAll(/<a\s+href="([^"]+)"/g)].map((m) => m[1])
const anchors = (html: string) => [...html.matchAll(/<a\s+href="([^"]+)">([^<]*)<\/a>/g)].map((m) => [m[1], m[2]])
const SRC = (file: string) =>
  fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', file), 'utf8')
const graphOf = (json: string) => JSON.parse(json)['@graph'] as Record<string, any>[]

describe('the tool pages and the guides hub', () => {
  it('are linked from every design page and every example page, in the HTML and the Markdown twin', () => {
    expect(TOOL_PATHS).toEqual(['/free-resume-builder', '/resume-builder-no-sign-up', '/ats-resume-checker'])
    for (const id of allTemplateIds()) {
      const l = links(staticHtml(id))
      for (const p of [...TOOL_PATHS, ALL_GUIDES_LINK.href]) expect(l, `${id} ${p}`).toContain(p)
      for (const p of [...TOOL_PATHS, ALL_GUIDES_LINK.href]) expect(templateMarkdown(id), `${id} ${p}`).toContain(`https://cvaurum.com${p})`)
    }
    for (const slug of orderedSampleSlugs()) {
      const l = links(sampleStaticHtml(slug))
      for (const p of [...TOOL_PATHS, ALL_GUIDES_LINK.href]) expect(l, `${slug} ${p}`).toContain(p)
      for (const p of [...TOOL_PATHS, ALL_GUIDES_LINK.href]) expect(sampleMarkdown(slug), `${slug} ${p}`).toContain(`https://cvaurum.com${p})`)
    }
  })

  it('name the keyword in the anchor', () => {
    const a = anchors(staticHtml(allTemplateIds()[0]))
    expect(a).toContainEqual(['/ats-resume-checker', 'Check it with the free ATS resume checker'])
    expect(a.find(([h]) => h === '/free-resume-builder')![1]).toMatch(/free resume builder/)
    expect(a.find(([h]) => h === '/resume-builder-no-sign-up')![1]).toMatch(/resume builder with no sign-up/)
    expect(a).toContainEqual(['/guides', 'All guides'])
  })

  it('has /guides linked from the gallery, the prompts and the example library', () => {
    for (const html of [galleryStaticHtml(), promptsStaticHtml(), examplesStaticHtml()]) expect(links(html)).toContain('/guides')
  })

  it('is linked the same way by the live pages', () => {
    for (const file of ['routes/TemplatePage.tsx', 'routes/ExamplePage.tsx']) expect(SRC(file), file).toMatch(/writeYours(Template|Sample)Links/)
    for (const file of ['routes/Templates.tsx', 'routes/Examples.tsx', 'routes/Prompts.tsx']) expect(SRC(file), file).toContain('ALL_GUIDES_LINK')
  })
})

describe('the button on a design or an example page', () => {
  it('names the design', () => {
    for (const t of TEMPLATES) {
      const html = staticHtml(t.id)
      expect(anchors(html), t.id).toContainEqual(['/app', htmlEscape(`Use the ${t.name} resume template`)])
      expect(html).not.toContain('Start a resume in this design')
    }
    expect(templateUseLabel('Classic')).toBe('Use the Classic resume template')
    expect(SRC('routes/TemplatePage.tsx')).toContain('templateUseLabel(tpl.name)')
    expect(SRC('routes/TemplatePage.tsx')).not.toContain('Use this template')
  })

  it('names the job, as a CV for a UK sample', () => {
    for (const s of LIBRARY) {
      const label = `Edit this ${s.role} ${s.region === 'uk' ? 'CV' : 'resume'}`
      expect(sampleEditLabel(s)).toBe(label)
      expect(anchors(sampleStaticHtml(s.slug)), s.slug).toContainEqual(['/app', htmlEscape(label)])
      expect(sampleStaticHtml(s.slug)).not.toContain('Use this example')
    }
    expect(SRC('routes/ExamplePage.tsx')).toContain('sampleEditLabel(sample)')
    expect(SRC('routes/ExamplePage.tsx')).not.toContain('Use this example')
  })
})

describe('the examples set in a design', () => {
  it('are listed on its page when there are any, and only then', () => {
    for (const id of allTemplateIds()) {
      const shown = EXAMPLES_BY_TEMPLATE[id] ?? []
      const html = staticHtml(id)
      const md = templateMarkdown(id)
      for (const s of shown) {
        expect(links(html), id).toContain(`/examples/${s.slug}`)
        expect(md, id).toContain(`(https://cvaurum.com/examples/${s.slug})`)
      }
      const heading = `Resume examples set in the ${TEMPLATES.find((t) => t.id === id)!.name} design`
      expect(html.includes(heading), id).toBe(shown.length > 0)
      expect(md.includes(heading), id).toBe(shown.length > 0)
    }
    expect(SRC('routes/TemplatePage.tsx')).toContain('EXAMPLES_BY_TEMPLATE')
    expect(SRC('routes/TemplatePage.tsx')).toContain('Resume examples set in the {tpl.name} design')
  })
})

describe('the structured data of a design or an example page', () => {
  it('says which site the page is part of and what it is', () => {
    for (const id of allTemplateIds()) {
      const page = graphOf(breadcrumbJsonLd(id)).find((n) => n['@type'] === 'WebPage')!
      expect(page.isPartOf, id).toEqual({ '@id': 'https://cvaurum.com/#website' })
      expect(page.description, id).toBe(templatePageMeta(id).description)
    }
    for (const slug of orderedSampleSlugs()) {
      const page = graphOf(sampleBreadcrumbJsonLd(slug)).find((n) => n['@type'] === 'WebPage')!
      expect(page.isPartOf, slug).toEqual({ '@id': 'https://cvaurum.com/#website' })
      expect(page.description, slug).toBe(samplePageMeta(slug).description)
    }
  })

  it('dates each collection by the newest page in it', () => {
    const newest = (paths: string[]) => paths.map((p) => lastmodEntry(p)!.lastmod).sort().pop()
    const designs = TEMPLATES.map((t) => templatePath(t))
    const samples = orderedSampleSlugs().map((s) => `/examples/${s}`)
    const collection = (json: string) => graphOf(json).find((n) => n['@type'] === 'CollectionPage')!
    expect(collection(galleryJsonLd()).dateModified).toBe(newest(['/templates', ...designs]))
    expect(collection(examplesJsonLd()).dateModified).toBe(newest(['/examples', ...samples]))
  })
})
