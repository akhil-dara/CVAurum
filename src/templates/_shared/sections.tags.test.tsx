import { describe, it, expect, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { createDocument, defaultMetadata } from '@/data/defaults'
import { getTemplate } from '@/templates/registry'
import { MetadataSchema } from '@/types/metadata'
import { HAS_KEYWORDS, paintStyle, sectionOverrideClasses } from './sectionClasses'

// The sanitizer wraps a DOM purifier that needs a window, and this suite runs
// under the plain node environment. Nothing rendered here is rich text, so
// handing the string back is what the real sanitizer would do with it.
vi.mock('@/lib/sanitize', () => ({ sanitizeHtml: (html: string) => html }))

import { SectionBody } from './sections'

/**
 * A project's tech tags could be shown or hidden and nothing else: the two
 * pickers that restyle the skills chips were gated to the skills section, so
 * the tags had no style at all (reported 2026-09-06). "Tags as" and "Tag
 * size" now belong to every section whose entries carry keywords, and the
 * chosen look travels as a class on the tag container - the page, and with it
 * the export that paints computed styles.
 */
const docWithTags = (settings: Record<string, unknown> = {}) => {
  const doc = createDocument({ sample: true })
  doc.content.projects = [
    {
      id: 'p1',
      name: 'Ledger',
      description: 'A thing',
      startDate: '2020-01',
      endDate: '2021-01',
      highlights: [],
      keywords: ['TypeScript', 'Postgres'],
    },
  ] as unknown as typeof doc.content.projects
  doc.metadata.layout.sectionSettings = { projects: settings }
  return doc
}

const render = (settings: Record<string, unknown> = {}, edit?: () => void) =>
  renderToStaticMarkup(
    <SectionBody sectionKey="projects" doc={docWithTags(settings)} config={getTemplate('aurum')} edit={edit} />
  )

describe('a project tag list wears the style the section picked', () => {
  it('a section that picked nothing keeps the chips the template draws', () => {
    const html = render()
    expect(html).toContain('class="rm-chips"')
    expect(html).not.toContain('rm-tags-')
    expect(html).toContain('TypeScript')
  })

  it('pills and tags stay a chip list, marked with the style the section chose', () => {
    expect(render({ tagStyle: 'chips' })).toContain('class="rm-chips rm-tags-chips"')
    expect(render({ tagStyle: 'tags' })).toContain('class="rm-chips rm-tags-tags"')
  })

  it('inline runs the tags together as text, with the separator the inline skills use', () => {
    const html = render({ tagStyle: 'inline' })
    expect(html).toContain('rm-skill-inline rm-tags-inline')
    expect(html).not.toContain('rm-chips')
    // The same running text the Word file already prints, so nothing reading
    // the page as words sees a different list from the file.
    expect(html.replace(/<[^>]*>/g, '')).toContain('TypeScript · Postgres')
  })

  it('the canvas shows the chosen style while the tags are edited', () => {
    // The editing surface must not disagree with its own output: an inline
    // list that looks like pills only while being edited is the trap the
    // skills chips were fixed for.
    expect(render({ tagStyle: 'inline' }, () => {})).toContain('rm-skill-inline rm-inline-edit rm-tags-inline')
    expect(render({ tagStyle: 'tags' }, () => {})).toContain('rm-chips rm-chips-edit rm-tags-tags')
  })

  it('the style rides on the tag container, not on the section element', () => {
    expect(sectionOverrideClasses({ tagStyle: 'tags' })).toEqual([])
  })
})

describe('the tag size is the pill size, and it reaches the tags', () => {
  it('the size still lands on the section element, where the pill vars live', () => {
    expect(sectionOverrideClasses({ tagStyle: 'tags', chipSize: 's' })).toEqual(['chip-s'])
  })

  const here = path.dirname(fileURLToPath(import.meta.url))
  const css = fs.readFileSync(path.join(here, '../../styles/artboard.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const rules: { selector: string; body: string }[] = []
  const re = /([^{}]+)\{([^{}]*)\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(css))) rules.push({ selector: m[1].trim().replace(/\s+/g, ' '), body: m[2] })
  const tagRules = rules.filter((r) => r.selector.includes('rm-tags-'))

  it('the audit sees the three tag looks', () => {
    for (const look of ['rm-tags-chips', 'rm-tags-tags', 'rm-tags-inline'])
      expect(tagRules.some((r) => r.selector.includes(look))).toBe(true)
  })

  it('no tag look fixes a size of its own - the pill-size vars stay in charge', () => {
    for (const r of tagRules) {
      if (/(?:^|;|\s)font-size\s*:/.test(r.body)) expect(r.body, r.selector).toMatch(/--rm-chip-fs/)
      if (/(?:^|;|\s)padding/.test(r.body)) expect(r.body, r.selector).toMatch(/--rm-chip-pad/)
    }
  })

  it('the inline run is sized too, so every look answers the size picker', () => {
    // Inline draws no pill, so a rule that only sized pills would have left
    // "Tag size" doing nothing in one of the three looks.
    const inline = tagRules.filter((r) => r.selector.includes('rm-tags-inline'))
    expect(inline.length).toBeGreaterThan(0)
    expect(inline.map((r) => r.body).join(';')).toMatch(/--rm-chip-fs/)
  })
})

describe('the style painter keeps the tag look to the sections that have tags', () => {
  const withStyle = (key: string, copied: Record<string, string>) => {
    const m = defaultMetadata()
    paintStyle(m, key, copied)
    return m.layout.sectionSettings[key]
  }

  it('a section whose entries carry no keywords stores no tag style', () => {
    for (const key of ['work', 'education', 'skills', 'certificates', 'custom-1a2b']) {
      expect(withStyle(key, { tagStyle: 'tags', headingStyle: 'bar' })).toEqual({ headingStyle: 'bar' })
    }
  })

  it('the sections that do carry keywords take it', () => {
    for (const key of HAS_KEYWORDS) expect(withStyle(key, { tagStyle: 'inline' })).toEqual({ tagStyle: 'inline' })
  })
})

describe('the tag style is an addition, so older files still open', () => {
  it('a document that never named a tag style parses untouched', () => {
    const m = MetadataSchema.parse({ layout: { sectionSettings: { projects: { showKeywords: true } } } })
    expect(m.layout.sectionSettings.projects).toEqual({ showKeywords: true })
  })

  it('each of the three looks parses', () => {
    for (const tagStyle of ['chips', 'tags', 'inline']) {
      const m = MetadataSchema.parse({ layout: { sectionSettings: { projects: { tagStyle } } } })
      expect(m.layout.sectionSettings.projects.tagStyle).toBe(tagStyle)
    }
  })
})
