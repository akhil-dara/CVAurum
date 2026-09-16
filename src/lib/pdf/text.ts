import { parseColor, parseFontWeight, parsePx } from './style'
import { SOFT_HYPHEN, stripSoftHyphens } from '@/lib/hyphenate'
import type { TextRun } from './types'

/** parseColor handles rgb()/rgba(), the `color(srgb ...)` form Chromium
 *  serializes color-mix() results to (see style.ts), and anything else via
 *  its canvas-normalization fallback (oklab()/oklch()/named colors/etc). */
const textColor = (css: string) => parseColor(css)

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

/** Distance from the top of the text box down to the alphabetic baseline, per
 *  canvas TextMetrics. Kept as `layoutMetricsFor`'s fallback source (canvas
 *  font-bounding-box ascent is NOT the ascent Chromium's own line layout
 *  uses — see layoutMetricsFor's doc comment) and by walk.ts's synthesized
 *  (pseudo/marker/logo) runs, which have no real line box to probe. */
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

/** Per-font layout metrics from `layoutMetricsFor`'s DOM probe: the ascent
 *  (top of line box -> alphabetic baseline) and the full line-box height
 *  (ascent + descent) it was measured against, for `line-height: normal`.
 *  `heightPx: null` means the probe was unavailable/unusable and `ascentPx`
 *  is the canvas fallback — callers must then skip the half-leading term
 *  entirely (there is no matching height to subtract against) rather than
 *  mixing a canvas ascent with a real DOM height. */
interface LayoutMetrics {
  ascentPx: number
  heightPx: number | null
}

const layoutMetricsCache = new Map<string, LayoutMetrics>()
let measureDiv: HTMLDivElement | null = null
let measureProbe: HTMLSpanElement | null = null

/** Lazily builds the hidden measurement container used by `layoutMetricsFor`:
 *  a positioned-off-screen div (own subtree, never a descendant of the
 *  render's own off-screen container — never touched by/visible to
 *  buildDrawList's walk) holding "Hxg" plus a zero-size `inline-block` probe
 *  span. An `inline-block` of height 0 sits exactly ON the alphabetic
 *  baseline, so the probe's own top edge IS the baseline. Reused across every
 *  font measured (only its `font` shorthand changes per call) rather than
 *  rebuilt each time. Returns null when no real DOM is available (e.g. under
 *  vitest's node environment, or a minimal test stub) so the caller can fall
 *  back rather than throw. */
function getMeasureElements(): { div: HTMLDivElement; probe: HTMLSpanElement } | null {
  if (measureDiv && measureProbe) return { div: measureDiv, probe: measureProbe }
  if (typeof document === 'undefined' || !document.body) return null
  const div = document.createElement('div')
  div.style.position = 'fixed'
  div.style.left = '-100000px'
  div.style.top = '0'
  div.style.margin = '0'
  div.style.padding = '0'
  div.style.border = '0'
  div.style.lineHeight = 'normal'
  div.style.whiteSpace = 'nowrap'
  div.appendChild(document.createTextNode('Hxg'))
  const probe = document.createElement('span')
  probe.style.display = 'inline-block'
  probe.style.width = '0'
  probe.style.height = '0'
  probe.style.overflow = 'hidden'
  div.appendChild(probe)
  document.body.appendChild(div)
  measureDiv = div
  measureProbe = probe
  return { div, probe }
}

const smallCapsScaleCache = new Map<string, number>()
let smallCapsProbe: HTMLSpanElement | null = null

/** Chromium's SYNTHETIC small-caps size ratio for one font shorthand, measured
 *  off the real engine and memoized per (family|weight|style|sizePx).
 *
 *  None of our self-hosted fonts ships a real `smcp` feature (see
 *  smallcaps.ts), so Chromium draws each lowercase letter as its uppercase
 *  glyph at a reduced size. The ratio is NOT the textbook 0.7: measured
 *  against real faces it lands anywhere from ~0.667 to ~0.73 and, for some
 *  fonts, VARIES WITH SIZE (glyph advances quantize at small sizes) — and a
 *  canvas `fontVariantCaps` measurement does not predict DOM layout at all
 *  (0.85 vs 0.67 for the same face). So this asks the layout engine the only
 *  question that has a reliable answer: how wide is this alphabet in
 *  small-caps versus the same alphabet already uppercased?
 *
 *  Returns 0 when the DOM is unusable or the measurement is implausible, which
 *  callers read as "don't attempt small caps" (the run then paints in its
 *  natural case, i.e. exactly the pre-2026-08-19 behavior). */
