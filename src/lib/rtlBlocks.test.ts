import { describe, expect, it } from 'vitest'
import { RTL_BLOCK_CLASS } from './rtlBlocks'

describe('RTL_BLOCK_CLASS', () => {
  const block = new RegExp(`[${RTL_BLOCK_CLASS}]`)
  it('holds Hebrew, Arabic and the last Arabic presentation form', () => {
    for (const cp of [0x05d0, 0x0627, 0x06f4, 0xfb1d, 0xfefc]) expect(block.test(String.fromCodePoint(cp))).toBe(true)
  })
  it('never counts the byte-order mark, or Latin', () => {
    expect(block.test(String.fromCodePoint(0xfeff))).toBe(false)
    expect(block.test('Senior Engineer')).toBe(false)
  })
})
