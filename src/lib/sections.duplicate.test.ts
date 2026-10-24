/**
 * Duplicating an entry copies all of it - title, dates, every bullet - into
 * a new entry right below the original, with an id of its own so the two
 * edit, move and delete independently.
 */
import { describe, it, expect } from 'vitest'
import { duplicateItem } from './sections'
import { createDocument } from '@/data/defaults'

describe('duplicateItem', () => {
  it('inserts a full copy directly after the original, under a new id', () => {
    const { content } = createDocument({ sample: true })
    const first = content.work[0]
    const newId = duplicateItem(content, 'work', first.id!)
    expect(newId).toBeTruthy()
    expect(newId).not.toBe(first.id)
    const copy = content.work[1]
    expect(copy.id).toBe(newId)
    expect({ ...copy, id: first.id }).toEqual(first)
  })

  it('the copy is independent: editing it leaves the original alone', () => {
    const { content } = createDocument({ sample: true })
    const first = content.work[0]
    const before = first.highlights.slice()
    duplicateItem(content, 'work', first.id!)
    content.work[1].highlights.push('only in the copy')
    expect(content.work[0].highlights).toEqual(before)
  })

  it('returns null and changes nothing for an id that is not there', () => {
    const { content } = createDocument({ sample: true })
    const n = content.work.length
    expect(duplicateItem(content, 'work', 'gone')).toBeNull()
    expect(content.work.length).toBe(n)
  })
})
