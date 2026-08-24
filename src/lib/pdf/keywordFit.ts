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

/** Terms that must survive whole, plus the last-word-and-separator pair
 *  inside each one: when a term is too wide to keep whole, that shorter pair
 *  still fits, and keeping IT unbreakable is what stops a separator from
 *  opening the next line. All are single elements already, so this only ever
 *  toggles a style - it never restructures anyone's DOM. */
const KEYWORD_SELECTOR = '.rm-kw, .rm-kw-tail, .rm-chip'

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

/**
 * Shrinks a section heading just enough that no WORD in it has to break.
 *
 * The sidebar sets `overflow-wrap: break-word` so an over-long value cannot
 * escape its band. That is right for a value and wrong for a heading: at the
 * narrowest sidebar it split "CERTIFICATIONS" into "CERTIFICATIO" and "NS",
 * and "CORE COMPETENCIES" into "COMPETENCI" and "ES". A parser looking for
 * those sections finds neither - a heading is the marker it segments the whole
 * document by, so breaking one costs far more than breaking a keyword.
 *
 * Shrinking is the only option that keeps the word whole. Letting it overflow
 * means the band clips it and the characters vanish from the text layer, which
 * is how text has been lost here before.
 */
const MIN_HEADING_SCALE = 0.72
const SCALE_LADDER = [1, 0.95, 0.9, 0.85, 0.8, 0.76, MIN_HEADING_SCALE]

/**
 * Where a word too long for its column must not be allowed to break.
 *
 * SIDEBAR only - section titles there, and the CONTAINERS of a keyword list
 * rather than the terms themselves. A main-column heading has the width of the
 * page and never has to break, and shrinking one changed the width of the rule
 * beneath it, which the pixel comparison saw as a structural difference
 * between the two render paths. The containers rather than the terms: shrinking one term of a list and not its neighbours looks like a
 * mistake, while shrinking the group keeps it uniform. Measured on pinnacle at
 * a 22% sidebar, "Cross-Functional Collaboration" had "Collaboration" broken
 * into "Collaborati" and "on", which matches nothing.
 */
const FIT_CONTAINERS =
  '.rm-col-aside .rm-section-title, .rm-col-aside .rm-skill-inline, .rm-col-aside .rm-chips'

export function fitHeadingWords(root: HTMLElement): void {
  const boxes = Array.from(root.querySelectorAll<HTMLElement>(FIT_CONTAINERS))
  for (const el of boxes) el.style.fontSize = ''
  for (const el of boxes) {
    const over = worstWordOverflow(el, root)
    if (over <= 1) continue
    // Pick from a LADDER rather than computing a continuous scale. The same
    // heading is measured in two different trees - the export's print sheet and
    // the app's measure portal - and a continuous scale lands a fraction of a
    // pixel apart in each, which is enough for their page cuts to disagree
    // (the multi-page parity check allows half a pixel). A rung is the same
    // rung in both unless the measurement differs by a whole step.
    const scale = SCALE_LADDER.find((r) => r <= 1 / over) ?? MIN_HEADING_SCALE
    const size = parseFloat(getComputedStyle(el).fontSize || '0')
    if (size <= 0) continue
    if (scale >= 1) continue
    el.style.fontSize = `${size * scale}px`
  }
}

/**
 * How much the worst word overflows the box it actually has to fit in.
 *
 * Each word is measured against ITS OWN box, not the container's: in the chip
 * style every term sits in a padded chip narrower than the list around it, so
 * measuring the container credits a word with room it does not have - which is
 * why "Collaboration" kept breaking after the container was already being
 * shrunk. Returns 1 when everything fits.
 */
function worstWordOverflow(el: Element, root: Element): number {
  const doc = el.ownerDocument
  if (!doc) return 1
  let worst = 1
  const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  let node: Node | null
  while ((node = walker.nextNode())) {
    const text = node as Text
    if (!text.data.trim()) continue
    if (hiddenWithin(text.parentElement, root)) continue
    // Two pixels of margin: a range's client rects exclude the letter-spacing
    // after the last glyph, which uppercase headings carry, and landing exactly
    // on the column width leaves the result on the rounding boundary.
    const avail = boxWidthFor(text, el) - 2
    if (avail <= 0) continue
    for (const m of text.data.matchAll(/\S+/g)) {
      const range = doc.createRange()
      range.setStart(text, m.index)
      range.setEnd(text, m.index + m[0].length)
      let w = 0
      for (const r of range.getClientRects()) w += r.width
      if (w / avail > worst) worst = w / avail
    }
  }
  return worst
}

/** Content width of the box this text actually wraps inside - the chip, not
 *  the chip list; the heading, not the section. */
function boxWidthFor(text: Text, container: Element): number {
  let el: Element | null = text.parentElement
  while (el) {
    const cs = getComputedStyle(el)
    const parentDisplay = el.parentElement ? getComputedStyle(el.parentElement).display : ''
    const isItem = parentDisplay.includes('flex') || parentDisplay.includes('grid')
    if (cs.display !== 'inline' || isItem || el === container) return contentWidth(el as HTMLElement, cs)
    if (el === container) break
    el = el.parentElement
  }
  return contentWidth(container as HTMLElement, getComputedStyle(container))
}

/** Width available to TEXT: the box less its padding AND its borders. The
 *  bar section style puts a 3px border down the left of every heading, and
 *  crediting the text with it left the shrink a hair short - "CERTIFICATIONS"
 *  still spilled its final S. */
function contentWidth(el: HTMLElement, cs: CSSStyleDeclaration): number {
  const pad = parseFloat(cs.paddingLeft || '0') + parseFloat(cs.paddingRight || '0')
  const border = parseFloat(cs.borderLeftWidth || '0') + parseFloat(cs.borderRightWidth || '0')
  return Math.max(0, el.getBoundingClientRect().width - pad - border)
}


/** Width of the widest single word, measured unwrapped: summing a range's
 *  per-line rects gives the width the word WOULD occupy, even when it has
 *  already been broken across two lines. */
function widestWordPx(el: Element, root: Element): number {
  const doc = el.ownerDocument
  if (!doc) return 0
  let widest = 0
  const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  let node: Node | null
  while ((node = walker.nextNode())) {
    const text = node as Text
    if (!text.data.trim()) continue
    if (hiddenWithin(text.parentElement, root)) continue
    for (const m of text.data.matchAll(/\S+/g)) {
      const range = doc.createRange()
      range.setStart(text, m.index)
      range.setEnd(text, m.index + m[0].length)
      let w = 0
      for (const r of range.getClientRects()) w += r.width
      if (w > widest) widest = w
    }
  }
  return widest
}

/**
 * True when `el` sits under an `aria-hidden` element INSIDE `root`.
 *
 * Bounded deliberately: the editing canvas wraps the artboard in its own
 * aria-hidden chrome, so an unbounded `closest` reports every element in the
 * document as decoration. That silently made this whole pass a no-op - every
 * heading measured as zero-width and none were ever shrunk.
 */
function hiddenWithin(from: Element | null, root: Element): boolean {
  let el: Element | null = from
  while (el) {
    const v = el.getAttribute('aria-hidden')
    if (v !== null && v !== 'false') return true
    if (el === root) return false
    el = el.parentElement
  }
  return false
}
