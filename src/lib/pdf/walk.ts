import { parseColor, parseFontWeight, parsePx, type Rgba } from './style'
import { roleForElement } from './tagging'
import { mainColumnTextFirst } from './readingOrder'
import { keepFlagsForParagraph } from './widows'
import { ascentPx, extractRuns, layoutMetricsFor, measureTextWidthPx, textNodeLineSegments } from './text'
import type { CornerRadii, DrawOp, LinearGradient, TextRun } from './types'
import { combineColumns, type PageBlock } from './paginate'

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
    /^linear-gradient\(\s*(?:([\d.]+)deg\s*,\s*)?((?:rgba?|color)\([^)]*\))\s*,\s*((?:rgba?|color)\([^)]*\))\s*\)$/i
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
  {
    side: 'Right',
    x1: (b, w) => b.xPx + b.wPx - w / 2,
    y1: (b) => b.yPx,
    x2: (b, w) => b.xPx + b.wPx - w / 2,
    y2: (b) => b.yPx + b.hPx,
  },
  {
    side: 'Bottom',
    x1: (b) => b.xPx,
    y1: (b, w) => b.yPx + b.hPx - w / 2,
    x2: (b) => b.xPx + b.wPx,
    y2: (b, w) => b.yPx + b.hPx - w / 2,
  },
  {
    side: 'Left',
    x1: (b, w) => b.xPx + w / 2,
    y1: (b) => b.yPx,
    x2: (b, w) => b.xPx + w / 2,
    y2: (b) => b.yPx + b.hPx,
  },
]

/** A single resolved border edge — width/style/color all already validated
 *  non-degenerate (width > 0, style not none/hidden, color not fully
 *  transparent). Shared shape `readBorderEdge` returns and `borderOps`
 *  compares across edges to detect the uniform case. */
type BorderEdgeInfo = { width: number; style: string; color: Rgba }

/** Reads and validates one `border-<side>-{width,style,color}` triple —
 *  `side` is the LOWERCASE edge name (`top`/`right`/`bottom`/`left`), same
 *  spelling `boxOps`'s old inline loop built via `edge.side.toLowerCase()`.
 *  Returns null for a degenerate edge (zero/negative width, `none`/`hidden`
 *  style, or fully-transparent/unparseable color) exactly like the old
 *  inline `continue` guards did — same three checks, just factored out so
 *  `borderOps` can inspect an edge's info WITHOUT immediately committing to
 *  drawing it (needed to detect the uniform-across-all-four-edges case
 *  before deciding whether to emit one rounded path or four lines). */
function readBorderEdge(cs: CSSStyleDeclaration, side: string): BorderEdgeInfo | null {
  const width = parsePx(cs.getPropertyValue(`border-${side}-width`))
  const style = cs.getPropertyValue(`border-${side}-style`)
  if (width <= 0 || style === 'none' || style === 'hidden') return null
  const color = parseColor(cs.getPropertyValue(`border-${side}-color`))
  if (!color || color.a === 0) return null
  return { width, style, color }
}

/** True when the box has ANY nonzero corner radius — the trigger for
 *  attempting the rounded-border path in `borderOps` below. */
function hasAnyRadius(radii: CornerRadii): boolean {
  return radii.tl > 0 || radii.tr > 0 || radii.br > 0 || radii.bl > 0
}

/**
 * Emits border draw op(s) for a box — shared by `boxOps` and `pseudoOps`
 * (task 22: pseudo-elements previously got NO border handling at all,
 * `pseudoOps` painted background+text only, so `.tpl-timeline`'s circular
 * `::before` marker — `border-radius: 50%`, `border: 2px solid` — silently
 * lost its ring in the export).
 *
 * Straight per-edge lines (`BORDER_EDGES`, task 14's width/2 inset) remain
 * the default and, for a ZERO-radius box, the ONLY path — no operator churn
 * for the overwhelming common case (plain rectangular borders).
 *
 * When the box has ANY nonzero corner radius AND all four edges are
 * PRESENT and share the exact same width/style/color (the common "rounded
 * card" shape — `.tpl-obsidian`'s entry cards, `border: 1px solid` +
 * `border-radius: 12px`, and `.tpl-timeline`'s circular marker, `border: 2px
 * solid` + `border-radius: 50%`), the four lines are replaced with ONE
 * stroked rounded-rect path (`roundedBorder` op) instead — a straight
 * line's flat ends overshoot a curved corner, which a single path traced
 * around the actual curve does not. A rounded box with MIXED per-edge
 * borders (missing edges, or different width/style/color across the four
 * that exist) is rare and has no single centerline that represents every
 * edge correctly — falls back to the straight-line per-edge behavior, with
 * a dev-warn since silently drawing a mixed-border rounded box as straight
 * lines is a real (if minor) fidelity loss worth surfacing loudly in dev.
 */
function borderOps(
  el: Element,
  cs: CSSStyleDeclaration,
  box: Box,
  radii: CornerRadii,
  opacityMul: number,
  ops: DrawOp[]
): void {
  const present = BORDER_EDGES.map((edge) => ({ edge, info: readBorderEdge(cs, edge.side.toLowerCase()) })).filter(
    (e): e is { edge: (typeof BORDER_EDGES)[number]; info: BorderEdgeInfo } => e.info !== null
  )
  if (!present.length) return

  if (hasAnyRadius(radii)) {
    const first = present[0].info
    const uniform =
      present.length === 4 &&
      present.every(
        (e) =>
          e.info.width === first.width &&
          e.info.style === first.style &&
          e.info.color.r === first.color.r &&
          e.info.color.g === first.color.g &&
          e.info.color.b === first.color.b &&
          e.info.color.a === first.color.a
      )
    if (uniform) {
      const inset = first.width / 2
      ops.push({
        kind: 'roundedBorder',
        xPx: box.xPx + inset,
        yPx: box.yPx + inset,
        wPx: box.wPx - first.width,
        hPx: box.hPx - first.width,
        radii: {
          tl: Math.max(0, radii.tl - inset),
          tr: Math.max(0, radii.tr - inset),
          br: Math.max(0, radii.br - inset),
          bl: Math.max(0, radii.bl - inset),
        },
        widthPx: first.width,
        color: { ...first.color, a: first.color.a * opacityMul },
        dashed: first.style === 'dashed' || first.style === 'dotted',
      })
      return
    }
    if (import.meta.env.DEV) {
      console.warn('[pdf] rounded box has mixed per-edge borders, falling back to straight-line borders', el)
    }
  }

  for (const { edge, info } of present) {
    ops.push({
      kind: 'line',
      x1Px: edge.x1(box, info.width),
      y1Px: edge.y1(box, info.width),
      x2Px: edge.x2(box, info.width),
      y2Px: edge.y2(box, info.width),
      widthPx: info.width,
      color: { ...info.color, a: info.color.a * opacityMul },
      dashed: info.style === 'dashed' || info.style === 'dotted',
    })
  }
}

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

/** Reads all FOUR computed corner radii (fix round 2: `boxOps` used to read
 *  only `border-top-left-radius` and apply that single value to every
 *  corner, so an asymmetric box — spotlight's header banner, `border-
 *  radius: 0 0 18px 18px`, square top / rounded bottom — painted as a plain
 *  rectangle). An elliptical corner (two values, e.g. `10px 5px` for
 *  differing horizontal/vertical radii) collapses to its first (horizontal)
 *  value — `parsePx`'s `parseFloat` already stops at the first non-numeric
 *  token, so this needs no special-casing; none of our own CSS uses
 *  elliptical radii today. */
