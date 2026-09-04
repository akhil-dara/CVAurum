import { describe, expect, it } from 'vitest'
import { atsSectionOrder, resumeToAtsText } from './atsText'
import { MetadataSchema } from '@/types/metadata'
import type { ResumeDocument } from '@/types/document'

describe('resumeToAtsText ignores purely visual link and icon choices', () => {
  // The tag shape of a named link and the folio chip on a heading are ink,
  // not words: the text a parser reads is built from the data model and can
  // never see a DOM class, so every combination must serialize byte for byte
  // the same. This pins that down before either setting exists on the page.
  const docWith = (metadata: Record<string, unknown>): ResumeDocument =>
    ({
      id: 'res-1',
      title: 'T',
      createdAt: 0,
      updatedAt: 0,
      content: {
        basics: { name: 'Alex Morgan', url: 'https://alexmorgan.dev', profiles: [], location: {} },
        work: [],
        education: [],
        projects: [
          {
            id: 'p1',
            name: 'Pulse',
            description: 'Observability toolkit.',
            url: 'https://github.com/alexmorgan/pulse',
            links: [
              { id: 'l1', label: 'Portfolio', url: 'https://alexmorgan.dev' },
              { id: 'l2', label: 'Source', url: 'https://github.com/alexmorgan/pulse' },
            ],
            startDate: '2022',
            endDate: '',
            highlights: ['3.2k stars.'],
            keywords: [],
          },
        ],
        skills: [],
        languages: [],
        certificates: [
          {
            id: 'c1',
            name: 'Cloud Architect',
            issuer: 'Vendor',
            date: '2024',
            url: 'https://x.test/c1',
            urlLabel: 'Verify',
          },
        ],
        awards: [],
        publications: [],
        volunteer: [],
        interests: [],
        references: [],
        custom: [],
      },
      metadata: MetadataSchema.parse({ layout: { main: ['projects', 'certificates'] }, ...metadata }),
    }) as unknown as ResumeDocument

  it('is byte-identical for links.style plain vs tag', () => {
    const plain = resumeToAtsText(docWith({ links: { style: 'plain' } }))
    const tag = resumeToAtsText(docWith({ links: { style: 'tag' } }))
    expect(plain).toContain('Portfolio')
    expect(plain).toContain('Verify')
    expect(plain).toBe(tag)
  })

  it('is byte-identical for sectionIconStyle chip vs folio', () => {
    const chip = resumeToAtsText(docWith({ layout: { main: ['projects', 'certificates'], sectionIconStyle: 'chip' } }))
    const folio = resumeToAtsText(
      docWith({ layout: { main: ['projects', 'certificates'], sectionIconStyle: 'folio' } })
    )
    expect(chip).toContain('Pulse')
    expect(chip).toBe(folio)
  })
})

describe('atsSectionOrder', () => {
  // The exporter emits the main column ahead of the sidebar in the text layer
  // whichever side the sidebar is drawn on, so this view must do the same.
  // It previously put a LEFT sidebar first, on the grounds that it comes first
  // in the DOM, and showed people a worse parse order than their own PDF has.
  it('reads the main column before the sidebar in a two-column resume', () => {
    expect(atsSectionOrder(['work', 'education'], ['skills'], true)).toEqual(['work', 'education', 'skills'])
  })

  it('ignores the sidebar entirely when the layout is single-column', () => {
    expect(atsSectionOrder(['work'], ['skills'], false)).toEqual(['work'])
  })
})