export function smallCapsScaleFor(cssFont: string): number {
  const cached = smallCapsScaleCache.get(cssFont)
  if (cached != null) return cached
  let scale = 0
  try {
    if (typeof document !== 'undefined' && document.body) {
      if (!smallCapsProbe) {
        const span = document.createElement('span')
        span.style.position = 'fixed'
        span.style.left = '-100000px'
        span.style.top = '0'
        span.style.whiteSpace = 'pre'
        document.body.appendChild(span)
        smallCapsProbe = span
      }
      const probe = smallCapsProbe
      const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'
      probe.style.font = cssFont
      probe.style.fontVariantCaps = 'small-caps'
      probe.textContent = ALPHABET
      const small = probe.getBoundingClientRect().width
      probe.style.fontVariantCaps = 'normal'
      probe.textContent = ALPHABET.toUpperCase()
      const full = probe.getBoundingClientRect().width
      probe.textContent = ''
      const ratio = full > 0 ? small / full : 0
      // Sanity band: a real small-caps ratio is well inside (0.5, 1). Anything
      // outside means the probe measured something else (font still loading,
      // zero-width fallback) — treat as "no small caps" rather than paint a
      // wrong size.
      if (ratio > 0.5 && ratio < 0.99) scale = ratio
    }
  } catch {
    scale = 0
  }
  smallCapsScaleCache.set(cssFont, scale)
  return scale
}

function layoutMetricsFallback(cssFont: string, reason: string): LayoutMetrics {
  if (import.meta.env.DEV) {
    console.warn(
      `[pdf] layout baseline probe unavailable for font "${cssFont}" (${reason}); falling back to canvas ascent`
    )
  }
  return { ascentPx: ascentPx(cssFont), heightPx: null }
}

/**
 * True DOM-layout baseline metrics for one (family|weight|style|sizePx) font
 * shorthand, memoized. Canvas TextMetrics' `fontBoundingBoxAscent` is NOT the
 * ascent Chromium's own line layout uses (Windows: usWin vs typo metrics
 * divergence) — this asks Chromium's line layout directly instead of
 * guessing a metric source: an `inline-block` of height 0 sits exactly ON
 * the alphabetic baseline, so
 *   layoutAscentPx = probeRect.top - divRect.top
 *   layoutHeightPx = divRect.height     (ascent + descent, line-height normal)
 * Guarded: if the probe yields nonsense (ascent <= 0 or >= height) or the DOM
 * isn't usable at all, falls back to the canvas ascent and dev-warns (see
 * layoutMetricsFallback) — callers then skip the half-leading term.
 */
export function layoutMetricsFor(cssFont: string): LayoutMetrics {
  const cached = layoutMetricsCache.get(cssFont)
  if (cached) return cached
  let m: LayoutMetrics
  try {
    const els = getMeasureElements()
    if (!els) {
      m = layoutMetricsFallback(cssFont, 'no DOM available')
    } else {
      const { div, probe } = els
      div.style.font = cssFont
      const divRect = div.getBoundingClientRect()
      const probeRect = probe.getBoundingClientRect()
      const a = probeRect.top - divRect.top
      const h = divRect.height
      m =
        a > 0 && a < h
          ? { ascentPx: a, heightPx: h }
          : layoutMetricsFallback(cssFont, `nonsense probe result (ascent=${a}, height=${h})`)
    }
  } catch (e) {
    m = layoutMetricsFallback(cssFont, e instanceof Error ? e.message : String(e))
  }
  layoutMetricsCache.set(cssFont, m)
  return m
}

