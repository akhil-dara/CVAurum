/**
 * Paints a `DrawOp[]` (produced by `./walk`) into a real pdf-lib page: vector
 * rects/lines, embedded-original-bytes images, and embedded-font text runs.
 *
 * No rasterisation anywhere — text stays true vector via embedded fonts, and
 * images embed their source bytes unmodified (never re-encoded/resized), only
 * *drawn* at the box size. That's what keeps the exported PDF's text layer
 * clean, which is the whole reason this renderer exists (see GitHub issue #4).
 */
import {
  concatTransformationMatrix,
  popGraphicsState,
  pushGraphicsState,
  LineCapStyle,
  PDFDict,
  PDFName,
  PDFNumber,
  PDFOperator,
  PDFOperatorNames,
  rgb,
  setTextRenderingMode,
  TextRenderingMode,
  type PDFFont,
  type PDFImage,
  type PDFPage,
  type PDFRef,
} from 'pdf-lib'
import type { Path as FontkitPath } from '@pdf-lib/fontkit'
import { pxToPt, ptToPx, flipY } from './units'
import type { CornerRadii, DecoBox, DrawOp, LinearGradient, TextRun } from './types'
import type { Rgba } from './style'
import type { PdfFontCache } from './fonts'

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47]
const JPEG_MAGIC = [0xff, 0xd8, 0xff]

// Same-line snap allowance (see the comment block above `prevRealEnd` in
// `paintOps`): the fraction of a snapped CHAIN's drawn width tolerated as
// negative-gap drift before a boundary is treated as a genuine visual-order
// reversal instead of metric drift. 0.04 gives >2x margin over the worst
// measured family (Montserrat, 1.76% of chain width) while staying far below
// the line-scale offsets a real reorder produces.
export const DRIFT_FRACTION = 0.04

function hasMagic(bytes: Uint8Array, magic: number[]): boolean {
  return magic.every((b, i) => bytes[i] === b)
}

/** Clamps a single corner radius against the SHORTER of the box's two
 *  half-dimensions — same guard `roundedRectPath`/`roundedRectOperators`
 *  always applied for a uniform radius, now per corner: each corner is
 *  independent, so (unlike CSS's own overlap-resolution algorithm, which
 *  proportionally shrinks ALL radii together when adjacent ones would
 *  overlap) two large radii on the same edge can still visually meet or
 *  slightly overlap for a tiny box. None of our own CSS combines a large
 *  radius with a small box, so this simple per-corner clamp (not CSS's full
 *  algorithm) has never been visibly wrong. */
function clampRadius(r: number, w: number, h: number): number {
  return Math.min(Math.max(r, 0), w / 2, h / 2)
}

/** Uniform-radius convenience: the shape every corner=r caller (markerOps'
 *  disc/circle marker dot, svgLogoOps' hand-authored logo mark's `rx`) still
 *  wants — `radiusPx` on a DrawOp, not the newer per-corner `radii`. */
function uniformRadii(r: number): CornerRadii {
  return { tl: r, tr: r, br: r, bl: r }
}

/** Resolves a rect/image op's corner radii: prefers `op.radii` (fix round 2
 *  — the four independently-computed `border-*-radius` values) when
 *  present, otherwise falls back to a uniform box built from the older
 *  `op.radiusPx` (or all-zero when neither is set). */
function opRadii(op: { radiusPx?: number; radii?: CornerRadii }): CornerRadii {
  return op.radii ?? uniformRadii(op.radiusPx ?? 0)
}

/** `pxToPt` applied to each of a CornerRadii's four values. */
function radiiToPt(radii: CornerRadii): CornerRadii {
  return { tl: pxToPt(radii.tl), tr: pxToPt(radii.tr), br: pxToPt(radii.br), bl: pxToPt(radii.bl) }
}

/** Rounded-rect SVG path in PDF user space, drawn from the TOP-left corner
 *  (drawSvgPath's y axis points down from the given origin), one radius PER
 *  CORNER (fix round 2 — task 13: `boxOps` used to read only `border-top-
 *  left-radius` and apply it to all four corners, painting an asymmetric box
 *  like spotlight's header banner, `border-radius: 0 0 18px 18px`, as a
 *  plain rectangle). A corner radius that's at least half the shorter side
 *  collapses that corner to a quarter-stadium/circle arc, which is how
 *  chips, the GPA pill, and proficiency dots (all `border-radius: 9999px` in
 *  CSS, i.e. all four corners equal and oversized) fall out of the same
 *  code — no separate "is this a circle" branch. Reduces to the original
 *  single-radius shape exactly when tl=tr=br=bl. */
export function roundedRectPath(w: number, h: number, radii: CornerRadii): string {
  const tl = clampRadius(radii.tl, w, h)
  const tr = clampRadius(radii.tr, w, h)
  const br = clampRadius(radii.br, w, h)
  const bl = clampRadius(radii.bl, w, h)
  return (
    `M ${tl} 0 H ${w - tr} A ${tr} ${tr} 0 0 1 ${w} ${tr} V ${h - br} ` +
    `A ${br} ${br} 0 0 1 ${w - br} ${h} H ${bl} ` +
    `A ${bl} ${bl} 0 0 1 0 ${h - bl} V ${tl} A ${tl} ${tl} 0 0 1 ${tl} 0 Z`
  )
}

/**
 * The same per-corner rounded-rect shape as `roundedRectPath`, as raw PDF
 * path operators (m/l/c/h) instead of an SVG path string — needed here
 * because a gradient fill can't go through `page.drawSvgPath` (see
 * `fillGradientRect` below for why) so there's no SVG-arc-to-bezier
 * conversion available; each 90° corner is approximated with a single cubic
 * bezier using the standard circle/bezier "kappa" constant (0.5522847498,
 * scaled by THAT corner's own radius), the same technique
 * `svgPathToOperators` itself uses under the hood for SVG arc commands —
 * accurate to a small fraction of a percent, well below anything visible at
 * PDF/print resolution. Degenerates cleanly to a plain rectangle at
 * tl=tr=br=bl=0 (every control point collapses onto its corner point).
 */
function roundedRectOperators(w: number, h: number, radii: CornerRadii): PDFOperator[] {
  const tl = clampRadius(radii.tl, w, h)
  const tr = clampRadius(radii.tr, w, h)
  const br = clampRadius(radii.br, w, h)
  const bl = clampRadius(radii.bl, w, h)
  const kappa = 0.5522847498
  const kTl = tl * kappa
  const kTr = tr * kappa
  const kBr = br * kappa
  const kBl = bl * kappa
  const num = (n: number) => PDFNumber.of(n)
  const m = (x: number, y: number) => PDFOperator.of(PDFOperatorNames.MoveTo, [num(x), num(y)])
  const l = (x: number, y: number) => PDFOperator.of(PDFOperatorNames.LineTo, [num(x), num(y)])
  const c = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) =>
    PDFOperator.of(PDFOperatorNames.AppendBezierCurve, [num(x1), num(y1), num(x2), num(y2), num(x3), num(y3)])
  return [
    m(tl, 0),
    l(w - tr, 0),
    c(w - tr + kTr, 0, w, tr - kTr, w, tr), // top-right corner
    l(w, h - br),
    c(w, h - br + kBr, w - br + kBr, h, w - br, h), // bottom-right corner
    l(bl, h),
    c(bl - kBl, h, 0, h - bl + kBl, 0, h - bl), // bottom-left corner
    l(0, tl),
    c(0, tl - kTl, tl - kTl, 0, tl, 0), // top-left corner
    PDFOperator.of(PDFOperatorNames.ClosePath),
  ]
}

