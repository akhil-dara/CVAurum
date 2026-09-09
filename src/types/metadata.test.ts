import { describe, expect, it } from 'vitest'
import { PageSchema } from './metadata'

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
      minBody: 7,
      priority: 'both',
      lock: { name: false, headline: false, contacts: false, sectionGap: false },
    })
  })
  it('keeps what the author set and refuses a target it cannot fit', () => {
    const page = PageSchema.parse({ fit: { target: 2, minBody: 11, priority: 'type', lock: { name: true } } })
    expect(page.fit.target).toBe(2)
    expect(page.fit.minBody).toBe(11)
    expect(page.fit.priority).toBe('type')
    expect(page.fit.lock).toEqual({ name: true, headline: false, contacts: false, sectionGap: false })
    expect(() => PageSchema.parse({ fit: { target: 4 } })).toThrow()
  })
})
