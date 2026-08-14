import { parseColor, parsePx } from './style'
import { extractRuns } from './text'
import { parseCssColorFunction, type DrawOp } from './types'

/** parseColor only understands rgb()/rgba(); color-mix(..., transparent)
 *  backgrounds/borders serialize as color(srgb ...) instead — see types.ts. */
const bgColor = (css: string) => parseColor(css) ?? parseCssColorFunction(css)

/**
 * Resolve a computed `content` value (own or pseudo-element) to the literal
 * text it paints, or '' when it paints no text at all (none/normal/counter/
 * url/attr/…). Only quoted string literals are supported; CSS unicode
 * escapes (`\2022`) are decoded to their glyph.
 */
export function pseudoContentText(content: string): string {
  const s = (content || '').trim()
  const m = s.match(/^"((?:[^"\\]|\\.)*)"$|^'((?:[^'\\]|\\.)*)'$/)
  if (!m) return ''
  const inner = m[1] ?? m[2] ?? ''
  return inner.replace(/\\([0-9a-fA-F]{1,6})\s?/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
}

/** Element box relative to `root`'s bounding box, in CSS px. */
function boxOf(el: Element, root: HTMLElement) {
  const r = el.getBoundingClientRect()
  const rootRect = root.getBoundingClientRect()
  return { xPx: r.left - rootRect.left, yPx: r.top - rootRect.top, wPx: r.width, hPx: r.height }
}

const BORDER_EDGES = [
  { side: 'Top', x1: (b: ReturnType<typeof boxOf>) => b.xPx, y1: (b: ReturnType<typeof boxOf>) => b.yPx, x2: (b: ReturnType<typeof boxOf>) => b.xPx + b.wPx, y2: (b: ReturnType<typeof boxOf>) => b.yPx },
  { side: 'Right', x1: (b: ReturnType<typeof boxOf>) => b.xPx + b.wPx, y1: (b: ReturnType<typeof boxOf>) => b.yPx, x2: (b: ReturnType<typeof boxOf>) => b.xPx + b.wPx, y2: (b: ReturnType<typeof boxOf>) => b.yPx + b.hPx },
  { side: 'Bottom', x1: (b: ReturnType<typeof boxOf>) => b.xPx, y1: (b: ReturnType<typeof boxOf>) => b.yPx + b.hPx, x2: (b: ReturnType<typeof boxOf>) => b.xPx + b.wPx, y2: (b: ReturnType<typeof boxOf>) => b.yPx + b.hPx },
  { side: 'Left', x1: (b: ReturnType<typeof boxOf>) => b.xPx, y1: (b: ReturnType<typeof boxOf>) => b.yPx, x2: (b: ReturnType<typeof boxOf>) => b.xPx, y2: (b: ReturnType<typeof boxOf>) => b.yPx + b.hPx },
] as const

/** background, borders, then image — in that paint order. */
function boxOps(el: HTMLElement, root: HTMLElement, ops: DrawOp[]): void {
  const cs = getComputedStyle(el)
  const box = boxOf(el, root)

  const bg = bgColor(cs.backgroundColor)
  if (bg && bg.a > 0) {
    ops.push({ kind: 'rect', xPx: box.xPx, yPx: box.yPx, wPx: box.wPx, hPx: box.hPx, fill: bg, radiusPx: parsePx(cs.borderTopLeftRadius) })
  }

  for (const edge of BORDER_EDGES) {
    const width = parsePx(cs.getPropertyValue(`border-${edge.side.toLowerCase()}-width`))
    const style = cs.getPropertyValue(`border-${edge.side.toLowerCase()}-style`)
    if (width <= 0 || style === 'none' || style === 'hidden') continue
    const color = bgColor(cs.getPropertyValue(`border-${edge.side.toLowerCase()}-color`))
    if (!color || color.a === 0) continue
    ops.push({
      kind: 'line',
      x1Px: edge.x1(box), y1Px: edge.y1(box), x2Px: edge.x2(box), y2Px: edge.y2(box),
      widthPx: width, color, dashed: style === 'dashed' || style === 'dotted',
    })
  }

  if (el instanceof HTMLImageElement && el.src) {
    ops.push({ kind: 'image', xPx: box.xPx, yPx: box.yPx, wPx: box.wPx, hPx: box.hPx, src: el.src, radiusPx: parsePx(cs.borderTopLeftRadius) })
  }
}

/** ::before then ::after, background rect only — pseudo text is deferred. */
function pseudoOps(el: HTMLElement, root: HTMLElement, ops: DrawOp[]): void {
  for (const which of ['::before', '::after'] as const) {
    const cs = getComputedStyle(el, which)
    if (cs.content === 'none' || cs.display === 'none') continue

    const bg = bgColor(cs.backgroundColor)
    if (!bg || bg.a === 0) continue

    const box = boxOf(el, root)
    const wPx = parsePx(cs.width) || box.wPx
    const hPx = parsePx(cs.height) || parsePx(cs.fontSize)
    if (wPx <= 0 || hPx <= 0) continue

    ops.push({ kind: 'rect', xPx: box.xPx, yPx: box.yPx, wPx, hPx, fill: bg, radiusPx: parsePx(cs.borderTopLeftRadius) })
  }
}

/**
 * Walk the rendered print DOM and produce an ordered draw list. Document
 * order matters: later ops paint on top, exactly like CSS paints backgrounds
 * before the text that sits on them.
 */
export function buildDrawList(root: HTMLElement): DrawOp[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => {
      if (n.nodeType === Node.ELEMENT_NODE) {
        const el = n as HTMLElement
        if (/\bno-print\b/.test(el.className?.toString?.() ?? '')) return NodeFilter.FILTER_REJECT
        const cs = getComputedStyle(el)
        if (cs.display === 'none' || cs.visibility === 'hidden') return NodeFilter.FILTER_REJECT
      }
      return NodeFilter.FILTER_ACCEPT
    },
  })

  const ops: DrawOp[] = []
  // visit the root itself first, then every accepted node exactly once
  for (let n: Node | null = walker.currentNode; n; n = walker.nextNode()) {
    if (n.nodeType === Node.ELEMENT_NODE) {
      boxOps(n as HTMLElement, root, ops)
      pseudoOps(n as HTMLElement, root, ops)
    } else if (n.nodeType === Node.TEXT_NODE) {
      for (const run of extractRuns(n as Text, root)) ops.push({ kind: 'text', run })
    }
  }
  return ops
}
