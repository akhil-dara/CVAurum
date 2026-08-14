import { parseColor, parseFontWeight, parsePx, type Rgba } from './style'
import { ascentPx, extractRuns, measureTextWidthPx } from './text'
import type { DrawOp, LinearGradient, TextRun } from './types'

/**
 * `background: linear-gradient(<angle>deg, <c1>, <c2>)` sets `background-
 * image`, not `background-color` — `getComputedStyle().backgroundColor` for
 * such an element is transparent, so `boxOps` used to draw nothing at all
 * for creative's header banner/sidebar and spotlight's header banner (task-
 * 10c report — confirmed the single biggest contributor to both templates'
 * pixel diffs, including losing the name/contact text painted on top, which
 * became invisible without its background). Chromium serializes the two
 * color stops as `rgb()` or `color(srgb ...)` (see style.ts's `parseColor`
 * for why `color-mix()` shows up as the latter) — by the time
 * getComputedStyle reports it, custom properties and color-mix()
 * are already resolved to concrete numbers, verified empirically against a
 * real element rather than assumed. Only the exact 2-stop, degree-angle
 * shape our own CSS uses is matched; anything else (keyword direction,
 * radial-gradient, 3+ stops) returns null and falls through to no
 * background, same as before this existed.
 *
 * The angle segment is OPTIONAL: `180deg` ("to bottom") is CSS's own default
 * direction for a bare `linear-gradient(c1, c2)`, and Chromium's computed-
 * style serializer OMITS the angle whenever it equals that default —
 * confirmed empirically against `.tpl-creative .rm-col-aside`, which is
 * authored with an EXPLICIT `linear-gradient(180deg, …)` in templates.css
 * but reports back as `linear-gradient(rgb(...), color(...))` with no `deg`
 * token at all. Missing the angle group entirely (rather than requiring it)
 * was the reason the sidebar's gradient still failed to parse on the first
 * pass even after the header banner's (120deg, never elided) started
 * working.
 */
export function parseLinearGradient(backgroundImage: string): LinearGradient | null {
  const m = (backgroundImage || '').match(
    /^linear-gradient\(\s*(?:([\d.]+)deg\s*,\s*)?((?:rgba?|color)\([^)]*\))\s*,\s*((?:rgba?|color)\([^)]*\))\s*\)$/i,
  )
  if (!m) return null
  const c1 = parseColor(m[2])
  const c2 = parseColor(m[3])
  if (!c1 || !c2) return null
  return { angleDeg: m[1] === undefined ? 180 : Number(m[1]), stops: [c1, c2] }
}

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

/** CSS paints a border INSIDE the element's box (e.g. border-bottom's OUTER
 *  edge is the element's own bottom edge; the stroke occupies [bottom -
 *  width, bottom]), but pdf-lib's `drawLine` strokes CENTERED on the given
 *  coordinates — passing the box edge straight through (as this used to)
 *  paints half the stroke width OUTSIDE the box. Each edge is inset by
 *  width/2 toward the box interior so the drawn line's centerline lands
 *  where the CSS stroke's own centerline does. Every coordinate fn takes the
 *  same (box, borderWidthPx) signature, even the ones that don't need the
 *  width, so the four edges share one uniform, TS-friendly shape. */
type EdgeCoord = (b: ReturnType<typeof boxOf>, w: number) => number
/** Exported so the border-inset arithmetic (task 14) can be unit-tested
 *  directly against a plain `{xPx, yPx, wPx, hPx}` box, without needing a
 *  real `Element`/`getComputedStyle` (boxOps itself isn't independently
 *  testable outside a DOM). */
export const BORDER_EDGES: Array<{ side: string; x1: EdgeCoord; y1: EdgeCoord; x2: EdgeCoord; y2: EdgeCoord }> = [
  { side: 'Top', x1: (b) => b.xPx, y1: (b, w) => b.yPx + w / 2, x2: (b) => b.xPx + b.wPx, y2: (b, w) => b.yPx + w / 2 },
  { side: 'Right', x1: (b, w) => b.xPx + b.wPx - w / 2, y1: (b) => b.yPx, x2: (b, w) => b.xPx + b.wPx - w / 2, y2: (b) => b.yPx + b.hPx },
  { side: 'Bottom', x1: (b) => b.xPx, y1: (b, w) => b.yPx + b.hPx - w / 2, x2: (b) => b.xPx + b.wPx, y2: (b, w) => b.yPx + b.hPx - w / 2 },
  { side: 'Left', x1: (b, w) => b.xPx + w / 2, y1: (b) => b.yPx, x2: (b, w) => b.xPx + w / 2, y2: (b) => b.yPx + b.hPx },
]

