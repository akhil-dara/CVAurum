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
 * A section can print an entry's location beside its date instead of under
 * its title. The location LEAVES the sub-line and lands in the date slot,
 * separated by one glyph the reader sees and the text layer treats as
 * decoration - and it stays editable where it lands, whichever field the
 * section leads its entries with. The page is rendered to a string here:
 * this markup is what the export paints, so the slot each field lands in is
 * the whole of the feature on the page.
 */
const docWith = (sectionSettings: Record<string, unknown> = {}): ResumeDocument =>
  ({
    id: 'res-1',
    title: 'T',
    createdAt: 0,
    updatedAt: 0,
    content: {
      basics: { name: 'Alex Morgan', profiles: [], location: {} },
      work: [
        {
          id: 'w1',
          name: 'Acme',
          position: 'Engineer',
          location: 'Austin, TX',
          startDate: '2019-01',
          endDate: '2021-03',
          highlights: [],
        },
      ],
      education: [
        {
          id: 'e1',
          institution: 'State University',
          studyType: 'BSc',
          area: 'Computer Science',
          location: 'Boston, MA',
          startDate: '2015',
          endDate: '2019',
          courses: [],
        },
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
      custom: [
        {
          id: 'x1',
          name: 'Talks',
          items: [{ id: 'i1', name: 'Keynote', subtitle: 'DevConf', date: '2022', location: 'Berlin', highlights: [] }],
        },
      ],
    },
    metadata: MetadataSchema.parse({ layout: { main: ['work', 'education', 'volunteer', 'custom-x1'], sectionSettings } }),
  }) as unknown as ResumeDocument

const render = (sectionKey: string, sectionSettings: Record<string, unknown> = {}, edit?: () => void) =>
  renderToStaticMarkup(
    createElement(SectionBody, { sectionKey, doc: docWith(sectionSettings), config: {} as TemplateConfig, edit }),
  )

/** The inside of the head row's date slot, and of the sub-line under it. */
const metaSlot = (html: string) => /<div class="rm-item-date[^"]*">([\s\S]*?)<\/div>/.exec(html)?.[1] ?? ''
const subSlot = (html: string) => /<div class="rm-item-sub">([\s\S]*?)<\/div>/.exec(html)?.[1] ?? ''

const WITH_DATE = { locationPlacement: 'with-date' }

describe('an entry prints its location where the section places it', () => {
  it('by default the location sits on the sub-line and the date slot holds the date alone', () => {
    const work = render('work')
    expect(subSlot(work)).toContain('Austin, TX')
    expect(metaSlot(work)).toBe('Jan 2019 — Mar 2021')
    expect(work).not.toContain('rm-item-meta')
  })

  it('with-date moves it into the date slot, ahead of the date', () => {
    const work = render('work', { work: WITH_DATE })
    expect(work).toContain('rm-item-meta')
    expect(metaSlot(work)).toBe(
      '<span class="rm-item-loc">Austin, TX</span><span class="rm-meta-sep"> | </span>Jan 2019 — Mar 2021',
    )
    expect(subSlot(work)).not.toContain('Austin, TX')
  })

  it('the separator is real text, so nothing runs the two together', () => {
    // Marking it decoration would make it a PDF artifact - painted, but out
    // of the text layer - and the extracted line would read
    // "Austin, TXJan 2019". It is a field separator, like the glyph between
    // the two ends of a range, so it stays in the text.
    const work = render('work', { work: WITH_DATE })
    expect(work).not.toContain('rm-meta-sep" aria-hidden')
    expect(metaSlot(work).replace(/<[^>]*>/g, '')).toBe('Austin, TX | Jan 2019 — Mar 2021')
  })

  it('education and a custom entry move theirs the same way', () => {
    const edu = render('education', { education: WITH_DATE })
    expect(metaSlot(edu)).toContain('<span class="rm-item-loc">Boston, MA</span>')
    expect(metaSlot(edu)).toContain('2015 — 2019')
    expect(subSlot(edu)).not.toContain('Boston, MA')
    const custom = render('custom-x1', { 'custom-x1': WITH_DATE })
    expect(metaSlot(custom)).toContain('<span class="rm-item-loc">Berlin</span>')
    expect(metaSlot(custom)).toContain('2022')
    expect(subSlot(custom)).not.toContain('Berlin')
  })

  it('a section whose entries carry no location is untouched by the choice', () => {
    expect(render('volunteer', { volunteer: WITH_DATE })).toBe(render('volunteer'))
  })

  it('a hidden location stays hidden wherever the section would place it', () => {
    const off = render('work', { work: { ...WITH_DATE, showLocation: false } })
    expect(off).not.toContain('Austin, TX')
    expect(metaSlot(off)).toBe('Jan 2019 — Mar 2021')
  })

  it('the date side is the section element\'s class, so the entries render the same', () => {
    expect(render('work', { work: { dateAlign: 'left' } })).toBe(render('work'))
  })
})

describe('the location stays editable in the date slot, in either entry order', () => {
  // In edit mode each field is a contenteditable carrying its own
  // placeholder, so the placeholder says which field sits in which slot.
  const edit = () => {}

  it('title first: the location edits beside the date, the company under it', () => {
    const html = render('work', { work: WITH_DATE }, edit)
    expect(metaSlot(html)).toContain('data-placeholder="Location"')
    expect(subSlot(html)).toContain('data-placeholder="Company')
    expect(subSlot(html)).not.toContain('data-placeholder="Location"')
  })

  it('organisation first: the location is still beside the date, the job title under it', () => {
    const html = render('work', { work: { ...WITH_DATE, entryOrder: 'org-first' } }, edit)
    expect(metaSlot(html)).toContain('data-placeholder="Location"')
    expect(subSlot(html)).toContain('data-placeholder="Job title')
  })

  it('a custom entry keeps both its own fields editable with the location moved', () => {
    const html = render('custom-x1', { 'custom-x1': { ...WITH_DATE, entryOrder: 'org-first' } }, edit)
    expect(metaSlot(html)).toContain('data-placeholder="Location"')
    expect(subSlot(html)).toContain('data-placeholder="Title"')
  })
})
