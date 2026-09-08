import { describe, expect, it } from 'vitest'
import { phoneLayoutFor } from './layoutMode'

describe('phoneLayoutFor', () => {
  it('a phone is a phone, a narrow desktop window is a desktop', () => {
    expect(phoneLayoutFor(375, true)).toBe(true)
    expect(phoneLayoutFor(683, false)).toBe(false)
    expect(phoneLayoutFor(1366, false)).toBe(false)
  })
  it('a small tablet held upright is a phone; a 768px tablet is a desktop', () => {
    expect(phoneLayoutFor(700, true)).toBe(true)
    expect(phoneLayoutFor(768, true)).toBe(false)
  })
  it('under 560px nothing fits side by side, whatever the pointer', () => {
    expect(phoneLayoutFor(540, false)).toBe(true)
    expect(phoneLayoutFor(560, false)).toBe(false)
  })
})