/** Computed `opacity`, defaulting to 1 for anything unparseable — shared by
 *  boxOps and pseudoOps so a `position: absolute` accent rule painted at
 *  `opacity: 0.38` (e.g. `.sec-ov-strike`'s heading rule) doesn't paint fully
 *  solid; CSS `opacity` is a separate compositing multiplier from whatever
 *  alpha the color itself already carries (e.g. from `color-mix()`), so this
 *  always MULTIPLIES rather than replaces. */
export function elementOpacity(cs: CSSStyleDeclaration): number {
  const s = (cs.opacity || '').trim()
  if (!s) return 1 // Number('') is 0, not NaN — guard explicitly so an empty/missing value defaults to opaque
  const n = Number(s)
  return Number.isFinite(n) ? n : 1
}

/** background, borders, then image — in that paint order. */
function boxOps(el: HTMLElement, root: HTMLElement, ops: DrawOp[]): void {
  const cs = getComputedStyle(el)
  const box = boxOf(el, root)
  const opacityMul = elementOpacity(cs)

  const bg = parseColor(cs.backgroundColor)
  const bgFill = bg && bg.a > 0 ? { ...bg, a: bg.a * opacityMul } : null
  const gradient = parseLinearGradient(cs.backgroundImage)
  if (gradient) {
    // background-image paints OVER background-color in CSS paint order —
    // matched here by only emitting the gradient when both are present
    // (never happens in our own CSS today: `background: linear-gradient(…)`
    // never sets background-color, confirmed empirically) but future-proof
    // either way since a solid fill is drawn first if bg is also opaque.
    if (bgFill) {
      ops.push({ kind: 'rect', xPx: box.xPx, yPx: box.yPx, wPx: box.wPx, hPx: box.hPx, fill: bgFill, radiusPx: parsePx(cs.borderTopLeftRadius) })
    }
    ops.push({ kind: 'rect', xPx: box.xPx, yPx: box.yPx, wPx: box.wPx, hPx: box.hPx, radiusPx: parsePx(cs.borderTopLeftRadius), fillGradient: gradient })
  } else if (bgFill) {
    ops.push({ kind: 'rect', xPx: box.xPx, yPx: box.yPx, wPx: box.wPx, hPx: box.hPx, fill: bgFill, radiusPx: parsePx(cs.borderTopLeftRadius) })
  }

  for (const edge of BORDER_EDGES) {
    const width = parsePx(cs.getPropertyValue(`border-${edge.side.toLowerCase()}-width`))
    const style = cs.getPropertyValue(`border-${edge.side.toLowerCase()}-style`)
    if (width <= 0 || style === 'none' || style === 'hidden') continue
    const color = parseColor(cs.getPropertyValue(`border-${edge.side.toLowerCase()}-color`))
    if (!color || color.a === 0) continue
    ops.push({
      kind: 'line',
      x1Px: edge.x1(box, width), y1Px: edge.y1(box, width), x2Px: edge.x2(box, width), y2Px: edge.y2(box, width),
      widthPx: width, color: { ...color, a: color.a * opacityMul }, dashed: style === 'dashed' || style === 'dotted',
    })
  }

  if (el instanceof HTMLImageElement && el.src) {
    const isSvg = /^data:image\/svg\+xml/i.test(el.src)
    if (!isSvg || !svgLogoOps(el, box, ops)) {
      ops.push({ kind: 'image', xPx: box.xPx, yPx: box.yPx, wPx: box.wPx, hPx: box.hPx, src: el.src, radiusPx: parsePx(cs.borderTopLeftRadius) })
    }
  }
}

/** #rgb / #rrggbb — the only color form our own SVG "logo" marks (see
 *  samples.ts's `mark()`) emit. */
function parseHexColor(s: string): Rgba | null {
  const m = (s || '').trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (!m) return null
  let hex = m[1]
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('')
  const n = parseInt(hex, 16)
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255, a: 1 }
}

