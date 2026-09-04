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

  it('keeps a page pin on one entry, and the diamond photo shape', () => {
    // An entry pin carries the item's own id beside the section key; both
    // halves must come back or the break lands before the whole section.
    const m = MetadataSchema.parse({
      page: { autoFit: false, breaks: [{ section: 'work' }, { section: 'work', itemId: 'w2' }] },
      layout: { photoShape: 'diamond' },
    })
    const back = fromJsonResume(toJsonResume(docWith(m)))
    expect(back.metadata.page.autoFit).toBe(false)
    expect(back.metadata.page.breaks).toEqual([{ section: 'work' }, { section: 'work', itemId: 'w2' }])
    expect(back.metadata.layout.photoShape).toBe('diamond')
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

describe('bullet indent and bullet spacing survive a round trip', () => {
  // Two more typography numbers: how far a highlight list is set in from
  // the text edge and how much air sits between two bullets. A file saved
  // before they existed carries neither and must land on the geometry the
  // page has always drawn (1.05em in, 0.2em apart).
  it('keeps both values', () => {
    const m = MetadataSchema.parse({ typography: { bulletIndent: 1.4, bulletGap: 0.35 } })
    const back = fromJsonResume(toJsonResume(docWith(m)))
    expect(back.metadata.typography.bulletIndent).toBe(1.4)
    expect(back.metadata.typography.bulletGap).toBe(0.35)
  })

  it('an older file lands on the geometry the page always drew', () => {
    const raw = toJsonResume(docWith(MetadataSchema.parse({}))) as unknown as {
      meta: { cvaurum: { typography: Record<string, unknown> } }
    }
    delete raw.meta.cvaurum.typography.bulletIndent
    delete raw.meta.cvaurum.typography.bulletGap
    const fresh = fromJsonResume(raw as never)
    expect(fresh.metadata.typography.bulletIndent).toBe(1.05)
    expect(fresh.metadata.typography.bulletGap).toBe(0.2)
  })
})

describe('the date settings survive a round trip', () => {
  // One block for how every date on the page reads: month style, separator,
  // present word and language. A file saved before it existed carries none
  // of it and must print dates exactly as it always did.
  it('keeps all four values', () => {
    const m = MetadataSchema.parse({ dates: { month: 'numeric', separator: 'hyphen', present: 'Now', language: 'de' } })
    const back = fromJsonResume(toJsonResume(docWith(m)))
    expect(back.metadata.dates).toEqual({ month: 'numeric', separator: 'hyphen', present: 'Now', language: 'de' })
  })

  it('an older file lands on the dates the page always printed', () => {
    const raw = toJsonResume(docWith(MetadataSchema.parse({}))) as unknown as {
      meta: { cvaurum: Record<string, unknown> }
    }
    delete raw.meta.cvaurum.dates
    const fresh = fromJsonResume(raw as never)
    expect(fresh.metadata.dates).toEqual({ month: 'short', separator: 'emdash', present: 'Present', language: 'en' })
  })

  it('a partial block fills in the rest', () => {
    const back = fromJsonResume(toJsonResume(docWith(MetadataSchema.parse({ dates: { month: 'long' } }))))
    expect(back.metadata.dates.month).toBe('long')
    expect(back.metadata.dates.separator).toBe('emdash')
  })
})

describe('a per-section time span switch survives a round trip', () => {
  it('keeps the flag beside the section\'s other settings', () => {
    const m = MetadataSchema.parse({
      layout: { sectionSettings: { work: { showDuration: true, showLocation: false } } },
    })
    const back = fromJsonResume(toJsonResume(docWith(m)))
    expect(back.metadata.layout.sectionSettings.work.showDuration).toBe(true)
    expect(back.metadata.layout.sectionSettings.work.showLocation).toBe(false)
  })

  it('an older file has no span switched on anywhere', () => {
    const older = { layout: { sectionSettings: { work: { showDates: true } } } }
    const back = fromJsonResume(toJsonResume(docWith(MetadataSchema.parse(older))))
    expect(back.metadata.layout.sectionSettings.work.showDuration).toBeUndefined()
  })
})

describe('the element colours survive a round trip', () => {
  // Five optional theme colours - the name, the headline, the section titles,
  // the contact line and the links - each drawn from the theme colours when
  // unset. A file saved before they existed carries none of them and must
  // decide none of them: an unset colour is derived, not a default.
  it('keeps all five', () => {
    const chosen = { name: '#112233', headline: '#445566', headings: '#778899', contacts: '#aabbcc', links: '#0a0b0c' }
    const m = MetadataSchema.parse({ theme: chosen })
    const back = fromJsonResume(toJsonResume(docWith(m)))
    expect(back.metadata.theme).toMatchObject(chosen)
    expect(back.metadata.theme.primary).toBe('#2563eb')
  })

  it('an older file decides none of them', () => {
    const raw = toJsonResume(docWith(MetadataSchema.parse({ theme: { primary: '#0f766e' } }))) as unknown as {
      meta: { cvaurum: { theme: Record<string, unknown> } }
    }
    for (const k of ['name', 'headline', 'headings', 'contacts', 'links']) delete raw.meta.cvaurum.theme[k]
    const fresh = fromJsonResume(raw as never)
    expect(fresh.metadata.theme.primary).toBe('#0f766e')
    for (const k of ['name', 'headline', 'headings', 'contacts', 'links'] as const)
      expect(fresh.metadata.theme[k]).toBeUndefined()
  })
})

describe('the type scale, heading case and weights survive a round trip', () => {
  // Three more typography numbers (section titles, headline and contacts as
  // multiples of the body size) and three choices (heading case, name weight,
  // heading weight). A file saved before they existed carries none of them
  // and must land on the sizes the page always drew, with no case or weight
  // decided - an undecided choice is the template's own, not a default.
  it('keeps all six values', () => {
    const m = MetadataSchema.parse({
      typography: {
        sectionTitleScale: 1.3,
        headlineScale: 1.0,
        contactScale: 0.85,
        headingCase: 'smallcaps',
        nameWeight: 'light',
        headingWeight: 'regular',
      },
    })
    const back = fromJsonResume(toJsonResume(docWith(m)))
    expect(back.metadata.typography).toMatchObject({
      sectionTitleScale: 1.3,
      headlineScale: 1.0,
      contactScale: 0.85,
      headingCase: 'smallcaps',
      nameWeight: 'light',
      headingWeight: 'regular',
    })
  })

  it('an older file lands on the sizes the page always drew, deciding nothing else', () => {
    const raw = toJsonResume(docWith(MetadataSchema.parse({}))) as unknown as {
      meta: { cvaurum: { typography: Record<string, unknown> } }
    }
    for (const k of ['sectionTitleScale', 'headlineScale', 'contactScale', 'headingCase', 'nameWeight', 'headingWeight'])
      delete raw.meta.cvaurum.typography[k]
    const fresh = fromJsonResume(raw as never)
    expect(fresh.metadata.typography.sectionTitleScale).toBe(1.06)
    expect(fresh.metadata.typography.headlineScale).toBe(1.15)
    expect(fresh.metadata.typography.contactScale).toBe(0.95)
    expect(fresh.metadata.typography.headingCase).toBeUndefined()
    expect(fresh.metadata.typography.nameWeight).toBeUndefined()
    expect(fresh.metadata.typography.headingWeight).toBeUndefined()
  })
})

describe('heading alignment, heading spacing and the rule width survive a round trip', () => {
  // A per-section alignment, a document-wide multiplier for the air under a
  // heading, and a chosen rule width. A file saved before they existed
  // carries none of them and must draw the heading exactly as it always did:
  // the template's own alignment, the stock gap, the template's own rule.
  it('keeps all three values', () => {
    const m = MetadataSchema.parse({
      typography: { headingGap: 1.6, headingRuleWidth: 2 },
      layout: { sectionSettings: { work: { headingAlign: 'center' } } },
    })
    const back = fromJsonResume(toJsonResume(docWith(m)))
    expect(back.metadata.typography.headingGap).toBe(1.6)
    expect(back.metadata.typography.headingRuleWidth).toBe(2)
    expect(back.metadata.layout.sectionSettings.work.headingAlign).toBe('center')
  })

  it('an older file lands on the stock gap and decides no alignment or rule', () => {
    const raw = toJsonResume(docWith(MetadataSchema.parse({}))) as unknown as {
      meta: { cvaurum: { typography: Record<string, unknown> } }
    }
    delete raw.meta.cvaurum.typography.headingGap
    delete raw.meta.cvaurum.typography.headingRuleWidth
    const fresh = fromJsonResume(raw as never)
    expect(fresh.metadata.typography.headingGap).toBe(1)
    expect(fresh.metadata.typography.headingRuleWidth).toBeUndefined()
    expect(fresh.metadata.layout.sectionSettings.work?.headingAlign).toBeUndefined()
  })
})

describe('the entry order and emphasis survive a round trip', () => {
  // Per section: which field leads an entry (the title or the organisation)
  // and which is bold. A file saved before they existed decides neither, and
  // an undecided pair is the page as it always was.
  it('keeps both, per section', () => {
    const m = MetadataSchema.parse({
      layout: {
        sectionSettings: {
          work: { entryOrder: 'org-first', entryEmphasis: 'org' },
          education: { entryEmphasis: 'org' },
        },
      },
    })
    const back = fromJsonResume(toJsonResume(docWith(m)))
    expect(back.metadata.layout.sectionSettings.work.entryOrder).toBe('org-first')
    expect(back.metadata.layout.sectionSettings.work.entryEmphasis).toBe('org')
    expect(back.metadata.layout.sectionSettings.education.entryOrder).toBeUndefined()
    expect(back.metadata.layout.sectionSettings.education.entryEmphasis).toBe('org')
  })

  it('an older file decides neither', () => {
    const older = { layout: { sectionSettings: { work: { showDates: true } } } }
    const back = fromJsonResume(toJsonResume(docWith(MetadataSchema.parse(older))))
    expect(back.metadata.layout.sectionSettings.work.entryOrder).toBeUndefined()
    expect(back.metadata.layout.sectionSettings.work.entryEmphasis).toBeUndefined()
  })
})
