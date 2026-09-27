import { describe, expect, it } from 'vitest'
import { defaultMetadata } from '@/data/defaults'
import { exceedsOnePage, onePageMarginMm } from './metrics'

/**
 * A page whose text reaches a little into the bottom margin still counts as
 * one page - the tolerance both the export and the preview allow. A page
 * with a foot has something in that margin, so it allows none: the text
 * would run into the foot.
 */
describe('onePageMarginMm', () => {
  it('is the page margin, unless every page carries a foot', () => {
    const m = defaultMetadata()
    m.page.margin = 12
    expect(onePageMarginMm(m)).toBe(12)
    m.layout.pageFoot = true
    expect(onePageMarginMm(m)).toBe(0)
  })
  it('so content a margin past the page is two pages once a foot is drawn', () => {
    const m = defaultMetadata()
    m.page.margin = 12
    const pageH = 1122.52
    expect(exceedsOnePage(pageH + 20, pageH, onePageMarginMm(m))).toBe(false)
    m.layout.pageFoot = true
    expect(exceedsOnePage(pageH + 20, pageH, onePageMarginMm(m))).toBe(true)
  })
  it('a page drawn exactly one page tall is one page, even measured a hair over', () => {
    // The page height reaches CSS rounded to 0.01px (1122.52 for A4's
    // 1122.5197), so a root held at one page tall measures a few hundredths
    // OVER the page - which, with no margin allowed, was a page two.
    expect(exceedsOnePage(1122.52, 1122.5196850393702, 0)).toBe(false)
    expect(exceedsOnePage(1123.6, 1122.5196850393702, 0)).toBe(true)
  })
})