/** Decode a `data:image/svg+xml` URI's payload synchronously — media-type
 *  parameters before the comma vary (samples.ts's `mark()` emits
 *  `;utf8,<encodeURIComponent>`; a foreign source might use `;base64,` or
 *  `;charset=utf-8,`), so accept any `;param` list and only special-case
 *  base64. */
function decodeSvgDataUri(src: string): string | null {
  const m = src.match(/^data:image\/svg\+xml((?:;[a-z0-9-]+(?:=[^;,]*)?)*),([\s\S]*)$/i)
  if (!m) return null
  const isBase64 = /(^|;)base64(;|$)/i.test(m[1])
  try {
    return isBase64 ? atob(m[2]) : decodeURIComponent(m[2])
  } catch {
    return null
  }
}

/**
 * A tiny "logo" `<img>` whose src is an inline SVG data URI can't be
 * embedded as a raster image the way boxOps normally handles `<img>` — pdf-
 * lib's embedPng/embedJpg only accept real PNG/JPEG bytes, so paint.ts's
 * fetch-and-embed silently no-ops on SVG bytes (confirmed by instrumenting
 * it: the fetch succeeds, the bytes start with `<svg`, and neither magic
 * check matches, so `paintOps` just draws nothing for that op). Rasterising
 * the source to fix that would break the "images embed original bytes,
 * never rasterise" rule for exactly the wrong reason — an SVG source is
 * already vector. Instead, parse the shapes our own sample-data marks
 * actually use (samples.ts's `mark()`: a rounded `<rect>` + a centered
 * `<text>` letter) into native rect/text ops. Anything we can't confidently
 * parse falls through to the ordinary (silently-skipped) image op, so this
 * is never worse than the status quo.
 */
function svgLogoOps(el: HTMLImageElement, box: ReturnType<typeof boxOf>, ops: DrawOp[]): boolean {
  const xml = decodeSvgDataUri(el.src)
  if (!xml) return false

  let svg: Element | null
  try {
    svg = new DOMParser().parseFromString(xml, 'image/svg+xml').documentElement
  } catch {
    return false
  }
  if (!svg || svg.nodeName !== 'svg' || svg.querySelector('parsererror')) return false

  const vb = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number)
  const [vbX, vbY, vbW, vbH] = vb.length === 4 && vb.every(Number.isFinite) ? vb : [0, 0, box.wPx, box.hPx]
  if (vbW <= 0 || vbH <= 0) return false
  const scaleX = box.wPx / vbW
  const scaleY = box.hPx / vbH

  const rectEl = svg.querySelector('rect')
  const textEl = svg.querySelector('text')
  if (!rectEl && !textEl) return false

  if (rectEl) {
    const fill = parseHexColor(rectEl.getAttribute('fill') || '')
    const wPx = parseFloat(rectEl.getAttribute('width') || '0') * scaleX
    const hPx = parseFloat(rectEl.getAttribute('height') || '0') * scaleY
    if (fill && wPx > 0 && hPx > 0) {
      const radiusPx = parseFloat(rectEl.getAttribute('rx') || rectEl.getAttribute('ry') || '0') * scaleX
      ops.push({
        kind: 'rect',
        xPx: box.xPx + (parseFloat(rectEl.getAttribute('x') || '0') - vbX) * scaleX,
        yPx: box.yPx + (parseFloat(rectEl.getAttribute('y') || '0') - vbY) * scaleY,
        wPx, hPx, fill, radiusPx,
      })
    }
  }

  const label = textEl?.textContent?.trim()
  if (textEl && label) {
    const sizePx = parseFloat(textEl.getAttribute('font-size') || '0') * scaleY
    if (sizePx > 0) {
      // Draw with the DOCUMENT's own font, not the SVG's declared one (our
      // marks say Arial) — only the résumé's chosen fonts get embedded in
      // the PDF, so an arbitrary family from the SVG source would throw at
      // export time (PdfFontMissingError) instead of just looking slightly
      // off.
      const family = getComputedStyle(el).fontFamily
      const weight = parseFontWeight(textEl.getAttribute('font-weight') || '400')
      const font = `${weight} ${sizePx}px ${family}`
      const width = measureTextWidthPx(label, font)
      const cx = box.xPx + (parseFloat(textEl.getAttribute('x') || '0') - vbX) * scaleX
      const anchor = textEl.getAttribute('text-anchor')
      const xPx = anchor === 'middle' ? cx - width / 2 : anchor === 'end' ? cx - width : cx
      const baselinePx = box.yPx + (parseFloat(textEl.getAttribute('y') || '0') - vbY) * scaleY
      const fill = parseHexColor(textEl.getAttribute('fill') || '') || { r: 1, g: 1, b: 1, a: 1 }
      // DECORATIVE: this is the logo mark's monogram letter, not résumé
      // content — paint.ts draws it as vector glyph outlines so it can't
      // leak into the extractable text layer (see types.ts's TextRun.isDecorative).
      // widthPx: 0 — no measured DOM rect backs this synthesized run (see
      // types.ts's TextRun.widthPx); it's also isDecorative so paint.ts's
      // Tz scaling never looks at it anyway.
      ops.push({ kind: 'text', run: { text: label, xPx, widthPx: 0, baselinePx, sizePx, family, weight, italic: false, color: fill, letterSpacingPx: 0, isDecorative: true } })
    }
  }

  return true
}

