import { describe, it, expect, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MetadataSchema } from '@/types/metadata'
import type { ResumeDocument } from '@/types/document'
import type { TemplateConfig } from '@/types/template'

// The sanitizer wraps a DOM purifier that needs a window, and this suite runs
// under the plain node environment. Nothing rendered here is rich text, so
// handing the string back is what the real sanitizer would do with it.
vi.mock('@/lib/sanitize', () => ({ sanitizeHtml: (html: string) => html }))

import { SectionBody } from './sections'

/**
 * A section can lead its entries with the organisation instead of the title.
 * The renderer puts the leading field in the head slot (the bold line beside
 * the date) and the other in the sub-line - in print, and on the canvas where
 * both fields stay editable. The page is rendered to a string here: the
 * markup is what the export paints, so the slot each field lands in is the
 * whole of the feature on the page.
 */
const docWith = (sectionSettings: Record<string, unknown> = {}): ResumeDocument =>
  ({
    id: 'res-1',
    title: 'T',
    createdAt: 0,
    updatedAt: 0,
    content: {
      basics: { name: 'Alex Morgan', profiles: [], location: {} },
      work: [{ id: 'w1', name: 'Acme', position: 'Engineer', startDate: '2019-01', endDate: '2021-03', highlights: [] }],
      education: [
        { id: 'e1', institution: 'State University', studyType: 'BSc', area: 'Computer Science', startDate: '2015', endDate: '2019', courses: [] },
      ],
      projects: [],
      skills: [],
      languages: [],
      certificates: [],
      awards: [],
      publications: [],
      volunteer: [{ id: 'v1', organization: 'Food Bank', position: 'Driver', startDate: '2020', endDate: '2021', highlights: [] }],
      interests: [],
      references: [],
      custom: [{ id: 'x1', name: 'Talks', items: [{ id: 'i1', name: 'Keynote', subtitle: 'DevConf', date: '2022', highlights: [] }] }],
    },
    metadata: MetadataSchema.parse({ layout: { main: ['work', 'education', 'volunteer', 'custom-x1'], sectionSettings } }),
  }) as unknown as ResumeDocument

const render = (sectionKey: string, sectionSettings: Record<string, unknown> = {}, edit?: () => void) =>
  renderToStaticMarkup(
    createElement(SectionBody, { sectionKey, doc: docWith(sectionSettings), config: {} as TemplateConfig, edit }),
  )

/** The markup from the start of the slot's element on, wide enough to hold
 *  its field (on the canvas the slot class shares its attribute with the
 *  editable's own, and the placeholder can sit before it). */
const slot = (html: string, cls: 'rm-item-title' | 'rm-item-org') => {
  const m = new RegExp(`class="[^"]*\\b${cls}\\b[^"]*"`).exec(html)
  expect(m, `no ${cls} in ${html}`).not.toBeNull()
  const start = html.lastIndexOf('<', m!.index)
  return html.slice(start, start + 600)
}

describe('an entry leads with the field the section leads with', () => {
  it('by default the title is the head line and the organisation the sub-line', () => {
    const work = render('work')
    expect(work).toContain('<div class="rm-item-title">Engineer</div>')
    expect(work).toContain('<span class="rm-item-org">Acme</span>')
    const edu = render('education')
    expect(edu).toContain('<div class="rm-item-title">BSc, Computer Science</div>')
    expect(edu).toContain('<span class="rm-item-org">State University</span>')
    const vol = render('volunteer')
    expect(vol).toContain('<div class="rm-item-title">Driver</div>')
    expect(vol).toContain('<span class="rm-item-org">Food Bank</span>')
    const custom = render('custom-x1')
    expect(custom).toContain('<div class="rm-item-title">Keynote</div>')
    expect(custom).toContain('<span class="rm-item-org">DevConf</span>')
  })

  it('organisation first swaps the two slots, in every section that has the two', () => {
    const swap = { entryOrder: 'org-first' }
    const work = render('work', { work: swap })
    expect(work).toContain('<div class="rm-item-title">Acme</div>')
    expect(work).toContain('<span class="rm-item-org">Engineer</span>')
    const edu = render('education', { education: swap })
    expect(edu).toContain('<div class="rm-item-title">State University</div>')
    expect(edu).toContain('<span class="rm-item-org">BSc, Computer Science</span>')
    const vol = render('volunteer', { volunteer: swap })
    expect(vol).toContain('<div class="rm-item-title">Food Bank</div>')
    expect(vol).toContain('<span class="rm-item-org">Driver</span>')
    const custom = render('custom-x1', { 'custom-x1': swap })
    expect(custom).toContain('<div class="rm-item-title">DevConf</div>')
    expect(custom).toContain('<span class="rm-item-org">Keynote</span>')
  })

  it('emphasis alone moves nothing: the weights are the stylesheet\'s, keyed on the section', () => {
    expect(render('work', { work: { entryEmphasis: 'org' } })).toBe(render('work'))
  })
})

describe('both fields stay editable on the canvas in either order', () => {
  // In edit mode each field is a contenteditable carrying its own placeholder,
  // so the placeholder says which field sits in which slot.
  const edit = () => {}

  it('title first: the job title edits in the head, the company in the sub-line', () => {
    const html = render('work', {}, edit)
    expect(slot(html, 'rm-item-title')).toContain('data-placeholder="Job title')
    expect(slot(html, 'rm-item-org')).toContain('data-placeholder="Company')
  })

  it('organisation first: the company edits in the head, the job title in the sub-line', () => {
    const html = render('work', { work: { entryOrder: 'org-first' } }, edit)
    expect(slot(html, 'rm-item-title')).toContain('data-placeholder="Company')
    expect(slot(html, 'rm-item-org')).toContain('data-placeholder="Job title')
  })

  it('education keeps both degree fields editable under a leading school', () => {
    const html = render('education', { education: { entryOrder: 'org-first' } }, edit)
    expect(slot(html, 'rm-item-title')).toContain('data-placeholder="School')
    const sub = slot(html, 'rm-item-org')
    expect(sub).toContain('data-placeholder="Degree')
    expect(sub).toContain('data-placeholder="Field')
  })

  it('a custom entry edits its subtitle in the head when it leads', () => {
    const html = render('custom-x1', { 'custom-x1': { entryOrder: 'org-first' } }, edit)
    expect(slot(html, 'rm-item-title')).toContain('data-placeholder="Subtitle"')
    expect(slot(html, 'rm-item-org')).toContain('data-placeholder="Title"')
  })
})
