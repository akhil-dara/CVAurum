import { describe, it, expect } from 'vitest'
import { hasPagePin, togglePagePin } from './pageBreakPins'
import type { PageBreakPin } from '@/types/metadata'

/**
 * One helper behind every "Start on new page" control - the section style
 * sheet, the entry hover cluster on the canvas and the entry card in the
 * panel - so a pin written from one surface reads back the same on the
 * others. A pin names a section, or one entry of it via the item's own id.
 */
describe('page pins', () => {
  it('toggling an entry pin writes {section, itemId}; toggling again removes it', () => {
    const breaks: PageBreakPin[] = []
    togglePagePin(breaks, 'work', 'w2')
    expect(breaks).toEqual([{ section: 'work', itemId: 'w2' }])
    expect(hasPagePin(breaks, 'work', 'w2')).toBe(true)
    togglePagePin(breaks, 'work', 'w2')
    expect(breaks).toEqual([])
    expect(hasPagePin(breaks, 'work', 'w2')).toBe(false)
  })

  it('a section pin and an entry pin in the same section are independent', () => {
    const breaks: PageBreakPin[] = [{ section: 'work' }]
    togglePagePin(breaks, 'work', 'w2')
    expect(breaks).toEqual([{ section: 'work' }, { section: 'work', itemId: 'w2' }])
    togglePagePin(breaks, 'work')
    expect(breaks).toEqual([{ section: 'work', itemId: 'w2' }])
    expect(hasPagePin(breaks, 'work')).toBe(false)
    expect(hasPagePin(breaks, 'work', 'w2')).toBe(true)
  })

  it('an entry pin belongs to one entry - a sibling in the same section is not pinned', () => {
    const breaks: PageBreakPin[] = [{ section: 'work', itemId: 'w2' }]
    expect(hasPagePin(breaks, 'work', 'w1')).toBe(false)
    expect(hasPagePin(breaks, 'education', 'w2')).toBe(false)
  })

  it('a section pin never reads as an entry pin, nor the reverse', () => {
    expect(hasPagePin([{ section: 'work' }], 'work', 'w1')).toBe(false)
    expect(hasPagePin([{ section: 'work', itemId: 'w1' }], 'work')).toBe(false)
  })
})
