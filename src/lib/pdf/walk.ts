import { parseColor, parseFontWeight, parsePx, type Rgba } from './style'
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
      ops.push({ kind: 'text', run: { text: label, xPx, baselinePx, sizePx, family, weight, italic: false, color: fill, letterSpacingPx: 0, isDecorative: true } })
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
    isDecorative: true,
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
 * When one text node ends and the next begins on the same line — e.g.
 * "...checkout latency from 820ms to " (plain) immediately followed by a
 * bold "190ms" span — the separating space really is in the first run's
 * `text` (collapseWhitespace only collapses runs of whitespace, it never
 * trims). The problem is what happens after: that text gets drawn with OUR
 * embedded font, and by the time a ~110-character run finishes, our font's
 * cumulative glyph advances can drift a couple of device pixels from what
 * the BROWSER's own layout used to position the run after it (confirmed by
 * instrumenting the real export: canvas's own text-shaping prediction for
 * this exact 112-character run — the best proxy available without loading
 * fontkit here — landed ~3px short of what pdf-lib actually draws, just
 * enough to swallow the ~2px space glyph and print "to190ms"). A longer
 * prior run means more accumulated drift, which is why this only shows up
 * at same-line boundaries after a long stretch of text, not for every space.
 *
 * This has to be a general "runs on the same line never overlap" guarantee
 * rather than a narrow "prev ends in whitespace" patch: pushing one run
 * right to fix its LEFT boundary can make ITS OWN drawn width reach further
 * than before, which can newly overshoot the run after it even when that
 * next run has no trailing/leading whitespace of its own to blame (seen
 * live: fixing "...with " + "8+ years" pushed "8+ years" right, which then
 * overshot the unrelated "8+ years" + " building..." boundary right after
 * it). `run.xPx` (from a real DOM Range) is always trustworthy, so this
 * only ever pushes it FURTHER right — it never pulls a run left, so a
 * boundary that already had plenty of clearance is left untouched.
 */
function closeInlineGap(prev: TextRun | null, run: TextRun): void {
  if (!prev) return
  if (Math.abs(run.baselinePx - prev.baselinePx) > 0.5) return // not the same line

  const font = `${prev.italic ? 'italic' : 'normal'} ${prev.weight} ${prev.sizePx}px ${prev.family}`
  const drawnWidth = measureTextWidthPx(prev.text, font) + prev.letterSpacingPx * prev.text.length
  // Canvas's own text shaping (used to predict our embedded font's width)
  // isn't pixel-identical to fontkit's — measured ~0.6% narrower than
  // pdf-lib's actual widthOfTextAtSize() for this exact 112-char run, just
  // enough to make the predicted end look safe while the real draw still
  // clips into the next run. A small safety margin covers that class of
  // shaping drift without needing to load fontkit here — kept tight so it
  // doesn't visibly widen genuinely-correct gaps (0.6% observed drift; 1%
  // margin, not the ~2% first tried, which over-corrected into a
  // noticeably wider-than-print gap).
  const predictedEnd = prev.xPx + drawnWidth * 1.01
  if (run.xPx < predictedEnd) run.xPx = predictedEnd
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
  let prevTextRun: TextRun | null = null
  // visit the root itself first, then every accepted node exactly once
  for (let n: Node | null = walker.currentNode; n; n = walker.nextNode()) {
    if (n.nodeType === Node.ELEMENT_NODE) {
      boxOps(n as HTMLElement, root, ops)
      pseudoOps(n as HTMLElement, root, ops)
      markerOps(n as HTMLElement, root, ops)
    } else if (n.nodeType === Node.TEXT_NODE) {
      for (const run of extractRuns(n as Text, root)) {
        closeInlineGap(prevTextRun, run)
        ops.push({ kind: 'text', run })
        prevTextRun = run
      }
    }
  }
  return ops
}