/** A run drawn from a computed style rather than a real DOM text node — same
 *  shape text.ts builds for real runs, reused for generated content (pseudo
 *  ::before/::after text, synthesized list markers). Always DECORATIVE: every
 *  caller (pseudoOps, markerOps) synthesizes a separator/bullet glyph, never
 *  real résumé content (confirmed exhaustively against templates.css's own
 *  `content:` declarations — see the task-10b report) — see types.ts's
 *  TextRun.isDecorative. */
function styledTextRun(cs: CSSStyleDeclaration, text: string, xPx: number, topPx: number): TextRun | null {
  const color = parseColor(cs.color)
  if (!color || color.a === 0) return null
  const sizePx = parsePx(cs.fontSize)
  if (sizePx <= 0) return null
  const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
  return {
    text,
    xPx,
    // No measured DOM rect backs a synthesized pseudo/marker run — 0 rather
    // than guess (see types.ts's TextRun.widthPx); also always isDecorative,
    // so paint.ts's Tz scaling never looks at it anyway.
    widthPx: 0,
    baselinePx: topPx + ascentPx(font),
    sizePx,
    family: cs.fontFamily,
    weight: parseFontWeight(cs.fontWeight),
    italic: cs.fontStyle === 'italic',
    color,
    letterSpacingPx: cs.letterSpacing === 'normal' ? 0 : parsePx(cs.letterSpacing),
    isDecorative: true,
  }
}

/** The subset of a host's computed style `pseudoBox`'s flex-item branch
 *  needs — a plain `Pick`, not a full `CSSStyleDeclaration`, so tests can
 *  fake it without a real DOM. */
type FlexHostStyle = Pick<CSSStyleDeclaration, 'display' | 'alignItems' | 'columnGap' | 'flexDirection'>
type Box = { xPx: number; yPx: number; wPx: number; hPx: number }

/**
 * Resolves a pseudo's own box from the HOST's box plus the pseudo's computed
 * `left`/`top`/`right`/`bottom`/`width`/`height` — used for `position:
 * absolute`/`relative` pseudos, whose containing block is the host itself
 * (every positioned pseudo in our CSS sits on a `position: relative` host,
 * confirmed against every `sec-ov-*`/`tpl-*` heading-accent rule that uses
 * one). `getComputedStyle` resolves `left`/`top`/etc to a used PX value
 * (including percentages, e.g. `.sec-ov-strike`'s `top: 50%`) or the literal
 * string `'auto'` when unset. When `left` AND `right` are both set with
 * `width: auto` (`.sec-ov-strike`'s full-width rule), CSS computes width as
 * the remaining space between them — matched here explicitly since there's
 * no layout engine to derive it for us; ditto `top`+`bottom` with `height:
 * auto`.
 *
 * A `position: static` pseudo is normally left at the pre-existing
 * approximation: painted at the host's own origin, sized to its own width/
 * height (or the host's width / the pseudo's own font-size as a fallback) —
 * exact static flow position isn't attempted, and that's fine for a simple
 * inline `content: '•'` separator glyph (most of our own ::before/::after
 * usage). It is NOT fine when the host is a `display: flex` ROW (e.g.
 * `.sec-rule-after`'s `.rm-section-title { display:flex; align-items:center
 * }`, whose `::after { flex: 1 }` rule fills the row's remaining width) —
 * there the pseudo is a genuine FLEX ITEM laid out by the flex algorithm,
 * not normal block/inline flow, and the host-origin approximation paints it
 * starting at the SAME x as the heading text (crossing straight through it)
 * instead of after it (confirmed live against onyx-noir's DEFAULT heading
 * style — a fix-round finding, not caught by the original task-13
 * verification, which never exercised a flex-row heading style; see the
 * task-13 report's "Fix round" section). `hostCs`/`lastChildBox` are
 * undefined/null for callers that don't have (or don't need) them, e.g. a
 * ::before, which is always FIRST in box order so the host-origin x is
 * already right for it — only the cross-axis (`align-items`) correction
 * still applies to it. A flex row lays out items left-to-right in box
 * order, so `::after` (always LAST in box order) starts right after the
 * last REAL child box the caller supplies; cross-axis position follows
 * `align-items`, same as the flex algorithm itself would place any item.
 */