/**
 * Registers a PDF Type 2 (axial) shading — a true vector gradient primitive,
 * not a raster — for a 2-stop linear gradient, as a named resource in the
 * page's `/Shading` resource dictionary, returning its resource name for use
 * with the `sh` operator. `coords` are `[x0, y0, x1, y1]` in whatever space
 * is CURRENT when `sh` later executes (subject to the active `cm`, unlike a
 * Pattern's Matrix, which is fixed relative to the page's default space —
 * confirmed against the PDF spec, §8.7.4.3).
 *
 * Scope: only fully-opaque stops. Our 3 known gradient usages (creative's
 * header/sidebar, spotlight's header) are all opaque `color-mix()` results
 * with no `transparent` side, so this is not a real limitation today; a
 * translucent stop would need either per-stop alpha (shadings have none —
 * PDF requires a separate soft-mask group) or a single blended `/ca` via an
 * ExtGState, neither of which is needed yet. Returns null rather than
 * approximate, so a translucent gradient falls through to no background
 * (unchanged from before this existed) instead of silently painting the
 * wrong opacity.
 */
function registerAxialShading(
  page: PDFPage,
  coords: [number, number, number, number],
  stops: [Rgba, Rgba]
): PDFName | null {
  if (stops[0].a < 0.999 || stops[1].a < 0.999) return null
  const context = page.doc.context

  const fn = context.register(
    context.obj({
      FunctionType: 2,
      Domain: [0, 1],
      C0: [stops[0].r, stops[0].g, stops[0].b],
      C1: [stops[1].r, stops[1].g, stops[1].b],
      N: 1,
    })
  )
  const shading = context.register(
    context.obj({
      ShadingType: 2,
      ColorSpace: 'DeviceRGB',
      Coords: coords,
      Function: fn,
      Extend: [true, true],
    })
  )

  // Resource-dict plumbing pdf-lib doesn't have a public helper for (it only
  // exposes Font/XObject/ExtGState convenience methods) — same pattern those
  // use internally: normalize() first so Resources definitely exists, then
  // get-or-create the /Shading sub-dictionary and register under a unique key.
  page.node.normalizedEntries()
  const resources = page.node.Resources()!
  let shadingDict = resources.lookupMaybe(PDFName.of('Shading'), PDFDict)
  if (!shadingDict) {
    shadingDict = context.obj({}) as PDFDict
    resources.set(PDFName.of('Shading'), shadingDict)
  }
  const key = shadingDict.uniqueKey('Sh')
  shadingDict.set(key, shading as PDFRef)
  return key
}

/**
 * Fills a (possibly rounded) rect with a true vector axial gradient, clipped
 * to its shape, reusing the CSS spec's own gradient-line-length formula
 * (https://drafts.csswg.org/css-images-3/#linear-gradients) so the direction
 * and stop positions match the browser exactly rather than approximating.
 *
 * Can't reuse `page.drawSvgPath` (used for the plain-fill rounded-rect case)
 * because it always sets the fill color via `rg`/`g`/`k` — there's no way to
 * ask it for a Pattern/Shading fill instead — so this replicates just enough
 * of its machinery by hand: the SAME `translate(x,y) + scale(1,-1)` local-
 * to-device transform (combined into one `cm`, verified equivalent by
 * reading pdf-lib's own `drawSvgPath` source), the SAME rounded-rect corner
 * geometry (`roundedRectOperators`, the bezier-based twin of
 * `roundedRectPath`), and `W n` to turn that path into a clip instead of a
 * filled shape, then `sh` to paint the shading into the clipped region.
 * Coordinates for the gradient line are computed in the SAME local (0,0)
 * top-left, y-down space the path uses — no separate page-space math needed,
 * since the single `cm` maps both consistently.
 */
function fillGradientRect(
  page: PDFPage,
  xPt: number,
  topYPt: number,
  wPt: number,
  hPt: number,
  radiiPt: CornerRadii,
  gradient: LinearGradient
): void {
  const angleRad = (gradient.angleDeg * Math.PI) / 180
  // CSS: direction = (sin A, -cos A) in a y-down space (0deg = "to top" = -y).
  const dx = Math.sin(angleRad)
  const dy = -Math.cos(angleRad)
  // CSS spec formula for the gradient line's length within a W x H box.
  const lineLen = Math.abs(wPt * dx) + Math.abs(hPt * dy)
  const cx = wPt / 2
  const cy = hPt / 2
  const half = lineLen / 2
  const coords: [number, number, number, number] = [cx - half * dx, cy - half * dy, cx + half * dx, cy + half * dy]

  const shadingKey = registerAxialShading(page, coords, gradient.stops)
  if (!shadingKey) return // translucent stop — see registerAxialShading

  page.pushOperators(
    pushGraphicsState(),
    concatTransformationMatrix(1, 0, 0, -1, xPt, topYPt),
    ...roundedRectOperators(wPt, hPt, radiiPt),
    PDFOperator.of(PDFOperatorNames.ClipNonZero),
    PDFOperator.of(PDFOperatorNames.EndPath),
    PDFOperator.of(PDFOperatorNames.ShadingFill, [shadingKey]),
    popGraphicsState()
  )
}

/** Fetches `src`, embeds its ORIGINAL bytes (no re-encode/resize), once per src. */
async function embedImage(
  page: PDFPage,
  src: string,
  cache: Map<string, Promise<PDFImage | null>>
): Promise<PDFImage | null> {
  let pending = cache.get(src)
  if (!pending) {
    pending = (async () => {
      try {
        const res = await fetch(src)
        if (!res.ok) return null
        const bytes = new Uint8Array(await res.arrayBuffer())
        if (hasMagic(bytes, PNG_MAGIC)) return await page.doc.embedPng(bytes)
        if (hasMagic(bytes, JPEG_MAGIC)) return await page.doc.embedJpg(bytes)
        return null // neither PNG nor JPEG — skip
      } catch {
        return null // failed to load — skip
      }
    })()
    cache.set(src, pending)
  }
  return pending
}

/**
 * Draws a text run's glyph outlines as VECTOR PATHS instead of a real PDF
 * text-showing operator. Used two ways (see `paintOps` below):
 *  - DECORATIVE runs (SVG logo monogram marks, CSS `::before`/`::after`/
 *    `::marker` separator/bullet glyphs — `TextRun.isDecorative` in
 *    types.ts): this is the ONLY layer painted for them, so a logo letter
 *    stays pixel-identical without ever entering the extractable text layer
 *    an ATS reads (task-10b brief, defect B — a logo's monogram letter was
 *    showing up mid-sentence in real résumé content, e.g. "EXPERIENCE V
 *    Senior Software Engineer").
 *  - Tracked (letter-spaced) REAL headings (defect A, see
 *    `paintTrackedHeading` below): this is the VISIBLE half of a two-layer
 *    approach, painted alongside a separate invisible, correctly-extractable
 *    copy of the same text.
 *
 * fontkit (already registered on the document for real-text font embedding)
 * exposes each glyph's outline (`glyph.path`) in FONT units with a y-UP axis
 * (baseline at y=0, ascenders positive — verified empirically against a real
 * embedded .ttf, not assumed). `page.drawSvgPath` expects an SVG-style y-DOWN
 * local space that it flips back to PDF's y-up itself via a `scale(1, -1)`
 * around the given (x, y) anchor (verified by reading pdf-lib's
 * `operations.js`), so `glyphPathToDrawPath` only needs to negate y (and
 * scale) — never flip x — before handing coordinates to drawSvgPath.
 *
 * `xPt` defaults to the run's own (unadjusted) position, used for decorative
 * calls. `paintTrackedHeading` passes the SAME (possibly same-line-adjusted)
 * x its invisible extractable layer used, so both layers stay aligned — see
 * `paintOps`'s adjacency handling.
 *
 * Returns the run's total drawn advance width in CSS px (the same `cursor`
 * accumulation already needed to position every glyph, just handed back
 * instead of discarded) — task 15's decorative-box capture hook in `paintOps`
 * uses this as the "measured advance width" for a decorative run's bounding
 * box, so callers that don't care (the tracked-heading real-content path)
 * simply ignore the return value; computing it is free either way, since the
 * loop below runs regardless of who's listening.
 */
