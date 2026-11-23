import { describe, expect, it } from 'vitest'
import { joinLineItems, rtlPages, type Item } from './layoutGraph'

/**
 * A right-to-left line reads from the right.
 *
 * pdf.js hands back one item per text-showing operator, each already in
 * reading order inside itself, and a Persian line mixing in a Latin word or a
 * number is several items. The importer used to join a line's items left to
 * right, which on a right-to-left page is the line backwards: the summary of a
 * Persian resume came back as "...TypeScript و React ... با ۸ مهندس". The
 * positions below are the real ones pdf.js reported for a native export.
 */
const item = (str: string, x: number, width: number, page = 1): Item => ({
  str,
  x,
  top: 100,
  width,
  height: 10,
  bold: false,
  page,
  col: 0,
  aside: false,
})

describe('joinLineItems: a right-to-left page', () => {
  it('reads a mixed Persian line from the right, every Latin word and digit in its place', () => {
    const items = [
      item('مهندس نرمافزار با', 481.7, 76.7),
      item('۸', 472.3, 6.5),
      item('سال تجربه در ساخت با', 263.1, 206.2),
      item('React', 232.1, 28.1),
      item('و', 224.3, 4.9),
      item('TypeScript', 169.3, 52.1),
      item('؛ کاهش زمان', 47.2, 122.1),
    ].sort((a, b) => a.x - b.x)
    expect(joinLineItems(items, true).replace(/\s+/g, ' ')).toBe('مهندس نرمافزار با ۸ سال تجربه در ساخت با React و TypeScript؛ کاهش زمان')
  })

  it('turns a punctuation-only item around: pdf.js leaves it in drawn order', () => {
    // "تا ۴۰٪." - the ٪ and the full stop are one right-to-left run drawn as
    // ".٪"; with no letter in it pdf.js does not reverse it.
    const items = [item('تا', 551.9, 6.5), item('۴۰', 537.9, 11), item('.٪', 529.5, 8.4)].sort((a, b) => a.x - b.x)
    expect(joinLineItems(items, true)).toBe('تا ۴۰٪.')
  })

  it('reads a row of Latin chips from the right', () => {
    const items = [item('React', 529.2, 24.9), item('TypeScript', 469.7, 46.6), item('Next.js', 426.4, 30.4)].sort((a, b) => a.x - b.x)
    expect(joinLineItems(items, true)).toBe('React TypeScript Next.js')
  })

  it('keeps a Latin phrase cut into flush pieces left to right inside the line', () => {
    // "Core Web Vitals: LCP" drawn as two pieces (a bold word, say), one word space apart.
    const items = [item('بهبود', 524.1, 22.8), item('Core Web', 417.1, 48), item('Vitals: LCP', 467.5, 50.5), item('از', 405, 6.3)].sort((a, b) => a.x - b.x)
    expect(joinLineItems(items, true).replace(/\s+/g, ' ')).toBe('بهبود Core Web Vitals: LCP از')
  })
})

describe('joinLineItems: a left-to-right page', () => {
  it('is the old left-to-right join for a Latin line', () => {
    const items = [item('Senior', 50, 30), item('Engineer', 84, 40), item('Mar 2021', 400, 40)]
    expect(joinLineItems(items, false)).toBe('Senior Engineer Mar 2021')
  })

  it('reads two Persian items side by side on an English line from the right', () => {
    const items = [item('Alex Morgan', 50, 120), item('نوری', 210, 20), item('علی', 174, 16)].sort((a, b) => a.x - b.x)
    expect(joinLineItems(items, false)).toBe('Alex Morgan علی نوری')
  })
})

describe('rtlPages', () => {
  it('names the pages whose letters are mostly right-to-left', () => {
    const items = [item('مهندس نرمافزار ارشد', 400, 100, 1), item('React', 300, 30, 1), item('Senior Software Engineer', 50, 150, 2), item('پریسا', 300, 20, 2)]
    expect([...rtlPages(items)]).toEqual([1])
  })
})