export function pseudoBox(
  cs: CSSStyleDeclaration,
  host: Box,
  which: '::before' | '::after' = '::before',
  hostCs?: FlexHostStyle,
  lastChildBox?: Box | null,
): Box {
  let xPx = host.xPx
  let yPx = host.yPx
  let wPx = parsePx(cs.width) || host.wPx
  let hPx = parsePx(cs.height) || parsePx(cs.fontSize)

  if (cs.position === 'absolute' || cs.position === 'relative') {
    const left = cs.left === 'auto' ? null : parsePx(cs.left)
    const right = cs.right === 'auto' ? null : parsePx(cs.right)
    if (left !== null) {
      xPx = host.xPx + left
      if (right !== null && cs.width === 'auto') wPx = host.wPx - left - right
    } else if (right !== null) {
      xPx = host.xPx + host.wPx - right - wPx
    }

    const top = cs.top === 'auto' ? null : parsePx(cs.top)
    const bottom = cs.bottom === 'auto' ? null : parsePx(cs.bottom)
    if (top !== null) {
      yPx = host.yPx + top
      if (bottom !== null && cs.height === 'auto') hPx = host.hPx - top - bottom
    } else if (bottom !== null) {
      yPx = host.yPx + host.hPx - bottom - hPx
    }
    return { xPx, yPx, wPx, hPx }
  }

  const flexRow = hostCs && (hostCs.display === 'flex' || hostCs.display === 'inline-flex') &&
    (!hostCs.flexDirection || hostCs.flexDirection === 'row')
  if (flexRow) {
    if (which === '::after' && lastChildBox) {
      xPx = lastChildBox.xPx + lastChildBox.wPx + (parsePx(hostCs!.columnGap) || 0)
    }
    if (hostCs!.alignItems === 'center') yPx = host.yPx + (host.hPx - hPx) / 2
    else if (hostCs!.alignItems === 'flex-end') yPx = host.yPx + host.hPx - hPx
  }

  return { xPx, yPx, wPx, hPx }
}

/** One of `::before`/`::after`: background rect, then generated text —
 *  matching CSS paint order within the pseudo itself. Caller controls WHICH
 *  of the two, and WHEN relative to the host's real children, to get the
 *  document-order requirement right at the buildDrawList level: `::before`
 *  paints before them, `::after` after — see buildDrawList's `openForAfter`.
 *  Most of our own ::before/::after usage is a small `content: '•'`-style
 *  separator glyph before a repeated element (contact list dots, tag
 *  separators); those are `position: static` and render at the pseudo's own
 *  host box, which is where the content is inserted in normal flow. Native
 *  `<li>` bullets are a completely different mechanism (see markerOps) —
 *  browsers never surface those through ::before. */
