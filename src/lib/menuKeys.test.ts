import { describe, expect, it } from 'vitest'
import { nextMenuIndex } from './menuKeys'

describe('moving through a menu with the keyboard', () => {
  it('goes down and up one item at a time', () => {
    expect(nextMenuIndex(0, 4, 'ArrowDown')).toBe(1)
    expect(nextMenuIndex(2, 4, 'ArrowUp')).toBe(1)
  })
  it('wraps at either end, the way menus do', () => {
    expect(nextMenuIndex(3, 4, 'ArrowDown')).toBe(0)
    expect(nextMenuIndex(0, 4, 'ArrowUp')).toBe(3)
  })
  it('enters at the first item going down and the last going up, from the menu itself', () => {
    expect(nextMenuIndex(-1, 4, 'ArrowDown')).toBe(0)
    expect(nextMenuIndex(-1, 4, 'ArrowUp')).toBe(3)
  })
  it('jumps to the ends with Home and End', () => {
    expect(nextMenuIndex(2, 4, 'Home')).toBe(0)
    expect(nextMenuIndex(1, 4, 'End')).toBe(3)
  })
  it('leaves every other key alone', () => {
    expect(nextMenuIndex(1, 4, 'Tab')).toBeNull()
    expect(nextMenuIndex(1, 0, 'ArrowDown')).toBeNull()
  })
})
