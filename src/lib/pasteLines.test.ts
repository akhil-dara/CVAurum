import { describe, expect, it } from 'vitest'
import { splitPastedLines } from './pasteLines'

describe('splitPastedLines', () => {
  it('one bullet per line, markers and numbering stripped, blanks dropped', () => {
    expect(splitPastedLines('• Led the rebuild\n- Cut latency 40%\n\n* Mentored 6 engineers\n')).toEqual([
      'Led the rebuild', 'Cut latency 40%', 'Mentored 6 engineers',
    ])
    expect(splitPastedLines('1. First\r\n2) Second\r\n(3) Third\r\na. Fourth')).toEqual(['First', 'Second', 'Third', 'Fourth'])
    expect(splitPastedLines('– en dash\n— em dash\n· middle dot\n▪ square\n◦ ring\n> quote')).toEqual([
      'en dash', 'em dash', 'middle dot', 'square', 'ring', 'quote',
    ])
  })
  it('splits an inline list on bullet glyphs between spaces', () => {
    expect(splitPastedLines('Led the rebuild • Cut latency • Mentored')).toEqual(['Led the rebuild', 'Cut latency', 'Mentored'])
  })
  it('keeps a hyphen inside a line and a number that is not a marker', () => {
    expect(splitPastedLines('Cut p95 latency 820ms - 190ms\n2024 was the year')).toEqual(['Cut p95 latency 820ms - 190ms', '2024 was the year'])
  })
  it('a single line is one item; whitespace alone is nothing', () => {
    expect(splitPastedLines('  Just one point  ')).toEqual(['Just one point'])
    expect(splitPastedLines(' \n\t\n')).toEqual([])
  })
})
