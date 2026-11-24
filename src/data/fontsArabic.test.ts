/**
 * Persian letters come from the face this project ships, not from whatever
 * Arabic face the reader's computer happens to have — and that holds when the
 * resume is set in a Latin face and when the interface speaks English.
 */
import { describe, expect, it } from 'vitest'
import { ARABIC_FALLBACK_FAMILY, ARABIC_FAMILY, FONTS, MARKS_FAMILY, fontStack, scriptFallbacks, usesArabicScript } from '@/data/fonts'
import { documentFaces } from '@/lib/documentFaces'
import { createDocument } from '@/data/defaults'

const stack = (name: string) =>
  fontStack(name)
    .split(',')
    .map((s) => s.trim().replace(/^"|"$/g, ''))

describe('the Arabic face in every chain', () => {
  it('is the fallback of every bundled resume face', () => {
    for (const f of FONTS) {
      if (f.name === ARABIC_FAMILY) continue // a face is never its own fallback
      expect(scriptFallbacks(f.name), f.name).toContain(ARABIC_FAMILY)
    }
  })

  it('is tried after the resume’s face and its Latin fallbacks, before the marks and the generic one', () => {
    // In the CSS stack the Arabic face goes by its arabic-only alias, so a
    // missing minus sign or arrow never silently comes out in Vazirmatn on a
    // resume with no Arabic at all (data/fonts.ts ARABIC_FALLBACK_FAMILY).
    const s = stack('Source Serif 4')
    expect(s[0]).toBe('Source Serif 4')
    expect(s.indexOf(ARABIC_FALLBACK_FAMILY)).toBeGreaterThan(s.indexOf('Inter'))
    expect(s.indexOf(ARABIC_FALLBACK_FAMILY)).toBeLessThan(s.indexOf(MARKS_FAMILY))
    expect(s.indexOf(ARABIC_FALLBACK_FAMILY)).toBeLessThan(s.indexOf('ui-serif'))
    // A face chosen FOR Persian keeps itself first: its own letters win.
    expect(stack('Vazirmatn')[0]).toBe('Vazirmatn')
    expect(stack('Vazirmatn').filter((f) => f === 'Vazirmatn')).toHaveLength(1)
  })
})

describe('when a resume needs the Arabic face', () => {
  it('is asked for as soon as the content carries Arabic-script letters', () => {
    const doc = createDocument({})
    doc.metadata.typography.fontFamily = 'Inter'
    doc.content.basics.name = ''
    expect(documentFaces(doc)).not.toContain(ARABIC_FAMILY)

    doc.content.basics.name = 'علی رضایی'
    expect(documentFaces(doc)).toContain(ARABIC_FAMILY)
  })

  it('says which letters those are', () => {
    expect(usesArabicScript('علی رضایی')).toBe(true)
    expect(usesArabicScript('مهندس نرم‌افزار')).toBe(true)
    expect(usesArabicScript('۱۴۰۰')).toBe(true)
    expect(usesArabicScript('Ali Rezaei')).toBe(false)
    expect(usesArabicScript('Даниил Гогов')).toBe(false)
    expect(usesArabicScript('')).toBe(false)
  })
})
