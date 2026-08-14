import { parseColor, parseFontWeight, parsePx } from './style'
import { parseCssColorFunction, type TextRun } from './types'

/** parseColor only understands rgb()/rgba(); color-mix(..., transparent)
 *  text colors serialize as color(srgb ...) instead — see types.ts. */
const textColor = (css: string) => parseColor(css) ?? parseCssColorFunction(css)

/** The browser paints the TRANSFORMED text, not the source text node. */
export function applyTextTransform(text: string, transform: string): string {
  if (transform === 'uppercase') return text.toUpperCase()
  if (transform === 'lowercase') return text.toLowerCase()
  if (transform === 'capitalize') return text.replace(/\b\p{L}/gu, (c) => c.toUpperCase())
  return text
}

/** With white-space: normal the browser collapses whitespace runs to one space. */
export function collapseWhitespace(text: string, whiteSpace: string): string {
  if (/^(pre|pre-wrap|break-spaces)$/.test(whiteSpace)) return text
  return text.replace(/\s+/g, ' ')
}

const ascentCache = new Map<string, number>()
let measureCtx: CanvasRenderingContext2D | null = null

/** Distance from the top of the text box down to the alphabetic baseline. */
export function ascentPx(cssFont: string): number {
  let a = ascentCache.get(cssFont)
  if (a == null) {
    if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d')
    measureCtx!.font = cssFont
    const m = measureCtx!.measureText('Hxg')
    a = m.fontBoundingBoxAscent ?? m.actualBoundingBoxAscent
    ascentCache.set(cssFont, a)
  }
  return a
}

/** Rendered width of `text` in `cssFont` (a canvas font shorthand, e.g.
 *  `700 9px "Source Sans 3"`) — used to right/center-align synthesized
 *  content (list markers, generated-content pseudo text) we can't lay out
 *  the way the browser does since we're not actually flowing it. */
export function measureTextWidthPx(text: string, cssFont: string): number {
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d')
  measureCtx!.font = cssFont
  return measureCtx!.measureText(text).width
}

/**
 * Turn a DOM Text node into per-LINE runs carrying exactly what the painter
 * needs: the rendered string, its x, its baseline y, and its style. Coordinates
 * are in CSS px relative to `root` — the painter converts to points.
 */
export function extractRuns(node: Text, root: HTMLElement): TextRun[] {
  const parent = node.parentElement
  const data = node.data
  if (!parent || data.trim() === '') return []

  const cs = getComputedStyle(parent)
  if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity || '1') === 0) return []

  const color = textColor(cs.color)
  if (!color || color.a === 0) return []

  const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
  const rootRect = root.getBoundingClientRect()
  const len = data.length
  if (len === 0) return []

  const range = document.createRange()

  // Walk character offsets, splitting into per-line segments by comparing each
  // character's top to the previous one.
  const segments: Array<{ start: number; end: number }> = []
  let segStart = 0
  let prevTop: number | null = null

  for (let i = 0; i < len; i++) {
    range.setStart(node, i)
    range.setEnd(node, i + 1)
    const rect = range.getBoundingClientRect()
    const top = rect.top
    if (prevTop != null && Math.abs(top - prevTop) > 1) {
      segments.push({ start: segStart, end: i })
      segStart = i
    }
    prevTop = top
  }
  segments.push({ start: segStart, end: len })

  const runs: TextRun[] = []
  for (const seg of segments) {
    if (seg.end <= seg.start) continue
    range.setStart(node, seg.start)
    range.setEnd(node, seg.end)
    const rect = range.getBoundingClientRect()

    const text = applyTextTransform(collapseWhitespace(data.slice(seg.start, seg.end), cs.whiteSpace), cs.textTransform)
    if (text.trim() === '') continue

    runs.push({
      text,
      xPx: rect.left - rootRect.left,
      widthPx: rect.right - rect.left,
      baselinePx: rect.top - rootRect.top + ascentPx(font),
      sizePx: parsePx(cs.fontSize),
      family: cs.fontFamily,
      weight: parseFontWeight(cs.fontWeight),
      italic: cs.fontStyle === 'italic',
      color,
      letterSpacingPx: cs.letterSpacing === 'normal' ? 0 : parsePx(cs.letterSpacing),
      isDecorative: false,
    })
  }

  return runs
}
