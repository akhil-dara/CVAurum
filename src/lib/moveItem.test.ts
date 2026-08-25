import { describe, it, expect } from 'vitest'
import { moveItem } from './sections'
import type { ResumeContent } from '@/types/document'

const content = () =>
  ({
    skills: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    custom: [{ id: 's1', items: [{ id: 'x' }, { id: 'y' }] }],
  }) as unknown as ResumeContent

const ids = (list: { id: string }[]) => list.map((x) => x.id)

describe('moveItem', () => {
  it('moves an entry later', () => {
    const c = content()
    moveItem(c, 'skills', 'a', 1)
    expect(ids(c.skills as never)).toEqual(['b', 'a', 'c'])
  })

  it('moves an entry earlier', () => {
    const c = content()
    moveItem(c, 'skills', 'c', -1)
    expect(ids(c.skills as never)).toEqual(['a', 'c', 'b'])
  })

  it('does nothing at the ends, rather than wrapping around', () => {
    const c = content()
    moveItem(c, 'skills', 'a', -1)
    moveItem(c, 'skills', 'c', 1)
    expect(ids(c.skills as never)).toEqual(['a', 'b', 'c'])
  })

  it('moves an entry of a custom section', () => {
    const c = content()
    moveItem(c, 'custom-s1', 'x', 1)
    expect(ids(c.custom[0].items as never)).toEqual(['y', 'x'])
  })

  it('ignores an id that is not there, and a section that is not a list', () => {
    const c = content()
    expect(() => moveItem(c, 'skills', 'nope', 1)).not.toThrow()
    expect(() => moveItem(c, 'basics', 'a', 1)).not.toThrow()
    expect(ids(c.skills as never)).toEqual(['a', 'b', 'c'])
  })
})