async function paintGlyphOutlines(
  page: PDFPage,
  run: TextRun,
  fonts: PdfFontCache,
  pageHeightPt: number,
  xPt: number = pxToPt(run.xPx)
): Promise<number> {
  const font = await fonts.embedGlyphOutlines(run.family, run.weight)
  const glyphRun = font.layout(run.text)
  const scale = pxToPt(run.sizePx) / font.unitsPerEm
  const color = rgb(run.color.r, run.color.g, run.color.b)
  const baseX = xPt
  const baseY = flipY(pxToPt(run.baselinePx), pageHeightPt)
  const letterSpacingPt = pxToPt(run.letterSpacingPx)

  let cursor = 0
  for (let i = 0; i < glyphRun.glyphs.length; i++) {
    const glyph = glyphRun.glyphs[i]
    const pos = glyphRun.positions[i]
    const d = glyphPathToDrawPath(glyph.path, scale)
    if (d) {
      page.drawSvgPath(d, {
        x: baseX + cursor + pos.xOffset * scale,
        y: baseY + pos.yOffset * scale,
        color,
        opacity: run.color.a,
      })
    }
    cursor += pos.xAdvance * scale + letterSpacingPt
  }
  return ptToPx(cursor)
}

const round3 = (n: number): number => Math.round(n * 1000) / 1000

/**
 * Replays a fontkit glyph `Path` (font units, y-up) via its own
 * `toFunction()` API into an SVG path data string in the y-down local space
 * `drawSvgPath` expects, scaled by `size / unitsPerEm`. Exported for testing
 * against a real embedded font — fontkit works on raw bytes with no DOM or
 * network needed, so this is verifiable in plain Node.
 */
export function glyphPathToDrawPath(path: FontkitPath, scale: number): string {
  const cmds: string[] = []
  const x = (v: number) => round3(v * scale)
  const y = (v: number) => round3(-v * scale)
  path.toFunction()({
    moveTo: (px: number, py: number) => cmds.push(`M ${x(px)} ${y(py)}`),
    lineTo: (px: number, py: number) => cmds.push(`L ${x(px)} ${y(py)}`),
    quadraticCurveTo: (cpx: number, cpy: number, px: number, py: number) =>
      cmds.push(`Q ${x(cpx)} ${y(cpy)} ${x(px)} ${y(py)}`),
    bezierCurveTo: (c1x: number, c1y: number, c2x: number, c2y: number, px: number, py: number) =>
      cmds.push(`C ${x(c1x)} ${y(c1y)} ${x(c2x)} ${y(c2y)} ${x(px)} ${y(py)}`),
    closePath: () => cmds.push('Z'),
  })
  return cmds.join(' ')
}

/**
 * Paints a TRACKED (letter-spaced) real-content heading as TWO layers —
 * see the task-10b report for the full investigation. In short:
 *
 * `/ActualText` (the PDF spec's own §14.6.2/§14.9.4 mechanism for telling an
 * extractor the real string behind unusual glyph positioning) is NOT read by
 * pdf.js's `getTextContent()` — confirmed by reading pdfjs-dist's worker
 * source (`beginMarkedContentProps` in evaluator.js only ever reads `MCID`
 * off the marked-content properties dict; `ActualText` is used solely by the
 * separate structure-tree/accessibility API, never by plain text extraction)
 * and by an isolated probe: a minimal PDF with a correctly-formed
 * `/Span <</ActualText (SUMMARY)>> BDC ... Tj ... EMC` still extracts as
 * "S U M M A R Y" (see the task-10b report for the exact bytes and pdf.js
 * output). pdf.js instead reconstructs words from raw GLYPH GEOMETRY: any
 * gap between consecutive glyphs bigger than `fontSize * 0.102`
 * (`TRACKING_SPACE_FACTOR` in evaluator.js) is treated as a word boundary and
 * gets an inserted space, regardless of which operator produced that gap
 * (`Tc`, a `TJ` array adjustment, and an explicit `Td` all move the pen the
 * same way from pdf.js's point of view) — our tracked headings use
 * letter-spacing well above that threshold (e.g. 0.16em), so there is no
 * "clever operator choice" that keeps the SAME visible spacing invisible to
 * this heuristic.
 *
 * The fix: stop asking one text-showing operator to be both "visually
 * tracked" and "cleanly extractable" — split those into two layers instead.
 *  1. An INVISIBLE (text rendering mode 3 — the same standard mechanism
 *     OCR tools like Tesseract use to lay searchable text under a scanned
 *     image), UNTRACKED (`Tc` stays 0) real `drawText` call. With no
 *     artificial gap between glyphs, pdf.js's geometry-based heuristic never
 *     fires, so this is exactly `run.text` when extracted — verified via
 *     `_local/gate-pdf.cjs` (TRACKED_TEXT_SPLIT count) after this change.
 *  2. The VISIBLE glyphs, drawn as vector outlines carrying the FULL tracked
 *     spacing (`paintGlyphOutlines`, reusing the exact machinery defect B's
 *     decorative marks use) — pixel-identical to the browser's
 *     `letter-spacing`, but not a PDF text-showing operator at all, so it
 *     cannot be misread by ANY glyph-geometry heuristic.
 *
 * Both layers still originate from exactly ONE logical `TextRun` and the
 * extractable layer is exactly ONE `drawText` call — this does not draw
 * real content character-by-character, and the extractable text is never
 * dropped, only its rendering mode changes.
 *
 * `font` and `xPt` are supplied by `paintOps` (already embedded the font to
 * compute same-line adjacency — see there) rather than re-resolved here, so
 * both this call's invisible layer and its visible vector layer (via
 * `paintGlyphOutlines`) use the exact same x as every other real-content run
 * on the page.
 *
 * Selection geometry (task 16): a viewer builds a text item's SELECTION BOX
 * from its advertised advance width, not from any glyph actually painted —
 * so the invisible layer (drawn UNTRACKED, `Tc` stays 0, on purpose, per the
 * heuristic above) advertises a narrower advance than the visible tracked
 * outlines actually span, and the selection highlight stops short of every
 * tracked heading's last couple of letters. The fix stretches the INVISIBLE
 * layer horizontally with `Tz` (text horizontal scaling) so its advance
 * equals the VISIBLE tracked width, while its glyph SPACING stays untracked
 * (`Tz` scales a glyph's advance and its rendered width together, uniformly
 * — unlike `Tc`, it never inserts an artificial gap BETWEEN glyphs, so
 * pdf.js's gap-based tracked-split heuristic still never fires; Task 12
 * already ships `Tz` on every normal run with exact 70/70 extraction, so
 * this is the same mechanism, just applied on the tracked path too).
 *
 * The visible width is measured by actually calling `paintGlyphOutlines`
 * (this function's own Layer 2, drawn FIRST here so its return value is
 * available before Layer 1 needs it — text rendering mode 3 means Layer 1
 * paints nothing either way, so swapping draw order has no visual or
 * extraction-order effect) rather than re-deriving a second copy of its
 * glyph-advance-plus-letter-spacing accumulation: reusing the actual drawn
 * value guarantees the invisible layer's stretched advance can never drift
 * from the real ink, even by the small embedded-font-vs-Chromium metric
 * differences Task 12 documents elsewhere. `run.widthPx` (the DOM
 * client-rect width) was the other option the task brief raised, but it was
 * NOT used: Chromium's own trailing-letter-spacing behavior at the end of a
 * run is not guaranteed to match `paintGlyphOutlines`' own accumulation
 * (which adds one letter-spacing increment per glyph, including the last),
 * so it risks a small but real mismatch between the advertised (DOM-based)
 * and actual (vector-outline) advances — reusing the outline painter's own
 * number instead makes the two layers self-consistent by construction.
 *
 * Returns the `Tz` percentage actually used (100 when unscaled or inside the
 * noise dead-band — see below), clamped to [50, 400]. NOT [100, 400]: that
 * was the original (task-16) bound on the assumption a tracked heading's
 * visible width is never shorter than its untracked one, which is false —
 * 17 rules across templates.css apply NEGATIVE letter-spacing to `.rm-name`
 * (base -0.01em on every template, several override to -0.02em), and those
 * runs go through this same function. Genuine negative tracking shrinks the
 * visible width below the untracked metric (empirically ~95-99% of it), and
 * flooring Tz at 100 for that case leaves the invisible layer WIDER than the
 * visible (negatively-tracked) ink, overshooting the selection box past the
 * run's true right edge — the same class of bug task 16 fixed for positive
 * tracking, just unnoticed here since it doesn't regress anything task 16
 * itself touched. 50 is a symmetric sanity floor (never scaled to half-width
 * by tracking alone); 400 stays the upper bound (far beyond any real
 * positive letter-spacing).
 *
 * Ratios within +-1 percentage point of 100 snap to exactly 100 (no Tz
 * emitted at all) instead of the raw ratio: fontkit's own glyph-advance sum
 * (what `visibleWidthPt` above is built from) and pdf-lib's
 * `widthOfTextAtSize` (`untrackedWidthPt`) are not bit-identical for the
 * SAME text/font/size even at zero letter-spacing — a small, real,
 * tracking-unrelated metric difference (discovered testing the original
 * clamp) that would otherwise emit a spurious near-100 Tz on every tracked
 * run. Genuine negative tracking lands well outside this band (~95-99%,
 * confirmed against `.rm-name`'s real -0.01em/-0.02em), so the dead-band
 * only absorbs noise, never real tracking.
 *
 * `paintOps` folds the returned percentage back into its own shared
 * `tzPct`-based `prevRealEnd` bookkeeping (the same formula the non-tracked
 * branch uses), so the next run's same-line snap targets this (possibly
 * clamped or dead-banded) extractable advance, not the plain untracked one.
 */
