import { describe, it, expect } from 'vitest'
import { toJsonResume, fromJsonResume } from './io'
import { MetadataSchema } from '@/types/metadata'
import type { ResumeDocument } from '@/types/document'

/**
 * Settings added later must survive a round trip through the JSON export.
 *
 * `toJsonResume` spreads the whole metadata object, so a new field is written
 * without anyone remembering to add it - but the IMPORT side parses the whole
 * of `meta.cvaurum` with a single safeParse, so one field the schema does not
 * recognise takes every OTHER setting down with it and the document comes back
 * on defaults. That is the failure this guards.
 */
const docWith = (metadata: unknown): ResumeDocument =>
  ({
    id: 'res-1',
    title: 'T',
    createdAt: 0,
    updatedAt: 0,
    content: { basics: { name: 'A' }, skills: [], custom: [] },
    metadata,
  }) as unknown as ResumeDocument

describe('exported settings survive a round trip', () => {
  it('keeps the link display choice and the underline toggle', () => {
    const m = MetadataSchema.parse({ links: { display: 'full', underline: true } })
    const back = fromJsonResume(toJsonResume(docWith(m)))
    expect(back.metadata.links.display).toBe('full')
    expect(back.metadata.links.underline).toBe(true)
  })

  it('keeps a per-section pill size and the stacked skills style', () => {
    const m = MetadataSchema.parse({
      layout: { sectionSettings: { skills: { chipSize: 's', skillsStyle: 'stacked' } } },
    })
    const back = fromJsonResume(toJsonResume(docWith(m)))
    expect(back.metadata.layout.sectionSettings.skills.chipSize).toBe('s')
    expect(back.metadata.layout.sectionSettings.skills.skillsStyle).toBe('stacked')
  })

  it('a document saved before these settings existed still imports, on defaults', () => {
    const older = { template: 'sapphire', typography: { fontSize: 11 } }
    const back = fromJsonResume(toJsonResume(docWith(MetadataSchema.parse(older))))
    expect(back.metadata.links.display).toBe('pretty')
    expect(back.metadata.typography.fontSize).toBe(11)
  })

  it('keeps the folio icon style, the icon size and the link style', () => {
    const m = MetadataSchema.parse({
      layout: { sectionIconStyle: 'folio', sectionIconSize: 'l' },
      links: { style: 'plain' },
    })
    const back = fromJsonResume(toJsonResume(docWith(m)))
    expect(back.metadata.layout.sectionIconStyle).toBe('folio')
    expect(back.metadata.layout.sectionIconSize).toBe('l')
    expect(back.metadata.links.style).toBe('plain')
  })

  it('a document saved before the folio chip existed imports on the new defaults', () => {
    // Older files carry none of these keys. They land on the defaults a new
    // document gets - folio chips at the medium size, tag-shaped named links -
    // while every explicit value they DO carry (chip, above) is kept.
    const older = { template: 'sapphire', layout: { sectionIconStyle: 'chip' } }
    const back = fromJsonResume(toJsonResume(docWith(MetadataSchema.parse(older))))
    expect(back.metadata.layout.sectionIconStyle).toBe('chip')
    expect(back.metadata.layout.sectionIconSize).toBe('m')
    expect(back.metadata.links.style).toBe('tag')
    const raw = toJsonResume(docWith(MetadataSchema.parse({}))) as unknown as {
      meta: { cvaurum: { layout: Record<string, unknown>; links: Record<string, unknown> } }
    }
    delete raw.meta.cvaurum.layout.sectionIconStyle
    delete raw.meta.cvaurum.layout.sectionIconSize
    delete raw.meta.cvaurum.links.style
    const fresh = fromJsonResume(raw as never)
    expect(fresh.metadata.layout.sectionIconStyle).toBe('folio')
    expect(fresh.metadata.layout.sectionIconSize).toBe('m')
    expect(fresh.metadata.links.style).toBe('tag')
  })

  it('one unrecognised setting does not take every other setting down with it', () => {
    const m = MetadataSchema.parse({ links: { display: 'short' }, typography: { fontSize: 12 } })
    const raw = toJsonResume(docWith(m)) as unknown as { meta: { cvaurum: Record<string, unknown> } }
    raw.meta.cvaurum.somethingFromANewerBuild = { nested: true }
    const back = fromJsonResume(raw as never)
    expect(back.metadata.links.display).toBe('short')
    expect(back.metadata.typography.fontSize).toBe(12)
  })
})

describe('every exporter shows a URL the way the author asked', () => {
  // The PDF honoured the display choice and the other two did not, so picking
  // "Full" gave a resume whose Word copy and ATS view still showed the trimmed
  // form - three exports of one document disagreeing about the same link.
  const doc = (display: 'pretty' | 'full' | 'short') =>
    ({
      id: 'res-1',
      title: 'T',
      createdAt: 0,
      updatedAt: 0,
      content: {
        basics: { name: 'A', url: 'https://alexmorgan.dev/', profiles: [], location: {} },
        work: [],
        education: [],
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
      metadata: MetadataSchema.parse({ links: { display } }),
    }) as unknown as ResumeDocument

  it('the ATS text follows it', async () => {
    const { resumeToAtsText } = await import('./atsText')
    expect(resumeToAtsText(doc('full'))).toContain('https://alexmorgan.dev/')
    expect(resumeToAtsText(doc('pretty'))).toContain('alexmorgan.dev')
    expect(resumeToAtsText(doc('pretty'))).not.toContain('https://alexmorgan.dev')
  })
})