export function cornerRadii(cs: CSSStyleDeclaration): CornerRadii {
  return {
    tl: parsePx(cs.borderTopLeftRadius),
    tr: parsePx(cs.borderTopRightRadius),
    br: parsePx(cs.borderBottomRightRadius),
    bl: parsePx(cs.borderBottomLeftRadius),
  }
}

/** background, borders, then image — in that paint order. */
function boxOps(el: HTMLElement, root: HTMLElement, ops: DrawOp[]): void {
  const cs = getComputedStyle(el)
  const box = boxOf(el, root)
  const opacityMul = elementOpacity(cs)
  const radii = cornerRadii(cs)

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
      ops.push({ kind: 'rect', xPx: box.xPx, yPx: box.yPx, wPx: box.wPx, hPx: box.hPx, fill: bgFill, radii })
    }
    ops.push({ kind: 'rect', xPx: box.xPx, yPx: box.yPx, wPx: box.wPx, hPx: box.hPx, radii, fillGradient: gradient })
  } else if (bgFill) {
    ops.push({ kind: 'rect', xPx: box.xPx, yPx: box.yPx, wPx: box.wPx, hPx: box.hPx, fill: bgFill, radii })
  }

  borderOps(el, cs, box, radii, opacityMul, ops)

  if (el instanceof HTMLImageElement && el.src) {
    const isSvg = /^data:image\/svg\+xml/i.test(el.src)
    if (!isSvg || !svgLogoOps(el, box, ops)) {
      ops.push({ kind: 'image', xPx: box.xPx, yPx: box.yPx, wPx: box.wPx, hPx: box.hPx, src: el.src, radii })
    }
  }
}

/** #rgb / #rrggbb — the only color form our own SVG "logo" marks (see
 *  samples.ts's `mark()`) emit. */