async function paintTrackedHeading(
  page: PDFPage,
  run: TextRun,
  font: PDFFont,
  fonts: PdfFontCache,
  pageHeightPt: number,
  xPt: number,
  untrackedWidthPt: number
): Promise<number> {
  // Layer 2: visible, tracked, vector — not part of the text layer at all.
  // Drawn first so its real drawn advance is known before Layer 1 needs it.
  const visibleWidthPx = await paintGlyphOutlines(page, run, fonts, pageHeightPt, xPt)
  const visibleWidthPt = pxToPt(visibleWidthPx)

  let tzPct = 100
  if (untrackedWidthPt > 0) {
    const rawRatio = (100 * visibleWidthPt) / untrackedWidthPt
    // +-1pp dead-band absorbs fontkit-vs-pdf-lib metric noise (see the doc
    // comment above) as an exact no-op rather than a spurious near-100 Tz;
    // outside it, allow SHRINKING to 50% (negative letter-spacing, e.g.
    // .rm-name) as well as stretching, up to 400%.
    tzPct = Math.abs(rawRatio - 100) <= 1 ? 100 : Math.min(400, Math.max(50, rawRatio))
  }

  // Layer 1: invisible, untracked (Tc stays 0), extractable — stretched via
  // Tz (set immediately before, reset in a finally) so its advertised
  // advance matches the visible tracked width above. Exactly the Task 12
  // Tz set/reset discipline; this path and the non-tracked path never run
  // for the same op (letterSpacingPx selects one or the other in paintOps),
  // so there is no Tz state to fight over between them.
  if (tzPct !== 100) {
    page.pushOperators(PDFOperator.of(PDFOperatorNames.SetTextHorizontalScaling, [PDFNumber.of(tzPct)]))
  }
  page.pushOperators(setTextRenderingMode(TextRenderingMode.Invisible))
  try {
    page.drawText(run.text, {
      x: xPt,
      y: flipY(pxToPt(run.baselinePx), pageHeightPt),
      size: pxToPt(run.sizePx),
      font,
      color: rgb(run.color.r, run.color.g, run.color.b),
      opacity: run.color.a,
    })
  } finally {
    // Always restore normal (filled) rendering mode and 100% horizontal
    // scaling, even if drawText threw — otherwise every op after this one
    // would silently paint nothing, or every run after it would stay scaled.
    page.pushOperators(setTextRenderingMode(TextRenderingMode.Fill))
    if (tzPct !== 100) {
      page.pushOperators(PDFOperator.of(PDFOperatorNames.SetTextHorizontalScaling, [PDFNumber.of(100)]))
    }
  }

  return tzPct
}

/**
 * Paints every op onto `page`. Never throws for a single bad rect/line/image
 * op — but a REAL-CONTENT text op's font resolution (`fonts.embed`) is NEVER
 * swallowed: any error there (missing font, or a genuine embed failure)
 * propagates out of `paintOps`. A resume that silently lost its text is not
 * a "mostly successful" export — it's a blank page masquerading as one, and
 * the caller's print-export fallback exists exactly to catch that case.
 * DECORATIVE text (see `isDecorative`) is tolerant like every other cosmetic
 * op: losing a logo's monogram letter is not the same class of failure as
 * losing résumé content.
 *
 * `captureDecoBoxes` (task 15) is the dev-only gate-instrumentation hook:
 * when the CALLER passes an array (render.tsx does so only behind
 * `window.__cvaCaptureRenderBoxes === true`), every DECORATIVE glyph-outline
 * run painted below (the `case 'text':` branch a few lines down — reached
 * ONLY for `isDecorative` runs, real content never takes this path) pushes
 * its approximate on-page box onto it. `paintOps` itself never touches
 * `window` — that stays render.tsx's job — so this module has no globals and
 * no environment assumptions, same as every other function here, and is
 * exercised directly in tests by just passing an array. `undefined` (the
 * default) costs a single `if` check per decorative run and nothing else.
 */
