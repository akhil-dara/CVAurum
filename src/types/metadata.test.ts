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

describe('the running section numeral has a style of its own', () => {
  // The numerals were always "01, 02": one shape, take it or leave it. The
  // switch stays a switch; how the numeral is SET is a separate choice, so a
  // document that wants plain figures or roman numerals does not have to
  // give up the numbering to escape the zero.
  it('defaults to the padded figures every numbered design already drew', () => {
    expect(LayoutSchema.parse({}).sectionNumberStyle).toBe('padded')
  })

  it('takes every style it offers', () => {
    for (const style of ['padded', 'plain', 'dot', 'roman'] as const) {
      expect(LayoutSchema.parse({ sectionNumberStyle: style }).sectionNumberStyle).toBe(style)
    }
  })

  it('refuses a value it does not know rather than dropping it silently', () => {
    // Same rule as headingStyle: a value quietly stripped would leave the
    // page drawing something the file never asked for, with nothing to say
    // why. An unknown style fails the whole parse.
    expect(() => LayoutSchema.parse({ sectionNumberStyle: 'letters' })).toThrow()
  })
})

describe('the bullet mark has a size of its own', () => {
  // Style, indent and spacing were all the author's; how big the mark itself
  // is drawn was the browser's, whatever the body size happened to be.
  it('defaults to the size the browser draws beside the text', () => {
    expect(TypographySchema.parse({}).bulletSize).toBe(1)
  })

  it('takes a multiple of the body size, and refuses one that would not read', () => {
    expect(TypographySchema.parse({ bulletSize: 1.8 }).bulletSize).toBe(1.8)
    expect(TypographySchema.parse({ bulletSize: 0.6 }).bulletSize).toBe(0.6)
    expect(() => TypographySchema.parse({ bulletSize: 3 })).toThrow()
    expect(() => TypographySchema.parse({ bulletSize: 0.2 })).toThrow()
  })
})
