import { describe, expect, it } from 'vitest'
import { effectiveMarks, applyMarks } from './sections'

describe('effectiveMarks', () => {
  it('returns empty when neither logo nor logos is set', () => {
    expect(effectiveMarks({})).toEqual([])
    expect(effectiveMarks({ logo: '', logos: [] })).toEqual([])
  })

  it('falls back to the legacy logo when logos is empty/absent', () => {
    expect(effectiveMarks({ logo: 'data:image/png;base64,A' })).toEqual(['data:image/png;base64,A'])
    expect(effectiveMarks({ logo: 'data:image/png;base64,A', logos: [] })).toEqual(['data:image/png;base64,A'])
  })

  it('uses logos when non-empty, regardless of logo', () => {
    expect(effectiveMarks({ logos: ['a', 'b'] })).toEqual(['a', 'b'])
  })

  it('prefers logos over logo when BOTH are set', () => {
    expect(effectiveMarks({ logo: 'legacy', logos: ['a', 'b'] })).toEqual(['a', 'b'])
  })
})

describe('applyMarks', () => {
  it('writes a single mark through the legacy `logo` field on an unpromoted entry', () => {
    const item: { logo?: string; logos?: string[] } = { logos: [] }
    applyMarks(item, ['a'])
    expect(item.logo).toBe('a')
    expect(item.logos).toEqual([]) // untouched — never promoted
  })

  it('clears the legacy `logo` field when removing the only mark on an unpromoted entry', () => {
    const item: { logo?: string; logos?: string[] } = { logo: 'a', logos: [] }
    applyMarks(item, [])
    expect(item.logo).toBe('')
    expect(item.logos).toEqual([])
  })

  it('replacing a single legacy mark in place stays on `logo` (byte-identical mutation to before this feature)', () => {
    const item: { logo?: string; logos?: string[] } = { logo: 'a', logos: [] }
    applyMarks(item, ['b'])
    expect(item.logo).toBe('b')
    expect(item.logos).toEqual([])
  })

  it('promotes to `logos` when a second mark is added, leaving legacy `logo` untouched', () => {
    const item: { logo?: string; logos?: string[] } = { logo: 'a', logos: [] }
    applyMarks(item, ['a', 'b'])
    expect(item.logos).toEqual(['a', 'b'])
    expect(item.logo).toBe('a') // untouched, now vestigial
  })

  it('keeps writing through `logos` once promoted, even shrinking back to 1 mark', () => {
    const item: { logo?: string; logos?: string[] } = { logo: 'a', logos: ['a', 'b'] }
    applyMarks(item, ['b'])
    expect(item.logos).toEqual(['b'])
    expect(item.logo).toBe('a') // still untouched/stale
  })

  it('clears both fields when a promoted entry is emptied out, so the stale legacy value cannot resurrect', () => {
    const item: { logo?: string; logos?: string[] } = { logo: 'a', logos: ['a', 'b'] }
    applyMarks(item, [])
    expect(item.logos).toEqual([])
    expect(item.logo).toBe('')
    expect(effectiveMarks(item)).toEqual([])
  })

  it('round-trips through effectiveMarks after every step of add -> add -> remove -> remove', () => {
    const item: { logo?: string; logos?: string[] } = {}
    applyMarks(item, ['a'])
    expect(effectiveMarks(item)).toEqual(['a'])
    applyMarks(item, ['a', 'b'])
    expect(effectiveMarks(item)).toEqual(['a', 'b'])
    applyMarks(item, ['a'])
    expect(effectiveMarks(item)).toEqual(['a'])
    applyMarks(item, [])
    expect(effectiveMarks(item)).toEqual([])
  })
})
