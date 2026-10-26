/**
 * Justified paragraphs that would open wide gaps are set ragged instead.
 *
 * A browser justifies by stretching the spaces of every line but the last,
 * however far that takes them. A line holding a long URL, a product name or
 * only a few words ends up with gaps two or three spaces wide, and on a
 * résumé, where lines are long and words often are too, that is the one
 * place justified text looks broken (user report, 2026-10-26). There is no
 * CSS for "justify, but not past this much"; this pass measures instead.
 *
 * Every justified leaf block (a summary, a bullet, a rich-text paragraph) is
 * measured line by line: the width of each rendered space, grouped by the
 * line it sits on, against the paragraph's natural space - the spaces of its
 * last line, which is never stretched, or the font's own space when the last
 * line has none. When any other line's average gap passes LOOSE_GAP_LIMIT
 * the block is marked `data-ragged` and set flush-left (artboard.css).
 *
 * Alignment never moves a line break, so marking or clearing a block cannot
 * change any height, page cut or fit: the pass is safe to run on every render
 * of both trees, the canvas and the one the PDF is painted from - which is
 * what keeps their choice the same. It clears its own marks first, so it is
 * idempotent.
 */

/** Average gap over normal space past which a paragraph goes ragged.
 *  Typesetters hold spaces to about 1.33x; browsers allow anything. On a real
 *  justified résumé (95-character lines, long product names) the median
 *  paragraph reached 1.81x and a quarter 2.09x, so a tighter limit set half
 *  the page ragged and the alignment read as random. 2.0 catches the gaps a
 *  reader notices - the 3x rivers - and leaves the rest of the page even. */
export const LOOSE_GAP_LIMIT = 2

/** The widest line's average gap over the natural space, last line excluded.
 *  `lines` are the measured space widths on each line, top to bottom. */
export function looseRatio(lines: number[][], natural: number): number {
  if (!(natural > 0)) return 1
  let worst = 1
  for (let i = 0; i < lines.length - 1; i++) {
    const gaps = lines[i]
    if (!gaps.length) continue
    const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length
    worst = Math.max(worst, avg / natural)
  }
  return worst
}

const CANDIDATES = '.rm-col-main :is(.rm-item-summary, .rm-bullets li, .rm-rich, .rm-rich p)'

let measureCtx: CanvasRenderingContext2D | null = null
/** The font's own space, with the element's letter- and word-spacing. */
function fontSpace(el: Element): number {
  const cs = getComputedStyle(el)
  measureCtx ??= document.createElement('canvas').getContext('2d')
  if (!measureCtx) return 0
  measureCtx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
  const ls = parseFloat(cs.letterSpacing) || 0
  const ws = parseFloat(cs.wordSpacing) || 0
  return measureCtx.measureText(' ').width + ls + ws
}

/** Rendered space widths of a block, grouped by line, top to bottom, in the
 *  block's own CSS pixels. The canvas is drawn zoomed, and a range's client
 *  rects carry the zoom while the font's own space does not - compared
 *  unscaled, a paragraph on a 1.2x canvas measured 1.2x looser than the same
 *  paragraph in the print tree (2026-10-26). */
function spacesByLine(block: HTMLElement): number[][] {
  const doc = block.ownerDocument
  const scale = block.offsetWidth > 0 ? block.getBoundingClientRect().width / block.offsetWidth : 1
  const range = doc.createRange()
  const lines: { top: number; gaps: number[] }[] = []
  const walker = doc.createTreeWalker(block, NodeFilter.SHOW_TEXT)
  let node: Node | null
  while ((node = walker.nextNode())) {
    const text = node as Text
    const data = text.data
    for (let i = 0; i < data.length; i++) {
      if (data[i] !== ' ') continue
      range.setStart(text, i)
      range.setEnd(text, i + 1)
      const r = range.getClientRects()[0]
      // A space at a line's end collapses to nothing: not a gap.
      if (!r || r.width < 0.5) continue
      const line = lines.find((l) => Math.abs(l.top - r.top) < r.height * 0.5)
      if (line) line.gaps.push(r.width / scale)
      else lines.push({ top: r.top, gaps: [r.width / scale] })
    }
  }
  // Lines with no spaces at all (one long word) still count as lines: the
  // last line is the last one the block has, not the last one with a gap.
  const rects = [...block.getClientRects()]
  const blockBottom = rects.length ? Math.max(...rects.map((r) => r.bottom)) : 0
  lines.sort((a, b) => a.top - b.top)
  const last = lines[lines.length - 1]
  const lineH = parseFloat(getComputedStyle(block).lineHeight) || 0
  if (last && lineH > 0 && blockBottom - last.top > lineH * 1.5) lines.push({ top: blockBottom, gaps: [] })
  return lines.map((l) => l.gaps)
}

/** The paragraphs justification applies to: block-level leaves (a mark on an
 *  inline rich span - a bullet's editable text - changed nothing, since
 *  alignment belongs to the block a line sits in; a rich block made of
 *  paragraphs is judged paragraph by paragraph). Call with no marks set, or
 *  a ragged block reads as not justified. */
export function justifiedBlocks(root: Element): HTMLElement[] {
  const all = [...root.querySelectorAll<HTMLElement>(CANDIDATES)].filter((el) => getComputedStyle(el).display !== 'inline')
  const leaves = all.filter((el) => !all.some((o) => o !== el && el.contains(o)))
  return leaves.filter((el) => el.hasAttribute('data-ragged') || getComputedStyle(el).textAlign === 'justify')
}

/** Mark the justified blocks under `root` whose gaps run too wide; returns
 *  how many are now ragged. Clears earlier marks first. */
export function settleLooseLines(root: Element | null | undefined, limit = LOOSE_GAP_LIMIT): number {
  if (!root) return 0
  for (const el of root.querySelectorAll('[data-ragged]')) el.removeAttribute('data-ragged')
  let ragged = 0
  for (const el of justifiedBlocks(root)) {
    const lines = spacesByLine(el)
    if (lines.length < 2) continue
    const lastGaps = lines[lines.length - 1]
    const natural = lastGaps.length ? Math.min(...lastGaps) : fontSpace(el)
    if (looseRatio(lines, natural) > limit) {
      el.setAttribute('data-ragged', '')
      ragged++
    }
  }
  return ragged
}