export async function paintOps(
  page: PDFPage,
  ops: DrawOp[],
  fonts: PdfFontCache,
  pageHeightPt: number,
  captureDecoBoxes?: DecoBox[]
): Promise<void> {
  const images = new Map<string, Promise<PDFImage | null>>()
  // Same-line adjacency for REAL (non-decorative) text runs: when one DOM
  // text node ends and the next begins on the same line (e.g. plain text
  // immediately followed by a bold span), walk.ts used to guess where THIS
  // run's own drawn text would end using canvas.measureText as a proxy for
  // our EMBEDDED font's width, plus a safety margin (task 10a, defect 5).
  // That guess drifts in BOTH directions depending on the exact string
  // (confirmed while diagnosing task 10c's TEXT_MISMATCH cases: for one bold
  // label on a "Category: keywords" line, canvas's estimate undershot our
  // embedded font's ACTUAL width, risking touching glyphs; for an adjacent
  // label on the very SAME line, our embedded font actually drew NARROWER
  // than the browser did, leaving a small unintended gap the OTHER
  // direction) — a single fixed-direction margin can't close both at once.
  // Doing it HERE instead, with the font already embedded, replaces the
  // guess with the EXACT metric pdf.js itself measures against
  // (`font.widthOfTextAtSize`), so there is nothing left to estimate.
  //
  // The correction is deliberately SYMMETRIC (see the negative-allowance
  // check below), not "push right only": a boundary meant to be flush (no DOM
  // whitespace between the two elements at all — e.g. a bold "Category"
  // label immediately followed by a ": keywords" span) must land at
  // EXACTLY the previous run's true end regardless of which direction our
  // font's width happens to differ from the browser's, because pdf.js's own
  // word-boundary heuristic (task-10b report) reacts to ANY gap above
  // ~10% of the font size, in EITHER direction, with no notion of
  // "acceptable drift" — only an exact match reliably avoids it.
  //
  // However, negative gaps arise from TWO distinct classes: (1) sub-pixel
  // overlap from Chromium/embedded-font metric drift, and (2) visual-order
  // reversal (CSS flex-direction: row-reverse, rtl, Grid placement) with
  // tens-of-points gaps and short previous runs. Drift is NOT proportional to
  // the previous run alone — it accumulates along the whole CHAIN of runs
  // already snapped together on this baseline, because a snapped run
  // inherits its predecessor's displacement. Measured on the real corpus
  // (Montserrat 400/700 at 9.3pt): a long run drifts 1.76% of its own drawn
  // width vs the embedded metric; a short bold run immediately after it
  // inherits that full drift, so bounding the allowance by the SHORT run's
  // own width (as if each boundary were independent) collapses to one
  // space-width and rejects a legitimate snap. Inter drifts only 0.49% by
  // comparison, so family matters. A chain-proportional allowance fixes
  // this: negAllowancePt = max(spaceWidth, DRIFT_FRACTION * chainWidth),
  // where chainWidth is measured from the START of the current contiguous
  // snapped chain (not just the immediately previous run) to its drawn end.
  // DRIFT_FRACTION = 0.04 gives >2x margin over the worst measured family
  // while reorder offsets (the case the lower bound exists for) stay
  // line-scale on short chains and remain excluded. The positive bound stays
  // one space width (a larger positive gap is DOM-intended spacing).
  let prevRealEnd: { baselinePx: number; endXPt: number; chainStartXPt: number } | null = null

  for (const op of ops) {
    if (op.kind === 'text' && !op.run.isDecorative) {
      const { run } = op
      // Intentionally OUTSIDE the try/catch below: any failure to embed the
      // font (real content, tracked or not) must propagate, not be
      // swallowed as a cosmetic per-op issue.
      const font = await fonts.embed(run.family, run.weight)
      const sizePt = pxToPt(run.sizePx)
      let xPt = pxToPt(run.xPx)

      // Snap to the previous run's true end whenever the real DOM gap is
      // smaller than a genuine space character in THIS run's own font,
      // allowing for metric drift proportional to the current snapped
      // chain's drawn width (not just the immediately previous run - see the
      // comment block above `prevRealEnd`). Covers both overlap (negative gap
      // within drift allowance) and small unintended positive gap, while a
      // real word-space (much wider than one glyph, confirmed empirically:
      // ~1.8pt vs drift cases' ~0.9-1.0pt at same font size) safely clears
      // the check and is left exactly where the browser put it.
      let snappedToChain = false
      if (prevRealEnd && Math.abs(run.baselinePx - prevRealEnd.baselinePx) <= 0.5) {
        const spaceWidthPt = font.widthOfTextAtSize(' ', sizePt)
        const chainWidthPt = prevRealEnd.endXPt - prevRealEnd.chainStartXPt
        const negAllowancePt = Math.max(spaceWidthPt, DRIFT_FRACTION * chainWidthPt)
        const gapPt = xPt - prevRealEnd.endXPt
        if (gapPt > -negAllowancePt && gapPt < spaceWidthPt) {
          xPt = prevRealEnd.endXPt
          snappedToChain = true
        }
      }

      // widthOfTextAtSize never applies letter-spacing, so this is the
      // UNTRACKED width either way — exactly what the non-tracked branch's
      // Tz ratio needs, AND exactly the "untracked width" the tracked
      // branch's OWN Tz ratio needs (see paintTrackedHeading's doc comment)
      // as the denominator against the visible tracked width.
      const embeddedWidthPt = font.widthOfTextAtSize(run.text, sizePt)
      let tzPct = 100

      if (run.letterSpacingPx !== 0) {
        // Tracked headings (task 16): paintTrackedHeading stretches its OWN
        // invisible extractable layer via Tz so its selection geometry
        // matches the visible tracked width, and returns the ratio it used
        // — folded into the SAME tzPct the non-tracked branch below sets, so
        // the shared endXPt formula just past this if/else advances by the
        // true (tracked) drawn width instead of the untracked one, with no
        // separate bookkeeping path needed.
        tzPct = await paintTrackedHeading(page, run, font, fonts, pageHeightPt, xPt, embeddedWidthPt)
      } else {
        // Exact-DOM-width scaling (task 12): our embedded static fonts
        // measure runs slightly (Inter, ~0.5%) to noticeably (Montserrat,
        // ~1.8%) wider than Chromium actually renders them, so drawn text
        // drifts right of its on-screen position by the end of a long line —
        // the same-line snap above keeps EXTRACTION correct but can't fix
        // that positional drift on its own. Scaling the run horizontally
        // (PDF `Tz`) so its DRAWN width equals its DOM width makes the ink
        // land exactly where Chromium's does; pdf.js honors Tz in both
        // rendering and text-extraction advances (textState.textHScale), so
        // this stays exact under extraction too. Clamped to a
        // typographically invisible 90-110% band as a sanity guard against a
        // bogus widthPx (e.g. a stale/mismeasured rect) ever visibly
        // squashing or stretching a run; widthPx === 0 (unmeasured — see
        // types.ts) leaves tzPct at 100, i.e. no scaling.
        if (run.widthPx > 0 && embeddedWidthPt > 0) {
          tzPct = Math.min(110, Math.max(90, (100 * pxToPt(run.widthPx)) / embeddedWidthPt))
        }
        if (tzPct !== 100) {
          page.pushOperators(PDFOperator.of(PDFOperatorNames.SetTextHorizontalScaling, [PDFNumber.of(tzPct)]))
        }
        try {
          page.drawText(run.text, {
            x: xPt,
            y: flipY(pxToPt(run.baselinePx), pageHeightPt),
            size: sizePt,
            font,
            color: rgb(run.color.r, run.color.g, run.color.b),
            opacity: run.color.a,
          })
        } finally {
          if (tzPct !== 100) {
            page.pushOperators(PDFOperator.of(PDFOperatorNames.SetTextHorizontalScaling, [PDFNumber.of(100)]))
          }
        }
      }

      // When scaling is active the run's TRUE drawn width is the SCALED one
      // (DOM width for the non-tracked branch; for the tracked branch, the
      // — possibly clamped or dead-band-snapped — Tz-stretched extractable
      // advance paintTrackedHeading actually emitted, which is not always
      // exactly equal to the raw visible-outline width once the [50,400]
      // clamp or the +-1pp noise dead-band engages), so bookkeeping must
      // advance by that, not the embedded (untracked) metric, or the next
      // run's same-line snap would target the wrong endpoint. tzPct stays
      // 100 whenever neither branch's scaling applied, so this reduces to
      // the old `xPt + embeddedWidthPt` there.
      const nextChainStartXPt: number = snappedToChain ? prevRealEnd!.chainStartXPt : xPt
      prevRealEnd = {
        baselinePx: run.baselinePx,
        endXPt: xPt + embeddedWidthPt * (tzPct / 100),
        chainStartXPt: nextChainStartXPt,
      }
      continue
    }

    try {
      switch (op.kind) {
        case 'text': {
          // Reached only for isDecorative runs (real content is handled,
          // and `continue`s past this switch, above).
          const drawnWidthPx = await paintGlyphOutlines(page, op.run, fonts, pageHeightPt)
          if (captureDecoBoxes) {
            // Approximate box, per the task-15 brief: x/baseline/size are
            // already exact (the same values the paint above used); the
            // consumer (a gate harness excluding these from its structural-
            // diff detector) pads before comparing, so an exact glyph-ink
            // bound isn't needed here.
            captureDecoBoxes.push({
              xPx: op.run.xPx,
              yPx: op.run.baselinePx - op.run.sizePx,
              wPx: drawnWidthPx,
              hPx: op.run.sizePx * 1.2,
            })
          }
          break
        }
        case 'rect': {
          // Solid fill (background-color) paints BEFORE the gradient
          // (background-image) — CSS paint order. walk.ts never actually
          // emits both on the same op today (a gradient background always
          // splits into two ops, solid pushed first when opaque), but the
          // DrawOp type allows it, so this stays correct either way rather
          // than relying on caller ordering.
          const radii = opRadii(op)
          const hasRadius = radii.tl > 0.5 || radii.tr > 0.5 || radii.br > 0.5 || radii.bl > 0.5
          if (op.fill && op.fill.a > 0) {
            const color = rgb(op.fill.r, op.fill.g, op.fill.b)
            if (hasRadius) {
              // drawSvgPath's origin is the TOP-left with y increasing downward,
              // unlike drawRectangle's bottom-left-with-height origin — flip
              // against the box's TOP edge (yPx), not yPx + hPx.
              page.drawSvgPath(roundedRectPath(pxToPt(op.wPx), pxToPt(op.hPx), radiiToPt(radii)), {
                x: pxToPt(op.xPx),
                y: flipY(pxToPt(op.yPx), pageHeightPt),
                color,
                opacity: op.fill.a,
              })
            } else {
              page.drawRectangle({
                x: pxToPt(op.xPx),
                y: flipY(pxToPt(op.yPx + op.hPx), pageHeightPt),
                width: pxToPt(op.wPx),
                height: pxToPt(op.hPx),
                color,
                opacity: op.fill.a,
              })
            }
          }
          if (op.fillGradient) {
            fillGradientRect(
              page,
              pxToPt(op.xPx),
              flipY(pxToPt(op.yPx), pageHeightPt),
              pxToPt(op.wPx),
              pxToPt(op.hPx),
              radiiToPt(radii),
              op.fillGradient
            )
          }
          break
        }
        case 'line': {
          page.drawLine({
            start: { x: pxToPt(op.x1Px), y: flipY(pxToPt(op.y1Px), pageHeightPt) },
            end: { x: pxToPt(op.x2Px), y: flipY(pxToPt(op.y2Px), pageHeightPt) },
            thickness: pxToPt(op.widthPx),
            color: rgb(op.color.r, op.color.g, op.color.b),
            opacity: op.color.a,
            dashArray: op.dashed ? [pxToPt(2), pxToPt(2)] : undefined,
          })
          break
        }
        case 'roundedBorder': {
          // Reuses the exact same rounded-rect PATH the radiused `rect` fill
          // case draws (roundedRectPath -> drawSvgPath), just STROKED instead
          // of filled: no `color` option means drawSvgPath's own `stroke()`
          // branch fires (verified against pdf-lib's operations.ts — `color
          // && borderWidth ? fillAndStroke() : color ? fill() : borderColor ?
          // stroke() : closePath()`), so this paints a pure outline with no
          // fill, matching a CSS border on a box whose own background (if
          // any) was already painted by a separate, earlier `rect` op. `x/y`
          // and the path's own w/h/radii are walk.ts's ALREADY-inset (by
          // widthPx/2) geometry — same convention as `BORDER_EDGES` — so no
          // further inset math happens here, only unit conversion.
          //
          // borderDashArray: pdf-lib's drawSvgPath supports it directly (see
          // PDFPageDrawSVGOptions), so a dashed/dotted rounded border needs
          // no fallback — same [2, 2] pt pattern the straight-line `line`
          // case above uses, for the same dashed/dotted look.
          page.drawSvgPath(roundedRectPath(pxToPt(op.wPx), pxToPt(op.hPx), radiiToPt(op.radii)), {
            x: pxToPt(op.xPx),
            y: flipY(pxToPt(op.yPx), pageHeightPt),
            borderColor: rgb(op.color.r, op.color.g, op.color.b),
            borderWidth: pxToPt(op.widthPx),
            borderOpacity: op.color.a,
            borderDashArray: op.dashed ? [pxToPt(2), pxToPt(2)] : undefined,
          })
          break
        }
        case 'image': {
          const img = await embedImage(page, op.src, images)
          if (!img) break
          const xPt = pxToPt(op.xPx)
          const yPt = flipY(pxToPt(op.yPx + op.hPx), pageHeightPt) // bottom-left, page space (y-up)
          const wPt = pxToPt(op.wPx)
          const hPt = pxToPt(op.hPx)
          const radii = opRadii(op)
          const hasRadius = radii.tl > 0.5 || radii.tr > 0.5 || radii.br > 0.5 || radii.bl > 0.5
          if (hasRadius) {
            // Clip to the (per-corner) rounded box before drawing — reuses the
            // SAME clamped bezier corner math fillGradientRect uses for
            // gradient fills. Without this every raster image (most commonly
            // a profile photo — DEFAULT photoShape is 'circle', metadata.ts/
            // artboard.css) drew as a plain square over the correctly-rounded
            // placeholder box painted underneath it (task 17, ship blocker).
            //
            // Unlike fillGradientRect, this does NOT remap into a top-left/
            // y-down local space: page.drawImage's x/y/width/height already
            // assume the same bottom-left-origin, y-up convention as the page
            // itself, so composing an extra y-flip `cm` here would draw the
            // image upside down. A plain translate keeps that convention, but
            // roundedRectOperators still hard-codes its OWN "tl at (low-x,
            // y=0)" y-down layout, so passed straight through it would clip
            // the box's BOTTOM corners as if they were the top ones. Swapping
            // tl<->bl and tr<->br corrects for that single vertical mirror —
            // the only difference from a page-space rounded rect.
            const r = radiiToPt(radii)
            page.pushOperators(
              pushGraphicsState(),
              concatTransformationMatrix(1, 0, 0, 1, xPt, yPt),
              ...roundedRectOperators(wPt, hPt, { tl: r.bl, tr: r.br, br: r.tr, bl: r.tl }),
              PDFOperator.of(PDFOperatorNames.ClipNonZero),
              PDFOperator.of(PDFOperatorNames.EndPath)
            )
            // Local frame's origin is now the box's own bottom-left (the cm
            // above only translated, never flipped), so drawImage's own x/y
            // convention lines up with (0, 0) directly — same box, no
            // separate offset math needed.
            //
            // try/finally around the pop (matching every other push/pop pair
            // in this file, e.g. paintTrackedHeading's Tr/Tz reset): a throw
            // from drawImage as a bare statement would otherwise leave the
            // clip and translate `cm` active on the graphics state with no
            // matching Q — paintOps' outer per-op catch swallows the error,
            // so every op painted AFTER this one would silently inherit this
            // image's clip region and offset. Proved by a test that monkey-
            // patches drawImage to throw once and asserts balanced q/Q counts
            // plus an unclipped following op.
            try {
              page.drawImage(img, { x: 0, y: 0, width: wPt, height: hPt })
            } finally {
              page.pushOperators(popGraphicsState())
            }
          } else {
            // Zero-radii images keep this direct path — no graphics-state /
            // clip operator overhead for the common (non-photo) case.
            page.drawImage(img, { x: xPt, y: yPt, width: wPt, height: hPt })
          }
          // NOT implemented: CSS `object-fit: cover` for non-square sources
          // (DOM crops via CSS; drawImage above still stretches to the box).
          // Scoped out per the task-17 brief ("if this exceeds an hour...
          // SKIP with a documented note") — ImageCropper already makes square
          // sources the normal case, and doing it only for the radius>0
          // branch above (the zero-radii branch must stay clip-free, per the
          // ship-blocker test) would make cover behavior inconsistent between
          // rounded and square photo boxes rather than fixing it uniformly.
          break
        }
        case 'svg': {
          // A decorative inline icon (walk.ts's svgIconOps — section-heading
          // chips, contact-row marks). `op.d` and `op.strokeWidthPx` are
          // deliberately in the svg's own viewBox/user-unit space, not
          // pre-scaled to `op.wPx/hPx` — see types.ts's `svg` DrawOp doc
          // comment. `scale` maps that space to the page: PDF interprets
          // line width in the user space active when the path is STROKED
          // (i.e. after this same `cm` scale applies), so passing
          // `strokeWidthPx` RAW here lands at the correct final device
          // thickness for free — verified empirically against a rasterized
          // probe (task-13 report), not assumed from the PDF spec alone.
          const [, , vbW] = op.viewBox
          if (vbW <= 0) break
          const scale = pxToPt(op.wPx) / vbW
          const svgOpts: Parameters<PDFPage['drawSvgPath']>[1] = {
            x: pxToPt(op.xPx),
            y: flipY(pxToPt(op.yPx), pageHeightPt),
            scale,
          }
          if (op.fill) {
            svgOpts.color = rgb(op.fill.r, op.fill.g, op.fill.b)
            svgOpts.opacity = op.fill.a
          }
          if (op.stroke) {
            svgOpts.borderColor = rgb(op.stroke.r, op.stroke.g, op.stroke.b)
            svgOpts.borderWidth = op.strokeWidthPx
            svgOpts.borderOpacity = op.stroke.a
            svgOpts.borderLineCap = LineCapStyle.Round // lucide's own strokeLinecap/strokeLinejoin: round
          }
          if (svgOpts.color || svgOpts.borderColor) {
            page.drawSvgPath(op.d, svgOpts)
          }
          break
        }
      }
    } catch {
      // Single bad rect/line/image op is swallowed: it must not sink the
      // whole export the way a lost font would.
    }
  }
}