function pseudoOps(el: HTMLElement, root: HTMLElement, ops: DrawOp[], which: '::before' | '::after'): void {
  const cs = getComputedStyle(el, which)
  if (cs.content === 'none' || cs.display === 'none') return

  const opacityMul = elementOpacity(cs)
  const hostCs = getComputedStyle(el)
  // Only fetched when it could actually matter (flex-row host, ::after) —
  // an extra getBoundingClientRect for every plain static pseudo (the
  // overwhelming common case) would be wasted work.
  const isFlexRow = (hostCs.display === 'flex' || hostCs.display === 'inline-flex') && (!hostCs.flexDirection || hostCs.flexDirection === 'row')
  const lastChildBox = isFlexRow && which === '::after' && el.lastElementChild ? boxOf(el.lastElementChild, root) : null
  const box = pseudoBox(cs, boxOf(el, root), which, hostCs, lastChildBox)

  const bg = parseColor(cs.backgroundColor)
  if (bg && bg.a > 0 && box.wPx > 0 && box.hPx > 0) {
    ops.push({
      kind: 'rect', xPx: box.xPx, yPx: box.yPx, wPx: box.wPx, hPx: box.hPx,
      fill: { ...bg, a: bg.a * opacityMul }, radiusPx: parsePx(cs.borderTopLeftRadius),
    })
  }

  const text = pseudoContentText(cs.content)
  if (!text) return
  const run = styledTextRun(cs, text, box.xPx, box.yPx)
  if (run) ops.push({ kind: 'text', run: opacityMul === 1 ? run : { ...run, color: { ...run.color, a: run.color.a * opacityMul } } })
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
  const color = parseColor(markerCs.color)
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
 * Converts one SVG shape child's geometry to path `d` commands, in the
 * child's own (viewBox) coordinate space — verbatim for `path` (its `d` IS
 * already path syntax), translated to M/L(/Z) for the primitive shapes
 * lucide's icon set actually uses (line, polyline/polygon, circle as a
 * two-arc path, a plain non-rounded rect — `rx`/`ry` rounding isn't
 * attempted: lucide barely uses `rect`, and the one case that does
 * (Briefcase, `rx="2"` on a 20x14 box) is invisible at print resolution).
 * Returns null for a shape kind this doesn't convert, or for missing/
 * non-finite geometry — the caller dev-warns and skips it. Pure and DOM-free
 * (`attr` is a plain getter, not an Element) so it's directly unit-testable.
 */
export function svgShapeToPathD(tag: string, attr: (name: string) => string | null): string | null {
  const num = (name: string): number => {
    const v = attr(name)
    const n = v === null ? NaN : parseFloat(v)
    return Number.isFinite(n) ? n : 0
  }
  switch (tag) {
    case 'path':
      return attr('d') || null
    case 'line':
      return `M ${num('x1')} ${num('y1')} L ${num('x2')} ${num('y2')}`
    case 'polyline':
    case 'polygon': {
      const pts = (attr('points') || '').trim().split(/[\s,]+/).filter(Boolean).map(Number)
      if (pts.length < 4 || pts.length % 2 !== 0 || pts.some((n) => !Number.isFinite(n))) return null
      const cmds = [`M ${pts[0]} ${pts[1]}`]
      for (let i = 2; i < pts.length; i += 2) cmds.push(`L ${pts[i]} ${pts[i + 1]}`)
      if (tag === 'polygon') cmds.push('Z')
      return cmds.join(' ')
    }
    case 'circle': {
      const cx = num('cx'), cy = num('cy'), r = num('r')
      if (r <= 0) return null
      // Two 180deg arcs trace the full circumference — same "two-arc circle"
      // shape as roundedRectPath's stadium collapse in paint.ts, just via
      // SVG arc commands instead of a radius clamp.
      return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`
    }
    case 'rect': {
      const x = num('x'), y = num('y'), w = num('width'), h = num('height')
      if (w <= 0 || h <= 0) return null
      return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`
    }
    default:
      return null
  }
}

const SVG_SHAPE_TAGS = new Set(['path', 'line', 'polyline', 'polygon', 'circle', 'rect'])
// Purely structural SVG wrappers our own icon sets never emit shapes inside
// of directly but that legitimately appear (querySelectorAll('*') walks
// through them) without themselves being a shape to warn about.
const SVG_STRUCTURAL_TAGS = new Set(['g', 'defs', 'title', 'desc', 'metadata', 'clippath', 'style'])

