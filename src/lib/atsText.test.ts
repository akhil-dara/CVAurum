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
