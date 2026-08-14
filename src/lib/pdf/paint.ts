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
  return `M ${tl} 0 H ${w - tr} A ${tr} ${tr} 0 0 1 ${w} ${tr} V ${h - br} ` +
         `A ${br} ${br} 0 0 1 ${w - br} ${h} H ${bl} ` +
         `A ${bl} ${bl} 0 0 1 0 ${h - bl} V ${tl} A ${tl} ${tl} 0 0 1 ${tl} 0 Z`
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
function registerAxialShading(page: PDFPage, coords: [number, number, number, number], stops: [Rgba, Rgba]): PDFName | null {
  if (stops[0].a < 0.999 || stops[1].a < 0.999) return null
  const context = page.doc.context

  const fn = context.register(
    context.obj({
      FunctionType: 2,
      Domain: [0, 1],
      C0: [stops[0].r, stops[0].g, stops[0].b],
      C1: [stops[1].r, stops[1].g, stops[1].b],
      N: 1,
    }),
  )
  const shading = context.register(
    context.obj({
      ShadingType: 2,
      ColorSpace: 'DeviceRGB',
      Coords: coords,
      Function: fn,
      Extend: [true, true],
    }),
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
function fillGradientRect(page: PDFPage, xPt: number, topYPt: number, wPt: number, hPt: number, radiiPt: CornerRadii, gradient: LinearGradient): void {
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
    popGraphicsState(),
  )
}

/** Fetches `src`, embeds its ORIGINAL bytes (no re-encode/resize), once per src. */
async function embedImage(page: PDFPage, src: string, cache: Map<string, Promise<PDFImage | null>>): Promise<PDFImage | null> {
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
async function paintGlyphOutlines(page: PDFPage, run: TextRun, fonts: PdfFontCache, pageHeightPt: number, xPt: number = pxToPt(run.xPx)): Promise<number> {
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
 */
async function paintTrackedHeading(page: PDFPage, run: TextRun, font: PDFFont, fonts: PdfFontCache, pageHeightPt: number, xPt: number): Promise<void> {
  // Layer 1: invisible, untracked, extractable.
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
    // Always restore normal (filled) rendering mode, even if drawText threw
    // — otherwise every op after this one would silently paint nothing.
    page.pushOperators(setTextRenderingMode(TextRenderingMode.Fill))
  }

  // Layer 2: visible, tracked, vector — not part of the text layer at all.
  await paintGlyphOutlines(page, run, fonts, pageHeightPt, xPt)
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
  captureDecoBoxes?: DecoBox[],
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

      // The tracked path's extractable layer is drawn UNTRACKED (Tc 0, see
      // paintTrackedHeading), so widthOfTextAtSize — which never applies
      // letter-spacing — is exactly right for both branches below.
      const embeddedWidthPt = font.widthOfTextAtSize(run.text, sizePt)
      let tzPct = 100

      if (run.letterSpacingPx !== 0) {
        // Tracked headings are UNTOUCHED by Tz scaling — tzPct stays 100, so
        // the shared endXPt formula below reduces to the pre-task-12 value.
        await paintTrackedHeading(page, run, font, fonts, pageHeightPt, xPt)
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

      // When scaling is active the run's TRUE drawn width IS the DOM width,
      // so bookkeeping must advance by that scaled width, not the embedded
      // metric, or the next run's same-line snap would target the wrong
      // (embedded-font) endpoint. tzPct stays 100 for the tracked branch and
      // whenever scaling didn't apply, so this reduces to the old
      // `xPt + embeddedWidthPt` there.
      const nextChainStartXPt: number = snappedToChain ? prevRealEnd!.chainStartXPt : xPt
      prevRealEnd = { baselinePx: run.baselinePx, endXPt: xPt + embeddedWidthPt * (tzPct / 100), chainStartXPt: nextChainStartXPt }
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
              op.fillGradient,
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
        case 'image': {
          const img = await embedImage(page, op.src, images)
          if (!img) break
          page.drawImage(img, {
            x: pxToPt(op.xPx),
            y: flipY(pxToPt(op.yPx + op.hPx), pageHeightPt),
            width: pxToPt(op.wPx),
            height: pxToPt(op.hPx),
          })
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
