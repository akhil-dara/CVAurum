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

  // The word is stored as the author would type it and set in capitals by
  // the stylesheet, so a finished course reads Graduated and the tile above
  // the project reads Project.
  it('gutter: a course says Graduated and a project says Project', () => {
    const doc = createDocument({ sample: true })
    doc.metadata.layout.metaColumn = 'gutter'
    const edu = renderToStaticMarkup(<SectionBody sectionKey="education" doc={doc} config={getTemplate('aurum')} />)
    expect(edu).toMatch(/rm-deco rm-year-sub" data-deco="1">Graduated</)
    const projects = renderToStaticMarkup(<SectionBody sectionKey="projects" doc={doc} config={getTemplate('aurum')} />)
    expect(projects).toMatch(/rm-deco rm-year-sub" data-deco="1">Project</)
  })

  it('the rail draws the author’s word, and an end-only course opens it with Expected', () => {
    const doc = createDocument({ sample: true })
    doc.metadata.layout.metaColumn = 'gutter'
    doc.content.work[0].rail = { word: 'Ongoing' }
    const html = renderToStaticMarkup(<SectionBody sectionKey="work" doc={doc} config={getTemplate('aurum')} />)
    expect(html).toContain('Ongoing')
    expect(html).not.toContain('to now')
    expect(html).toContain('Mar 2021')
    for (const list of [doc.content.work, doc.content.education, doc.content.projects, doc.content.volunteer]) for (const e of list) { e.startDate = ''; e.endDate = '' }
    for (const s of doc.content.custom) for (const i of s.items) i.date = ''
    doc.content.education[0].endDate = '2027-05'
    const page = renderToStaticMarkup(<TemplateRenderer doc={doc} mode="print" />)
    expect(page).toContain('meta-gutter')
    expect(page).toContain('2027')
    expect(page).toContain('Expected')
  })

  it('gutter: the summary has no date, so the rail stays empty beside it', () => {
    const doc = createDocument({ sample: true })
    doc.metadata.layout.metaColumn = 'gutter'
    const html = renderToStaticMarkup(<SectionBody sectionKey="summary" doc={doc} config={getTemplate('aurum')} />)
    expect(html).not.toContain('rm-meta-cell')
    expect(html).not.toContain('rm-initials')
    // The paragraph still sits in the entry wrapper, which is what keeps it
    // on the text column's own left edge rather than under the rail.
    expect(html).toContain('rm-item')
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

  // A section can switch its dates off. The gutter's year is that same date
  // said again, in ink - so a hidden date must not come back as a numeral
  // three times the body size beside every entry, where no parser, Word file
  // or ATS text can account for it.
  it('gutter: a section with its dates switched off gets no decorative year', () => {
    const doc = createDocument({ sample: true })
    doc.metadata.layout.metaColumn = 'gutter'
    doc.metadata.layout.sectionSettings = { work: { showDates: false } }
    const html = renderToStaticMarkup(<SectionBody sectionKey="work" doc={doc} config={getTemplate('aurum')} />)
    expect(html).not.toContain('rm-year')
    expect(html).not.toContain('to now')
    expect(html).not.toContain('Mar 2021')
    // The section beside it kept its dates, so it keeps its gutter.
    const edu = renderToStaticMarkup(<SectionBody sectionKey="education" doc={doc} config={getTemplate('aurum')} />)
    expect(edu).toContain('rm-year')
  })

  // A column with nothing to show is not drawn: a student's resume with
  // undated projects and no course dates at all gave the year rail nothing,
  // and it stood as a tinted seventh of the page. A lone expected finish is
  // a year, though - the rail opens on it and so does the margin.
  it('a document with no dates opens no column, and a lone finish opens either one', () => {
    const doc = createDocument({ sample: true })
    for (const list of [doc.content.work, doc.content.education, doc.content.projects, doc.content.volunteer]) {
      for (const e of list) { e.startDate = ''; e.endDate = '' }
    }
    for (const a of doc.content.awards) a.date = ''
    for (const c of doc.content.certificates) c.date = ''
    for (const p of doc.content.publications) p.releaseDate = ''
    for (const sec of doc.content.custom) for (const i of sec.items) i.date = ''
    doc.metadata.layout.metaColumn = 'gutter'
    const none = renderToStaticMarkup(<TemplateRenderer doc={doc} mode="print" />)
    expect(none).not.toContain('meta-gutter')
    expect(none).not.toContain('rm-meta-cell')
    expect(none).not.toContain('Present')
    doc.content.education[0].endDate = '2027-05'
    expect(renderToStaticMarkup(<TemplateRenderer doc={doc} mode="print" />)).toContain('meta-gutter')
    doc.metadata.layout.metaColumn = 'margin'
    const margin = renderToStaticMarkup(<TemplateRenderer doc={doc} mode="print" />)
    expect(margin).toContain('meta-margin')
    expect(margin).toContain('rm-meta-cell')
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
