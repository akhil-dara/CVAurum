import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createDocument } from '@/data/defaults'
import { getTemplate } from '@/templates/registry'

// The sanitizer wraps a DOM purifier that needs a window, and this suite runs
// under the plain node environment. Nothing rendered here is rich text, so
// handing the string back is what the real sanitizer would do with it.
vi.mock('@/lib/sanitize', () => ({ sanitizeHtml: (html: string) => html }))
// The rich-text atom keeps hyphenated compounds whole through a DOM template
// element; the markup passes through untouched here.
vi.mock('@/lib/pdf/hyphens', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/pdf/hyphens')>()),
  noBreakCompoundsHtml: (html: string) => html,
}))

import { SectionBody } from './sections'
import { TemplateRenderer } from '@/templates/TemplateRenderer'

/**
 * The meta column. An entry can hand its dates to a column of its own: a
 * GUTTER on the left, where a big decorative year stands over a short word
 * and the entry keeps its real date line; or a MARGIN on the right, where
 * the entry's own date moves out of the head row and prints once, in the
 * margin. Nothing decorative is ever the only copy of a fact.
 */
describe('meta column', () => {
  it('gutter: a decorative year per entry, the real date kept in the entry', () => {
    const doc = createDocument({ sample: true })
    doc.metadata.layout.metaColumn = 'gutter'
    const html = renderToStaticMarkup(<SectionBody sectionKey="work" doc={doc} config={getTemplate('aurum')} />)
    expect(html).toMatch(/rm-deco rm-year" data-deco="1">2021</)
    expect(html).toContain('to now')
    expect(html).toContain('Mar 2021')
  })

  it('gutter: a finished entry counts to its end year', () => {
    const doc = createDocument({ sample: true })
    doc.metadata.layout.metaColumn = 'gutter'
    const html = renderToStaticMarkup(<SectionBody sectionKey="work" doc={doc} config={getTemplate('aurum')} />)
    expect(html).toMatch(/rm-deco rm-year" data-deco="1">2018</)
    expect(html).toContain('to 2021')
  })

  it('gutter: a course says graduated and a project says project', () => {
    const doc = createDocument({ sample: true })
    doc.metadata.layout.metaColumn = 'gutter'
    const edu = renderToStaticMarkup(<SectionBody sectionKey="education" doc={doc} config={getTemplate('aurum')} />)
    expect(edu).toMatch(/rm-deco rm-year-sub" data-deco="1">graduated</)
    const projects = renderToStaticMarkup(<SectionBody sectionKey="projects" doc={doc} config={getTemplate('aurum')} />)
    expect(projects).toMatch(/rm-deco rm-year-sub" data-deco="1">project</)
  })

  it('gutter: the summary opens with the initials, as decoration', () => {
    const doc = createDocument({ sample: true })
    doc.metadata.layout.metaColumn = 'gutter'
    const html = renderToStaticMarkup(<SectionBody sectionKey="summary" doc={doc} config={getTemplate('aurum')} />)
    expect(html).toContain('rm-meta-cell')
    expect(html).toMatch(/rm-deco rm-initials" data-deco="1">AM</)
  })

  it('margin: the date leaves the sub-line for the margin cell, once', () => {
    const doc = createDocument({ sample: true })
    doc.metadata.layout.metaColumn = 'margin'
    const html = renderToStaticMarkup(<SectionBody sectionKey="work" doc={doc} config={getTemplate('aurum')} />)
    expect(html.match(/Mar 2021/g)?.length).toBe(1)
    expect(html).toContain('rm-meta-cell')
    // The margin's text is the entry's own date, so it stays a real,
    // readable string - never decoration.
    expect(html).not.toContain('data-deco')
    expect(html).not.toContain('rm-item-date')
  })

  it('margin: no decorative year is invented', () => {
    const doc = createDocument({ sample: true })
    doc.metadata.layout.metaColumn = 'margin'
    const html = renderToStaticMarkup(<SectionBody sectionKey="work" doc={doc} config={getTemplate('aurum')} />)
    expect(html).not.toContain('rm-year')
  })

  it('none: neither column, and the entry reads exactly as it always did', () => {
    const doc = createDocument({ sample: true })
    const html = renderToStaticMarkup(<SectionBody sectionKey="work" doc={doc} config={getTemplate('aurum')} />)
    expect(html).not.toContain('rm-meta-cell')
    expect(html).toContain('rm-item-date')
    expect(html).toContain('Mar 2021')
  })

  it('the footer strip keeps its rows plain, with no meta cell', () => {
    const doc = createDocument({ sample: true })
    doc.metadata.layout.metaColumn = 'gutter'
    const html = renderToStaticMarkup(
      <SectionBody sectionKey="work" doc={doc} config={getTemplate('aurum')} compact />
    )
    expect(html).not.toContain('rm-meta-cell')
  })

  // A sidebar is a column already. Building the cell there and hiding it in
  // CSS would have thrown the entry's ONLY date away under `margin`, so the
  // cell is simply never built and the head row keeps the date.
  it('a sidebar section builds no cell, so a margin date is never lost', () => {
    const doc = createDocument({ sample: true })
    doc.metadata.layout.metaColumn = 'margin'
    const html = renderToStaticMarkup(
      <SectionBody sectionKey="work" doc={doc} config={getTemplate('aurum')} noMeta />
    )
    expect(html).not.toContain('rm-meta-cell')
    expect(html).toContain('rm-item-date')
    expect(html).toContain('Mar 2021')
  })

  it('the page says which column it opened, and says nothing when it opened none', () => {
    const doc = createDocument({ sample: true })
    doc.metadata.layout.metaColumn = 'gutter'
    expect(renderToStaticMarkup(<TemplateRenderer doc={doc} mode="print" />)).toContain('meta-gutter')
    doc.metadata.layout.metaColumn = 'margin'
    expect(renderToStaticMarkup(<TemplateRenderer doc={doc} mode="print" />)).toContain('meta-margin')
    doc.metadata.layout.metaColumn = 'none'
    const plain = renderToStaticMarkup(<TemplateRenderer doc={doc} mode="print" />)
    expect(plain).not.toContain('meta-gutter')
    expect(plain).not.toContain('meta-margin')
  })
})