/**
 * The baseline y (relative to `root`'s top) for one line rect, folding in
 * half-leading: with `line-height` > the font's own (ascent+descent) box,
 * the font box is centered in the taller line box rather than pinned to its
 * top, so `rect.top + ascent` alone is wrong whenever a GENUINELY generous
 * line-height is set.
 *   baseline = rect.top - rootTop + max(0, (rect.height - layoutHeightPx) / 2) + layoutAscentPx
 * `layoutHeightPx: null` (the DOM-probe fallback case) skips the centering
 * term entirely and degrades to the old `rect.top - rootTop + layoutAscentPx`
 * formula — mixing a canvas-derived ascent with a real DOM line-box height
 * would be worse than either alone.
 *
 * The centering term is CLAMPED to >= 0 rather than applied verbatim as
 * `(rect.height - layoutHeightPx) / 2` — measured empirically (task 14,
 * probe-baseline runs against the real off-screen print container across
 * all 4 gate templates, see the task-14 report) `layoutHeightPx` (measured
 * under a probe div forced to `line-height: normal`) is a reliable proxy for
 * a font's true (ascent+descent) box for SOME families — Source Sans 3's
 * probe height matches the real rendered line's rect.height almost exactly
 * — but OVERSHOOTS it for others with a larger line-gap metric: Poppins
 * Bold's probe height came back 47px vs the real single line's measured
 * rect.height of only 44px, for a heading whose OWN authored line-height
 * (33px) is tighter than Poppins' idea of "normal". Applied unclamped, that
 * overshoot produces a NEGATIVE centering term even though there is no such
 * thing as negative leading on a single line — confirmed against the live
 * app (clarity template's name heading REGRESSED from dy=-0.66pt to
 * dy=-1.03pt vs print ground truth with the unclamped formula, then to
 * dy=+0.09pt — passing — once clamped, with zero change to every other
 * measured probe line across all 4 templates). Clamping at 0 keeps the term
 * for its actual intended case (an author-set line-height genuinely taller
 * than the font's own normal box, where rect.height > layoutHeightPx is
 * real) while never letting an unreliable "normal" reference pull the
 * baseline the wrong direction.
 */