/* --------------------------------------------------- multi-page assembly */
/**
 * Native-multipage-pdf plan, task 3: splits ONE document-wide `DrawOp[]`
 * across N output pages and paints each page with an ordinary (unmodified)
 * `paintOps` call. Deliberately layered ON TOP of `paintOps` rather than
 * folded into it — `paintOps` itself stays exactly as it was (every existing
 * test above this comment, and the plan's global "single-page docs must stay
 * byte-identical" constraint, both hold for free by construction, not by
 * careful preservation).
 */

/**
 * The single y (CSS px, document space) used to decide which page's band a
 * `DrawOp` belongs to (spec section 2: "an op's band = band of its top
 * edge"). For every op EXCEPT `text` this literally is the op's own top edge
 * (`yPx`, or the smaller of a `line`'s two y endpoints). A `TextRun` doesn't
 * carry its own top explicitly (only `baselinePx` + `sizePx`) — rather than
 * approximate an ascent fraction, `baselinePx` itself is used directly:
 * paginate.ts's own break-point rules guarantee a legal cut NEVER falls
 * inside a text line's box, so ANY y strictly between that line's true top
 * and bottom (which the baseline always is) lands in the same, correct band
 * as the line's real top edge would — no font-metric ascent guess needed,
 * and no misclassification risk near a page boundary.
 */