function parseHexColor(s: string): Rgba | null {
  const m = (s || '').trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (!m) return null
  let hex = m[1]
  if (hex.length === 3)
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('')
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

  const vb = (svg.getAttribute('viewBox') || '')
    .trim()
    .split(/[\s,]+/)
    .map(Number)
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
        wPx,
        hPx,
        fill,
        radiusPx,
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
      ops.push({
        kind: 'text',
        run: {
          text: label,
          xPx,
          widthPx: 0,
          baselinePx,
          sizePx,
          family,
          weight,
          italic: false,
          color: fill,
          letterSpacingPx: 0,
          isDecorative: true,
        },
      })
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
type FlexHostStyle = Pick<CSSStyleDeclaration, 'display' | 'alignItems' | 'columnGap' | 'rowGap' | 'flexDirection'>
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
 * usage). It is NOT fine when the host is a `display: flex` container (e.g.
 * `.sec-rule-after`'s `.rm-section-title { display:flex; align-items:center
 * }`, whose `::after { flex: 1 }` rule fills the row's remaining width; or
 * `.rm-header-centered { display:flex; flex-direction:column }`, whose
 * `.tpl-sienna`/`.tpl-elegant` `::after { width:44px; margin:12px auto 0 }`
 * name-underline rule centers itself in the column via auto margins) — there
 * the pseudo is a genuine FLEX ITEM laid out by the flex algorithm, not
 * normal block/inline flow, and the host-origin approximation either crosses
 * straight through the row's other content (row case, onyx-noir, task-13
 * fix round 1) or paints a whole 44px rule at the CONTAINER's own top-left
 * corner instead of centered below all its other content (column case,
 * sienna/elegant, fix round 2 — confirmed live: the DOM has NOTHING within
 * 16px of where our old approximation painted it). `hostCs`/`lastChildBox`
 * are undefined/null for callers that don't have (or don't need) them.
 *
 * ROW: items lay out left-to-right in box order, so `::after` (always LAST
 * in box order) starts right after the last REAL child box the caller
 * supplies, plus the container's `column-gap`; cross-axis (Y) position
 * follows `align-items`, same as the flex algorithm would place any item.
 * `::before` is always FIRST in box order, so the host-origin x is already
 * right for it — only the cross-axis correction still applies to it.
 *
 * COLUMN: the roles of the two axes swap. Main-axis (Y) position for
 * `::after` is the last real child's bottom edge plus the container's
 * `row-gap` plus the pseudo's own `margin-top` (margins and `gap` are
 * ADDITIVE in flex layout, never collapsed the way block-layout margins
 * are) — `::before` skips the "after last child" term but still gets its
 * own `margin-top`. Cross-axis (X) is resolved from the pseudo's OWN
 * computed `margin-left`/`margin-right` when either is nonzero: a flex
 * item's `getComputedStyle().marginLeft` reports the actual USED value
 * whether it was authored as an explicit length or as `auto` (auto-margin
 * centering — sienna's case, verified live: equal resolved left/right
 * margins that sum to exactly the container's leftover width) — trusting it
 * directly needs no "was this literally the word auto" check, which
 * `getComputedStyle` doesn't expose post-layout anyway. Falls back to
 * `align-items` only when neither margin is in play (both resolve to 0).
 */
export function pseudoBox(
  cs: CSSStyleDeclaration,
  host: Box,
  which: '::before' | '::after' = '::before',
  hostCs?: FlexHostStyle,
  lastChildBox?: Box | null
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

  const isFlex = hostCs && (hostCs.display === 'flex' || hostCs.display === 'inline-flex')
  const isColumn = isFlex && (hostCs!.flexDirection === 'column' || hostCs!.flexDirection === 'column-reverse')
  const isRow = isFlex && !isColumn && (!hostCs!.flexDirection || hostCs!.flexDirection === 'row')

  if (isRow) {
    if (which === '::after' && lastChildBox) {
      xPx = lastChildBox.xPx + lastChildBox.wPx + (parsePx(hostCs!.columnGap) || 0)
    }
    if (hostCs!.alignItems === 'center') yPx = host.yPx + (host.hPx - hPx) / 2
    else if (hostCs!.alignItems === 'flex-end') yPx = host.yPx + host.hPx - hPx
  } else if (isColumn) {
    const marginTopPx = parsePx(cs.marginTop)
    yPx = host.yPx + marginTopPx
    if (which === '::after' && lastChildBox) {
      yPx = lastChildBox.yPx + lastChildBox.hPx + (parsePx(hostCs!.rowGap) || 0) + marginTopPx
    }

    const marginLeftPx = parsePx(cs.marginLeft)
    const marginRightPx = parsePx(cs.marginRight)
    if (marginLeftPx > 0 || marginRightPx > 0) {
      xPx = host.xPx + marginLeftPx
    } else if (hostCs!.alignItems === 'center') {
      xPx = host.xPx + (host.wPx - wPx) / 2
    } else if (hostCs!.alignItems === 'flex-end') {
      xPx = host.xPx + host.wPx - wPx
    }
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
/** Rotation (deg) and the translation the computed `transform` matrix applies
 *  to the BOX CENTER (transform-origin defaults to the center, so rotation
 *  never moves it and the matrix translation column IS the center shift). */
export function parseTransform(transform: string): { rotationDeg: number; dxPx: number; dyPx: number } {
  const m = /^matrix\(([^)]+)\)$/.exec(transform || '')
  if (!m) return { rotationDeg: 0, dxPx: 0, dyPx: 0 }
  const [a, b, , , e, f] = m[1].split(',').map((v) => parseFloat(v.trim()))
  return { rotationDeg: (Math.atan2(b, a) * 180) / Math.PI, dxPx: e || 0, dyPx: f || 0 }
}

function pseudoOps(el: HTMLElement, root: HTMLElement, ops: DrawOp[], which: '::before' | '::after'): void {
  const cs = getComputedStyle(el, which)
  if (cs.content === 'none' || cs.display === 'none') return

  const opacityMul = elementOpacity(cs)
  const hostCs = getComputedStyle(el)
  // Only fetched when it could actually matter (flex host, ::after) — an
  // extra getBoundingClientRect for every plain static pseudo (the
  // overwhelming common case) would be wasted work.
  const isFlex = hostCs.display === 'flex' || hostCs.display === 'inline-flex'
  const lastChildBox = isFlex && which === '::after' && el.lastElementChild ? boxOf(el.lastElementChild, root) : null
  const box = pseudoBox(cs, boxOf(el, root), which, hostCs, lastChildBox)

  // Row-flex `align-items: baseline` with a TEXTLESS pseudo (2026-08-17
  // user report — the Grid skills diamond rendered at the chip's TOP in
  // the PDF while the canvas centers it): a no-text flex item aligns its
  // BOTTOM edge to the host's text baseline. Approximate the baseline as
  // line-height − 0.435em of the HOST font — calibrated by pixel
  // measurement against the live canvas (probe-diamond: DOM marker center
  // 7.64px, this model 7.6px; the first guess of 0.32em sat 1.4px low).
  const isRowFlex = isFlex && (!hostCs.flexDirection || hostCs.flexDirection === 'row')
  if (isRowFlex && hostCs.alignItems === 'baseline' && !pseudoContentText(cs.content) && box.hPx > 0) {
    const hostFontPx = parsePx(hostCs.fontSize)
    const hostLineH = parsePx(hostCs.lineHeight) || hostFontPx * 1.2
    const baselineY = boxOf(el, root).yPx + hostLineH - hostFontPx * 0.435
    box.yPx = baselineY - box.hPx
  }
  // The computed transform's center shift always applies (translateY(-1px)
  // on the grid diamond); rotation is consumed below for the diamond shape.
  const tf = parseTransform(cs.transform)
  box.xPx += tf.dxPx
  box.yPx += tf.dyPx

  const radii = cornerRadii(cs)
  const bg = parseColor(cs.backgroundColor)
  if (bg && bg.a > 0 && box.wPx > 0 && box.hPx > 0) {
    // A square pseudo rotated ~45° is a DIAMOND (Grid skills marker) — the
    // export used to drop the rotation and print an axis-aligned square.
    // Emitted as an svg path so no rect-op rotation plumbing is needed;
    // the path's bounding box is the rotated square's (diagonal-sized),
    // centered where the unrotated box was.
    if (Math.abs(Math.abs(tf.rotationDeg) - 45) < 8 && Math.abs(box.wPx - box.hPx) < 1) {
      const cx = box.xPx + box.wPx / 2
      const cy = box.yPx + box.hPx / 2
      const r = (box.wPx * Math.SQRT2) / 2
      ops.push({
        kind: 'svg',
        xPx: cx - r,
        yPx: cy - r,
        wPx: r * 2,
        hPx: r * 2,
        viewBox: [0, 0, 2, 2],
        d: 'M 1 0 L 2 1 L 1 2 L 0 1 Z',
        fill: { ...bg, a: bg.a * opacityMul },
        stroke: undefined,
        strokeWidthPx: 0,
      })
    } else {
      ops.push({
        kind: 'rect',
        xPx: box.xPx,
        yPx: box.yPx,
        wPx: box.wPx,
        hPx: box.hPx,
        fill: { ...bg, a: bg.a * opacityMul },
        radii,
      })
    }
  }
  // Pseudo-elements previously got NO border handling at all (task 22) — a
  // `::before`/`::after` with a `border` (e.g. .tpl-timeline's circular
  // marker: `border-radius: 50%`, `border: 2px solid`) silently vanished
  // from the export. Same box-size guard as the background rect above: a
  // pseudo's box is SYNTHESIZED (pseudoBox), not measured, and can come out
  // zero/negative for a degenerate host, unlike boxOps's real elements.
  if (box.wPx > 0 && box.hPx > 0) borderOps(el, cs, box, radii, opacityMul, ops)

  const text = pseudoContentText(cs.content)
  if (!text) return
  const run = styledTextRun(cs, text, box.xPx, box.yPx)
  if (run)
    ops.push({
      kind: 'text',
      run: opacityMul === 1 ? run : { ...run, color: { ...run.color, a: run.color.a * opacityMul } },
    })
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
  //
  // GEOMETRY (2026-08-17 user report "points not aligned", calibrated
  // against pixel measurement of Chromium's own rendering): the dot centers
  // on the FIRST LINE BOX (computed line-height / 2 below the li top —
  // measured 8.80px vs Chromium's true 8.51px on the harvard/Source Serif 4
  // case, sub-half-pixel), and its diameter is ceil(fontSize / 3) (5px,
  // exact match). The previous font-bounding-box arithmetic placed the dot
  // 2px low and 0.5px small (measured 10.52px/4.5px) — and canvas font
  // metrics additionally RACE font loading (first measurement caches
  // fallback-font numbers), which line-height arithmetic is immune to.
  if (!explicitText && (kind === 'disc' || kind === 'circle' || kind === 'square')) {
    const d = Math.ceil(sizePx / 3)
    const gapPx = sizePx * 0.4
    const lineHeightPx = parsePx(cs.lineHeight) || layoutMetricsFor(font).heightPx || sizePx * 1.2
    const centerYPx = box.yPx + lineHeightPx / 2
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
      const pts = (attr('points') || '')
        .trim()
        .split(/[\s,]+/)
        .filter(Boolean)
        .map(Number)
      if (pts.length < 4 || pts.length % 2 !== 0 || pts.some((n) => !Number.isFinite(n))) return null
      const cmds = [`M ${pts[0]} ${pts[1]}`]
      for (let i = 2; i < pts.length; i += 2) cmds.push(`L ${pts[i]} ${pts[i + 1]}`)
      if (tag === 'polygon') cmds.push('Z')
      return cmds.join(' ')
    }
    case 'circle': {
      const cx = num('cx'),
        cy = num('cy'),
        r = num('r')
      if (r <= 0) return null
      // Two 180deg arcs trace the full circumference — same "two-arc circle"
      // shape as roundedRectPath's stadium collapse in paint.ts, just via
      // SVG arc commands instead of a radius clamp.
      return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`
    }
    case 'rect': {
      const x = num('x'),
        y = num('y'),
        w = num('width'),
        h = num('height')
      if (w <= 0 || h <= 0) return null
      // rx/ry per SVG: either sets both, clamped to half the box (lucide's
      // Briefcase body is rx=2 — flattening it to sharp corners visibly
      // diverged from the browser at icon scale, user-reported 2026-08-16)
      const rxAttr = attr('rx'),
        ryAttr = attr('ry')
      let rx = rxAttr !== null ? Number(rxAttr) : ryAttr !== null ? Number(ryAttr) : 0
      let ry = ryAttr !== null ? Number(ryAttr) : rx
      if (!Number.isFinite(rx) || rx < 0) rx = 0
      if (!Number.isFinite(ry) || ry < 0) ry = 0
      rx = Math.min(rx, w / 2)
      ry = Math.min(ry, h / 2)
      if (rx <= 0 || ry <= 0) return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`
      return (
        `M ${x + rx} ${y} L ${x + w - rx} ${y} A ${rx} ${ry} 0 0 1 ${x + w} ${y + ry} ` +
        `L ${x + w} ${y + h - ry} A ${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h} ` +
        `L ${x + rx} ${y + h} A ${rx} ${ry} 0 0 1 ${x} ${y + h - ry} ` +
        `L ${x} ${y + ry} A ${rx} ${ry} 0 0 1 ${x + rx} ${y} Z`
      )
    }
    default:
      return null
  }
}

/**
 * Makes one shape child's `d` safe for concatenation into a combined path
 * (user-reported icon corruption, 2026-08-16). Per the SVG spec, a path
 * whose `d` STARTS with a lowercase `m x y` is an ABSOLUTE moveto (there is
 * no previous point to be relative to) — but `svgIconOps` below joins every
 * child's `d` into one string, and in that combined path the same `m`
 * becomes RELATIVE to the previous child's endpoint, displacing the whole
 * shape (the languages icon scrambled; badge-check's check stroke drifted
 * off its seal). The rewrite: leading `m x y` -> `M x y`, and — the trap a
 * naive case-flip falls into — any bare coordinate pairs that FOLLOW the
 * leading pair (implicit linetos, which stay RELATIVE after a moveto of
 * either case) become an explicit `l` run so their meaning survives the `M`.
 * Uppercase-M paths and every other command are returned verbatim; a
 * malformed leading run (fewer than 2 numbers) is returned verbatim rather
 * than guessed at. Exported for direct unit testing.
 */
export function absolutizeLeadingMoveto(d: string): string {
  const lead = /^\s*m[\s,]*/.exec(d)
  if (!lead) return d
  let i = lead[0].length
  const numRe = /[+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?/y
  const nums: string[] = []
  for (;;) {
    while (i < d.length && /[\s,]/.test(d[i])) i++
    numRe.lastIndex = i
    const t = numRe.exec(d)
    if (!t) break
    nums.push(t[0])
    i = numRe.lastIndex
  }
  if (nums.length < 2) return d
  const rest = d.slice(i).trim()
  const tailPairs = nums.slice(2)
  const tail = tailPairs.length ? ` l ${tailPairs.map((n) => String(Number(n))).join(' ')}` : ''
  const head = `M ${Number(nums[0])} ${Number(nums[1])}`
  return rest ? `${head}${tail} ${rest}` : `${head}${tail}`
}

/**
 * Re-emits every arc (a/A) argument group in `d` with explicit separators
 * (user-reported icon corruption, 2026-08-16). SVG's grammar allows the two
 * single-digit arc FLAGS to pack against the next number with no separator
 * (`a18.15 18.15 0 0 1-20 0` = large-arc 0, sweep 1, x -20) — briefcase-
 * business's lid swoop ships exactly that form, and pdf-lib's drawSvgPath
 * lexer mis-reads it (generic number parsing consumes `1-20`-adjacent
 * digits wrong) and drops the arc. Flag positions are lexed as what they
 * ARE — one mandatory 0/1 digit each — and each 7-value group re-emitted
 * space-separated; everything outside a/A argument runs is copied verbatim.
 * Exported for direct unit testing.
 */
export function expandArcFlags(d: string): string {
  const numRe = /[+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?/y
  let out = ''
  let i = 0
  const skipSep = () => {
    while (i < d.length && /[\s,]/.test(d[i])) i++
  }
  const readNum = (): string | null => {
    skipSep()
    numRe.lastIndex = i
    const t = numRe.exec(d)
    if (!t) return null
    i = numRe.lastIndex
    return t[0]
  }
  const readFlag = (): string | null => {
    skipSep()
    if (d[i] === '0' || d[i] === '1') {
      const f = d[i]
      i++
      return f
    }
    return null
  }
  while (i < d.length) {
    const c = d[i]
    if (c === 'a' || c === 'A') {
      out += c
      i++
      for (;;) {
        const save = i
        const rx = readNum()
        if (rx === null) break
        const ry = readNum()
        const rot = readNum()
        const f1 = readFlag()
        const f2 = readFlag()
        const x = readNum()
        const y = readNum()
        if (ry === null || rot === null || f1 === null || f2 === null || x === null || y === null) {
          // malformed group: emit the rest verbatim rather than guessing
          i = save
          break
        }
        out += ` ${rx} ${ry} ${rot} ${f1} ${f2} ${Number(x)} ${Number(y)}`
      }
    } else {
      out += c
      i++
    }
  }
  return out
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

  const vb = (svg.getAttribute('viewBox') || '')
    .trim()
    .split(/[\s,]+/)
    .map(Number)
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
      if (d) dParts.push(absolutizeLeadingMoveto(expandArcFlags(d)))
      else if (import.meta.env.DEV)
        console.warn(`[pdf] inline <svg> <${tag}> has no usable geometry, skipping shape`, child)
    } else if (!SVG_STRUCTURAL_TAGS.has(tag)) {
      if (import.meta.env.DEV)
        console.warn(`[pdf] inline <svg> has an unsupported child <${tag}>, skipping shape`, child)
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

  const stroke =
    strokeColor && strokeColor.a > 0 && strokeWidthPx > 0
      ? { ...strokeColor, a: strokeColor.a * opacityMul }
      : undefined
  const fill = fillColor && fillColor.a > 0 ? { ...fillColor, a: fillColor.a * opacityMul } : undefined
  if (!stroke && !fill) return

  ops.push({
    kind: 'svg',
    xPx: box.xPx,
    yPx: box.yPx,
    wPx: box.wPx,
    hPx: box.hPx,
    d: dParts.join(' '),
    viewBox: [vbX, vbY, vbW, vbH],
    stroke,
    fill,
    strokeWidthPx,
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
      // Structure role for the tagged-PDF tree: derived from the DOM the
      // run came from, so a heading is whatever the template renders as one
      // (tagging.ts). Decorative runs are artifacts a reader skips.
      const role = roleForElement((n as Text).parentElement, root)
      const column: 'main' | 'aside' = (n as Text).parentElement?.closest('.rm-col-aside') ? 'aside' : 'main'
      const blockId = logicalBlockId((n as Text).parentElement, root)
      for (const run of extractRuns(n as Text, root)) {
        ops.push({ kind: 'text', run, role: run.isDecorative ? 'Artifact' : role, column, blockId })
      }
    }
  }
  closeUpTo(null)
  tagPageChromeOps(ops, boxOf(root, root).hPx)
  // Two-column layouts: put the main column's text ahead of the sidebar's in
  // the TEXT LAYER, which is what an ATS reads (readingOrder.ts). Purely a
  // reordering of text ops — no glyph moves, and single-column documents get
  // the identical array back.
  return mainColumnTextFirst(ops)
}

/**
 * Post-pass (native-multipage-pdf plan, task 2): marks every background
 * `rect` op that spans >= 96% of the document's own total content height as
 * `pageChrome` — the root's own full-height background (always exactly
 * 100%, so it always qualifies) plus any other background rect that reads as
 * a full-column band rather than page-specific content (e.g. a two-column
 * template's dark sidebar fill). See types.ts's `DrawOpChrome.pageChrome`
 * doc comment for what task 3's paint.ts does with the tag.
 *
 * Runs as a pass over the FINISHED op list rather than tagging inline at
 * boxOps-time: boxOps only ever sees one element's own box, not the whole
 * document's total height, and threading that through every caller (boxOps,
 * pseudoOps, svgLogoOps) would be far more invasive than one pass at the
 * end. A rect with no fill (a pure `fillGradient`) still counts as
 * "background" for this heuristic — gradients repeat as chrome too (spec
 * section 2: "gradients/borders on chrome rects repeat with the rect").
 */
function tagPageChromeOps(ops: DrawOp[], contentHeightPx: number): void {
  if (!(contentHeightPx > 0)) return // guards NaN/0/negative — never tag against a degenerate height
  const threshold = contentHeightPx * 0.96
  for (const op of ops) {
    if (op.kind === 'rect' && (op.fill || op.fillGradient) && op.hPx >= threshold) {
      op.pageChrome = true
    }
  }
}

/* ------------------------------------------------------- extractPageBlocks */

/**
 * DOM-derived `PageBlock[]` for the native-multipage-pdf plan's pagination
 * engine (paginate.ts — READ ITS JSDoc first, its shape is the binding
 * contract this function fills in). Walks the SAME rendered résumé DOM
 * `buildDrawList` walks (print-mode for export, the live editable canvas for
 * the WYSIWYG preview — both share the exact `.rm-section`/`.rm-item`/
 * `.rm-skill-group`/`.rm-mini`/`.rm-chips` class vocabulary sections.tsx and
 * Artboard.tsx render), producing ONE FLAT, top-to-bottom-ordered sequence of
 * blocks: `'section-gap'`/`'entry-gap'` blocks are the ACTUAL empty region
 * between two sections/entries (their own span IS the gap); `'line'` blocks
 * are real text-line ink (reusing text.ts's `textNodeLineSegments` — the
 * same per-line geometry `extractRuns` paints from); `'atomic'` blocks are
 * indivisible non-text ink (an image, an inline `<svg>` icon, a chip row).
 * Section titles (`.rm-section-title`) and entry title ROWS carry
 * `keepWithNext: true` so paginate.ts's widow rule can never strand a
 * heading alone at the bottom of a page.
 *
 * "Title ROW", not just "title text": `.rm-item-head` (badge/logo + title +
 * date), `.rm-level` (a skill/language name + its rating meter), and the
 * bare `.rm-skill-group-name`/`.rm-mini-title` spans (Interests/References,
 * which have no wrapping row) are each collapsed to ONE block from their OWN
 * `getBoundingClientRect()` rather than decomposed into their child text
 * nodes. Two reasons: (1) these are `display:flex` ROWS laying out sibling
 * elements SIDE BY SIDE on one visual line (badge, title, date) — decomposing
 * per child would put those siblings at roughly the same y (not stacked),
 * producing overlapping blocks, which is exactly what this module's own
 * sanity check below flags; (2) it's also the semantically right answer for
 * keepWithNext — the WHOLE title+date row (or name+meter row) is what must
 * stay with the entry's first content line, not just the title text alone.
 * `.rm-item-sub` (org + location + GPA — also a wrapping flex row, see
 * artboard.css) gets the same single-block collapse for the SAME
 * same-line-siblings reason, but is NOT a title (no keepWithNext).
 *
 * KNOWN IMPRECISION (documented, not fixed here — see the task-2 report):
 * sibling TEXT NODES sharing one visual line via inline rich-text formatting
 * (e.g. a bold `<strong>` run mid-sentence in a bullet) are measured
 * independently per text node (same as extractRuns always did) and are NOT
 * merged into one shared-line block, so they can produce partially
 * overlapping 'line' blocks. paginate.ts tolerates this (candidates are only
 * ever built at gap midpoints; `fallsInsideInk` defensively drops any that
 * still land inside a block) and this module's sanity check dev-warns rather
 * than throws, so the worst case is a slightly worse (not wrong) page break.
 *
 * The header (`.rm-header`) is deliberately NOT walked — paginate.ts never
 * needs a candidate break inside it (nothing here proposes a cut in a region
 * with no blocks at all), and section/entry gap semantics don't apply to it.
 *
 * TWO-COLUMN layouts (task 2b, native-multipage-pdf plan): Artboard.tsx
 * always wraps the main column's sections in a `<main class="rm-col-main">`
 * (single-column docs too — `.rm-col-main` alone carries no column meaning
 * by itself), and additionally renders a sidebar `<aside class="rm-col-
 * aside">` next to it whenever the template is configured for 2 columns AND
 * has any aside sections at all. Its presence is exactly the two-column
 * signal: when it exists, main's and aside's sections sit SIDE BY SIDE at
 * overlapping y-ranges (task 2's own flat root-wide walk used to concatenate
 * aside's blocks then main's — or vice versa — as if they were sequential,
 * which produced a nonsensical, non-monotonic combined list the moment the
 * second column's y-range restarted near the top; this module's own dev-only
 * sanity check used to fire on every real two-column template as a result).
 * Each column is walked independently, in its own local top-to-bottom order,
 * and `combineColumns` (paginate.ts) merges them into one legal sequence
 * where a cut candidate exists only where EVERY column is clear at that y
 * (spec 1: "both columns cut at the same y").
 *
 * Single-column docs (no `.rm-col-aside` present) skip `combineColumns`
 * entirely rather than routing a single column through it — same walk,
 * same result, byte-identical to task 2's own output (see the task-2b
 * brief's explicit byte-stability requirement; `combineColumns` itself
 * relabels 'atomic' ink as 'line' when reconstructing merged blocks, which
 * would NOT be byte-identical for a column containing any image/svg/chip
 * block even though it's semantically equivalent to paginate.ts).
 */
export function extractPageBlocks(root: HTMLElement): PageBlock[] {
  const rootTop = root.getBoundingClientRect().top
  const aside = findByClass(root, ['rm-col-aside'])[0]

  if (!aside) {
    const blocks = extractBlocksFromScope(root, rootTop)
    if (import.meta.env.DEV) sanityCheckPageBlocks(blocks)
    return blocks
  }

  const main = findByClass(root, ['rm-col-main'])[0] ?? root
  const mainBlocks = extractBlocksFromScope(main, rootTop)
  const asideBlocks = extractBlocksFromScope(aside, rootTop)
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    // Diagnosis only: a stranded heading needs the PRE-combine blocks to tell
    // a flag that combineColumns lost from one that was never set. Guarded on
    // `window` because the unit suite runs this extractor under node.
    ;(window as unknown as { __cvaLastColumnBlocks?: unknown }).__cvaLastColumnBlocks = {
      main: mainBlocks.map((b) => ({ ...b })),
      aside: asideBlocks.map((b) => ({ ...b })),
    }
  }
  const combined = combineColumns([mainBlocks, asideBlocks])
  if (import.meta.env.DEV) sanityCheckPageBlocks(combined)
  return combined
}

