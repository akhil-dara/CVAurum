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
    expect(segmentByCoverage('Даниил Гогов', [latin, cyrillic])).toEqual([
      { text: 'Даниил', font: 1 },
      { text: ' ', font: 0 },
      { text: 'Гогов', font: 1 },
    ])
  })
  it('splits a mixed run where the script changes', () => {
    // A SPACE is matched through the chain from the start like any other
    // character, because that is what CSS font matching does - so it comes
    // from the primary family even between two Cyrillic words. It matters
    // because a space is not the same width in every family: see the marker
    // case in the module's own comment.
    expect(segmentByCoverage('Работа в Google Inc.', [latin, cyrillic])).toEqual([
      { text: 'Работа', font: 1 },
      { text: ' ', font: 0 },
      { text: 'в', font: 1 },
      { text: ' Google Inc.', font: 0 },
    ])
  })
  it('leading whitespace takes the first font that has it, not the text’s', () => {
    expect(segmentByCoverage('  Гогов', [latin, cyrillic])).toEqual([
      { text: '  ', font: 0 },
      { text: 'Гогов', font: 1 },
    ])
  })
  it('a space only the fallback family has still comes from that family', () => {
    // The bundled marks family carries a space of its own (0.26 em); a
    // Latin-only primary that somehow lacked one would hand the space on
    // down the chain exactly as the browser does.
    const noSpace = (cp: number) => cp !== 0x20 && cp < 0x0250
    expect(segmentByCoverage('a b', [noSpace, cyrillic])).toEqual([
      { text: 'a', font: 0 },
      { text: ' ', font: 1 },
      { text: 'b', font: 0 },
    ])
  })
  it('marks characters no font has with -1 so the painter can drop and report them', () => {
    expect(segmentByCoverage('అఖిల్ Rao', [latin, cyrillic])).toEqual([
      { text: 'అఖిల్', font: -1 },
      { text: ' Rao', font: 0 },
    ])
  })
  it('a neutral no chain font has follows its neighbour rather than being dropped', () => {
    const noTab = (cp: number) => cp !== 9 && cp < 0x0250
    expect(segmentByCoverage('a	b', [noTab])).toEqual([{ text: 'a	b', font: 0 }])
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
