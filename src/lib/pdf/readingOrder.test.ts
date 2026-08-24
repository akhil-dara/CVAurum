import { describe, it, expect } from 'vitest'
import { mainColumnTextFirst, sidebarFirstOnContinuationPages } from './readingOrder'
import type { DrawOp, TextRun } from './types'

const run = (text: string): TextRun => ({
  text,
  xPx: 0,
  widthPx: 0,
  baselinePx: 0,
  sizePx: 10,
  family: 'Arimo',
  weight: 400,
  italic: false,
  color: { r: 0, g: 0, b: 0, a: 1 },
  letterSpacingPx: 0,
  isDecorative: false,
})
const text = (t: string, column?: 'main' | 'aside'): DrawOp => ({ kind: 'text', run: run(t), column })
const deco = (t: string, column?: 'main' | 'aside'): DrawOp => ({
  kind: 'text',
  run: { ...run(t), isDecorative: true },
  column,
})
const rect = (): DrawOp => ({ kind: 'rect', xPx: 0, yPx: 0, wPx: 1, hPx: 1, fill: { r: 0, g: 0, b: 0, a: 1 } })
const strs = (ops: DrawOp[]) => ops.map((o) => (o.kind === 'text' ? o.run.text : 'RECT'))

describe('mainColumnTextFirst', () => {
  it('moves sidebar text after main-column text so an ATS reads the name first', () => {
    const out = mainColumnTextFirst([
      text('SKILLS', 'aside'),
      text('TypeScript', 'aside'),
      text('Alex Morgan', 'main'),
      text('EXPERIENCE', 'main'),
    ])
    expect(strs(out)).toEqual(['Alex Morgan', 'EXPERIENCE', 'SKILLS', 'TypeScript'])
  })

  it('keeps each column in its own order', () => {
    const out = mainColumnTextFirst([text('a1', 'aside'), text('m1', 'main'), text('a2', 'aside'), text('m2', 'main')])
    expect(strs(out)).toEqual(['m1', 'm2', 'a1', 'a2'])
  })

  it('leaves decoration in place so backgrounds still paint under the text', () => {
    const out = mainColumnTextFirst([rect(), text('SKILLS', 'aside'), text('Name', 'main')])
    expect(strs(out)).toEqual(['RECT', 'Name', 'SKILLS'])
  })

  it('never reorders decorative glyphs, which are not part of the text layer', () => {
    const out = mainColumnTextFirst([deco('•', 'aside'), text('SKILLS', 'aside'), text('Name', 'main')])
    expect(strs(out)).toEqual(['•', 'Name', 'SKILLS'])
  })

  it('returns the very same array for a single-column document', () => {
    const ops = [text('Name', 'main'), text('EXPERIENCE', 'main'), rect()]
    expect(mainColumnTextFirst(ops)).toBe(ops)
  })

  it('is a no-op for a right-sidebar template, which is already in order', () => {
    const ops = [text('Name', 'main'), text('SKILLS', 'aside')]
    expect(strs(mainColumnTextFirst(ops))).toEqual(['Name', 'SKILLS'])
  })
})

const head = (t: string, column?: 'main' | 'aside'): DrawOp => ({
  kind: 'text',
  run: run(t),
  role: 'H2',
  column,
})

describe('sidebarFirstOnContinuationPages', () => {
  // Page 1 ends inside SKILLS; page 2 opens a fresh EDUCATION in the main
  // column and carries the rest of the skills in the sidebar. Main-first puts
  // the skills tail AFTER the EDUCATION heading, so a linear parser files it
  // under EDUCATION - the "skills and experience mixed up" report.
  const page1 = [head('SUMMARY', 'main'), text('did things', 'main'), head('SKILLS', 'aside'), text('Go', 'aside')]

  it('puts the sidebar first on a page where it continues and the main column starts fresh', () => {
    const page2 = [head('EDUCATION', 'main'), text('BSc', 'main'), text('Python', 'aside')]
    const out = sidebarFirstOnContinuationPages([page1, page2])
    expect(strs(out[1])).toEqual(['Python', 'EDUCATION', 'BSc'])
  })

  it('never reorders page 1 - the candidate name has to come first', () => {
    const out = sidebarFirstOnContinuationPages([page1])
    expect(out[0]).toBe(page1)
  })

  it('leaves a page alone when the sidebar starts its own section there', () => {
    const page2 = [head('EDUCATION', 'main'), head('LANGUAGES', 'aside'), text('Telugu', 'aside')]
    const out = sidebarFirstOnContinuationPages([page1, page2])
    expect(out[1]).toBe(page2)
  })

  it('still rejoins the sidebar when BOTH columns continue - the main half is stranded either way', () => {
    const page2 = [text('more experience', 'main'), text('Python', 'aside')]
    const out = sidebarFirstOnContinuationPages([page1, page2])
    expect(strs(out[1])).toEqual(['Python', 'more experience'])
  })

  it('keeps decoration ahead of the text it sits under', () => {
    const page2 = [rect(), head('EDUCATION', 'main'), text('Python', 'aside')]
    const out = sidebarFirstOnContinuationPages([page1, page2])
    expect(strs(out[1])).toEqual(['RECT', 'Python', 'EDUCATION'])
  })

  it('leaves a single-column document untouched', () => {
    const pages = [[text('a', 'main')], [text('b', 'main')]]
    expect(sidebarFirstOnContinuationPages(pages)).toBe(pages)
  })
})
