import { describe, it, expect } from 'vitest'
import { pseudoContentText } from './walk'

describe('pseudoContentText', () => {
  it('unwraps a quoted content string', () => {
    expect(pseudoContentText('"|"')).toBe('|')
    expect(pseudoContentText("'-'")).toBe('-')
  })
  it('treats none/normal as empty', () => {
    expect(pseudoContentText('none')).toBe('')
    expect(pseudoContentText('normal')).toBe('')
  })
  it('ignores non-string content like counters and images', () => {
    expect(pseudoContentText('counter(x)')).toBe('')
    expect(pseudoContentText('url("a.png")')).toBe('')
  })
  it('decodes an escaped unicode glyph', () => {
    expect(pseudoContentText('"\\2022"')).toBe('\u2022')
  })
})
