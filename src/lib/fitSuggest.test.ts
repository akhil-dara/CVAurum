import { describe, expect, it } from 'vitest'
import { createDocument } from '@/data/defaults'
import type { ResumeDocument } from '@/types/document'
import type { FitResult } from './fitReadout'
import { suggestFits } from './fitSuggest'

const docWith = (main: string[], target: 1 | 2 | 3 = 1) => {
  const d = createDocument({ sample: true })
  d.metadata.layout.columns = 1
  d.metadata.layout.main = main
  d.metadata.layout.aside = []
  d.metadata.layout.footer = []
  d.metadata.page.autoFit = true
  d.metadata.page.fit.target = target
  d.metadata.typography.fontSize = 10
  return d
}
const res = (pages: number, lastPageFill: number, type = 1, space = 1, lastPageSections: string[] = []): FitResult => ({
  fit: { type, space },
  pages,
  lastPageFill,
  lastPageSections,
})

describe('suggestFits', () => {
  it('offers to pull a résumé onto fewer pages when a trial at the smaller target fits', async () => {
    const doc = docWith(['experience', 'education', 'skills'], 2)
    const trial = async (c: ResumeDocument) => {
      if (c.metadata.page.fit.target === 2) return res(2, 0.25) // a reorder trial: no help
      expect(c.metadata.page.fit.target).toBe(1)
      return res(1, 0.97, 0.9, 0.8)
    }
    const out = await suggestFits(doc, trial, res(2, 0.2, 1, 1, ['skills']))
    expect(out.map((s) => s.label)).toEqual(['Fit 1 page: body 9pt, gaps 80%'])
    const applied = structuredClone(doc)
    out[0].mutate(applied)
    expect(applied.metadata.page.fit.target).toBe(1)
  })

  it('does not offer the pull-up when the target is already below the page count (the fit fell back)', async () => {
    const doc = docWith(['experience', 'education', 'skills'], 1)
    let calls = 0
    const trial = async () => {
      calls++
      return res(1, 0.9)
    }
    const out = await suggestFits(doc, trial, res(2, 0.9, 0.7, 0.7, ['skills']))
    expect(out).toEqual([])
    expect(calls).toBe(0)
  })

  it('offers a move up for a section on a nearly empty last page when the trial says it helps', async () => {
    const doc = docWith(['experience', 'projects', 'education', 'skills', 'languages'], 2)
    const trial = async (c: ResumeDocument) => {
      const main = c.metadata.layout.main
      if (c.metadata.page.fit.target === 1) return res(2, 0.2) // the pull-up fails
      if (main.join() === 'experience,projects,education,languages,skills') return res(2, 0.62, 1, 1, ['skills'])
      if (main.join() === 'experience,projects,skills,education,languages') return res(2, 0.25, 1, 1, ['languages'])
      return res(2, 0.2, 1, 1, ['skills', 'languages'])
    }
    const out = await suggestFits(doc, trial, res(2, 0.2, 1, 1, ['skills', 'languages']))
    expect(out.map((s) => s.label)).toEqual(['Move Languages above Skills: 2 pages, page 2 is 62% full'])
    const applied = structuredClone(doc)
    out[0].mutate(applied)
    expect(applied.metadata.layout.main).toEqual(['experience', 'projects', 'education', 'languages', 'skills'])
  })

  it('ranks fewer pages first, then a fuller last page, and offers at most three', async () => {
    const doc = docWith(['a', 'b', 'c', 'd', 'e', 'f'], 3)
    const trial = async (c: ResumeDocument) => {
      const main = c.metadata.layout.main.join()
      if (c.metadata.page.fit.target === 2) return res(2, 0.5, 0.95, 0.9) // pull-up works
      if (main === 'a,c,b,d,e,f') return res(3, 0.45) // +25 points
      if (main === 'a,b,d,c,e,f') return res(2, 0.9) // fewer pages
      if (main === 'a,b,c,e,d,f') return res(3, 0.35) // +15 points
      if (main === 'a,b,c,d,f,e') return res(3, 0.31) // +11 points
      return res(3, 0.2)
    }
    const out = await suggestFits(doc, trial, res(3, 0.2, 1, 1, ['c', 'd', 'e', 'f']))
    expect(out.map((s) => s.label)).toEqual([
      'Move d above c: 2 pages, page 2 is 90% full',
      'Fit 2 pages: body 9.5pt, gaps 90%',
      'Move c above b: 3 pages, page 3 is 45% full',
    ])
  })

  it('offers nothing on one page, and nothing when no move gains ten points', async () => {
    const one = docWith(['experience', 'skills'], 1)
    expect(await suggestFits(one, async () => res(1, 0.5), res(1, 0.5, 1, 1, ['experience', 'skills']))).toEqual([])
    const two = docWith(['experience', 'education', 'skills'], 2)
    const trial = async (c: ResumeDocument) => (c.metadata.page.fit.target === 1 ? res(2, 0.3) : res(2, 0.36))
    expect(await suggestFits(two, trial, res(2, 0.3, 1, 1, ['skills']))).toEqual([])
  })
})