export function halfLeadingBaselinePx(
  rectTop: number,
  rootTop: number,
  rectHeight: number,
  metrics: LayoutMetrics
): number {
  if (metrics.heightPx == null) return rectTop - rootTop + metrics.ascentPx
  return rectTop - rootTop + Math.max(0, (rectHeight - metrics.heightPx) / 2) + metrics.ascentPx
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

let layoutWidthProbe: HTMLSpanElement | null = null

/**
 * The width the LAYOUT ENGINE gives `text`, set exactly as `cs` sets it.
 *
 * `measureTextWidthPx` above asks a canvas context, and a canvas context
 * carries only the `font` shorthand: it knows nothing about `font-variant`,
 * `font-feature-settings`, `letter-spacing` or `word-spacing`, all of which
 * the real engine applies. That is not a rounding difference. Chromium's UA
 * stylesheet gives every `::marker` `font-variant-numeric: tabular-nums` (so
 * that an ordered list's numbers line up), and in Work Sans `tnum` re-cuts the
 * SPACE — measured on marquee's own bullet, the string "•  " lays out at
 * 1.1124 em with the property off and 1.0350 em with it on, and switching each
 * of the eleven copied properties one at a time showed `font-variant` is the
 * only one that moves it. Measured on canvas, the marker box therefore came
 * out 0.077 em too wide, and every marquee bullet was drawn that far left of
 * the mark on the page.
 *
 * `white-space: pre` because the strings this measures (a marker's "•  ")
 * carry meaningful trailing spaces that normal white-space processing would
 * collapse away.
 *
 * Returns 0 when there is no usable DOM — callers fall back to the canvas
 * measurement, which is close for a face whose features leave its spaces
 * alone.
 */
export function measureLaidOutWidthPx(text: string, cs: CSSStyleDeclaration): number {
  if (!text) return 0
  try {
    if (typeof document === 'undefined' || !document.body) return 0
    if (!layoutWidthProbe) {
      const span = document.createElement('span')
      span.setAttribute('aria-hidden', 'true')
      span.style.position = 'fixed'
      span.style.left = '-100000px'
      span.style.top = '0'
      span.style.whiteSpace = 'pre'
      document.body.appendChild(span)
      layoutWidthProbe = span
    }
    const s = layoutWidthProbe.style
    s.fontFamily = cs.fontFamily
    s.fontSize = cs.fontSize
    s.fontWeight = cs.fontWeight
    s.fontStyle = cs.fontStyle
    s.fontStretch = cs.fontStretch
    s.fontKerning = cs.fontKerning
    s.fontFeatureSettings = cs.fontFeatureSettings
    s.fontVariationSettings = cs.fontVariationSettings
    s.fontVariant = cs.fontVariant
    s.letterSpacing = cs.letterSpacing
    s.wordSpacing = cs.wordSpacing
    layoutWidthProbe.textContent = text
    const w = layoutWidthProbe.getBoundingClientRect().width
    layoutWidthProbe.textContent = ''
    return Number.isFinite(w) ? w : 0
  } catch {
    return 0
  }
}

/** A plain (non-DOMRect) rect for one visually-wrapped line segment of a text
 *  node — deliberately NOT a real DOMRect so callers (and their tests) can
 *  work with it without a real DOM. */
export interface LineRect {
  top: number
  bottom: number
  left: number
  right: number
}

/** One visually-wrapped LINE of a single text node: its character-offset
 *  span within `node.data`, plus that span's own bounding rect. */
export interface TextLineSegment {
  start: number
  end: number
  rect: LineRect
}

/**
 * Split ONE text node into its visually-wrapped lines, by comparing each
 * character's own bounding-rect top to the previous character's — a jump of
 * more than 1px marks a line-wrap boundary. This is the per-line
 * segmentation `extractRuns` always needed for its own TextRun output;
 * factored out here (native-multipage-pdf plan, task 2) so walk.ts's
 * `extractPageBlocks` can reuse the exact same geometry for its 'line'
 * PageBlocks instead of re-deriving line boxes a second way. Operates on
 * ONE node at a time — sibling text nodes on the same visual line (e.g. a
 * bold `<strong>` run in the middle of a sentence) are NOT merged into one
 * segment here; each node's own segments are measured independently. That
 * matches what extractRuns already did before this refactor (no behavior
 * change for the painter), and extractPageBlocks documents the pagination-
 * side consequence (adjacent same-line text nodes can produce overlapping
 * 'line' blocks) in its own module doc comment.
 */
export function textNodeLineSegments(node: Text): TextLineSegment[] {
  const len = node.data.length
  if (len === 0) return []

  const range = document.createRange()

  /**
   * A soft hyphen the engine BROKE draws a hyphen at the end of the line it
   * broke from - and Chromium hands that hyphen's box to the FIRST CHARACTER
   * OF THE NEXT LINE as well as to the soft hyphen itself. Measured on a
   * 90px column of "in&shy;ter&shy;na&shy;tion&shy;al&shy;iza&shy;tion":
   * the 't' that opens the continuation line reports TWO client rects,
   * `top=0 left=80.9 w=4.3` (the hyphen, on the line above) and
   * `top=16 left=0.0 w=3.6` (itself), so its bounding box spans both lines
   * and its `top` names the wrong one. The walk below would then put that
   * letter on the line above, and the painter would draw it there.
   *
   * The character's own box is always the LAST of its rects - an inherited
   * hyphen is always to its left, on the earlier line. Only nodes that
   * actually carry a soft hyphen pay for the extra list; every other node
   * takes the single bounding-box read it always took.
   */
  const shy = node.data.indexOf(SOFT_HYPHEN) >= 0
  const topAt = (i: number): number => {
    range.setStart(node, i)
    range.setEnd(node, i + 1)
    if (!shy) return range.getBoundingClientRect().top
    const rects = range.getClientRects()
    return rects.length ? rects[rects.length - 1].top : range.getBoundingClientRect().top
  }

  // Walk character offsets, splitting into per-line segments by comparing each
  // character's top to the previous one.
  const offsets: Array<{ start: number; end: number; top: number }> = []
  let segStart = 0
  let segTop = 0
  let prevTop: number | null = null

  for (let i = 0; i < len; i++) {
    const top = topAt(i)
    if (prevTop == null) segTop = top
    if (prevTop != null && Math.abs(top - prevTop) > 1) {
      offsets.push({ start: segStart, end: i, top: segTop })
      segStart = i
      segTop = top
    }
    prevTop = top
  }
  offsets.push({ start: segStart, end: len, top: segTop })

  // A wrap puts its space on ONE of the two lines, and Chromium is not
  // consistent about which: measured on a real export, most wrapped lines
  // ended with their space but one began with it, so the copied text read
  // "queue-level" then " performance". Hand every such space back to the line
  // it broke from, so a line never opens with one and joining two lines always
  // finds a separator between the words.
  for (let i = 1; i < offsets.length; i++) {
    while (offsets[i].start < offsets[i].end && /\s/.test(node.data[offsets[i].start])) {
      offsets[i].start++
      offsets[i - 1].end = offsets[i].start
    }
  }

  const segments: TextLineSegment[] = []
  for (const { start, end, top } of offsets) {
    if (end <= start) continue
    range.setStart(node, start)
    range.setEnd(node, end)
    // Same inherited-hyphen problem one level up: a segment that OPENS after
    // a break reports the previous line's hyphen among its rects, and its
    // bounding box would therefore start at the line above, which is the box
    // the baseline is computed from. Union only the boxes on this segment's
    // own line.
    let rect: { top: number; bottom: number; left: number; right: number } | null = null
    if (shy) {
      for (const r of range.getClientRects()) {
        if (Math.abs(r.top - top) > 1) continue
        rect = rect
          ? {
              top: Math.min(rect.top, r.top),
              bottom: Math.max(rect.bottom, r.bottom),
              left: Math.min(rect.left, r.left),
              right: Math.max(rect.right, r.right),
            }
          : { top: r.top, bottom: r.bottom, left: r.left, right: r.right }
      }
    }
    if (!rect) {
      const b = range.getBoundingClientRect()
      rect = { top: b.top, bottom: b.bottom, left: b.left, right: b.right }
    }
    segments.push({ start, end, rect })
  }
  return segments
}


/* ---- what a soft-hyphen break does to the TEXT LAYER ----
 *
 * lib/hyphenate.ts puts soft hyphens into justified main-column prose so the
 * engine can break a long word instead of stretching a line's word spaces
 * (the whole reason justification was making our pages worse than ragged
 * ones). When one of them breaks, the engine DRAWS a hyphen - but that hyphen
 * is not a character of the text node, and the two halves of the word are.
 *
 * The export used to hide the break rather than write it: the line that BROKE
 * carried the whole word (its own glyphs as real text, then the missing tail
 * as an INVISIBLE run squeezed under the drawn hyphen), the hyphen was a
 * vector outline, and the line that CONTINUED drew its leading fragment as
 * outlines too so the word could not be read twice. Every extractor then read
 * "Experienced" whole, and the panel-vs-file comparison matched word for word
 * without anything having to know about hyphenation.
 *
 * It also put characters in the file that draw nothing, which is what an ATS
 * scanner means by "text drawn invisibly" - so the file now writes the break
 * the way every typeset document writes it. The line that breaks ends with a
 * real, visible hyphen; the line that continues opens with the rest of the
 * word, as real, visible text; nothing is drawn twice and nothing is hidden.
 *
 * Rejoining the halves is the READER's job, and it is a convention every
 * de-hyphenating reader already implements: a letter, a hyphen, a line end, a
 * letter is one word. _local/gate-ats-truth.cjs and _local/gate-line-1to1.cjs
 * do exactly that before they compare (each says so in its own header), and
 * `visualLines` below reports the same two lines the page draws, because it is
 * the DOM side of the line-level gate and the two must describe one document.
 */

/** One rendered line of the print DOM: what it says, and where it sits. */
export interface VisualLine {
  topPx: number
  bottomPx: number
  xPx: number
  /** Right edge, so a consumer can tell a flush neighbour from one across a
   *  gap - a gap is where a reader inserts a space that no character backs. */
  rightPx: number
  text: string
  column: 'main' | 'aside'
}

/**
 * Every line the print DOM actually draws, in document order.
 *
 * This is the ground truth an exported PDF has to reproduce line for line:
 * Edge and Chrome copy a PDF one line at a time, so a text layer that carries
 * the right characters divided into the wrong lines is not 1:1, however well
 * a whitespace-normalised comparison scores.
 *
 * Skips what the exporter skips - no-print chrome, hidden subtrees, and
 * anything under aria-hidden, whose glyphs are painted as artifacts with no
 * extractable text behind them on purpose.
 */
export function visualLines(root: HTMLElement): VisualLine[] {
  const rootRect = root.getBoundingClientRect()
  const doc = root.ownerDocument
  if (!doc) return []
  const out: VisualLine[] = []
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => {
      const t = n as Text
      if (!t.data || !t.data.trim()) return NodeFilter.FILTER_REJECT
      const el = t.parentElement
      if (!el) return NodeFilter.FILTER_REJECT
      if (el.closest('.no-print')) return NodeFilter.FILTER_REJECT
      // Bounded at `root`: the editing canvas wraps the artboard in its own
      // aria-hidden chrome, and an unbounded closest() would report every line
      // in the document as decoration.
      for (let a: Element | null = el; a; a = a.parentElement) {
        const v = a.getAttribute('aria-hidden')
        if (v !== null && v !== 'false') return NodeFilter.FILTER_REJECT
        if (a === root) break
      }
      const cs = getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity || '1') === 0) {
        return NodeFilter.FILTER_REJECT
      }
      return NodeFilter.FILTER_ACCEPT
    },
  })
  let node: Node | null
  while ((node = walker.nextNode())) {
    const t = node as Text
    const cs = getComputedStyle(t.parentElement as Element)
    const column: 'main' | 'aside' = t.parentElement?.closest('.rm-col-aside') ? 'aside' : 'main'
    const segs = textNodeLineSegments(t)
    for (let si = 0; si < segs.length; si++) {
      const seg = segs[si]
      // A line the hyphenator broke ends with a drawn HYPHEN, and the rest of
      // the word is on the line below - which is what the browser draws and,
      // since the invisible tail went away, what the file says too. This used
      // to report the whole word up here and nothing of it down there, to
      // match a file that carried "Experienced" whole at the end of the line
      // it started on; both sides say the plain thing now, and the gates
      // rejoin the two halves before comparing (see gate-line-1to1.cjs).
      const broke = si < segs.length - 1 && t.data[seg.end - 1] === SOFT_HYPHEN
      const raw = t.data.slice(seg.start, seg.end)
      let text = applyTextTransform(collapseWhitespace(stripSoftHyphens(raw), cs.whiteSpace), cs.textTransform)
      if (!text.trim()) continue
      if (broke) text += '-'
      out.push({
        topPx: seg.rect.top - rootRect.top,
        bottomPx: seg.rect.bottom - rootRect.top,
        xPx: seg.rect.left - rootRect.left,
        rightPx: seg.rect.right - rootRect.left,
        text,
        column,
      })
    }
  }
  return out
}

