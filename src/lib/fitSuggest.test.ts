import { describe, expect, it } from 'vitest'
import { createDocument } from '@/data/defaults'
import type { ResumeDocument } from '@/types/document'
import type { FitResult } from './fitReadout'
import { explainShort, suggestFitOn, suggestFits } from './fitSuggest'

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
    // no trial at a smaller target; other moves (margins, leaving a section
    // out) may still be measured when the target is out of reach
    const targets: number[] = []
    const trial = async (c: ResumeDocument) => {
      targets.push(c.metadata.page.fit.target)
      return res(1, 0.9)
    }
    const out = await suggestFits(doc, trial, res(2, 0.9, 0.7, 0.7, ['skills']))
    expect(out.filter((o) => /^(target|floor)-/.test(o.id))).toEqual([])
    expect(targets.every((t) => t === 1)).toBe(true)
  })

  it('when the target is out of reach, measures it with the floor let down and says so', async () => {
    const doc = docWith(['experience', 'education', 'skills'], 2)
    doc.metadata.page.fit.minBody = 9
    const trial = async (c: ResumeDocument) => {
      if (c.metadata.page.fit.minBody === 6) return res(2, 0.99, 0.86, 0.7)
      return res(3, 0.4)
    }
    const out = await suggestFits(doc, trial, res(3, 0.98, 0.9, 0.9, ['skills']))
    expect(out.map((s) => s.label)).toEqual(['Fit 2 pages: body 8.6pt, below your 9pt floor'])
    const applied = structuredClone(doc)
    out[0].mutate(applied)
    expect(applied.metadata.page.fit.minBody).toBe(8.5)
  })

  it('never proposes a body below 8pt, however low the floor may go', async () => {
    const doc = docWith(['experience', 'education', 'skills'], 1)
    doc.metadata.page.fit.minBody = 11
    doc.metadata.typography.fontSize = 7.25
    // at the 6pt floor the target is met, at 0.83 of 7.25pt = 6pt
    const trial = async (c: ResumeDocument) => (c.metadata.page.fit.minBody === 6 ? res(1, 0.99, 0.83, 0.7) : res(3, 0.6))
    expect(await suggestFits(doc, trial, res(3, 0.61, 1.517, 1, ['awards']))).toEqual([])
  })

  // Measured on the owner's own file (2026-09-24): 3 pages, target 1, an 11pt
  // floor. One page needs a body under 8pt, so nothing was offered - though
  // two pages were within reach at about 9pt, the move actually worth making.
  it('when the target is out of reach even so, offers the fewest pages a readable floor can reach', async () => {
    const doc = docWith(['experience', 'education', 'skills'], 1)
    doc.metadata.page.fit.minBody = 11
    doc.metadata.typography.fontSize = 7.25
    const trial = async (c: ResumeDocument) => {
      const f = c.metadata.page.fit
      // as applied: floor 9pt, target 1 -> the fit falls back to 2 pages at 9pt
      if (f.minBody === 9 && f.target === 1) return res(2, 0.97, 9 / 7.25, 1)
      if (f.minBody !== 6) return res(3, 0.6)
      // one page only at 6pt; two pages at 1.25 x 7.25 = 9.1pt
      return f.target === 1 ? res(1, 0.99, 0.83, 0.7) : res(2, 0.95, 1.25, 1)
    }
    const out = await suggestFits(doc, trial, res(3, 0.61, 1.517, 1, ['awards']))
    expect(out.map((s) => s.label)).toContain('Fit 2 pages: body 9pt, below your 11pt floor')
    const offer = out.find((s) => s.id.startsWith('floor-'))!
    const applied = structuredClone(doc)
    offer.mutate(applied)
    // the floor moves; the target stays the author's
    expect(applied.metadata.page.fit.minBody).toBe(9)
    expect(applied.metadata.page.fit.target).toBe(1)
  })

  it('says so when the size it offers is below what prints legibly', async () => {
    const doc = docWith(['experience', 'education', 'skills'], 1)
    doc.metadata.page.fit.minBody = 11
    doc.metadata.typography.fontSize = 7.25
    const trial = async (c: ResumeDocument) => {
      const f = c.metadata.page.fit
      if (f.minBody === 8 && f.target === 1) return res(2, 0.99, 8 / 7.25, 1)
      if (f.minBody !== 6) return res(3, 0.6)
      return f.target === 1 ? res(1, 0.99, 0.83, 0.7) : res(2, 0.99, 8.1 / 7.25, 1)
    }
    const out = await suggestFits(doc, trial, res(3, 0.61, 1.517, 1, ['awards']))
    expect(out.map((s) => s.label)).toContain('Fit 2 pages: body 8pt, below your 11pt floor — small for print')
  })

  it('offers no floor change when the floor is already at its lowest, or when even that cannot reach the target', async () => {
    const low = docWith(['experience', 'education', 'skills'], 1)
    const floors: (number | null)[] = []
    const counted = async (c: ResumeDocument) => {
      floors.push(c.metadata.page.fit.minBody)
      return res(2, 0.99)
    }
    expect(await suggestFits(low, counted, res(2, 0.99, 0.7, 0.7, ['skills']))).toEqual([])
    // no floor trial: the floor is not the author's to let down here
    expect(floors.every((f) => f === low.metadata.page.fit.minBody)).toBe(true)
    const high = docWith(['experience', 'education', 'skills'], 1)
    high.metadata.page.fit.minBody = 10
    expect(await suggestFits(high, async () => res(2, 0.99, 0.7, 0.7), res(2, 0.99, 0.9, 0.9, ['skills']))).toEqual([])
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

describe('suggestFits — moves beyond type and spacing', () => {
  // A two-page résumé asked for one page, at a 9pt floor, used to end in
  // "Nothing better within your rules": one page needed ~7.6pt, and the only
  // levers the offers knew were the floor and section order (2026-10-24).
  const twoPages = () => {
    const d = docWith(['work', 'projects', 'skills', 'awards', 'interests'], 1)
    d.metadata.page.fit.minBody = 9
    d.metadata.page.margin = 18
    d.content.interests = [{ id: 'i1', name: 'Chess', keywords: [] } as never]
    return d
  }
  it('offers narrower margins when they alone bring the target in reach', async () => {
    const trial = async (c: ResumeDocument) => (c.metadata.page.margin < 18 ? res(1, 0.97, 0.95, 0.9) : res(2, 0.8))
    const out = await suggestFits(twoPages(), trial, res(2, 0.8))
    const m = out.find((o) => o.id.startsWith('margin-'))
    expect(m?.label).toBe('Narrower margins (13 mm): fits 1 page, text 9.5pt')
    const applied = twoPages()
    m!.mutate(applied)
    expect(applied.metadata.page.margin).toBe(13)
  })
  it('offers to leave out the least essential section first, keeping its content', async () => {
    const trial = async (c: ResumeDocument) => (c.metadata.layout.hidden.includes('interests') ? res(1, 0.99, 0.94, 0.9) : res(2, 0.8))
    const doc = twoPages()
    const out = await suggestFits(doc, trial, res(2, 0.8))
    const h = out.find((o) => o.id.startsWith('hide-'))
    expect(h?.label).toBe('Leave out Interests: fits 1 page, text 9.4pt')
    const applied = structuredClone(doc)
    h!.mutate(applied)
    expect(applied.metadata.layout.hidden).toContain('interests')
    expect(applied.content.interests).toHaveLength(1)
  })
  it('never offers to leave out a section with nothing in it, or one already hidden', async () => {
    const doc = twoPages()
    doc.content.interests = []
    doc.metadata.layout.hidden = ['awards']
    const tried: string[] = []
    const trial = async (c: ResumeDocument) => {
      tried.push(...c.metadata.layout.hidden.filter((k) => !doc.metadata.layout.hidden.includes(k)))
      return res(2, 0.8)
    }
    await suggestFits(doc, trial, res(2, 0.8))
    expect(tried).not.toContain('interests')
    expect(tried).not.toContain('awards')
  })
  it('ranks the moves that reach the target by the text size they keep', async () => {
    const trial = async (c: ResumeDocument) => {
      if (c.metadata.layout.hidden.includes('interests')) return res(1, 0.99, 0.94, 0.9)
      if (c.metadata.page.margin < 18) return res(1, 0.97, 0.98, 0.9)
      return res(2, 0.8)
    }
    const out = await suggestFits(twoPages(), trial, res(2, 0.8))
    expect(out[0].id.startsWith('margin-')).toBe(true)
  })
  it('when no single move reaches the target, offers the smallest combination that does', async () => {
    const doc = twoPages()
    doc.content.awards = [{ id: 'a1', title: 'Best', date: '', awarder: '', summary: '' } as never]
    const trial = async (c: ResumeDocument) => {
      const h = c.metadata.layout.hidden
      return c.metadata.page.margin < 18 && h.includes('interests') && h.includes('awards') ? res(1, 0.98, 0.92, 0.85) : res(2, 0.7)
    }
    const out = await suggestFits(doc, trial, res(2, 0.8))
    const combo = out.find((o) => o.id.startsWith('combo-'))
    expect(combo?.label).toBe('Narrower margins and leave out Interests, Awards: fits 1 page, text 9.2pt')
    const applied = structuredClone(doc)
    combo!.mutate(applied)
    expect(applied.metadata.page.margin).toBe(13)
    expect(applied.metadata.layout.hidden).toEqual(expect.arrayContaining(['interests', 'awards']))
  })
  it('makes no new move when the résumé already meets its target', async () => {
    let n = 0
    const out = await suggestFits(twoPages(), async () => (n++, res(1, 0.9)), res(1, 0.9))
    expect(out.filter((o) => /^(margin|hide)-/.test(o.id))).toEqual([])
  })
})

describe('explainShort — why the target is out of reach', () => {
  it('says what body size the target would need, measured with the floor let down', async () => {
    const d = docWith(['work'], 1)
    d.metadata.page.fit.minBody = 9
    const trial = async (c: ResumeDocument) => (c.metadata.page.fit.minBody === 6 ? res(1, 0.99, 0.76, 0.7) : res(2, 0.8))
    expect(await explainShort(d, trial, res(2, 0.8))).toEqual({ pages: 1, body: 7.6, floor: 9 })
  })
  it('says nothing when the target is met', async () => {
    const d = docWith(['work'], 1)
    expect(await explainShort(d, async () => res(1, 0.9), res(1, 0.9))).toBeNull()
  })
  it('says the target cannot be met at any size when even the lowest floor falls short', async () => {
    const d = docWith(['work'], 1)
    d.metadata.page.fit.minBody = 9
    expect(await explainShort(d, async () => res(2, 0.5), res(2, 0.8))).toEqual({ pages: 1, body: null, floor: 9 })
  })
})

describe('suggestFitOn — with Magic fit off', () => {
  const off = (fontSize = 10) => {
    const d = docWith(['experience', 'education', 'skills'], 1)
    d.metadata.page.autoFit = false
    d.metadata.page.fit.minBody = 9
    d.metadata.typography.fontSize = fontSize
    return d
  }

  it('offers one page fewer when a few lines spill over and 9pt or more still fits', async () => {
    const doc = off()
    const trial = async (c: ResumeDocument) => {
      expect(c.metadata.page.autoFit).toBe(true)
      expect(c.metadata.page.fit.target).toBe(1)
      expect(c.metadata.page.fit.minBody).toBe(9)
      return res(1, 0.99, 0.94, 0.9)
    }
    const out = await suggestFitOn(doc, trial, res(2, 0.12))
    expect(out?.label).toBe('Fit on 1 page: text 9.4pt')
    const applied = structuredClone(doc)
    out!.mutate(applied)
    expect(applied.metadata.page.autoFit).toBe(true)
    expect(applied.metadata.page.fit.target).toBe(1)
  })

  it('offers nothing when fitting would take the text under 9pt', async () => {
    expect(await suggestFitOn(off(), async () => res(2, 0.99, 0.9, 0.9), res(2, 0.12))).toBeNull()
  })

  it('does not measure at all when the last page is well used, on one page, or with the fit on', async () => {
    let calls = 0
    const t = async () => {
      calls++
      return res(1, 0.9)
    }
    expect(await suggestFitOn(off(), t, res(2, 0.6))).toBeNull()
    expect(await suggestFitOn(off(), t, res(1, 0.2))).toBeNull()
    const on = off()
    on.metadata.page.autoFit = true
    expect(await suggestFitOn(on, t, res(2, 0.1))).toBeNull()
    expect(calls).toBe(0)
  })
})