describe('resumeToAtsText prints a time span when the section asks for one', () => {
  // The span is real text the shared date formatter appends, so the words a
  // parser reads are the words on the page - and they are absent, not blank,
  // for every section that never asked. Closed ranges only: an open one
  // would read the calendar and the assertion would age.
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
          {
            id: 'e1',
            institution: 'State University',
            studyType: 'BSc',
            area: 'Computer Science',
            startDate: '2015-09',
            endDate: '2019-06',
            courses: [],
          },
        ],
        projects: [],
        skills: [],
        languages: [],
        certificates: [],
        awards: [],
        publications: [],
        volunteer: [],
        interests: [],
        references: [],
        custom: [],
      },
      metadata: MetadataSchema.parse({ layout: { main: ['work', 'education'], sectionSettings } }),
    }) as unknown as ResumeDocument

  it('appends the span to that section and leaves the others alone', () => {
    const text = resumeToAtsText(docWith({ work: { showDuration: true } }))
    expect(text).toContain('Jan 2019 — Mar 2021 (2 yrs 3 mos)')
    expect(text).toContain('Sep 2015 — Jun 2019\n')
    expect(text).not.toContain('(3 yrs 10 mos)')
  })

  it('prints no span by default, and none when the switch is off', () => {
    expect(resumeToAtsText(docWith())).not.toContain('(')
    expect(resumeToAtsText(docWith({ work: { showDuration: false } }))).not.toContain('(')
  })
})

describe('resumeToAtsText prints dates the way the document formats them', () => {
  // The month style, the separator, the present word and the language are
  // one setting the shared formatter reads, so the text a parser sees is the
  // text on the page. Ranges are closed and open (no span), so nothing here
  // reads the calendar.
  const docWith = (dates: Record<string, unknown> = {}): ResumeDocument =>
    ({
      id: 'res-1',
      title: 'T',
      createdAt: 0,
      updatedAt: 0,
      content: {
        basics: { name: 'Alex Morgan', profiles: [], location: {} },
        work: [
          { id: 'w1', name: 'Acme', position: 'Engineer', startDate: '2019-01', endDate: '2021-03', highlights: [] },
          { id: 'w2', name: 'Beta', position: 'Lead', startDate: '2021-04', endDate: '', highlights: [] },
        ],
        education: [],
        projects: [],
        skills: [],
        languages: [],
        certificates: [{ id: 'c1', name: 'Cloud Architect', issuer: 'Vendor', date: '2024-09' }],
        awards: [],
        publications: [],
        volunteer: [],
        interests: [],
        references: [],
        custom: [],
      },
      metadata: MetadataSchema.parse({ layout: { main: ['work', 'certificates'] }, dates }),
    }) as unknown as ResumeDocument

  it('reads as it always did when the document never chose', () => {
    const text = resumeToAtsText(docWith())
    expect(text).toContain('Jan 2019 — Mar 2021')
    expect(text).toContain('Apr 2021 — Present')
    expect(text).toContain('Sep 2024')
  })

  it('follows the month style, the separator and the present word', () => {
    const text = resumeToAtsText(docWith({ month: 'long', separator: 'to', present: 'Current' }))
    expect(text).toContain('January 2019 to March 2021')
    expect(text).toContain('April 2021 to Current')
    expect(text).toContain('September 2024')
    expect(text).not.toContain('Present')
  })

  it('follows the language, single dates included', () => {
    const text = resumeToAtsText(docWith({ month: 'long', language: 'de', separator: 'endash' }))
    expect(text).toContain('Januar 2019 – März 2021')
    expect(text).toContain('September 2024')
  })
})

