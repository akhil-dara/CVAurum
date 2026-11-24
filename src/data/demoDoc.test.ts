/**
 * The sample a page DRAWS follows the interface's language: a Persian
 * interface shows Persian, right-to-left pages - in the hero, in any gallery -
 * while the author's own resume keeps whatever language it was written in.
 */
import { describe, expect, it } from 'vitest'
import { demoDocument } from './demoDoc'

const persian = /[\u0600-\u06FF]/

describe('the sample resume a page shows', () => {
  it('is Persian and right-to-left when the interface speaks Persian', () => {
    const fa = demoDocument('harvard', 'fa')
    expect(fa.metadata.layout.rtl).toBe(true)
    expect(fa.metadata.dates.language).toBe('fa')
    expect(fa.metadata.dates.present).toBe('تاکنون')
    expect(fa.metadata.typography.fontFamily).toBe('Vazirmatn')
    expect(fa.content.basics.name).toBe('علی رضایی')
    expect(fa.content.work.length).toBeGreaterThan(1)
    expect(fa.content.work.every((w) => persian.test(w.position ?? ''))).toBe(true)
    expect(fa.metadata.layout.headings?.work).toBe('تجربهٔ کاری')
  })

  it('stays the English sample in an English interface', () => {
    const en = demoDocument('harvard', 'en')
    expect(en.metadata.layout.rtl).toBe(false)
    expect(en.metadata.dates.language).toBe('en')
    expect(persian.test(en.content.basics.name)).toBe(false)
  })

  it('builds one document per design and language, and hands back the same one', () => {
    expect(demoDocument('harvard', 'fa')).toBe(demoDocument('harvard', 'fa'))
    expect(demoDocument('harvard', 'fa')).not.toBe(demoDocument('harvard', 'en'))
    expect(demoDocument('harvard', 'fa')).not.toBe(demoDocument('modern', 'fa'))
  })
})
