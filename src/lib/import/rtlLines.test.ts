import { describe, expect, it } from 'vitest'
import { detectGutter, joinLineItems, rtlPages, type Item } from './layoutGraph'

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

describe('joinLineItems: a phrase in a wider-spaced face', () => {
  it('keeps a monospaced date in order: its word space is wider than the line average', () => {
    // meridian: the date is set in a monospaced face, one item per word.
    const items = [
      item('توسعهدهنده نرمافزار', 443.5, 114.9),
      item('Sep', 36.8, 18.5),
      item('2017', 61.5, 24.7),
      item('—', 92.4, 6.2),
      item('Feb', 104.7, 18.5),
      item('2021', 129.4, 24.7),
    ].sort((a, b) => a.x - b.x)
    expect(joinLineItems(items, true)).toBe('توسعهدهنده نرمافزار Sep 2017 — Feb 2021')
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

describe('detectGutter: a right-to-left page', () => {
  // A Persian line that mixes in a number or a Latin word is several pdf.js
  // items, one word space apart. Down a page of such lines the spaces can
  // line up, and the scan read the stripe they make as a column gutter: on
  // slate, atelier and contemporary the import cut "۳۸٪" in two and filed half
  // of every split line as a second column.
  const at = (str: string, x: number, width: number, top: number): Item => ({ str, x, top, width, height: 10, bold: false, page: 1, col: 0, aside: false })
  const lines = (gap: number) =>
    Array.from({ length: 24 }, (_, i) => [at('کاهش خطاهای پرداخت با بازنویسی', 289, 231, 100 + i * 14), at('ماژول سبد خرید ۳۸', 40, 283 - 40 - (gap - 6), 100 + i * 14)]).flat()

  it('does not read the word spaces of a line as a gutter', () => {
    expect(detectGutter(lines(6), 595)).toBeNull()
  })

  it('still finds a real gutter between two columns', () => {
    // The same page with a 30-point channel between the halves is two columns.
    const two = Array.from({ length: 24 }, (_, i) => [at('کاهش خطاهای پرداخت با بازنویسی', 320, 200, 100 + i * 14), at('ماژول سبد خرید ۳۸', 40, 250, 100 + i * 14)]).flat()
    expect(detectGutter(two, 595)).not.toBeNull()
  })

  it('leaves a left-to-right page as it was', () => {
    const latin = Array.from({ length: 24 }, (_, i) => [at('Reduced payment errors by', 40, 243, 100 + i * 14), at('rewriting the cart module', 289, 231, 100 + i * 14)]).flat()
    expect(detectGutter(latin, 595)).not.toBeNull()
  })
})
