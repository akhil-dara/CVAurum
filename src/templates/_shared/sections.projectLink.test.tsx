import { describe, it, expect, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { createDocument, defaultMetadata } from '@/data/defaults'
import { getTemplate } from '@/templates/registry'
import { MetadataSchema } from '@/types/metadata'
import { HAS_LINK, STYLE_FIELDS, linkStyleOf, paintStyle } from './sectionClasses'

// The sanitizer wraps a DOM purifier that needs a window, and this suite runs
// under the plain node environment. Nothing rendered here is rich text, so
// handing the string back is what the real sanitizer would do with it.
vi.mock('@/lib/sanitize', () => ({ sanitizeHtml: (html: string) => html }))

import { SectionBody } from './sections'

/**
 * A project's visible URL line had no control at all (reported 2026-09-07):
 * the document's links.style governs NAMED links and header contacts, and the
 * address under a project title was drawn one way whatever the author wanted.
 * The section now chooses: auto follows the document, tag wears the same tag a
 * named link wears, plain is ordinary text, and none does not print - in the
 * Word file and the ATS text as well, because those read the document.
 */
const docWithLink = (settings: Record<string, unknown> = {}, links?: Record<string, unknown>) => {
  const doc = createDocument({ sample: true })
  doc.content.projects = [
    {
      id: 'p1',
      name: 'Ledger',
      description: 'A thing',
      url: 'https://github.com/example/ledger',
      highlights: [],
      keywords: [],
    },
  ] as unknown as typeof doc.content.projects
  doc.metadata.layout.sectionSettings = { projects: settings }
  if (links) doc.metadata.links = { ...doc.metadata.links, ...links }
  return doc
}

const render = (settings: Record<string, unknown> = {}, links?: Record<string, unknown>) =>
  renderToStaticMarkup(
    <SectionBody sectionKey="projects" doc={docWithLink(settings, links)} config={getTemplate('aurum')} />
  )

describe('the project link line wears the style its own section picked', () => {
  it('a section that picked nothing prints the line exactly as it always did', () => {
    const html = render()
    expect(html).toContain('class="rm-item-link"')
    expect(html).toContain('rm-named-link rm-tag-link')
    expect(html).not.toContain('rm-link-')
    expect(html).toContain('github.com/example/ledger')
  })

  it('tag marks the line, so the tag rules reach it whatever the document says', () => {
    // Even with the document set to plain links: the section asked for a tag.
    const html = render({ linkStyle: 'tag' }, { style: 'plain' })
    expect(html).toContain('class="rm-item-link rm-link-tag"')
    expect(html).toContain('github.com/example/ledger')
  })

  it('plain marks the line, so the tag rules are cancelled on it', () => {
    const html = render({ linkStyle: 'plain' })
    expect(html).toContain('class="rm-item-link rm-link-plain"')
    expect(html).toContain('github.com/example/ledger')
  })

  it('none prints no line at all', () => {
    const html = render({ linkStyle: 'none' })
    expect(html).not.toContain('rm-item-link')
    // No words either: the address is what the line printed.
    expect(html.replace(/<[^>]*>/g, '')).not.toContain('github.com')
  })

  it('none still leaves the address on the title, so it can be changed back', () => {
    // The address itself is not deleted - only its line. The title keeps the
    // link, which is where a project link is set, so turning the line off is
    // never a one-way door.
    expect(render({ linkStyle: 'none' })).toContain('https://github.com/example/ledger')
  })

  it('auto written out reads as the unset default', () => {
    expect(linkStyleOf(undefined)).toBe('auto')
    expect(linkStyleOf({})).toBe('auto')
    expect(linkStyleOf({ linkStyle: 'auto' })).toBe('auto')
    expect(linkStyleOf({ linkStyle: 'none' })).toBe('none')
    expect(render({ linkStyle: 'auto' })).toContain('class="rm-item-link"')
  })
})

describe('the tag look is the one the document already draws, not a second one', () => {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const css = fs.readFileSync(path.join(here, '../../styles/artboard.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const rules: { selector: string; body: string }[] = []
  const re = /([^{}]+)\{([^{}]*)\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(css))) rules.push({ selector: m[1].trim().replace(/\s+/g, ' '), body: m[2] })

  it('every rule the section tag reads is a rule the document tag already read', () => {
    const tagged = rules.filter((r) => r.selector.includes('rm-link-tag'))
    expect(tagged.length).toBeGreaterThan(0)
    for (const r of tagged) expect(r.selector, r.selector).toContain('links-tag')
  })

  it('the paper and the accent bar both reach the section tag', () => {
    const box = rules.find((r) => r.selector.includes('.links-tag .rm-tag-link') && !r.selector.includes('::before'))
    expect(box?.selector).toContain('rm-link-tag')
    expect(box?.body).toContain('inline-block')
    const bar = rules.find((r) => r.selector.includes('.links-tag .rm-tag-link::before'))
    expect(bar?.selector).toContain('rm-link-tag')
  })

  it('plain takes the box, the bar and the link colour off the line', () => {
    const plain = rules.filter((r) => r.selector.includes('rm-link-plain'))
    expect(plain.length).toBeGreaterThan(0)
    expect(plain.map((r) => r.body).join(';')).toContain('content: none')
    // Ordinary text is the colour of the words around it, and the link-colour
    // audit (elementColors.test.ts) allows exactly that word.
    expect(plain.map((r) => r.body).join(';')).toMatch(/color:\s*inherit/)
  })
})

describe('the style painter keeps the link style to the sections that have a link', () => {
  const withStyle = (key: string, copied: Record<string, string>) => {
    const m = defaultMetadata()
    paintStyle(m, key, copied)
    return m.layout.sectionSettings[key]
  }

  it('the painter carries both of the entry-decoration fields', () => {
    expect(STYLE_FIELDS).toContain('tagStyle')
    expect(STYLE_FIELDS).toContain('linkStyle')
  })

  it('a section with neither keywords nor a link stores neither field', () => {
    for (const key of ['work', 'education', 'skills', 'certificates', 'custom-1a2b']) {
      expect(withStyle(key, { tagStyle: 'tags', linkStyle: 'plain', headingStyle: 'bar' })).toEqual({
        headingStyle: 'bar',
      })
    }
  })

  it('the sections that do print a link take it', () => {
    for (const key of HAS_LINK) expect(withStyle(key, { linkStyle: 'tag' })).toEqual({ linkStyle: 'tag' })
  })
})

describe('the link style is an addition, so older files still open', () => {
  it('a document that never named one parses untouched', () => {
    const m = MetadataSchema.parse({ layout: { sectionSettings: { projects: { showKeywords: true } } } })
    expect(m.layout.sectionSettings.projects).toEqual({ showKeywords: true })
  })

  it('each of the four choices parses', () => {
    for (const linkStyle of ['auto', 'tag', 'plain', 'none']) {
      const m = MetadataSchema.parse({ layout: { sectionSettings: { projects: { linkStyle } } } })
      expect(m.layout.sectionSettings.projects.linkStyle).toBe(linkStyle)
    }
  })
})
