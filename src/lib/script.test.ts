import { describe, expect, it } from 'vitest'
import { createDocument } from '@/data/defaults'
import { ARABIC_FAMILY, usesArabicScript } from '@/data/fonts'
import type { ResumeDocument } from '@/types/document'
import { documentFaces } from './documentFaces'
import { documentScript } from './script'

/** A blank resume with `edit` applied to it - the fixture every case starts from. */
function docWith(edit: (d: ResumeDocument) => void): ResumeDocument {
  const d = createDocument()
  d.content.basics.name = 'Alex Morgan'
  edit(d)
  return d
}

describe('usesArabicScript', () => {
  it('never reads a byte-order mark as Arabic', () => {
    expect(usesArabicScript('﻿')).toBe(false)
    expect(usesArabicScript('﻿Alex Morgan')).toBe(false)
  })

  it('still reads the last presentation form (U+FEFB, lam-alef ligature)', () => {
    expect(usesArabicScript('ﻻ')).toBe(true)
  })
})

describe('documentScript reads only what the page shows', () => {
  it('a Latin resume is neither', () => {
    expect(documentScript(docWith(() => {}))).toEqual({ arabic: false, persian: false })
  })

  it('ignores Arabic letters in a hidden section', () => {
    const d = docWith((d) => {
      d.content.basics.summary = '<p>پویا علیرضا</p>'
      d.metadata.layout.main = d.metadata.layout.main.filter((k) => k !== 'summary')
      d.metadata.layout.hidden = [...d.metadata.layout.hidden, 'summary']
    })
    expect(documentScript(d)).toEqual({ arabic: false, persian: false })
  })

  it('ignores Arabic letters that sit only in URL fields', () => {
    const d = docWith((d) => {
      d.content.basics.url = 'https://example.com/علیرضا'
      d.content.basics.profiles = [{ id: 'p1', network: 'GitHub', username: 'alex', url: 'https://github.com/پویا' } as never]
      d.content.projects = [
        {
          id: 'pr1',
          name: 'Pulse',
          description: '',
          url: 'https://example.com/پویا',
          links: [{ id: 'l1', label: 'Source', url: 'https://example.com/علی' }],
          startDate: '',
          endDate: '',
          highlights: [],
          keywords: [],
        } as never,
      ]
      d.metadata.layout.main = [...d.metadata.layout.main, 'projects']
    })
    expect(documentScript(d).arabic).toBe(false)
  })

  it('counts an Arabic label the page prints for a link, whatever the address', () => {
    // A credential prints its verify word only when it has an address, and a
    // profile with no handle prints only when it has one: emptying the address
    // would take shown words off the page as well.
    const cert = docWith((d) => {
      d.content.certificates = [{ id: 'c1', name: 'AWS', issuer: 'Amazon', date: '', url: 'https://example.com/v', urlLabel: 'تأیید' } as never]
      d.metadata.layout.main = [...d.metadata.layout.main, 'certificates']
    })
    expect(documentScript(cert).arabic).toBe(true)
    const award = docWith((d) => {
      d.content.awards = [{ id: 'a1', title: 'Best', awarder: 'ACM', date: '', summary: '', url: 'https://example.com/a', urlLabel: 'تأیید' } as never]
      d.metadata.layout.main = [...d.metadata.layout.main, 'awards']
    })
    expect(documentScript(award).arabic).toBe(true)
    const profile = docWith((d) => {
      d.content.basics.profiles = [{ id: 'p1', network: 'GitHub', username: '', label: 'گیت‌هاب', url: 'https://github.com/x' } as never]
    })
    expect(documentScript(profile)).toEqual({ arabic: true, persian: true })
    const site = docWith((d) => {
      d.content.basics.url = 'https://example.com'
      d.content.basics.urlLabel = 'وبسایت'
    })
    expect(documentScript(site).arabic).toBe(true)
    const link = docWith((d) => {
      d.content.projects = [
        { id: 'pr1', name: 'Pulse', description: '', url: '', links: [{ id: 'l1', label: 'کد', url: 'https://example.com/c' }], startDate: '', endDate: '', highlights: [], keywords: [] } as never,
      ]
      d.metadata.layout.main = [...d.metadata.layout.main, 'projects']
    })
    expect(documentScript(link).arabic).toBe(true)
  })

  it('a name in Arabic script is Arabic; Persian only with a Persian-only letter', () => {
    expect(documentScript(docWith((d) => (d.content.basics.name = 'علیرضا')))).toEqual({ arabic: true, persian: false })
    expect(documentScript(docWith((d) => (d.content.basics.name = 'پویا')))).toEqual({ arabic: true, persian: true })
  })
})

describe('documentFaces', () => {
  it('adds the Arabic face exactly when the shown text is Arabic', () => {
    const latin = docWith(() => {})
    const named = docWith((d) => (d.content.basics.name = 'علیرضا'))
    const hidden = docWith((d) => {
      d.content.basics.summary = '<p>علیرضا</p>'
      d.metadata.layout.main = d.metadata.layout.main.filter((k) => k !== 'summary')
      d.metadata.layout.hidden = [...d.metadata.layout.hidden, 'summary']
    })
    for (const d of [latin, named, hidden]) {
      expect(documentFaces(d).includes(ARABIC_FAMILY)).toBe(documentScript(d).arabic)
    }
    expect(documentFaces(named)).toContain(ARABIC_FAMILY)
    expect(documentFaces(hidden)).not.toContain(ARABIC_FAMILY)
  })

  it('with metadata alone, names only the chosen faces', () => {
    const d = docWith((d) => (d.content.basics.name = 'علیرضا'))
    expect(documentFaces({ metadata: d.metadata })).not.toContain(ARABIC_FAMILY)
  })
})
