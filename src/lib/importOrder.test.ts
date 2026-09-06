import { describe, expect, it } from 'vitest'
import { fromJsonResume } from './io'
import { resolveOrder, seedSectionOrder } from './sections'
import { defaultMetadata } from '@/data/defaults'

// The user's own file: a student resume with no work, no skills, and an
// empty settings object - the shape that left the editor's section list blank.
const IMPORTED = {
  basics: { name: 'Sanjog Kasireddy', label: 'Integrated M.Tech Student', summary: 'A summary line.' },
  work: [],
  education: [{ institution: 'Vellore Institute of Technology', area: 'Software Engineering', studyType: 'Integrated M.Tech', endDate: '2027-05' }],
  projects: [{ name: 'Collusion Attack Prevention in VANETs', description: 'A project.', highlights: ['One.'] }],
  skills: [],
  languages: [{ language: 'Telugu', fluency: 'Native' }, { language: 'English', fluency: '5/5' }],
  meta: { cvaurum: {} },
}

describe('an imported document gets a section order', () => {
  it('lists every section it actually has, so the panel is not empty', () => {
    const doc = fromJsonResume(IMPORTED)
    expect(doc.metadata.layout.main.length).toBeGreaterThan(0)
    for (const key of ['summary', 'education', 'projects', 'languages']) {
      expect(doc.metadata.layout.main).toContain(key)
    }
    // and the page agrees with the panel
    expect(resolveOrder(doc).main).toEqual(doc.metadata.layout.main.filter((k) => resolveOrder(doc).main.includes(k)))
  })

  it('keeps an order the file already carried, and appends only what is missing', () => {
    const doc = fromJsonResume({ ...IMPORTED, meta: { cvaurum: { layout: { main: ['education', 'summary'] } } } })
    expect(doc.metadata.layout.main.slice(0, 2)).toEqual(['education', 'summary'])
    expect(doc.metadata.layout.main).toContain('languages')
    expect(doc.metadata.layout.main).toContain('projects')
  })

  it('leaves a hidden section hidden', () => {
    const doc = fromJsonResume({ ...IMPORTED, meta: { cvaurum: { layout: { main: ['summary'], hidden: ['languages'] } } } })
    expect(doc.metadata.layout.main).not.toContain('languages')
    expect(doc.metadata.layout.hidden).toContain('languages')
  })

  it('fills a two-column layout on both sides', () => {
    const m = defaultMetadata()
    m.layout.columns = 2
    m.layout.main = []
    m.layout.aside = []
    const seeded = seedSectionOrder(m, fromJsonResume(IMPORTED).content)
    expect(seeded.layout.aside.length).toBeGreaterThan(0)
    expect(seeded.layout.main).toContain('education')
  })
})