function opBandAnchorPx(op: DrawOp): number {
  switch (op.kind) {
    case 'line':
      return Math.min(op.y1Px, op.y2Px)
    case 'text':
      return op.run.baselinePx
    case 'rect':
    case 'roundedBorder':
    case 'image':
    case 'svg':
      return op.yPx
  }
}

/** A shallow clone of `op` with its own y-coordinate(s) shifted by `dyPx`
 *  (CSS px, document space) — moves a content op from its natural document-
 *  wide position into a specific output page's LOCAL coordinate space.
 *  Never mutates `op`. `dyPx === 0` (page 1, always) returns `op` itself
 *  unchanged — no allocation at all on the common single-page path. */
function translateOpY(op: DrawOp, dyPx: number): DrawOp {
  if (dyPx === 0) return op
  switch (op.kind) {
    case 'line':
      return { ...op, y1Px: op.y1Px + dyPx, y2Px: op.y2Px + dyPx }
    case 'text':
      return { ...op, run: { ...op.run, baselinePx: op.run.baselinePx + dyPx } }
    case 'rect':
    case 'roundedBorder':
    case 'image':
    case 'svg':
      return { ...op, yPx: op.yPx + dyPx }
  }
}

/**
 * [topPx, bottomPx] span (document space) for a rect/line op — used ONLY by
 * the straddling-decoration duplication path below (task 6b); every other
 * kind still classifies by the single anchor point `opBandAnchorPx` returns.
 */
function opSpanPx(op: Extract<DrawOp, { kind: 'rect' | 'line' }>): [number, number] {
  if (op.kind === 'line') return [Math.min(op.y1Px, op.y2Px), Math.max(op.y1Px, op.y2Px)]
  return [op.yPx, op.yPx + op.hPx]
}

/**
 * Every band index (0-based, into `bandTops`) whose half-open range
 * `[bandTops[i], bandTops[i+1))` the `[topPx, bottomPx)` span intersects —
 * the last band is unbounded above. A span that only touches a band
 * boundary exactly (e.g. `bottomPx === bandTops[i]`) does NOT count as
 * intersecting that band, matching the half-open convention the ordinary
 * anchor-point scan below already uses for a cut landing exactly on an op's
 * top edge.
 */
function intersectingBandIndexes(topPx: number, bottomPx: number, bandTops: number[]): number[] {
  const indexes: number[] = []
  for (let i = 0; i < bandTops.length; i++) {
    const bandBottomPx = i + 1 < bandTops.length ? bandTops[i + 1] : Infinity
    if (bottomPx > bandTops[i] && topPx < bandBottomPx) indexes.push(i)
  }
  return indexes
}

/**
 * True when a `rect` op carries any nonzero corner radius (either the newer
 * per-corner `radii`, or the older uniform `radiusPx`). Task 6b fix-round-1,
 * finding I2: radius-free geometry crops EXACTLY to a straight band boundary
 * (a plain rectangle clamp — see `cropOpToBand`), but a rounded corner does
 * not — cropping a rounded rect through the middle of its own curvature
 * would need to re-derive new corner geometry at the cut, which this module
 * has no machinery for. Ops that carry radii are excluded from the
 * straddling-repeat path entirely and fall back to the ordinary single-band
 * (top-edge) assignment every other kind already uses — the same rule
 * `roundedBorder` (a stroked rounded border, never eligible for the repeat
 * path at all) was already on, so a rounded card's FILL and BORDER once
 * again travel together under the same single-band rule instead of the fill
 * repeating while the border stays single-band (the fill/border asymmetry
 * finding M5 flagged).
 */
function hasAnyRadiusOp(op: Extract<DrawOp, { kind: 'rect' }>): boolean {
  if (op.radiusPx && op.radiusPx > 0) return true
  const r = op.radii
  return !!r && (r.tl > 0 || r.tr > 0 || r.br > 0 || r.bl > 0)
}

/**
 * `op` (a radius-free `rect`/`line`) CROPPED to its own visible portion
 * within `[bandTopPx, bandBottomPx)` — task 6b fix-round-1, finding I2: the
 * straddling-repeat path used to push each band's copy with the op's FULL
 * original (untranslated) geometry, so a copy could paint PAST its own
 * band's boundary into territory the adjacent copy (or that page's own
 * natural, non-duplicated content) already covers — the same document-space
 * slice painted twice, both landing inside a real page's MediaBox (concrete
 * symptom: a straddling 2px divider reappearing as a stray ~1px hairline
 * just past the NEXT page's own top padding, because the untranslated
 * remainder before the cut was never clipped off that page's copy). Cropping
 * each copy to exactly the band it's actually painted on removes the
 * overlap outright — radius-free geometry crops with a plain clamp, no
 * corner surgery, which is exactly why a radiused rect never reaches this
 * function (see `hasAnyRadiusOp`).
 */
