import { describe, expect, it } from 'vitest'
import { applyTemplateToMetadata } from './templateApply'
import { MetadataSchema } from '@/types/metadata'
import type { TemplateDefaults } from '@/types/template'

/** A template's defaults, shaped exactly like a registry entry's. */
const defaultsFor = (template: string, columns: 1 | 2): TemplateDefaults => {
  const m = MetadataSchema.parse({ template, layout: { columns, aside: columns === 2 ? ['skills'] : [] } })
  return { template, theme: m.theme, typography: m.typography, layout: m.layout }
}

describe('applyTemplateToMetadata keeps the link settings', () => {
  // The rebuild went through defaultMetadata(), whose overrides had no `links`
  // slot, so every template switch quietly put the link display, the
  // clickable switch, the underline and the link style back on defaults.
  it('carries display, clickable, underline and style across a switch', () => {
    const cur = MetadataSchema.parse({
      template: 'modern',
      links: { display: 'full', clickable: false, underline: true, style: 'plain' },
    })
    const next = applyTemplateToMetadata(cur, defaultsFor('sapphire', 2))
    expect(next.template).toBe('sapphire')
    expect(next.links).toEqual({ display: 'full', clickable: false, underline: true, style: 'plain' })
  })

  it('a document on defaults stays on defaults', () => {
    const cur = MetadataSchema.parse({})
    const next = applyTemplateToMetadata(cur, defaultsFor('aurum', 1))
    expect(next.links).toEqual(cur.links)
  })
})

describe('applyTemplateToMetadata keeps the date settings', () => {
  // How dates read is the author's choice, like the link settings: a switch
  // adopts the template's look but must not put a hand-set month style,
  // separator, present word or language back on the default.
  it('carries the whole dates block across a switch', () => {
    const dates = { month: 'long', separator: 'to', present: 'Current', language: 'fr' } as const
    const cur = MetadataSchema.parse({ template: 'modern', dates })
    const next = applyTemplateToMetadata(cur, defaultsFor('sapphire', 2))
    expect(next.dates).toEqual(dates)
  })
})

describe('applyTemplateToMetadata keeps the bullet geometry', () => {
  // The indent and the gap are the author's, like the marker style: a
  // template switch adopts the new fonts and sizes but must not put a
  // hand-set bullet indent back on the default.
  it('carries bulletIndent and bulletGap across a switch', () => {
    const cur = MetadataSchema.parse({ template: 'modern', typography: { bulletIndent: 1.6, bulletGap: 0.45 } })
    const next = applyTemplateToMetadata(cur, defaultsFor('sapphire', 2))
    expect(next.typography.bulletIndent).toBe(1.6)
    expect(next.typography.bulletGap).toBe(0.45)
  })
})

describe('applyTemplateToMetadata keeps the element colours', () => {
  // A switch adopts the template's theme - its accent, text and muted colours -
  // but a colour the author set on the name, the headline, the section
  // titles, the contacts or the links is theirs and stays. One a template
  // ships applies only where the author decided nothing.
  const chosen = { name: '#112233', headline: '#445566', headings: '#778899', contacts: '#aabbcc', links: '#0a0b0c' }

  it('carries all five across a switch', () => {
    const cur = MetadataSchema.parse({ template: 'modern', theme: chosen })
    const next = applyTemplateToMetadata(cur, defaultsFor('sapphire', 2))
    expect(next.theme).toMatchObject(chosen)
    expect(next.theme.primary).toBe(defaultsFor('sapphire', 2).theme.primary)
  })

  it("an undecided colour takes the template's own, a decided one does not", () => {
    const d = defaultsFor('aurum', 1)
    const shipped = { ...d, theme: { ...d.theme, headings: '#123456', name: '#654321' } }
    const cur = MetadataSchema.parse({ template: 'modern', theme: { name: '#112233' } })
    const next = applyTemplateToMetadata(cur, shipped)
    expect(next.theme.headings).toBe('#123456')
    expect(next.theme.name).toBe('#112233')
    expect(next.theme.links).toBeUndefined()
  })
})

describe('applyTemplateToMetadata keeps the type scale, heading case and weights', () => {
  // A template ships its own fonts and sizes, but how much larger the section
  // titles, the headline and the contacts sit, and whether headings are set
  // in small caps or the name in a light weight, are the author's - a switch
  // used to put every one of them back on the default.
  it('carries all six across a switch', () => {
    const chosen = {
      sectionTitleScale: 1.3,
      headlineScale: 1.0,
      contactScale: 0.85,
      headingCase: 'smallcaps',
      nameWeight: 'light',
      headingWeight: 'regular',
    } as const
    const cur = MetadataSchema.parse({ template: 'modern', typography: chosen })
    const next = applyTemplateToMetadata(cur, defaultsFor('sapphire', 2))
    expect(next.typography).toMatchObject(chosen)
  })

  it('an undecided case or weight stays undecided', () => {
    const cur = MetadataSchema.parse({ template: 'modern' })
    const next = applyTemplateToMetadata(cur, defaultsFor('aurum', 1))
    expect(next.typography.headingCase).toBeUndefined()
    expect(next.typography.nameWeight).toBeUndefined()
    expect(next.typography.headingWeight).toBeUndefined()
  })
})

describe('applyTemplateToMetadata keeps the heading spacing and rule width', () => {
  // The air under a heading and the weight of its rule are the author's,
  // like the bullet geometry: a switch must not put them back on the default,
  // and an undecided rule width stays undecided.
  it('carries headingGap and headingRuleWidth across a switch', () => {
    const cur = MetadataSchema.parse({ template: 'modern', typography: { headingGap: 1.4, headingRuleWidth: 2 } })
    const next = applyTemplateToMetadata(cur, defaultsFor('sapphire', 2))
    expect(next.typography.headingGap).toBe(1.4)
    expect(next.typography.headingRuleWidth).toBe(2)
  })

  it('an undecided rule width stays undecided', () => {
    const cur = MetadataSchema.parse({ template: 'modern' })
    expect(applyTemplateToMetadata(cur, defaultsFor('aurum', 1)).typography.headingRuleWidth).toBeUndefined()
  })
})

describe('applyTemplateToMetadata keeps the entry order and emphasis', () => {
  // Which field leads an entry and which is bold are per-section choices of
  // the author, carried with the rest of the section settings: a switch
  // adopts the template's look and leaves them where they were.
  it('carries both across a switch, per section', () => {
    const cur = MetadataSchema.parse({
      template: 'modern',
      layout: { sectionSettings: { work: { entryOrder: 'org-first', entryEmphasis: 'org' }, education: { entryEmphasis: 'org' } } },
    })
    const next = applyTemplateToMetadata(cur, defaultsFor('sapphire', 2))
    expect(next.layout.sectionSettings.work).toEqual({ entryOrder: 'org-first', entryEmphasis: 'org' })
    expect(next.layout.sectionSettings.education).toEqual({ entryEmphasis: 'org' })
  })

  it('an undecided pair stays undecided', () => {
    const cur = MetadataSchema.parse({ template: 'modern', layout: { sectionSettings: { work: { showDates: false } } } })
    const next = applyTemplateToMetadata(cur, defaultsFor('aurum', 1))
    expect(next.layout.sectionSettings.work.entryOrder).toBeUndefined()
    expect(next.layout.sectionSettings.work.entryEmphasis).toBeUndefined()
  })
})
