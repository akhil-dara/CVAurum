import { describe, expect, it } from 'vitest'
import { ARABIC_SCRIPT_CLASS, RTL_BLOCK_CLASS } from './rtlBlocks'

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

describe('ARABIC_SCRIPT_CLASS', () => {
  const arabic = new RegExp(`[${ARABIC_SCRIPT_CLASS}]`)
  it('holds the Arabic blocks, their supplements and presentation forms, to U+FEFC', () => {
    for (const cp of [0x0600, 0x0627, 0x06cc, 0x06f4, 0x0750, 0x077f, 0x08a0, 0x08ff, 0xfb50, 0xfdff, 0xfe70, 0xfefc]) {
      expect(arabic.test(String.fromCodePoint(cp))).toBe(true)
    }
  })
  it('never counts Hebrew, Syriac, Thaana, the byte-order mark, or Latin', () => {
    for (const cp of [0x05d0, 0x0710, 0x0780, 0x07c0, 0xfb1d, 0xfeff]) expect(arabic.test(String.fromCodePoint(cp))).toBe(false)
    expect(arabic.test('Senior Engineer')).toBe(false)
  })
})
