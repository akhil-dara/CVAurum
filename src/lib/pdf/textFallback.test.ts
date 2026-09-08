import { describe, expect, it } from 'vitest'
import { fontCoveringAll, mayNeedFallback, segmentByCoverage } from './textFallback'

const latin = (cp: number) => cp < 0x0250
const cyrillic = (cp: number) => cp < 0x0250 || (cp >= 0x0400 && cp <= 0x04ff)
const greekOnly = (cp: number) => cp >= 0x0370 && cp <= 0x03ff

describe('mayNeedFallback', () => {
  it('lets plain Latin text through untouched', () => {
    expect(mayNeedFallback('Senior Software Engineer — 2021 – Present, €50k, “quoted”')).toBe(false)
    expect(mayNeedFallback('Ştefan Łukasz Đorđe Ünal')).toBe(false)
  })
  it('flags Cyrillic, Greek and other scripts', () => {
    expect(mayNeedFallback('Даниил Гогов')).toBe(true)
    expect(mayNeedFallback('Αλέξανδρος')).toBe(true)
    expect(mayNeedFallback('Nguyễn')).toBe(true)
  })
})

describe('segmentByCoverage', () => {
  it('keeps a run its own font can draw as one piece', () => {
    expect(segmentByCoverage('Senior Engineer', [latin, cyrillic])).toEqual([{ text: 'Senior Engineer', font: 0 }])
  })
  it('hands a Cyrillic run to the first font that has it', () => {
    expect(segmentByCoverage('Даниил Гогов', [latin, cyrillic])).toEqual([{ text: 'Даниил Гогов', font: 1 }])
  })
  it('splits a mixed run where the script changes, spaces following the text before them', () => {
    expect(segmentByCoverage('Работа в Google Inc.', [latin, cyrillic])).toEqual([
      { text: 'Работа в ', font: 1 },
      { text: 'Google Inc.', font: 0 },
    ])
  })
  it('leading whitespace takes the first visible character’s font', () => {
    expect(segmentByCoverage('  Гогов', [latin, cyrillic])).toEqual([{ text: '  Гогов', font: 1 }])
  })
  it('marks characters no font has with -1 so the painter can drop and report them', () => {
    expect(segmentByCoverage('అఖిల్ Rao', [latin, cyrillic])).toEqual([
      { text: 'అఖిల్ ', font: -1 },
      { text: 'Rao', font: 0 },
    ])
  })
  it('an all-whitespace run takes the primary font', () => {
    expect(segmentByCoverage('   ', [latin, cyrillic])).toEqual([{ text: '   ', font: 0 }])
  })
})

describe('fontCoveringAll', () => {
  it('names the first font that draws the whole run', () => {
    expect(fontCoveringAll('ОПИТ', [latin, cyrillic, greekOnly])).toBe(1)
    expect(fontCoveringAll('EXPERIENCE', [latin, cyrillic])).toBe(0)
    expect(fontCoveringAll('ΕΜΠΕΙΡΙΑ', [latin, cyrillic, greekOnly])).toBe(2)
  })
  it('returns -1 when no single font covers it', () => {
    expect(fontCoveringAll('ΕΜΠΕΙΡΙΑ 2021', [latin, cyrillic, greekOnly])).toBe(-1)
  })
})
