import { describe, expect, it } from 'vitest'
import { createDocument } from '@/data/defaults'
import { resumeToAtsText } from '@/lib/atsText'
import { ICON_KINDS, sectionIconKind, suggestedIcons } from './sectionIconChoice'
import { dateAlignOf, entryMetaOf, sectionOverrideClasses } from './sectionClasses'
import { contactLabel, contactsInSidebar } from './contacts'

describe("a section's icon", () => {
  it('suggests from a custom title, best match first', () => {
    expect(suggestedIcons('Volunteering', 'custom-x')[0]).toBe('volunteer')
    expect(suggestedIcons('Honours & Awards', 'custom-x')[0]).toBe('awards')
    expect(suggestedIcons('Talks and Conferences', 'custom-x')[0]).toBe('publications')
  })

  it("offers a standard section's own glyph among its suggestions", () => {
    expect(suggestedIcons('Experience', 'work')).toContain('work')
  })

  it("takes the author's pick, then the title's suggestion, then the glyph it always had", () => {
    expect(sectionIconKind('work', 'Experience', 'awards')).toBe('awards')
    expect(sectionIconKind('work', 'Experience', 'none')).toBe('none')
    expect(sectionIconKind('work', 'Experience')).toBe('work')
    expect(sectionIconKind('custom-a', 'Volunteering')).toBe('volunteer')
    // A title that suggests nothing still gets a mark, never an empty badge.
    expect(sectionIconKind('custom-a', 'Zzz')).toBe('interests')
    // An unknown stored value falls back rather than drawing nothing.
    expect(sectionIconKind('work', 'Experience', 'no-such-glyph')).toBe('work')
  })

  it('names every glyph once', () => {
    const kinds = ICON_KINDS.map((k) => k.kind)
    expect(new Set(kinds).size).toBe(kinds.length)
    expect(kinds).toHaveLength(12)
  })
})

describe('where dates sit', () => {
  it("resolves a section's own side over the document's", () => {
    expect(dateAlignOf(undefined, undefined)).toBeUndefined()
    expect(dateAlignOf(undefined, 'inline')).toBe('inline')
    expect(dateAlignOf({ dateAlign: 'right' }, 'inline')).toBe('right')
  })

  it("classes a section by the side in effect, even with no settings of its own", () => {
    expect(sectionOverrideClasses(undefined, undefined, 'title')).toEqual(['sec-date-title'])
    expect(sectionOverrideClasses({ dateAlign: 'left' }, undefined, 'title')).toContain('sec-date-left')
  })

  it("moves the Word file's date to the left only for the leading column", () => {
    expect(entryMetaOf(undefined, 'left').dateLeft).toBe(true)
    expect(entryMetaOf(undefined, 'inline').dateLeft).toBe(false)
  })
})

describe('the contact line', () => {
  it('labels each kind of contact for the strip', () => {
    expect(contactLabel({ kind: 'email' })).toBe('Email')
    expect(contactLabel({ kind: 'profile', network: 'linkedin' })).toBe('Linkedin')
    expect(contactLabel({ kind: 'profile' })).toBe('Profile')
  })

  it('reads contacts in the sidebar where the file writes them: after the main column', () => {
    const doc = createDocument({ sample: true })
    doc.metadata.layout.columns = 2
    doc.metadata.layout.aside = ['skills', 'languages']
    doc.metadata.layout.main = doc.metadata.layout.main.filter((k) => !['skills', 'languages'].includes(k))
    doc.metadata.layout.contactPlacement = 'sidebar'
    expect(contactsInSidebar(doc)).toBe(true)
    const text = resumeToAtsText(doc)
    const email = doc.content.basics.email
    const name = doc.content.basics.name
    expect(text.indexOf(name)).toBeLessThan(text.indexOf(email))
    // The first main-column section comes before the contacts.
    const firstMainLine = text.split('\n')[3]
    expect(text.indexOf(email)).toBeGreaterThan(text.indexOf(firstMainLine))
  })

  it('keeps contacts under the name when no sidebar is drawn', () => {
    // Two columns with nothing in the sidebar is drawn as one column.
    const doc = createDocument({ sample: true })
    doc.metadata.layout.columns = 2
    doc.metadata.layout.aside = []
    doc.metadata.layout.contactPlacement = 'sidebar'
    expect(contactsInSidebar(doc)).toBe(false)
  })

  it('keeps contacts under the name on a one-column page, whatever was chosen', () => {
    const doc = createDocument({ sample: true })
    doc.metadata.layout.columns = 1
    doc.metadata.layout.contactPlacement = 'sidebar'
    expect(contactsInSidebar(doc)).toBe(false)
  })
})