/**
 * The MAIN column's own block list, BEFORE `combineColumns` merges it with
 * the aside — native-multipage-pdf plan, task 5 fix round 2: the editor
 * preview's two-column separator mapping needs to attribute a print-space
 * cut back to ONE real section/entry so it can find that element's edit-
 * canvas counterpart (the same section-key + entry-index scheme
 * `pageChromeMap.ts` uses for single-column docs), which the COMBINED list
 * alone cannot support — a combined gap can straddle two DIFFERENT columns'
 * content, so counting its section-gap/entry-gap blocks doesn't name a
 * single section. The main column is the correct structural anchor: every
 * cut is a full-width line, and the main column is the one column every
 * template always renders (the aside is optional — see Artboard.tsx).
 *
 * Uses the SAME `rootTop` reference `extractPageBlocks` does (relative to
 * `root`, not to the main column's own top), so its `topPx`/`bottomPx`
 * values live in the SAME coordinate space `paginate()`'s cuts do —
 * `cutY` from the combined result can be compared directly against this
 * list's blocks with no translation.
 *
 * Returns `null` for single-column docs (no `.rm-col-aside`) — callers
 * should use `extractPageBlocks` directly there, since its output already
 * IS the (single) column's own list.
 */
export function extractMainColumnBlocks(root: HTMLElement): PageBlock[] | null {
  const rootTop = root.getBoundingClientRect().top
  const aside = findByClass(root, ['rm-col-aside'])[0]
  if (!aside) return null
  const main = findByClass(root, ['rm-col-main'])[0] ?? root
  return extractBlocksFromScope(main, rootTop)
}

