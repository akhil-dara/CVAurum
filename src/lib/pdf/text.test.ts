import { describe, it, expect } from 'vitest'
import { applyTextTransform, collapseWhitespace } from './text'

describe('applyTextTransform', () => {
  it('uppercases (our section titles are tracked uppercase)', () => {
    expect(applyTextTransform('Experience', 'uppercase')).toBe('EXPERIENCE')
  })
  it('lowercases', () => {
    expect(applyTextTransform('Experience', 'lowercase')).toBe('experience')
  })
  it('capitalises each word', () => {
    expect(applyTextTransform('senior engineer', 'capitalize')).toBe('Senior Engineer')
  })
  it('passes text through for none/unknown', () => {
    expect(applyTextTransform('Kept As-Is', 'none')).toBe('Kept As-Is')
    expect(applyTextTransform('Kept As-Is', '')).toBe('Kept As-Is')
  })
})

describe('collapseWhitespace', () => {
  it('collapses runs of whitespace to one space when white-space is normal', () => {
    expect(collapseWhitespace('Led   the\n  rebuild', 'normal')).toBe('Led the rebuild')
  })
  it('preserves text verbatim for pre/pre-wrap', () => {
    expect(collapseWhitespace('a   b', 'pre')).toBe('a   b')
    expect(collapseWhitespace('a   b', 'pre-wrap')).toBe('a   b')
  })
  it('handles an empty string', () => {
    expect(collapseWhitespace('', 'normal')).toBe('')
  })
  it('keeps a single leading/trailing space rather than trimming it', () => {
    // This is what separates adjacent inline runs on the same line (e.g.
    // plain text ending "...from 820ms to " immediately followed by a bold
    // "190ms" span): the trailing space must survive so the drawn text
    // doesn't read "to190ms".
    expect(collapseWhitespace('to ', 'normal')).toBe('to ')
    expect(collapseWhitespace(' 190ms', 'normal')).toBe(' 190ms')
    expect(collapseWhitespace('a  ', 'normal')).toBe('a ')
  })
})
