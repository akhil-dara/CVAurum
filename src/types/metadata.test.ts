import { describe, expect, it } from 'vitest'
import { HEADING_STYLES, LayoutSchema, PageSchema, TypographySchema } from './metadata'

describe('PageSchema.breaks (pinned page breaks, 2026-08-17)', () => {
  it('defaults to an empty pin list (existing docs parse unchanged)', () => {
    const page = PageSchema.parse({})
    expect(page.breaks).toEqual([])
  })

  it('round-trips section and entry pins', () => {
    const page = PageSchema.parse({ breaks: [{ section: 'skills' }, { section: 'work', itemId: 'w2' }] })
    expect(page.breaks).toEqual([{ section: 'skills' }, { section: 'work', itemId: 'w2' }])
    expect(PageSchema.parse(JSON.parse(JSON.stringify(page))).breaks).toEqual(page.breaks)
  })
})

describe('PageSchema.fit (Magic fit rules, 2026-09-09)', () => {
  it('defaults reproduce the old fit, with a readable floor and no locks', () => {
    const page = PageSchema.parse({})
    expect(page.fit).toEqual({
      target: 1,
      minBody: null,
      priority: 'both',
      lock: { name: false, headline: false, contacts: false, sectionGap: false, leading: false },
    })
  })
  it('keeps what the author set and refuses a target it cannot fit', () => {
    const page = PageSchema.parse({ fit: { target: 2, minBody: 11, priority: 'type', lock: { name: true } } })
    expect(page.fit.target).toBe(2)
    expect(page.fit.minBody).toBe(11)
    expect(page.fit.priority).toBe('type')
    expect(page.fit.lock).toEqual({ name: true, headline: false, contacts: false, sectionGap: false, leading: false })
    expect(() => PageSchema.parse({ fit: { target: 4 } })).toThrow()
  })
})

describe('a heading style the whole document can set', () => {
  // One vocabulary, two levels: the document's default and a section's own.
  // They have to stay the same eight words, or a style one level offers is a
  // parse failure at the other.
  it('offers exactly the styles a section offers, and both take every one', () => {
    for (const style of HEADING_STYLES) {
      expect(TypographySchema.parse({ headingStyle: style }).headingStyle).toBe(style)
      expect(LayoutSchema.parse({ sectionSettings: { work: { headingStyle: style } } }).sectionSettings.work).toEqual({
        headingStyle: style,
      })
    }
  })

  it("is absent until it is set, and absent means the template's own", () => {
    expect(TypographySchema.parse({}).headingStyle).toBeUndefined()
  })

  it('refuses a value it does not know rather than dropping it silently', () => {
    // An unknown value has to fail the whole parse: a document that came back
    // with the field quietly stripped would sit on the template's look again
    // with nothing to say why.
    expect(() => TypographySchema.parse({ headingStyle: 'bordered' })).toThrow()
  })
})