/** One column's own blocks: every `.rm-section` found within `scope`, each
 *  section's own blocks (`extractSectionBlocks`) joined by a `'section-gap'`
 *  block measuring the real empty span between consecutive sections — the
 *  body `extractPageBlocks` used to run directly against `root` before task
 *  2b, unchanged for the single-column (no-aside) case. */
function extractBlocksFromScope(scope: Element, rootTop: number): PageBlock[] {
  const sections = findByClass(scope, ['rm-section'])

  const blocks: PageBlock[] = []
  let prevEnd: PageBlock | null = null
  for (const section of sections) {
    const sectionBlocks = extractSectionBlocks(section, rootTop)
    if (!sectionBlocks.length) continue
    if (prevEnd) {
      blocks.push({ kind: 'section-gap', topPx: prevEnd.bottomPx, bottomPx: sectionBlocks[0].topPx })
    }
    blocks.push(...sectionBlocks)
    prevEnd = sectionBlocks[sectionBlocks.length - 1]
  }
  return blocks
}

/** `.rm-section-title`, and every entry's "title ROW" wrapper (or, absent a
 *  wrapper, the bare title span itself — Interests/References) — collapsed
 *  to ONE block from their own box and flagged `keepWithNext`. See
 *  `extractPageBlocks`'s doc comment for why a whole ROW, not just the title
 *  text run. */
