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