/**
 * Turn a DOM Text node into per-LINE runs carrying exactly what the painter
 * needs: the rendered string, its x, its baseline y, and its style. Coordinates
 * are in CSS px relative to `root` — the painter converts to points.
 */
/** Previous/next text node in document order. `skipBlank` walks past
 *  whitespace-only nodes to the nearest node carrying real characters. */
function adjacentTextNode(node: Text, forward: boolean, skipBlank = true): Text | null {
  let cur: Node | null = node
  while (cur) {
    let step: Node | null = forward ? cur.nextSibling : cur.previousSibling
    if (!step) {
      cur = cur.parentNode
      if (!cur || (cur as Element).classList?.contains('rm-root')) return null
      continue
    }
    // Descend to the nearest edge leaf of the sibling subtree.
    while (step) {
      if (step.nodeType === Node.TEXT_NODE) {
        // A zero-length node renders nothing - splitText(0) leaves one behind
        // in front of every wrapped range - so it never ends the walk.
        if ((step as Text).data.length === 0) break
        if (!skipBlank || (step as Text).data.trim() !== '') return step as Text
        break
      }
      if (step.nodeType !== Node.ELEMENT_NODE) break
      const next: Node | null = forward ? step.firstChild : step.lastChild
      if (!next) break
      step = next
    }
    cur = step ?? cur
    if (cur === node) return null
  }
  return null
}

