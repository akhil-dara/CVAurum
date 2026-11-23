import { describe, it, expect } from 'vitest'
import { MetadataSchema, type Metadata } from '@/types/metadata'
import { ARABIC_FAMILY, FONTS } from '@/data/fonts'
import { applyRtlSetup, coversArabic, rtlOfferShown } from './rtlSetup'
import { DATE_LANGUAGE_OPTIONS } from './utils'

const fresh = (): Metadata => MetadataSchema.parse({})

describe('applyRtlSetup', () => {
  it('a Persian resume in the default Inter: mirrored, Persian dates, Vazirmatn for all three faces', () => {
    const m = fresh()
    m.typography.headingFamily = 'Lora'
    m.typography.nameFamily = 'Bebas Neue'
    applyRtlSetup(m, { arabic: true, persian: true })
    expect(m.layout.rtl).toBe(true)
    expect(m.dates.language).toBe('fa')
    expect(m.typography.fontFamily).toBe(ARABIC_FAMILY)
    expect(m.typography.headingFamily).toBe(ARABIC_FAMILY)
    expect(m.typography.nameFamily).toBe(ARABIC_FAMILY)
  })

  it('an empty heading or name face follows the body and stays empty', () => {
    const m = fresh()
    applyRtlSetup(m, { arabic: true, persian: true })
    expect(m.typography.headingFamily).toBe('')
    expect(m.typography.nameFamily).toBe('')
  })

  it('an Arabic resume gets Arabic dates', () => {
    const m = fresh()
    applyRtlSetup(m, { arabic: true, persian: false })
    expect(m.dates.language).toBe('ar')
    // ...a language the date settings offer by name, with its own span words
    expect(DATE_LANGUAGE_OPTIONS.some((o) => o.value === 'ar')).toBe(true)
  })

  it('a document already set in an Arabic face changes only the direction and the dates', () => {
    const m = fresh()
    m.typography.fontFamily = ARABIC_FAMILY
    m.typography.headingFamily = ARABIC_FAMILY
    const before = structuredClone(m)
    applyRtlSetup(m, { arabic: true, persian: true })
    expect(m.layout.rtl).toBe(true)
    expect(m.dates.language).toBe('fa')
    expect({ ...m, layout: before.layout, dates: before.dates }).toEqual(before)
  })
})

describe('coversArabic', () => {
  // No font data in this codebase records the scripts a face draws (neither
  // FONTS nor public/fonts-pdf/index.json): the rule is that the Arabic
  // family is the one bundled face with Arabic letters.
  it('only the Arabic family draws Arabic script', () => {
    expect(coversArabic(ARABIC_FAMILY)).toBe(true)
    for (const f of FONTS) if (f.name !== ARABIC_FAMILY) expect(coversArabic(f.name), f.name).toBe(false)
  })
})

describe('rtlOfferShown', () => {
  it('shows for Arabic script on an unmirrored page nobody declined', () => {
    const m = fresh()
    expect(rtlOfferShown(m, { arabic: true, persian: true })).toBe(true)
    expect(rtlOfferShown(m, { arabic: false, persian: false })).toBe(false)
    m.layout.rtl = true
    expect(rtlOfferShown(m, { arabic: true, persian: true })).toBe(false)
    m.layout.rtl = false
    m.layout.rtlOfferDismissed = true
    expect(rtlOfferShown(m, { arabic: true, persian: true })).toBe(false)
  })

  it('a document saved before the field existed parses, offer not declined', () => {
    const old = MetadataSchema.parse({ layout: { rtl: false } })
    expect(old.layout.rtlOfferDismissed).toBe(false)
  })
})