/** A stable id for the nearest BLOCK-level ancestor of a text node - the
 *  paragraph, bullet or heading a reader thinks of as one unit. Every visual
 *  line of that block shares the id, which is what lets the structure tree
 *  group them into ONE element instead of one per line. Inline ancestors
 *  (<strong>, <em>, a chip's span) are transparent, so a bolded run mid
 *  sentence stays part of its paragraph. */
const blockIds = new WeakMap<Element, number>()
let nextBlockId = 1
function logicalBlockId(from: Element | null, root: Element): number | undefined {
  let el: Element | null = from
  while (el && el !== root.parentElement) {
    const display = getComputedStyle(el).display
    if (display !== 'inline' && display !== 'contents') {
      let id = blockIds.get(el)
      if (id === undefined) {
        id = nextBlockId++
        blockIds.set(el, id)
      }
      return id
    }
    el = el.parentElement
  }
  return undefined
}

const TITLE_ROW_CLASSES = ['rm-section-title', 'rm-item-head', 'rm-level', 'rm-skill-group-name', 'rm-mini-title']
/** Other flex ROWS with same-line siblings that need the same single-block
 *  collapse but are NOT a title (no keepWithNext) — see the doc comment. */
const PLAIN_ROW_CLASSES = ['rm-item-sub']
/** One entry wrapper per section-body child (sections.tsx's real classes —
 *  Summary/Work/Education/Projects/Volunteer/Custom use `rm-item`, Skills
 *  uses `rm-skill-group`, Languages/Certificates/Awards/Publications/
 *  Interests/References use `rm-mini`). Entries never nest. */
const ENTRY_CLASSES = ['rm-item', 'rm-skill-group', 'rm-mini']

function hasAnyClass(el: Element, classes: string[]): boolean {
  const cl = (el as HTMLElement).classList
  return classes.some((c) => cl.contains(c))
}

/** Same print-DOM filtering `buildDrawList`'s own TreeWalker applies —
 *  edit-canvas-only chrome (delete buttons, gears, add-entry rows — all
 *  `no-print`) and anything laid out with zero footprint must never
 *  contribute a block, in EITHER the offscreen print-mode DOM (export) or
 *  the live editable canvas (preview) this function also runs against, or
 *  the two would disagree on cut positions. */
function isSkippedElement(el: Element): boolean {
  if ((el as HTMLElement).classList.contains('no-print')) return true
  const cs = getComputedStyle(el as HTMLElement)
  return cs.display === 'none' || cs.visibility === 'hidden'
}

/** Images, inline `<svg>` icons, and chip rows are indivisible ink — never
 *  decomposed into lines (brief: "images/svg/chips emit atomic"). */
function isAtomicElement(el: Element): boolean {
  if (el.tagName === 'IMG' || el.tagName === 'svg') return true
  return (el as HTMLElement).classList.contains('rm-chips')
}

/** Depth-first search for every descendant matching one of `classes`,
 *  document order, skipped/no-print subtrees pruned — does NOT descend past
 *  a match (sections don't nest inside sections; entries don't nest inside
 *  entries). Shared by section-finding and entry-finding — the two calls
 *  just differ in which class list they pass. */
function findByClass(root: Element, classes: string[]): Element[] {
  const out: Element[] = []
  const visit = (el: Element) => {
    for (const child of Array.from(el.childNodes)) {
      if (child.nodeType !== Node.ELEMENT_NODE) continue
      const c = child as Element
      if (isSkippedElement(c)) continue
      if (hasAnyClass(c, classes)) {
        out.push(c)
        continue
      }
      visit(c)
    }
  }
  visit(root)
  return out
}

/** Pushes ONE block from `el`'s own `getBoundingClientRect()` — used for
 *  atomic elements and for the title/plain ROW collapse (see the module doc
 *  comment) — never for plain per-text-node line blocks, which come from
 *  `pushTextLineBlocks` below instead. */
function pushOwnBoxBlock(
  el: Element,
  rootTop: number,
  out: PageBlock[],
  kind: 'line' | 'atomic',
  keepWithNext: boolean
): void {
  const r = el.getBoundingClientRect()
  const topPx = r.top - rootTop
  const bottomPx = r.bottom - rootTop
  if (bottomPx <= topPx) return // zero/negative-height box — nothing to record
  out.push(keepWithNext ? { kind, topPx, bottomPx, keepWithNext: true } : { kind, topPx, bottomPx })
}

/** Pushes one 'line' block per visually-wrapped line of a text node, via
 *  text.ts's shared `textNodeLineSegments` — the exact geometry
 *  `extractRuns` paints from. */
function pushTextLineBlocks(node: Text, rootTop: number, out: PageBlock[]): void {
  if (!node.data || node.data.trim() === '') return
  const lines: PageBlock[] = []
  for (const seg of textNodeLineSegments(node)) {
    const topPx = seg.rect.top - rootTop
    const bottomPx = seg.rect.bottom - rootTop
    if (bottomPx <= topPx) continue
    lines.push({ kind: 'line', topPx, bottomPx })
  }
  // Widow/orphan control: a page break may not strand one line of a wrapped
  // paragraph on its own (widows.ts). Expressed as keepWithNext so the rule
  // survives combineColumns and applies to two-column resumes too.
  const keep = keepFlagsForParagraph(lines.length)
  lines.forEach((line, i) => {
    if (keep[i]) line.keepWithNext = true
    out.push(line)
  })
}

/** Union `[topPx, bottomPx]` of every real text-line rect within `el`'s own
 *  subtree (task 6b's geometric stretch test — see `pushRowBlock`), or
 *  `null` when the element has no text ink at all (an image/icon-only row,
 *  or an empty placeholder) — callers keep today's box-collapse behavior in
 *  that case, per the brief ("elements with no text at all keep today's
 *  behavior"). Reuses `textNodeLineSegments` (text.ts) — the exact
 *  Range-based line geometry `pushTextLineBlocks`/`extractRuns` already
 *  measure from, so this is the SAME notion of "a text line" pagination
 *  already relies on elsewhere, not a new approximation. Recurses through
 *  every descendant (skipped/no-print subtrees pruned) regardless of
 *  atomic/title-row nesting — this only ever needs a height comparison, not
 *  a real block list. */
function textLineUnion(el: Element, rootTop: number): { topPx: number; bottomPx: number } | null {
  let topPx = Infinity
  let bottomPx = -Infinity
  const visit = (node: Element) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child as Text
        if (!text.data || text.data.trim() === '') continue
        for (const seg of textNodeLineSegments(text)) {
          const t = seg.rect.top - rootTop
          const b = seg.rect.bottom - rootTop
          if (b <= t) continue
          if (t < topPx) topPx = t
          if (b > bottomPx) bottomPx = b
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const c = child as Element
        if (isSkippedElement(c)) continue
        visit(c)
      }
    }
  }
  visit(el)
  return topPx <= bottomPx ? { topPx, bottomPx } : null
}