describe('resumeToAtsText leads each entry with the field the section leads with', () => {
  // The page can put the organisation above the title in a section; the text
  // a parser reads must list the two lines in the same order. Emphasis is
  // ink, not words: which line is bold changes nothing here.
  const docWith = (sectionSettings: Record<string, unknown> = {}): ResumeDocument =>
    ({
      id: 'res-1',
      title: 'T',
      createdAt: 0,
      updatedAt: 0,
      content: {
        basics: { name: 'Alex Morgan', profiles: [], location: {} },
        work: [
          { id: 'w1', name: 'Acme', position: 'Engineer', startDate: '2019-01', endDate: '2021-03', location: 'Austin', highlights: [] },
        ],
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
        custom: [{ id: 'x1', name: 'Talks', items: [{ id: 'i1', name: 'Keynote', subtitle: 'DevConf', date: '2022', location: 'Berlin', highlights: [] }] }],
      },
      metadata: MetadataSchema.parse({ layout: { main: ['work', 'education', 'volunteer', 'custom-x1'], sectionSettings } }),
    }) as unknown as ResumeDocument

  it('title first by default: position, then company; degree, then school', () => {
    const text = resumeToAtsText(docWith())
    expect(text).toContain('Engineer\nAcme\nJan 2019 — Mar 2021  ·  Austin')
    expect(text).toContain('BSc, Computer Science\nState University\n2015 — 2019')
    expect(text).toContain('Driver\nFood Bank\n2020 — 2021')
    expect(text).toContain('Keynote\nDevConf\n2022  ·  Berlin')
  })

  it('organisation first swaps the two lines in that section, and in no other', () => {
    const text = resumeToAtsText(docWith({ work: { entryOrder: 'org-first' }, custom: { entryOrder: 'org-first' } }))
    expect(text).toContain('Acme\nEngineer\nJan 2019 — Mar 2021  ·  Austin')
    expect(text).toContain('BSc, Computer Science\nState University\n')
    expect(text).toContain('Driver\nFood Bank\n')
    // A custom section's settings are keyed by its own key, not by 'custom'.
    expect(text).toContain('Keynote\nDevConf\n')
    const each = resumeToAtsText(
      docWith({ education: { entryOrder: 'org-first' }, volunteer: { entryOrder: 'org-first' }, 'custom-x1': { entryOrder: 'org-first' } }),
    )
    expect(each).toContain('State University\nBSc, Computer Science\n2015 — 2019')
    expect(each).toContain('Food Bank\nDriver\n2020 — 2021')
    expect(each).toContain('DevConf\nKeynote\n2022  ·  Berlin')
  })

  it('is byte-identical whichever line is bold', () => {
    const stock = resumeToAtsText(docWith())
    expect(resumeToAtsText(docWith({ work: { entryEmphasis: 'org' }, education: { entryEmphasis: 'org' } }))).toBe(stock)
    const swapped = resumeToAtsText(docWith({ work: { entryOrder: 'org-first' } }))
    expect(resumeToAtsText(docWith({ work: { entryOrder: 'org-first', entryEmphasis: 'org' } }))).toBe(swapped)
  })
})

describe('resumeToAtsText follows the section on the meta line', () => {
  // Which edge the date sits on is placement, and the text an ATS reads has
  // no columns to place anything in, so it reads the same either way. Which
  // of the two fields comes FIRST is not placement - the page and the Word
  // file both lead with the location once it joins the date - so the text
  // leads with it too, and the three surfaces name the pair in one order.
  const docWith = (sectionSettings: Record<string, unknown> = {}): ResumeDocument =>
    ({
      id: 'res-1',
      title: 'T',
      createdAt: 0,
      updatedAt: 0,
      content: {
        basics: { name: 'Alex Morgan', profiles: [], location: {} },
        work: [
          { id: 'w1', name: 'Acme', position: 'Engineer', startDate: '2019-01', endDate: '2021-03', location: 'Austin', highlights: [] },
        ],
        education: [
          { id: 'e1', institution: 'State University', studyType: 'BSc', area: 'Computer Science', location: 'Boston', startDate: '2015', endDate: '2019', courses: [] },
        ],
        projects: [],
        skills: [],
        languages: [],
        certificates: [],
        awards: [],
        publications: [],
        volunteer: [],
        interests: [],
        references: [],
        custom: [{ id: 'x1', name: 'Talks', items: [{ id: 'i1', name: 'Keynote', subtitle: 'DevConf', date: '2022', location: 'Berlin', highlights: [] }] }],
      },
      metadata: MetadataSchema.parse({ layout: { main: ['work', 'education', 'custom-x1'], sectionSettings } }),
    }) as unknown as ResumeDocument

  it('is byte-identical with the date moved to the left of the title', () => {
    const stock = resumeToAtsText(docWith())
    const moved = { dateAlign: 'left' }
    expect(resumeToAtsText(docWith({ work: moved, education: moved, 'custom-x1': moved }))).toBe(stock)
  })

  it('prints the date and then the location while the location is on the sub-line', () => {
    expect(resumeToAtsText(docWith())).toContain('Engineer\nAcme\nJan 2019 — Mar 2021  ·  Austin')
  })

  it('leads with the location once the section prints it beside the date', () => {
    const text = resumeToAtsText(docWith({ work: { locationPlacement: 'with-date' } }))
    expect(text).toContain('Engineer\nAcme\nAustin  ·  Jan 2019 — Mar 2021')
  })
})