/** First (or last) character box of a text node - the edge that meets the
 *  space, so we can tell whether the line continued or wrapped. */
function edgeCharRect(node: Text, last: boolean): DOMRect | null {
  const i = last ? node.data.length - 1 : 0
  if (i < 0) return null
  const r = document.createRange()
  r.setStart(node, i)
  r.setEnd(node, i + 1)
  const rects = Array.from(r.getClientRects())
  return rects.length ? rects[last ? rects.length - 1 : 0] : null
}

/** True when the text before AND after this space sit on the same line as it. */
function sharesLineWithNeighbours(node: Text, rect: DOMRect): boolean {
  const prev = adjacentTextNode(node, false)
  const next = adjacentTextNode(node, true)
  if (!prev || !next) return false
  const a = edgeCharRect(prev, true)
  const b = edgeCharRect(next, false)
  if (!a || !b) return false
  return Math.abs(a.top - rect.top) <= 1 && Math.abs(b.top - rect.top) <= 1
}

/**
 * Rect of the rendered space immediately before `node`, or `null`.
 *
 * A whitespace-only text node between two inline elements is a REAL space
 * ("Cloud & DevOps:" + " " + "AWS"); dropping it concatenates the two words in
 * the extracted text, so an ATS reads "DevOps:AWS". It is returned for the
 * FOLLOWING run to absorb rather than painted on its own, because a standalone
 * space is its own PDF text item - 66 of them on one page - and every one is a
 * gap that splits a visual line into fragments. Column detection reads those
 * fragments as columns: it cost `compact` a phantom third column and a whole
 * work entry.
 *
 * Returns null unless the space genuinely renders (whitespace between BLOCK
 * elements collapses to no box at all) and both neighbours sit on its line. A
 * space at a wrap is a hanging space, parked past the column edge and carrying
 * no meaning: the line break already separates the two words.
 */
