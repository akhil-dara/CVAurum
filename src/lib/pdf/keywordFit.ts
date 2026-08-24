/**
 * Keeps each keyword whole when a list wraps, so a break falls BETWEEN terms
 * and never inside one.
 *
 * A skills list reaches the page as a run of terms separated by dots or
 * commas. Wherever the line happens to run out, CSS breaks at the nearest
 * space - which is routinely inside a term, leaving "Queue &" ending one line
 * and "Workload Analysis" starting the next. Every reader that rebuilds text
 * from the page, an ATS included, then sees two fragments instead of the
 * phrase someone searched for.
 *
 * The fix is `white-space: nowrap` on the term, but only where the term
 * actually FITS: CSS has no conditional form of it, and a nowrap span wider
 * than its column does not wrap - it overflows and is clipped, which deletes
 * the characters outright (measured: a 161px span in a 140px column overflows
 * even with `overflow-wrap: break-word` on the parent). So each term is
 * measured before it is marked.
 *
 * This runs from the Artboard, which both the on-screen preview and the export
 * render, so the two wrap identically. Doing it only to the export's DOM makes
 * the PDF disagree with the preview it was previewed from.
 */

/** Terms that must survive whole. Both are single elements already, so this
 *  only ever toggles a style - it never restructures anyone's DOM. */
const KEYWORD_SELECTOR = '.rm-kw, .rm-chip'

/**
 * Width available to `el`, in CSS px.
 *
 * A term inside a flex or grid row gets its own box, not the row's: measuring
 * against the row would count the space taken by a right-aligned date and call
 * an over-wide term a fit.
 */
function availableWidth(el: Element): number {
  let cur: Element | null = el.parentElement
  while (cur) {
    const parent: HTMLElement | null = cur.parentElement
    if (parent) {
      const display = getComputedStyle(parent).display
      if (display.includes('flex') || display.includes('grid')) return cur.getBoundingClientRect().width
    }
    const cs = getComputedStyle(cur)
    if (cs.display !== 'inline') {
      const pad = parseFloat(cs.paddingLeft || '0') + parseFloat(cs.paddingRight || '0')
      return Math.max(0, cur.getBoundingClientRect().width - pad)
    }
    cur = parent
  }
  return Number.POSITIVE_INFINITY
}

/**
 * Width `el`'s text would occupy on one line, even when it currently wraps.
 *
 * `getBoundingClientRect` cannot answer this for an inline element: for one
 * that has already wrapped it returns the containing block's width, so "fits"
 * and "already broken in two" measure the same. Each line gets its own client
 * rect, so their widths sum to the unwrapped width.
 */
function naturalWidth(el: Element): number {
  let sum = 0
  for (const r of el.getClientRects()) sum += r.width
  return sum
}

/**
 * Marks every keyword that fits its column unbreakable, and unmarks every one
 * that does not.
 *
 * Idempotent, and safe to run after each render: the marks are cleared before
 * anything is measured, so a term that stopped fitting - the sidebar narrowed,
 * the font grew - gives up its mark instead of overflowing.
 */
export function applyKeywordFit(root: HTMLElement): void {
  const terms = Array.from(root.querySelectorAll<HTMLElement>(KEYWORD_SELECTOR))
  if (!terms.length) return
  for (const el of terms) el.style.whiteSpace = ''
  // Measure every term against the unmarked layout FIRST: marking as we go
  // would measure each term against a layout half-changed by the ones before.
  const measured = terms.map((el) => ({ el, naturalPx: naturalWidth(el), availPx: availableWidth(el) }))
  for (const m of measured) {
    if (m.naturalPx <= m.availPx - 1) m.el.style.whiteSpace = 'nowrap'
  }
  if (import.meta.env?.DEV) {
    // What was kept whole and what was conceded, with the two widths behind
    // each call, so the keyword gate can check the arithmetic rather than
    // take this pass's word for it.
    const gaveUp = measured.filter((m) => m.naturalPx > m.availPx - 1)
    ;(window as unknown as Record<string, unknown>).__cvaKeywordUnits = {
      kept: measured.filter((m) => m.naturalPx <= m.availPx - 1).map((m) => m.el.textContent || ''),
      gaveUp: gaveUp.map((m) => m.el.textContent || ''),
      gaveUpDetail: gaveUp.map((m) => ({ text: m.el.textContent || '', naturalPx: m.naturalPx, availPx: m.availPx })),
    }
  }
}
