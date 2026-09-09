import { describe, expect, it } from 'vitest'
import { defaultMetadata } from '@/data/defaults'
import { fitRulesOf, fitSizesPt, formatFitReadout } from './fitReadout'

const meta = () => {
  const m = defaultMetadata()
  m.typography.fontSize = 10
  m.typography.sectionTitleScale = 1.2
  m.typography.headingScale = 1.5
  m.layout.sectionGap = 10
  m.layout.itemGap = 6
  return m
}

describe('fitRulesOf', () => {
  it('hands the search the document’s rules and the body size as set', () => {
    const m = meta()
    m.page.fit = { target: 2, minBody: 11, priority: 'type', lock: { name: false, headline: false, contacts: false, sectionGap: false } }
    expect(fitRulesOf(m)).toEqual({ target: 2, minBody: 11, fontSize: 10, priority: 'type' })
  })
})

describe('fitSizesPt', () => {
  it('follows the two scales the renderer draws from', () => {
    const s = fitSizesPt(meta(), { type: 0.9, space: 0.8 })
    expect(s.body).toBeCloseTo(9, 5)
    expect(s.heading).toBeCloseTo(10.8, 5)
    expect(s.name).toBeCloseTo(9 * (1.55 + 1.5 * 0.62), 5)
    expect(s.sectionGap).toBeCloseTo(8, 5)
    expect(s.entryGap).toBeCloseTo(4.8, 5)
  })
  it('a locked name and a locked section gap stay as set', () => {
    const m = meta()
    m.page.fit.lock.name = true
    m.page.fit.lock.sectionGap = true
    const s = fitSizesPt(m, { type: 0.9, space: 0.8 })
    expect(s.name).toBeCloseTo(10 * (1.55 + 1.5 * 0.62), 5)
    expect(s.sectionGap).toBe(10)
    expect(s.entryGap).toBeCloseTo(4.8, 5)
  })
})

describe('formatFitReadout', () => {
  it('says what the fit did and how full the pages are', () => {
    const line = formatFitReadout(meta(), { fit: { type: 0.94, space: 0.85 }, pages: 1, lastPageFill: 0.98 })
    expect(line).toBe('Fitted: body 9.4pt, headings 11.3pt, name 23.3pt, gaps 8.5pt / 5.1pt · 1 page, 98% full')
  })
  it('says “As set” when nothing moved, and names the last page on a longer résumé', () => {
    const m = meta()
    m.page.fit.target = 2
    const line = formatFitReadout(m, { fit: { type: 1, space: 1 }, pages: 2, lastPageFill: 0.23 })
    expect(line).toBe('As set: body 10pt, headings 12pt, name 24.8pt, gaps 10pt / 6pt · 2 pages, page 2 is 23% full')
  })
  it('says when the page target was out of reach and the fit fell back to more pages', () => {
    const line = formatFitReadout(meta(), { fit: { type: 0.7, space: 0.7 }, pages: 2, lastPageFill: 1 })
    expect(line).toBe('Fitted: body 7pt, headings 8.4pt, name 17.4pt, gaps 7pt / 4.2pt · 2 pages, page 2 is 100% full · 1 page is out of reach within your rules')
    const m = meta()
    m.page.fit.target = 2
    expect(formatFitReadout(m, { fit: { type: 0.7, space: 0.7 }, pages: 3, lastPageFill: 0.5 })).toContain('· 2 pages are out of reach within your rules')
  })
  it('says Off with the page count when the fit is off, and Measuring before the first result', () => {
    const m = meta()
    m.page.autoFit = false
    expect(formatFitReadout(m, { fit: { type: 1, space: 1 }, pages: 2, lastPageFill: 0.4 })).toBe('Off · 2 pages, page 2 is 40% full')
    expect(formatFitReadout(meta(), null)).toBe('Measuring…')
  })
})