function cropOpToBand(op: Extract<DrawOp, { kind: 'rect' | 'line' }>, bandTopPx: number, bandBottomPx: number): DrawOp {
  if (op.kind === 'line') {
    const spanTopPx = Math.max(Math.min(op.y1Px, op.y2Px), bandTopPx)
    const spanBottomPx = Math.min(Math.max(op.y1Px, op.y2Px), bandBottomPx)
    // Preserve which endpoint was y1 vs y2 (the line's own drawn direction)
    // rather than assuming y1 <= y2.
    return op.y1Px <= op.y2Px
      ? { ...op, y1Px: spanTopPx, y2Px: spanBottomPx }
      : { ...op, y1Px: spanBottomPx, y2Px: spanTopPx }
  }
  const topPx = Math.max(op.yPx, bandTopPx)
  const bottomPx = Math.min(op.yPx + op.hPx, bandBottomPx)
  return { ...op, yPx: topPx, hPx: Math.max(0, bottomPx - topPx) }
}

/** A page-chrome op (walk.ts's `pageChrome: true` — the root's own full-
 *  height background, or a full-column band like a dark two-column sidebar)
 *  repeats on EVERY output page, resized to THAT page's own full height
 *  rather than assigned to a single band (spec section 2: "Page-chrome ops
 *  repeat on every page, clamped to full page height"). Only `'rect'` ops
 *  are ever tagged `pageChrome` today (see walk.ts's `tagPageChromeOps`) —
 *  any other kind is returned unchanged as a safe no-op fallback rather than
 *  a crash, since there is no "full page height" concept for a line/image/
 *  svg/text op. */
function clampChromeOpToPage(op: DrawOp, pageHeightPx: number): DrawOp {
  if (op.kind !== 'rect') return op
  return { ...op, yPx: 0, hPx: pageHeightPx }
}

/**
 * Splits a single-document `DrawOp[]` (the whole, continuous print-mode
 * layout) into one `DrawOp[]` PER OUTPUT PAGE, each already translated into
 * that page's own LOCAL coordinate space (native-multipage-pdf plan, spec
 * sections 2-3; the break-point SELECTION itself is paginate.ts's job — this
 * only consumes its `cutsPx` result).
 *
 * `cutsPx` empty (single page — the overwhelming common case) is special-
 * cased to return `[ops]`, literally the SAME array reference with zero
 * per-op cloning — so painting it is byte-for-byte identical to calling
 * `paintOps` directly the way render.tsx always did before this task (the
 * plan's global constraint: single-page docs stay byte-identical).
 *
 * For N > 1 pages: every non-chrome op is assigned to the band containing
 * its own `opBandAnchorPx`, then translated by that page's own offset —
 * `bandTops[pageIndex] - pageTopPaddingPx` for every page after the first,
 * always exactly 0 for page 1 (spec section 3: page 1 renders its band at
 * its natural position; every later page's band is shifted up so its own
 * content starts exactly `pageTopPaddingPx` below that page's top, the same
 * visual margin page 1 already has built into its own natural layout).
 * `pageChrome` ops skip band assignment entirely and instead repeat, via
 * `clampChromeOpToPage`, on EVERY page.
 *
 * Op order within each page's own list is preserved from `ops`' original
 * document order (a single left-to-right pass appends to whichever page
 * bucket(s) each op belongs to), so later ops still paint on top of earlier
 * ones on the SAME page, exactly like the single-page case already relies on.
 *
 * Task 6b (straddling decoration ops): the top-edge-only rule above is right
 * for text and images — paginate.ts's own break-point rules guarantee a
 * legal cut never falls inside either — but a tall, thin, purely decorative
 * `rect`/`line` op (e.g. timeline's vertical entry rail) can legitimately
 * straddle a cut, and assigning it to a single band the way ordinary content
 * is assigned clips the rest of it off the following page (sweep artifact:
 * 155px of missing rail at the top of page 2). For a NON-pageChrome, RADIUS-
 * FREE `rect`/`line` op (see `hasAnyRadiusOp` — a radiused rect can't crop
 * cleanly at a straight cut, so it's excluded and falls back to single-band
 * below) whose own `[top, bottom]` span intersects MORE THAN ONE band, the
 * op is pushed into EVERY band it intersects, each copy first CROPPED to
 * that band's own `[bandTop, bandBottom)` range (`cropOpToBand` — fix-round-
 * 1, finding I2: an uncropped copy could paint past its own band's boundary
 * into territory the adjacent copy already covers, the same document-space
 * slice painted twice) and then translated by that band's own offset like
 * any other op. An op that only intersects ONE band (the overwhelming common
 * case, including every rect/line on a single-page document) falls through
 * to the exact same anchor-point path every other kind uses, so nothing here
 * changes behavior for non-straddling ops.
 */
export function assignOpsToPages(
  ops: DrawOp[],
  cutsPx: number[],
  pageTopPaddingPx: number,
  pageHeightPx: number
): DrawOp[][] {
  if (cutsPx.length === 0) return [ops]

  const pageCount = cutsPx.length + 1
  const bandTops = [0, ...cutsPx]
  const pages: DrawOp[][] = Array.from({ length: pageCount }, () => [])

  const pushToBand = (op: DrawOp, pageIndex: number) => {
    const offsetPx = pageIndex === 0 ? 0 : bandTops[pageIndex] - pageTopPaddingPx
    pages[pageIndex].push(translateOpY(op, -offsetPx))
  }

  for (const op of ops) {
    if (op.pageChrome) {
      for (const page of pages) page.push(clampChromeOpToPage(op, pageHeightPx))
      continue
    }

    if (op.kind === 'line' || (op.kind === 'rect' && !hasAnyRadiusOp(op))) {
      const [topPx, bottomPx] = opSpanPx(op)
      const bandIdxs = intersectingBandIndexes(topPx, bottomPx, bandTops)
      if (bandIdxs.length > 1) {
        for (const pageIndex of bandIdxs) {
          const bandBottomPx = pageIndex + 1 < bandTops.length ? bandTops[pageIndex + 1] : Infinity
          pushToBand(cropOpToBand(op, bandTops[pageIndex], bandBottomPx), pageIndex)
        }
        continue
      }
    }

    const anchorPx = opBandAnchorPx(op)
    let pageIndex = 0
    for (let i = 1; i < bandTops.length; i++) {
      if (anchorPx >= bandTops[i]) pageIndex = i
      else break
    }
    pushToBand(op, pageIndex)
  }

  return pages
}

/**
 * Multi-page-aware entry point layered directly on top of the unchanged
 * `paintOps` (native-multipage-pdf plan, task 3): assigns `ops` to their
 * output pages via `assignOpsToPages`, then paints each page's own op list
 * with an ordinary `paintOps` call — one call per `PDFPage`, in order.
 *
 * This is also what resets the same-line snap chain at every page boundary,
 * for free: `paintOps` already starts its own `prevRealEnd` fresh (`null`)
 * on every invocation (see the comment above its own definition), so calling
 * it once per page, each with that page's own already-offset op list, needs
 * no separate reset logic here at all — a run at the top of page 2 can never
 * snap against a run that happened to end near the bottom of page 1, because
 * they are never passed to the same `paintOps` call.
 *
 * `pages.length` MUST equal `cutsPx.length + 1` (render.tsx creates exactly
 * that many `PDFPage`s from `paginate()`'s own `pageCount`). For a single
 * page (`cutsPx` empty) this reduces to exactly ONE `paintOps` call against
 * the ORIGINAL `ops` array, unchanged — see `assignOpsToPages`'s own doc
 * comment for why that's byte-identical to calling `paintOps` directly.
 */
export async function paintPages(
  pages: PDFPage[],
  ops: DrawOp[],
  fonts: PdfFontCache,
  pageHeightPt: number,
  pageHeightPx: number,
  cutsPx: number[],
  pageTopPaddingPx: number,
  captureDecoBoxes?: DecoBox[]
): Promise<void> {
  const perPageOps = assignOpsToPages(ops, cutsPx, pageTopPaddingPx, pageHeightPx)
  for (let i = 0; i < pages.length; i++) {
    await paintOps(pages[i], perPageOps[i] ?? [], fonts, pageHeightPt, captureDecoBoxes)
  }
}