/** Recurses through `el`'s own child text/element nodes, collecting ink into
 *  `out` — the ordinary (non-collapsed) half of `collectInk`, factored out so
 *  `pushRowBlock`'s stretched-box fallback can drive the exact same walk a
 *  plain (non-row) element already gets. */
function collectChildInk(el: Element, rootTop: number, out: PageBlock[]): void {
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      pushTextLineBlocks(child as Text, rootTop, out)
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const c = child as Element
      if (isSkippedElement(c)) continue
      collectInk(c, rootTop, out)
    }
  }
}

/** Tallest `getBoundingClientRect()` height among `el`'s atomic descendants
 *  (image/svg/chip row — see `isAtomicElement`), or 0 when there are none.
 *  Task 6b fix-round-1, finding M4: `pushRowBlock`'s decomposition assumes a
 *  stretched row's real content is explained by its TEXT alone; a row that
 *  also holds an atomic child taller than that text (e.g. an icon beside a
 *  short label) decomposes into an atomic ink block sitting at roughly the
 *  same y as a much-shorter text-line block — the exact overlapping-ink
 *  shape the row-collapse exists to prevent in the first place (confirmed
 *  live: `atomic 100..160` then `line 100..120` tripped the blocks-overlap
 *  dev-warn). Does not descend PAST an atomic element — same one-indivisible-
 *  unit treatment `collectInk` itself gives it. */
function maxAtomicHeightPx(el: Element): number {
  let max = 0
  const visit = (node: Element) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType !== Node.ELEMENT_NODE) continue
      const c = child as Element
      if (isSkippedElement(c)) continue
      if (isAtomicElement(c)) {
        const r = c.getBoundingClientRect()
        const h = r.bottom - r.top
        if (h > max) max = h
        continue
      }
      visit(c)
    }
  }
  visit(el)
  return max
}

/**
 * ROW collapse (TITLE_ROW_CLASSES / PLAIN_ROW_CLASSES) for the COMMON case:
 * one block from the row's own bounding box, exactly as before task 6b. But
 * when the box height balloons far past the row's own real text-line extent
 * — a CSS-grid-stretched gutter label cell (atelier's `section: 'side'`
 * layout: probe `{kind:'line', top:243, h:1627, keepWithNext:true}`, a
 * 1627px-tall "line" holding one real text line at its top) — the ballooned
 * box is a lie about where the row's real ink is: paginate.ts reading it as
 * one giant `line` block finds no legal gap inside it at all, producing an
 * absurd cut or `PaginationImpossibleError` (task-6b brief, defect 1).
 *
 * Purely geometric (box height vs the union of the row's OWN text-line
 * rects, `textLineUnion` — the same Range-based line segmentation this
 * module already uses everywhere else): no template id or class name is
 * ever consulted, so every current and future template's stretched cells
 * benefit automatically. Thresholds (brief's own recommendation): box height
 * must exceed 1.6x the text span AND the absolute slack must exceed 24px —
 * either bound alone is cheap to clear from ordinary padding/line-height;
 * both together are not, so normal rows never churn. M4 adds one more guard
 * (`maxAtomicHeightPx`, see its own doc comment): a child atomic TALLER than
 * the text union skips decomposition entirely, falling back to the box.
 *
 * `keepWithNext` (title rows only — PLAIN_ROW_CLASSES always pass `false`):
 * fix-round-1 finding I1 — a decomposed row emits it on EVERY line, not just
 * the last, so a cut can never land BETWEEN a wrapped title's own lines (a
 * grid-stretched heading that ALSO wraps to two real lines by design, e.g.
 * a narrow "side" gutter label, used to protect only its last line, leaving
 * the gap between its own two lines as a legal — and disastrous — cut
 * candidate). The trailing line still carries the exact same semantic role
 * it always had: for a SECTION title (this function is never told
 * otherwise) that is unconditional; for an ENTRY title,
 * `dropTrailingTitleKeepWithNext` (fix 3) strips it back off downstream,
 * once the full entry's own trailing edge is known.
 *
 * M3 adds a safety net: if decomposition resolves to ZERO blocks (e.g. the
 * row's only ink is a zero-height atomic — real text existed for
 * `textLineUnion` to find and trigger the stretch check, but
 * `collectChildInk`'s own atomic-collapse then drops it via
 * `pushOwnBoxBlock`'s zero-height guard), this falls back to the box rather
 * than let the row vanish from the block list entirely — `pageChromeMap.
 * locateStructural` relies on every section/entry contributing at least one
 * block.
 */
function pushRowBlock(el: Element, rootTop: number, out: PageBlock[], keepWithNext: boolean): void {
  const textSpan = textLineUnion(el, rootTop)
  if (textSpan) {
    const r = el.getBoundingClientRect()
    const boxHeight = r.bottom - r.top
    const textHeight = textSpan.bottomPx - textSpan.topPx
    const stretched = boxHeight > 1.6 * textHeight && boxHeight - textHeight > 24
    if (stretched && maxAtomicHeightPx(el) <= textHeight) {
      const raw: PageBlock[] = []
      collectChildInk(el, rootTop, raw)
      const coalesced = coalesceSameLineBlocks(raw)
      if (coalesced.length) {
        out.push(...(keepWithNext ? coalesced.map((b) => ({ ...b, keepWithNext: true as const })) : coalesced))
        return
      }
      // M3: decomposition produced nothing at all -- fall through to the
      // plain box below instead of emitting zero blocks for this row.
    }
  }
  pushOwnBoxBlock(el, rootTop, out, 'line', keepWithNext)
}

/** Recursively collects every ink block ('line'/'atomic') within `el`'s own
 *  subtree, in document order — the entry-level (and title-row-level) walk
 *  `extractSectionBlocks` drives. Atomic elements and title/plain ROWS
 *  collapse to one block each (see `pushRowBlock` for the ROW case's
 *  geometric stretch exception) and are never descended into further here;
 *  anything else recurses through its child text/element nodes. */
function collectInk(el: Element, rootTop: number, out: PageBlock[]): void {
  if (isAtomicElement(el)) {
    pushOwnBoxBlock(el, rootTop, out, 'atomic', false)
    return
  }
  if (hasAnyClass(el, TITLE_ROW_CLASSES)) {
    pushRowBlock(el, rootTop, out, true)
    return
  }
  if (hasAnyClass(el, PLAIN_ROW_CLASSES)) {
    pushRowBlock(el, rootTop, out, false)
    return
  }
  // Widow control has to see a PARAGRAPH, not the text nodes it is made of.
  // A bullet carrying bold runs ("...cutting manual reporting effort by
  // <b>~40%</b>...") arrives as several text nodes, each flagged on its own
  // line count, so a four-line bullet could still be cut 2/2 - which on a
  // two-column page put the ENTIRE sidebar between the halves in the copied
  // text, since each page emits its main column and then its sidebar.
  // Coalescing the paragraph's own lines first, then flagging across all of
  // them, applies the rule to what the reader actually sees as one bullet.
  if (el.tagName === 'P' || el.tagName === 'LI') {
    const own: PageBlock[] = []
    collectChildInk(el, rootTop, own)
    const merged = coalesceSameLineBlocks(own)
    const lineIdx: number[] = []
    merged.forEach((b, i) => {
      if (b.kind === 'line') lineIdx.push(i)
    })
    const keep = keepFlagsForParagraph(lineIdx.length)
    lineIdx.forEach((bi, k) => {
      if (keep[k]) merged[bi].keepWithNext = true
    })
    out.push(...merged)
    return
  }
  collectChildInk(el, rootTop, out)
}