function leadingSpaceRect(node: Text, cs: CSSStyleDeclaration): DOMRect | null {
  // Document order, not siblings: the space that separates "Languages:" from
  // the list after it sits BETWEEN the two spans, so it is a sibling of this
  // node's parent, not of this node.
  const space = adjacentTextNode(node, false, false)
  if (!space) return null
  if (space.data.trim() !== '') return null
  const spaceStyle = space.parentElement ? getComputedStyle(space.parentElement) : cs
  if (collapseWhitespace(space.data, spaceStyle.whiteSpace) !== ' ') return null
  const range = document.createRange()
  range.selectNodeContents(space)
  const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0.01 && r.height > 0.01)
  if (rects.length !== 1) return null
  const rect = rects[0]
  const before = adjacentTextNode(space, false)
  const a = before ? edgeCharRect(before, true) : null
  const b = edgeCharRect(node, false)
  if (!a || !b) return null
  if (Math.abs(a.top - rect.top) > 1 || Math.abs(b.top - rect.top) > 1) return null
  return rect
}

/** True when `cs` (or an ancestor it inherited from) draws `want`. */
function decorationOf(cs: CSSStyleDeclaration, want: 'underline' | 'line-through'): boolean {
  const line = cs.textDecorationLine || cs.textDecoration || ''
  return line.includes(want)
}

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
  // `font-variant: small-caps` (six templates' section titles + one name).
  // Measured, not modelled — see smallCapsScaleFor.
  const smallCapsScale = cs.fontVariantCaps === 'small-caps' ? smallCapsScaleFor(font) : 0

  const segments = textNodeLineSegments(node)
  if (!segments.length) return []

  const metrics = layoutMetricsFor(font)
  // Only the first line can carry the space that precedes the node.
  const lead = leadingSpaceRect(node, cs)
  const sizePx = parsePx(cs.fontSize)
  /** Everything a run of this node shares. Spread into each one so the three
   *  a hyphen break adds cannot drift from the body run beside them. */
  const style = {
    sizePx,
    family: cs.fontFamily,
    weight: parseFontWeight(cs.fontWeight),
    italic: cs.fontStyle === 'italic',
    color,
    letterSpacingPx: cs.letterSpacing === 'normal' ? 0 : parsePx(cs.letterSpacing),
    smallCapsScale,
    // `textDecorationLine` reports the decoration this element declares; it
    // is inherited visually from an ancestor <u>/<s> through the box tree,
    // so read the LINE property (which resolves that) rather than the
    // shorthand.
    ...(decorationOf(cs, 'underline') ? { underline: true as const } : {}),
    ...(decorationOf(cs, 'line-through') ? { lineThrough: true as const } : {}),
  }
  const shaped = (s: string) => applyTextTransform(collapseWhitespace(stripSoftHyphens(s), cs.whiteSpace), cs.textTransform)

  // Sub-range geometry, needed only where a soft hyphen actually broke a
  // line: where this line's letters stop, and how wide the hyphen the engine
  // drew after them is. A node with no soft hyphen never builds the range and
  // never measures anything extra - the loop below collapses to exactly the
  // one-run-per-segment it was before hyphenation existed.
  const hasSoftHyphen = data.indexOf(SOFT_HYPHEN) >= 0
  let lazyRange: Range | null = null
  /** The box of `[s, e)` ON the line whose top is `top` - a range that opens
   *  just after a break also reports the previous line's drawn hyphen among
   *  its rects (see textNodeLineSegments), and that box belongs to the line
   *  above, not to this one. */
  const rectOf = (s: number, e: number, top: number): { left: number; right: number } => {
    const r = (lazyRange ??= document.createRange())
    r.setStart(node, s)
    r.setEnd(node, e)
    let out: { left: number; right: number } | null = null
    for (const box of r.getClientRects()) {
      if (Math.abs(box.top - top) > 1) continue
      out = out ? { left: Math.min(out.left, box.left), right: Math.max(out.right, box.right) } : { left: box.left, right: box.right }
    }
    return out ?? r.getBoundingClientRect()
  }

  const runs: TextRun[] = []
  for (let si = 0; si < segments.length; si++) {
    const seg = segments[si]
    const broke = hasSoftHyphen && si < segments.length - 1 && data[seg.end - 1] === SOFT_HYPHEN
    const bodyStart = seg.start
    const bodyEnd = broke ? seg.end - 1 : seg.end
    const baselinePx = halfLeadingBaselinePx(seg.rect.top, rootRect.top, seg.rect.bottom - seg.rect.top, metrics)

    let text = shaped(data.slice(bodyStart, bodyEnd))
    if (text.trim() !== '') {
      const box = broke ? rectOf(bodyStart, bodyEnd, seg.rect.top) : seg.rect
      // Absorb the preceding space: starting the run at the space's own left
      // edge leaves every glyph exactly where it was - the space advances the
      // pen by precisely the width it occupies on screen.
      const absorb = lead && si === 0 && Math.abs(lead.top - seg.rect.top) <= 1
      if (absorb) text = ' ' + text
      const left = absorb ? lead!.left : box.left
      runs.push({ ...style, text, xPx: left - rootRect.left, widthPx: box.right - left, baselinePx, isDecorative: false })
    }

    if (broke) {
      // The line-end hyphen: REAL, VISIBLE text, exactly as every typeset
      // document in the world writes it.
      //
      // It used to be drawn as a vector outline (an Artifact, on the argument
      // that nobody typed it) with the rest of the word laid INVISIBLY after
      // it, squeezed to the hyphen's own width, so that an extractor read
      // "Experienced" whole at the end of the line it started on. That did
      // extract beautifully, and it is also precisely the shape an ATS scanner
      // reports as "text drawn invisibly": characters in the file that draw
      // nothing.
      //
      // So the file now says what the page says - "...Experi-" here, "enced"
      // at the head of the next line - and the comparison moves to where the
      // convention already lives: _local/gate-ats-truth.cjs and
      // _local/gate-line-1to1.cjs rejoin a word broken across a line end
      // before they compare, which is what every de-hyphenating reader does.
      // `resumeToAtsText` (the app's own "Copy as plain text") never had a
      // line break to put a hyphen at and is untouched.
      const inkEnd = (bodyEnd > seg.start ? rectOf(seg.start, bodyEnd, seg.rect.top) : seg.rect).right
      const xPx = inkEnd - rootRect.left
      const hyphenBox = rectOf(seg.end - 1, seg.end, seg.rect.top)
      const drawnHyphenPx = hyphenBox.right - hyphenBox.left
      const hyphenWidthPx = drawnHyphenPx > 0.01 ? drawnHyphenPx : measureTextWidthPx('-', font)
      runs.push({
        ...style,
        text: '-',
        xPx,
        // The width the engine actually drew it at, so the painter fits the
        // glyph to it the way it fits every other run.
        widthPx: hyphenWidthPx,
        baselinePx,
        // A rule is painted against a run's own advance, and the body run
        // above already spans the letters this hyphen follows; carrying the
        // decoration here too would draw it twice over the same pixels.
        underline: false,
        lineThrough: false,
        isDecorative: false,
      })
    }
  }

  return runs
}