/**
 * Inline lucide-style `<svg>` icons (section-heading chips via
 * sectionIcons.tsx, contact-row marks via ContactIcons) never went through
 * the walker at all before this task — only `<img src="data:image/svg+xml">`
 * "logo" marks did (svgLogoOps above), so every section-icon chip painted as
 * an empty tinted square. Emits ONE 'svg' op combining every shape child
 * into a single `d`: lucide icons share one stroke/fill across all their
 * children (verified against every icon in sectionIcons.tsx/ContactIcons —
 * `fill="none" stroke="currentColor"` on the `<svg>`, never overridden on a
 * child), so one `drawSvgPath` call paints the whole icon. Coordinates stay
 * VERBATIM in the svg's own viewBox/user-unit space — see types.ts's `svg`
 * DrawOp doc comment for why paint.ts doesn't need this module to pre-scale
 * them (or the stroke width) itself.
 */
function svgIconOps(svg: Element, root: HTMLElement, ops: DrawOp[]): void {
  const box = boxOf(svg, root)
  if (box.wPx <= 0 || box.hPx <= 0) return

  const vb = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number)
  if (vb.length !== 4 || vb.some((n) => !Number.isFinite(n)) || vb[2] <= 0 || vb[3] <= 0) {
    if (import.meta.env.DEV) console.warn('[pdf] inline <svg> has no usable viewBox, skipping icon', svg)
    return
  }
  const [vbX, vbY, vbW, vbH] = vb
  if (vbX !== 0 || vbY !== 0) {
    if (import.meta.env.DEV) console.warn('[pdf] inline <svg> has a non-zero viewBox origin, skipping icon', svg)
    return
  }

  const dParts: string[] = []
  for (const child of Array.from(svg.querySelectorAll('*'))) {
    const tag = child.tagName.toLowerCase()
    if (SVG_SHAPE_TAGS.has(tag)) {
      const d = svgShapeToPathD(tag, (name) => child.getAttribute(name))
      if (d) dParts.push(d)
      else if (import.meta.env.DEV) console.warn(`[pdf] inline <svg> <${tag}> has no usable geometry, skipping shape`, child)
    } else if (!SVG_STRUCTURAL_TAGS.has(tag)) {
      if (import.meta.env.DEV) console.warn(`[pdf] inline <svg> has an unsupported child <${tag}>, skipping shape`, child)
    }
  }
  if (!dParts.length) return

  const cs = getComputedStyle(svg)
  const opacityMul = elementOpacity(cs)
  const strokeColor = parseColor(cs.stroke) ?? parseColor(cs.color)
  const fillColor = cs.fill === 'none' ? null : (parseColor(cs.fill) ?? parseColor(cs.color))
  // RAW (un-scaled) stroke-width, in the svg's own viewBox/user-unit space —
  // see types.ts's `svg` DrawOp doc comment for why paint.ts wants it this way.
  const strokeWidthPx = parsePx(cs.strokeWidth)

  const stroke = strokeColor && strokeColor.a > 0 && strokeWidthPx > 0 ? { ...strokeColor, a: strokeColor.a * opacityMul } : undefined
  const fill = fillColor && fillColor.a > 0 ? { ...fillColor, a: fillColor.a * opacityMul } : undefined
  if (!stroke && !fill) return

  ops.push({
    kind: 'svg',
    xPx: box.xPx, yPx: box.yPx, wPx: box.wPx, hPx: box.hPx,
    d: dParts.join(' '),
    viewBox: [vbX, vbY, vbW, vbH],
    stroke, fill, strokeWidthPx,
  })
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
        const el = n as Element
        // `el.className` is an `SVGAnimatedString` (not a plain string) on
        // SVG elements, so the old `className.toString()` regex silently
        // never matched `no-print` there — `classList` works uniformly for
        // both HTML and SVG elements.
        if (el.classList.contains('no-print')) return NodeFilter.FILTER_REJECT
        // Inline SVG shape children (path/line/circle/...) are consumed
        // directly off the <svg> root by svgIconOps below — never walked as
        // separate elements. `ownerSVGElement` is set on every DESCENDANT of
        // an <svg> and null on the <svg> root itself, so this rejects
        // exactly (and only) the subtree svgIconOps already owns.
        if ((el as SVGElement).ownerSVGElement) return NodeFilter.FILTER_REJECT
        const cs = getComputedStyle(el as HTMLElement)
        if (cs.display === 'none' || cs.visibility === 'hidden') return NodeFilter.FILTER_REJECT
      }
      return NodeFilter.FILTER_ACCEPT
    },
  })

  const ops: DrawOp[] = []
  // Elements whose ::after is still pending. CSS paints ::after AFTER all of
  // an element's normal-flow children, but this flat pre-order walk visits
  // the element itself before any of them (defect 3 — the walker used to
  // paint ::before AND ::after back-to-back right there, so ::after landed
  // BEFORE every child, the wrong side of CSS's own stacking order). Every
  // element is pushed here when first visited and stays "open" until a later
  // node turns out NOT to be its descendant (`Node.contains`, which reflects
  // the real DOM regardless of what the walker's own filter skipped), at
  // which point every open ancestor the walk has now exited gets its
  // ::after flushed, innermost (most recently opened) first — exactly the
  // order CSS closes nested elements in.
  const openForAfter: HTMLElement[] = []
  const closeUpTo = (n: Node | null) => {
    while (openForAfter.length && !(n && openForAfter[openForAfter.length - 1].contains(n))) {
      pseudoOps(openForAfter.pop()!, root, ops, '::after')
    }
  }

  // Paint the ROOT's own box (background + borders, plus its own ::before —
  // rm-root never puts generated content directly on itself, so this is a
  // no-op in practice, kept only for parity with every other element's
  // treatment) FIRST, explicitly — dark templates set the page color via
  // `background: var(--rm-bg)` on `.rm-root` itself (artboard.css), and an
  // inner column container then covers most, but not necessarily all, of the
  // page, so root's own fill has to land before any descendant, exactly like
  // every other element's own box paints before its children's.
  //
  // This is deliberately NOT left to fall out implicitly of starting the walk
  // from `walker.currentNode` (which happens to equal `root` immediately
  // after `document.createTreeWalker(root, ...)`, per the DOM spec's own
  // createTreeWalker steps — `current` is set to `root` UNCONDITIONALLY,
  // bypassing `acceptNode` entirely). Relying on that spec quirk silently
  // is a trap for the next reader: the more obviously-idiomatic
  // `for (let n = walker.nextNode(); n; ...)` looks equivalent and reads
  // cleaner, but would silently drop root's own background again. boxOf
  // measures every element relative to `root`'s own rect, so root's own box
  // falls out as exactly (0,0,rootW,rootH) here too — see walk.test.ts.
  boxOps(root, root, ops)
  pseudoOps(root, root, ops, '::before')
  markerOps(root, root, ops)
  openForAfter.push(root)

  for (let n: Node | null = walker.nextNode(); n; n = walker.nextNode()) {
    closeUpTo(n)
    if (n.nodeType === Node.ELEMENT_NODE) {
      const el = n as HTMLElement
      if (el.tagName === 'svg') {
        // DECORATIVE vector icon — see svgIconOps's doc comment. Not
        // descended into for text/box processing (its shape children were
        // already rejected by the walker above) and no ::before/::after
        // handling: no template CSS puts generated content on an <svg>.
        svgIconOps(el, root, ops)
      } else {
        boxOps(el, root, ops)
        pseudoOps(el, root, ops, '::before')
        markerOps(el, root, ops)
        openForAfter.push(el)
      }
    } else if (n.nodeType === Node.TEXT_NODE) {
      // Same-line adjacent-run touching/gap prevention used to live here,
      // estimated with canvas.measureText as a proxy for our EMBEDDED font's
      // width (task 10a, defect 5). That estimate turned out to drift in
      // BOTH directions depending on the specific string (confirmed while
      // diagnosing task 10c's "Languages :" TEXT_MISMATCH: for one string
      // canvas underestimated our font's width enough to risk overlap, for
      // an adjacent one on the same line it overestimated enough to leave a
      // gap pdf.js's word-boundary heuristic read as a real space), so an
      // estimate with a safety margin can't get every case right no matter
      // how the margin is tuned. paint.ts now does this exactly, using the
      // ACTUAL embedded pdf-lib font's widthOfTextAtSize — the very metric
      // pdf.js itself measures against — which needs the font object this
      // module doesn't have. See paint.ts's paintOps.
      for (const run of extractRuns(n as Text, root)) {
        ops.push({ kind: 'text', run })
      }
    }
  }
  closeUpTo(null)
  return ops
}
