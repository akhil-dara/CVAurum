import { parseColor, parseFontWeight, parsePx } from './style'
import { ascentPx, extractRuns, measureTextWidthPx } from './text'
import { parseCssColorFunction, type DrawOp, type TextRun } from './types'

/** parseColor only understands rgb()/rgba(); color-mix(..., transparent)
 *  backgrounds/borders serialize as color(srgb ...) instead — see types.ts. */
const parseAnyColor = (css: string) => parseColor(css) ?? parseCssColorFunction(css)

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

  const bg = parseAnyColor(cs.backgroundColor)
  if (bg && bg.a > 0) {
    ops.push({ kind: 'rect', xPx: box.xPx, yPx: box.yPx, wPx: box.wPx, hPx: box.hPx, fill: bg, radiusPx: parsePx(cs.borderTopLeftRadius) })
  }

  for (const edge of BORDER_EDGES) {
    const width = parsePx(cs.getPropertyValue(`border-${edge.side.toLowerCase()}-width`))
    const style = cs.getPropertyValue(`border-${edge.side.toLowerCase()}-style`)
    if (width <= 0 || style === 'none' || style === 'hidden') continue
    const color = parseAnyColor(cs.getPropertyValue(`border-${edge.side.toLowerCase()}-color`))
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

/** A run drawn from a computed style rather than a real DOM text node — same
 *  shape text.ts builds for real runs, reused for generated content (pseudo
 *  ::before/::after text, synthesized list markers). */
function styledTextRun(cs: CSSStyleDeclaration, text: string, xPx: number, topPx: number): TextRun | null {
  const color = parseAnyColor(cs.color)
  if (!color || color.a === 0) return null
  const sizePx = parsePx(cs.fontSize)
  if (sizePx <= 0) return null
  const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
  return {
    text,
    xPx,
    baselinePx: topPx + ascentPx(font),
    sizePx,
    family: cs.fontFamily,
    weight: parseFontWeight(cs.fontWeight),
    italic: cs.fontStyle === 'italic',
    color,
    letterSpacingPx: cs.letterSpacing === 'normal' ? 0 : parsePx(cs.letterSpacing),
  }
}

/** ::before then ::after: background rect, then generated text — matching
 *  CSS paint order. Most of our own ::before/::after usage is a small
 *  `content: '•'`-style separator glyph before a repeated element (contact
 *  list dots, tag separators); it renders at the pseudo's own host box,
 *  which is where the content is inserted in normal flow. Native `<li>`
 *  bullets are a completely different mechanism (see markerOps) — browsers
 *  never surface those through ::before. */
function pseudoOps(el: HTMLElement, root: HTMLElement, ops: DrawOp[]): void {
  for (const which of ['::before', '::after'] as const) {
    const cs = getComputedStyle(el, which)
    if (cs.content === 'none' || cs.display === 'none') continue

    const box = boxOf(el, root)

    const bg = parseAnyColor(cs.backgroundColor)
    if (bg && bg.a > 0) {
      const wPx = parsePx(cs.width) || box.wPx
      const hPx = parsePx(cs.height) || parsePx(cs.fontSize)
      if (wPx > 0 && hPx > 0) {
        ops.push({ kind: 'rect', xPx: box.xPx, yPx: box.yPx, wPx, hPx, fill: bg, radiusPx: parsePx(cs.borderTopLeftRadius) })
      }
    }

    const text = pseudoContentText(cs.content)
    if (!text) continue
    const run = styledTextRun(cs, text, box.xPx, box.yPx)
    if (run) ops.push({ kind: 'text', run })
  }
}

/** Bullet glyph implied by `list-style-type`, for marker kinds that are
 *  genuinely TEXT — a custom marker declared as a CSS string (our
 *  dash/arrow/check/diamond bullet styles: `list-style-type: '›  '`) reuses
 *  the same quoted-string parsing as ::before/::after content. disc/circle/
 *  square are handled separately in markerOps: browsers draw those as UA
 *  geometric shapes, not as glyphs from the current font. */
function listStyleGlyph(listStyleType: string): string {
  return pseudoContentText(listStyleType)
}

/**
 * Native `<li>::marker` bullets (used by every template's achievement/detail
 * lists). `getComputedStyle(el, '::marker').content` is only ever something
 * other than `normal` when a stylesheet explicitly sets `::marker { content:
 * ... }` — ours never do; the bullet is driven by `list-style-type` instead
 * (disc/circle/square, or a quoted custom string for the dash/arrow/check/
 * diamond bullet styles).
 *
 * `list-style-position: outside` renders the marker OUTSIDE (to the left of)
 * the li's own box, in space reserved by the list's `padding-left` — there's
 * no DOM box for the marker itself to read a position from, so we right-
 * align it against the li's left edge with a small gap, which is what
 * "outside" looks like in every browser.
 */
function markerOps(el: HTMLElement, root: HTMLElement, ops: DrawOp[]): void {
  const cs = getComputedStyle(el)
  if (cs.display !== 'list-item') return

  const markerCs = getComputedStyle(el, '::marker')
  const explicitText = pseudoContentText(markerCs.content)
  const kind = (cs.listStyleType || '').trim()

  const box = boxOf(el, root)
  const color = parseAnyColor(markerCs.color)
  if (!color || color.a === 0) return
  const sizePx = parsePx(markerCs.fontSize)
  if (sizePx <= 0) return
  const font = `${markerCs.fontStyle} ${markerCs.fontWeight} ${markerCs.fontSize} ${markerCs.fontFamily}`

  // Chromium draws disc/circle/square markers as small UA-generated shapes,
  // not as glyphs from the current font — drawing the Unicode bullet/square
  // characters instead looked visibly wrong (a tiny, font-dependent, baseline-
  // hugging mark instead of a round dot centred on the line). Reuse the
  // rounded-rect vector primitive defect 1 added to paint.ts: a square rect
  // with radiusPx = its own size collapses to a perfect circle.
  if (!explicitText && (kind === 'disc' || kind === 'circle' || kind === 'square')) {
    const d = sizePx * 0.34
    const gapPx = sizePx * 0.4
    const centerYPx = box.yPx + ascentPx(font) - sizePx * 0.24
    ops.push({
      kind: 'rect',
      xPx: box.xPx - gapPx - d,
      yPx: centerYPx - d / 2,
      wPx: d,
      hPx: d,
      fill: color,
      radiusPx: kind === 'square' ? 0 : d,
    })
    return
  }

  const text = explicitText || listStyleGlyph(kind)
  if (!text) return
  const run = styledTextRun(markerCs, text, 0, box.yPx)
  if (!run) return
  const gapPx = run.sizePx * 0.35
  run.xPx = box.xPx - gapPx - measureTextWidthPx(text, font)
  ops.push({ kind: 'text', run })
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
      markerOps(n as HTMLElement, root, ops)
    } else if (n.nodeType === Node.TEXT_NODE) {
      for (const run of extractRuns(n as Text, root)) ops.push({ kind: 'text', run })
    }
  }
  return ops
}