/**
 * Fix round (native-multipage-pdf plan, task 2 — same-line sibling
 * coalescing): sibling TEXT NODES sharing one visual line (a bold
 * `<strong>`/`<em>` run mid-sentence, e.g. "with 8+ years building" inside a
 * bullet) each get their own `'line'` block from `pushTextLineBlocks` — one
 * per text node, per this module's existing per-node granularity (see
 * text.ts's `textNodeLineSegments`). A `Range`'s bounding rect for a same-
 * line run correctly reports that shared line box's real vertical extent, so
 * two (or three) side-by-side runs come out with (near-)identical y-spans —
 * correct geometry, but PageBlock is y-ONLY, so the Y-only pagination model
 * reads that as overlapping ink. Confirmed live against the running app's
 * canvas (task-2 review): the unmodified dev sanity-warn fired ~11 times on
 * one ordinary long-form résumé, once per bolded line — this is not a rare
 * edge case, it fires on every inline-formatted line.
 *
 * Merges ADJACENT `'line'` blocks whose vertical spans overlap or coincide
 * (within the same 0.5px epsilon `sanityCheckPageBlocks` uses) into ONE block
 * spanning their union. Blocks are emitted in document order by a depth-first
 * walk, so same-line siblings are always adjacent in the array; genuinely
 * different (stacked) lines always have real vertical separation from
 * line-height leading, well past the epsilon, so they're never merged.
 * `'atomic'` blocks (images/svg/chips) never participate — they're already
 * whole units and must never absorb or be absorbed by adjacent text.
 *
 * Callers apply this to ONE `collectInk` call's own local output (one entry,
 * or one title row) — never to the section's combined `blocks` array — so
 * this can only ever merge siblings within a single flowing text block,
 * never across entries or sections (those are joined by explicit
 * `'entry-gap'`/`'section-gap'` blocks afterward, which this never touches).
 */
function coalesceSameLineBlocks(blocks: PageBlock[]): PageBlock[] {
  const EPS = 0.5
  const out: PageBlock[] = []
  for (const b of blocks) {
    const prev = out[out.length - 1]
    if (prev && prev.kind === 'line' && b.kind === 'line' && b.topPx <= prev.bottomPx + EPS) {
      out[out.length - 1] = {
        kind: 'line',
        topPx: Math.min(prev.topPx, b.topPx),
        bottomPx: Math.max(prev.bottomPx, b.bottomPx),
        ...(prev.keepWithNext || b.keepWithNext ? { keepWithNext: true as const } : {}),
      }
      continue
    }
    out.push(b)
  }
  return out
}

/** One section's own blocks: its title row, then each entry with an
 *  `'entry-gap'` block (the measured empty span) between consecutive ones —
 *  including between the title row and the first entry, so paginate.ts's
 *  widow rule (which only inspects `keepWithNext` on the block immediately
 *  BEFORE a gap) has a gap candidate to reject there too. Each `collectInk`
 *  call's own output is coalesced (see `coalesceSameLineBlocks`) before it's
 *  ever appended to the section-wide `blocks` list. */
function extractSectionBlocks(section: Element, rootTop: number): PageBlock[] {
  const blocks: PageBlock[] = []
  let prevEnd: PageBlock | null = null

  const titles = findByClass(section, ['rm-section-title'])
  if (titles.length) {
    const rawTitleBlocks: PageBlock[] = []
    collectInk(titles[0], rootTop, rawTitleBlocks)
    const titleBlocks = coalesceSameLineBlocks(rawTitleBlocks)
    blocks.push(...titleBlocks)
    prevEnd = titleBlocks[titleBlocks.length - 1] ?? prevEnd
  }

  const entries = findByClass(section, ENTRY_CLASSES)
  for (const entry of entries) {
    const rawEntryBlocks: PageBlock[] = []
    collectInk(entry, rootTop, rawEntryBlocks)
    const entryBlocks = dropTrailingTitleKeepWithNext(coalesceSameLineBlocks(rawEntryBlocks))
    if (!entryBlocks.length) continue
    if (prevEnd) {
      blocks.push({ kind: 'entry-gap', topPx: prevEnd.bottomPx, bottomPx: entryBlocks[0].topPx })
    }
    blocks.push(...entryBlocks)
    prevEnd = entryBlocks[entryBlocks.length - 1]
  }

  return blocks
}

/**
 * Fix round (task 6b, fix 3): an ENTRY title row (rm-item-head/rm-level/
 * rm-skill-group-name/rm-mini-title, collapsed by `pushRowBlock`) always
 * pushed its own block with `keepWithNext: true`, on the theory that a cut
 * must never separate a title from the entry's first body line. That theory
 * only holds when the entry actually HAS a body line below its title — a
 * single-line entry (a bare certification/award/language/interest row,
 * which IS its own title row and nothing else) has no such line to protect,
 * so the flag instead banned the ENTRY-GAP that follows it, chaining every
 * consecutive single-line entry into one unbreakable `keepWithNext` run
 * (live repro, task-6b fix-3 brief: verdant -> sienna template-switch merge,
 * a rich long doc, autoFit off — the languages/certifications/awards/
 * interests tail, ~2840-3089px, became one solid chain with zero legal cut
 * candidates near the ideal third-page boundary, and `renderResumePdf`
 * threw `PdfMultiPageUnsupportedError` for a document that paginates fine
 * once the flag is scoped correctly).
 *
 * An entry has exactly one title row (the four TITLE_ROW_CLASSES entry
 * variants are mutually exclusive within one entry), always first in
 * document order, so `keepWithNext: true` can only ever land on the LAST
 * block of `entryBlocks` when nothing else in the entry follows it — that is
 * precisely the "single-line entry" case. SECTION title rows never pass
 * through this function (handled separately above, left untouched): the ban
 * between a section heading and its first entry is genuine widow protection
 * no matter how long that first entry turns out to be.
 */
function dropTrailingTitleKeepWithNext(entryBlocks: PageBlock[]): PageBlock[] {
  if (!entryBlocks.length) return entryBlocks
  const last = entryBlocks[entryBlocks.length - 1]
  if (!last.keepWithNext) return entryBlocks
  return [...entryBlocks.slice(0, -1), { kind: last.kind, topPx: last.topPx, bottomPx: last.bottomPx }]
}

/**
 * Cheap dev-only guard (native-multipage-pdf plan, task 2 brief): paginate.ts
 * does NO runtime validation of the block list it's given — malformed
 * geometry (overlaps, negative heights, out-of-order blocks) degrades
 * silently rather than throwing — so this extractor is on the hook for
 * emitting a clean, sorted, non-overlapping tiling itself. Dev-warns rather
 * than throws: a violation here means a WORSE page break somewhere (see this
 * module's own "KNOWN IMPRECISION" doc comment above for the two documented
 * sources — same-line title/plain ROWS are already handled, inline rich-text
 * runs are not), not a broken export — a hard failure would take down the
 * whole multi-page path over what's usually a fidelity nit.
 */
function sanityCheckPageBlocks(blocks: PageBlock[]): void {
  const EPS = 0.5 // sub-pixel float noise tolerance
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    if (b.bottomPx < b.topPx) {
      console.warn('[pdf] extractPageBlocks: block has a negative height', b)
    }
    if (i > 0 && blocks[i - 1].topPx > b.topPx + EPS) {
      console.warn('[pdf] extractPageBlocks: blocks are not sorted by topPx', blocks[i - 1], b)
    }
    if (i > 0 && blocks[i - 1].bottomPx > b.topPx + EPS) {
      console.warn('[pdf] extractPageBlocks: blocks overlap', blocks[i - 1], b)
    }
  }
}
