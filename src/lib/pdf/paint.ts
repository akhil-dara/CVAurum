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
  PDFArray,
  PDFString,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
  type PDFRef,
} from 'pdf-lib'
import type { Path as FontkitPath } from '@pdf-lib/fontkit'
import { pxToPt, ptToPx, flipY } from './units'
import { fontCoveringAll, mayNeedFallback, segmentByCoverage } from './textFallback'
import { smallCapsSegments } from './smallcaps'
import type { TagSink } from './tagging'
import type { CornerRadii, DecoBox, DrawOp, LinearGradient, TextRun } from './types'
import type { Rgba } from './style'
import type { PdfFontCache } from './fonts'
import { sidebarFirstOnContinuationPages } from './readingOrder'

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
  gradient: LinearGradient,
  /** Gradient extent in the SAME local space as the rect (top relative to the
   *  rect's own top, so a negative top means the gradient began on an earlier
   *  page). Defaults to the rect itself. */
  gradBoxPt?: { topPt: number; hPt: number }
): void {
  const angleRad = (gradient.angleDeg * Math.PI) / 180
  // CSS: direction = (sin A, -cos A) in a y-down space (0deg = "to top" = -y).
  const dx = Math.sin(angleRad)
  const dy = -Math.cos(angleRad)
  // CSS spec formula for the gradient line's length within a W x H box.
  const gradTopPt = gradBoxPt ? gradBoxPt.topPt : 0
  const gradHPt = gradBoxPt ? gradBoxPt.hPt : hPt
  const lineLen = Math.abs(wPt * dx) + Math.abs(gradHPt * dy)
  const cx = wPt / 2
  const cy = gradTopPt + gradHPt / 2
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

/** Decodes a `data:` URI's payload to raw bytes WITHOUT the network layer
 *  (hosted-site CSP, user report 2026-08-16: production ships
 *  `connect-src 'self'`, which blocks `fetch()` on data: URIs — every
 *  logo/photo embed silently failed on the live site while dev, with no
 *  CSP, passed every gate). Returns null for non-data URLs or malformed
 *  payloads so callers can fall back to fetch for real URLs. Exported for
 *  direct unit testing. */
export function dataUriToBytes(src: string): Uint8Array | null {
  const m = /^data:([^,]*),(.*)$/s.exec(src)
  if (!m) return null
  try {
    if (/;base64$/i.test(m[1])) {
      const bin = atob(m[2])
      const out = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
      return out
    }
    return new TextEncoder().encode(decodeURIComponent(m[2]))
  } catch {
    return null
  }
}

/** Re-encoded bytes, and which of pdf-lib's two embedders reads them. */
type Transcoded = { bytes: Uint8Array; jpeg: boolean }

/** How much of a source is kept when it is drawn into `box` under
 *  `object-fit: cover`: the largest centred rectangle of the source that has
 *  the box's own shape, which is exactly what the canvas shows. */
export function coverCrop(
  srcW: number,
  srcH: number,
  boxW: number,
  boxH: number
): { sx: number; sy: number; sw: number; sh: number } {
  if (!boxW || !boxH) return { sx: 0, sy: 0, sw: srcW, sh: srcH }
  const wide = srcW / srcH > boxW / boxH
  const sw = wide ? srcH * (boxW / boxH) : srcW
  const sh = wide ? srcH : srcW * (boxH / boxW)
  return { sx: (srcW - sw) / 2, sy: (srcH - sh) / 2, sw, sh }
}

/** A raster's size AS A READER WOULD SHOW IT, read straight off the bytes.
 *
 *  Needed because the shape of the source decides whether its original bytes
 *  can go into the file untouched (see `embedImage`), and asking the browser
 *  to decode every image just to learn its width would put a decode on the
 *  fast path for every photo and logo in the document. PNG carries width and
 *  height in the IHDR chunk, which is always first; JPEG carries them in its
 *  frame header, and the EXIF `Orientation` tag can say the stored pixels are
 *  turned - a phone photo is stored landscape and tagged "turn it", and every
 *  browser (and this function) reports the TURNED size, while pdf-lib embeds
 *  the stored one. Measured against sharp on nine real files, progressive
 *  (SOF2) and CMYK (4-component) JPEGs included: all nine agree.
 *
 *  Returns null for anything that is not a PNG or a JPEG, or a JPEG with no
 *  frame header - callers then fall back to decoding. */
export function rasterSize(b: Uint8Array): { w: number; h: number; orientation: number } | null {
  if (b.length > 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    const rd = (o: number) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0
    const w = rd(16)
    const h = rd(20)
    return w && h ? { w, h, orientation: 1 } : null
  }
  if (!(b.length > 4 && b[0] === 0xff && b[1] === 0xd8)) return null
  let i = 2
  let orientation = 1
  let w = 0
  let h = 0
  while (i + 3 < b.length) {
    if (b[i] !== 0xff) {
      i++
      continue
    }
    const m = b[i + 1]
    // Standalone markers carry no length word.
    if (m === 0xd8 || m === 0x01 || m === 0xff || (m >= 0xd0 && m <= 0xd7)) {
      i += 2
      continue
    }
    if (m === 0xda || m === 0xd9) break // start of scan / end: past every header
    const len = (b[i + 2] << 8) | b[i + 3]
    if (len < 2) break
    const seg = i + 4
    // SOF0..SOF15 are frame headers except C4 (Huffman tables), C8 (JPEG
    // extensions) and CC (arithmetic tables), which share the number space.
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc && !w) {
      h = (b[seg + 1] << 8) | b[seg + 2]
      w = (b[seg + 3] << 8) | b[seg + 4]
    }
    if (m === 0xe1 && b[seg] === 0x45 && b[seg + 1] === 0x78 && b[seg + 2] === 0x69 && b[seg + 3] === 0x66) {
      const t = seg + 6 // TIFF header: "Exif\0\0" then II/MM
      const le = b[t] === 0x49
      const u16 = (o: number) => (le ? b[o] | (b[o + 1] << 8) : (b[o] << 8) | b[o + 1])
      const u32 = (o: number) =>
        le
          ? ((b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0)
          : (((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0)
      const ifd = t + u32(t + 4)
      if (ifd + 2 < b.length) {
        const n = u16(ifd)
        for (let k = 0; k < n && ifd + 2 + k * 12 + 12 <= b.length; k++) {
          const e = ifd + 2 + k * 12
          if (u16(e) === 0x0112) orientation = u16(e + 8)
        }
      }
    }
    i += 2 + len
  }
  if (!w || !h) return null
  // 5..8 are the quarter-turn orientations, which swap the sides.
  return orientation >= 5 && orientation <= 8 ? { w: h, h: w, orientation } : { w, h, orientation }
}

/** True when this source cannot go into the file as it stands, because the box
 *  it is drawn into would show a DIFFERENT picture from the one the page
 *  shows.
 *
 *  `page.drawImage` fills the box with the whole source: it has no `object-fit`
 *  and no idea about EXIF. So original bytes are only right when the source
 *  already has the box's shape (nothing to crop or letterbox) and is stored the
 *  way up it is shown. Measured, on a document whose photo came in through the
 *  JSON import rather than the cropper: a 600x400 photo in a square frame
 *  exported as a squashed oval where the page showed a circle, and a phone
 *  photo tagged orientation 6 exported lying on its side. The cropper's own
 *  output is square and untagged, which is why the upload path never showed
 *  this and the import path always did. */
export function needsReshape(
  src: { w: number; h: number; orientation: number },
  box: { wPx: number; hPx: number; fit?: 'cover' | 'contain' }
): boolean {
  if (src.orientation > 1) return true
  // No object-fit: the DOM stretches the source into the box, and so does
  // drawImage - the two agree whatever the shapes are.
  if (box.fit !== 'cover' && box.fit !== 'contain') return false
  if (!src.w || !src.h || !box.wPx || !box.hPx) return false
  // 1% of aspect is well under a pixel on a 29px logo; it keeps a source that
  // is square bar a rounding error on the cheap path.
  return Math.abs(src.w / src.h - box.wPx / box.hPx) > 0.01 * (box.wPx / box.hPx)
}

/** Twice the drawn size is enough resolution for print without paying for
 *  the source's own: an art band decodes at 1200x300 and is drawn about a
 *  third of that wide. */
const SUPERSAMPLE = 2
/** The quality a re-encoded opaque source is written at. High enough that a
 *  photographic band shows no artefacts at print size, low enough that a
 *  document carrying one stays inside the export budget (P10: under 400 KB). */
const JPEG_QUALITY = 0.82

/** Decodes `src` with the browser's own image pipeline and re-encodes it for
 *  pdf-lib. Used for formats pdf-lib cannot embed directly - WEBP/GIF/AVIF
 *  logos render fine in the preview but used to export as an EMPTY gap (user
 *  report 2026-08-16: `downscaleImage` keeps the ORIGINAL data URL whenever
 *  its JPEG re-encode is not smaller, so small webp logos reach the walker in
 *  webp).
 *
 *  A source with NO transparency is re-encoded as a JPEG at the size it is
 *  drawn (`box`), cropped the way the page crops it. A PNG at the source's
 *  natural size is what this used to do for everything, and for a 1200x300
 *  photographic art band that is about a megabyte of Flate-compressed
 *  samples in the file - two to three times the whole export budget - drawn
 *  stretched where the canvas cropped it, so the PDF showed a different
 *  picture from the page.
 *
 *  A source WITH transparency (the identity marks and logos, which ride on
 *  their alpha) keeps the PNG path exactly as it was, and so does a
 *  `contain` fit, whose letterboxing needs a ground colour a JPEG has no way
 *  to leave out. Returns null when decoding fails or outside a DOM (unit
 *  tests keep today's skip-on-unsupported behavior). */
async function transcodeBytes(
  src: string,
  box: { wPx: number; hPx: number; fit?: 'cover' | 'contain' }
): Promise<Transcoded | null> {
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('image decode failed'))
      i.src = src
    })
    const w = img.naturalWidth
    const h = img.naturalHeight
    if (!w || !h) return null
    const natural = document.createElement('canvas')
    natural.width = w
    natural.height = h
    const nctx = natural.getContext('2d')
    if (!nctx) return null
    nctx.drawImage(img, 0, 0)
    // Whether any pixel is see-through, read off the decoded source itself
    // rather than guessed from the file extension. A reader that refuses to
    // hand back the pixels leaves the source on the PNG path, which is the
    // safe answer for anything that might carry alpha.
    let opaque = false
    try {
      const pixels = nctx.getImageData(0, 0, w, h).data
      opaque = true
      for (let i = 3; i < pixels.length; i += 4)
        if (pixels[i] !== 255) {
          opaque = false
          break
        }
    } catch {
      opaque = false
    }
    const drawW = Math.max(1, Math.round(box.wPx * SUPERSAMPLE))
    const drawH = Math.max(1, Math.round(box.hPx * SUPERSAMPLE))
    // A JPEG cannot carry the see-through part of a mark, nor the see-through
    // letterbox a `contain` fit leaves around one, so those keep the PNG path.
    if (!opaque || box.fit === 'contain') {
      // A source that already has the box's shape is written at its own size,
      // exactly as it always was: nothing to crop or letterbox, and paying a
      // resample for that would only cost the mark its edges.
      if (!needsReshape({ w, h, orientation: 1 }, box)) {
        const bytes = dataUriToBytes(natural.toDataURL('image/png'))
        return bytes ? { bytes, jpeg: false } : null
      }
      const shaped = document.createElement('canvas')
      shaped.width = drawW
      shaped.height = drawH
      const sctx = shaped.getContext('2d')
      if (!sctx) return null
      // Nothing is painted behind: a canvas is born transparent, and the
      // letterbox a `contain` fit leaves has to STAY see-through - whatever
      // shows through it is the element's own background, which the page has
      // already painted underneath.
      sctx.imageSmoothingQuality = 'high'
      if (box.fit === 'contain') {
        // The whole image, centred, nothing cut off - what the element's own
        // background shows around is the page's, not ours to invent.
        const s = Math.min(drawW / w, drawH / h)
        sctx.drawImage(img, (drawW - w * s) / 2, (drawH - h * s) / 2, w * s, h * s)
      } else {
        const { sx, sy, sw, sh } = coverCrop(w, h, box.wPx, box.hPx)
        sctx.drawImage(img, sx, sy, sw, sh, 0, 0, drawW, drawH)
      }
      const bytes = dataUriToBytes(shaped.toDataURL('image/png'))
      return bytes ? { bytes, jpeg: false } : null
    }
    const canvas = document.createElement('canvas')
    canvas.width = drawW
    canvas.height = drawH
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    if (box.fit === 'cover') {
      const { sx, sy, sw, sh } = coverCrop(w, h, box.wPx, box.hPx)
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, drawW, drawH)
    } else {
      // No object-fit of its own: the DOM stretches the source into the box,
      // and so does this.
      ctx.drawImage(img, 0, 0, drawW, drawH)
    }
    const bytes = dataUriToBytes(canvas.toDataURL('image/jpeg', JPEG_QUALITY))
    return bytes ? { bytes, jpeg: true } : null
  } catch {
    return null
  }
}

/** Fetches the op's source and embeds its ORIGINAL bytes (no re-encode/resize)
 *  once per source and drawn size - measured: every photo and logo the cropper
 *  writes goes into the file byte for byte. Two kinds of source do NOT: a
 *  format pdf-lib cannot read (webp/gif/avif), and one whose shape or stored
 *  rotation would make the box show a different picture from the page (see
 *  `needsReshape`). Both are re-encoded by `transcodeBytes` rather than
 *  silently skipped or silently wrong. The drawn size is part of the key
 *  because a re-encoded source is written at the size it is drawn - the same
 *  picture in two boxes is two pictures. */
async function embedImage(
  page: PDFPage,
  op: { src: string; wPx: number; hPx: number; fit?: 'cover' | 'contain' },
  cache: Map<string, Promise<PDFImage | null>>
): Promise<PDFImage | null> {
  const src = op.src
  const key = `${src}|${Math.round(op.wPx)}x${Math.round(op.hPx)}|${op.fit ?? ''}`
  let pending = cache.get(key)
  if (!pending) {
    pending = (async () => {
      try {
        // data: URIs decode locally — fetch() on them is BLOCKED by the
        // hosted site's connect-src 'self' CSP (the network layer is only
        // for real URLs, which same-origin CSP allows).
        let bytes = dataUriToBytes(src)
        if (!bytes) {
          const res = await fetch(src)
          if (!res.ok) return null
          bytes = new Uint8Array(await res.arrayBuffer())
        }
        // Original bytes, but only when they land in the box as the picture
        // the page shows. pdf-lib fills the box with the whole source and
        // knows nothing of object-fit or EXIF, so a source whose shape or
        // stored rotation disagrees with the box is redrawn instead - see
        // `needsReshape`, and the import-path photos it was measured on.
        const size = rasterSize(bytes)
        const reshape = !!size && needsReshape(size, op)
        if (!reshape) {
          if (hasMagic(bytes, PNG_MAGIC)) return await page.doc.embedPng(bytes)
          if (hasMagic(bytes, JPEG_MAGIC)) return await page.doc.embedJpg(bytes)
        }
        const transcoded = await transcodeBytes(src, op)
        if (transcoded)
          return transcoded.jpeg ? await page.doc.embedJpg(transcoded.bytes) : await page.doc.embedPng(transcoded.bytes)
        return null // undecodable — skip
      } catch {
        return null // failed to load — skip
      }
    })()
    cache.set(key, pending)
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
 *
 * ONLY decorative runs take this path. Tracked (letter-spaced) and small-caps
 * REAL content used to be drawn here too, as the visible half of a two-layer
 * trick whose other half was an invisible text copy; it is ordinary visible
 * text in a tracked cut of the font now (see `paintTrackedRun`).
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
 * `xPt` defaults to the run's own (unadjusted) position, which is what every
 * decorative call wants: a mark synthesized by walk.ts is positioned against
 * the element it belongs to, not against the previous run's drawn end.
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
  const color = rgb(run.color.r, run.color.g, run.color.b)
  const baseX = xPt
  const baseY = flipY(pxToPt(run.baselinePx), pageHeightPt)
  const letterSpacingPt = pxToPt(run.letterSpacingPx)
  const sizePt = pxToPt(run.sizePx)

  // `font-variant: small-caps` splits the run into full-size and reduced-size
  // pieces (see smallcaps.ts); everything else is one piece at the run's own
  // size, which is the identical code path with a single segment.
  // This path draws OUTLINES, never text, so a small-caps piece can simply be
  // uppercased here: there is no text layer for the case to leak into (a
  // decorative run is a logo monogram or a CSS separator glyph). Real content
  // takes paintTrackedRun, which draws the source's own lowercase letters in a
  // small-caps cut of the face instead — see smallcaps.ts.
  const scScale = run.smallCapsScale ?? 0
  const pieces =
    scScale > 0
      ? smallCapsSegments(run.text).map((seg) => ({
          text: seg.reduced ? seg.text.toUpperCase() : seg.text,
          sizePt: seg.reduced ? sizePt * scScale : sizePt,
        }))
      : [{ text: run.text, sizePt }]

  let cursor = 0
  for (const piece of pieces) {
    const glyphRun = font.layout(piece.text)
    const scale = piece.sizePt / font.unitsPerEm
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
 * One piece of a TRACKED or SMALL-CAPS run: its text, the size it is drawn
 * at, the (possibly tracked) cut of the font that draws it, and that font's
 * own measured width for it.
 */
interface TrackedPiece {
  text: string
  sizePt: number
  font: PDFFont
  widthPt: number
}

/**
 * Splits a tracked / small-caps run into the pieces one `drawText` each can
 * express, and embeds the font cut each one needs.
 *
 * `font-variant: small-caps` is synthesized by Chromium (none of the bundled
 * faces carries a real `smcp`): each lowercase letter is drawn as its
 * UPPERCASE glyph at a reduced size, while uncased characters keep the full
 * size. That is two sizes on one baseline, which no single text-showing
 * operator can say — hence one piece per size run (smallcaps.ts). A run with
 * no small-caps treatment is the identical path with a single piece.
 *
 * A reduced piece keeps its own LOWERCASE TEXT and is drawn in a small-caps
 * CUT of the face — `fonts.smallCapsFont`, whose cmap maps each lowercase
 * letter to its capital's glyph and leaves that glyph with the lowercase
 * letter as its only code point. The capitals are what the reader sees and
 * "Summary" is what every extractor reads, from one visible operator with
 * nothing hidden under it. Uppercasing the string instead (which this did
 * first) changed what the file SAYS: marquee's skill-group label went out as
 * LANGUAGES, which a parser reads as a section heading.
 *
 * A face with no cmap the variant can rewrite falls back to the ordinary cut
 * with the text uppercased — the page's shapes, not its words. No bundled
 * face does (159/159 carry the format 4 subtable), so this is a guard, not a
 * path.
 *
 * `letter-spacing` is a LENGTH in CSS, not a multiple of the em, so the same
 * `letterSpacingPx` applies to a reduced small-caps piece as to a full-size
 * one — which is a different fraction of ITS em, and therefore a different
 * font variant. Two embeds at most per (family, weight), both subset.
 */
async function trackedPieces(run: TextRun, fonts: PdfFontCache): Promise<TrackedPiece[]> {
  const scScale = run.smallCapsScale ?? 0
  const raw =
    scScale > 0
      ? smallCapsSegments(run.text).map((s) => ({
          text: s.text,
          sizePx: s.reduced ? run.sizePx * scScale : run.sizePx,
          smallCaps: s.reduced,
        }))
      : [{ text: run.text, sizePx: run.sizePx, smallCaps: false }]
  const out: TrackedPiece[] = []
  for (const piece of raw) {
    if (!piece.text) continue
    const trackingEm = piece.sizePx > 0 ? run.letterSpacingPx / piece.sizePx : 0
    // Outside any try: a real-content run whose font cannot be embedded is
    // not a cosmetic loss, and paintOps' contract is that it propagates.
    const caps = piece.smallCaps ? await fonts.smallCapsFont(run.family, run.weight, trackingEm) : null
    const font = caps ?? (await fonts.embed(run.family, run.weight, trackingEm))
    const text = piece.smallCaps && !caps ? piece.text.toUpperCase() : piece.text
    const sizePt = pxToPt(piece.sizePx)
    out.push({ text, sizePt, font, widthPt: safeWidthPt(font, text, sizePt, 0) })
  }
  return out
}

/**
 * Paints a TRACKED (letter-spaced) or SMALL-CAPS real-content run as ORDINARY,
 * VISIBLE text — one text-showing operator per piece, nothing hidden.
 *
 * What this replaces, and why. `/ActualText` (the PDF spec's own §14.6.2 way
 * of telling an extractor the real string behind unusual glyph positioning) is
 * not read by pdf.js's `getTextContent()` — its evaluator only ever reads
 * `MCID` off a marked-content properties dict — and every extractor in use
 * instead reconstructs words from glyph GEOMETRY: pdf.js splits at any gap
 * over `fontSize * 0.102`, and PyMuPDF and poppler do the equivalent. So a
 * heading drawn with PDF's character-spacing operator (`Tc`) at the 0.03em to
 * 0.2em our templates use extracts as "S U M M A R Y".
 *
 * The old answer was two layers: visible vector glyph outlines carrying the
 * tracking, plus an INVISIBLE (text rendering mode 3) untracked copy of the
 * string underneath for extractors to read. It extracted correctly, and an
 * external ATS scanner read the file and reported "text drawn invisibly" —
 * which is precisely the shape of that trick, whatever its intent. 22 of the
 * 93 text objects in one export were mode 3.
 *
 * The answer now is to make the glyphs honestly that wide: `fonts.embed`'s
 * third argument returns a cut of the face with `letterSpacingPx / sizePx`
 * baked into its `hmtx` advances (fonts.ts's `widenAdvances`). `Tc` stays 0,
 * no gap is inserted BETWEEN glyphs, and the same three extractors read
 * "SUMMARY" as one word — measured, and asserted per-design by
 * _local/gate-hidden-text.cjs.
 *
 * SMALL CAPS leaves the text layer exactly as the source wrote it. The reduced
 * pieces are drawn with their own LOWERCASE text in a small-caps cut of the
 * face (see `trackedPieces`), so a heading the canvas shows as "Sᴜᴍᴍᴀʀʏ" is
 * drawn as capitals and extracts as "Summary" — from one visible operator,
 * with nothing hidden under it. Uppercasing the string instead was the first
 * attempt, and it made the file say something the page does not: a skill-group
 * label set in small capitals went out as LANGUAGES, which a parser reads as a
 * section heading.
 *
 * `Tz` (horizontal scaling) fits the drawn width to the DOM's own measured
 * width exactly as the untracked branch does, and for the same reason: our
 * embedded static fonts measure a run from 0.5% (Inter) to 1.8% (Montserrat)
 * wide of what Chromium renders, so without it the ink drifts right of its
 * on-screen position by the end of a long heading. The DOM width already
 * INCLUDES the tracking (Chromium adds one increment per character, the last
 * included — the same thing `widenAdvances` does), so the numerator and the
 * denominator are the same measurement and the ratio lands near 100. Same
 * 90-110 sanity band as the untracked branch; negative tracking is simply a
 * narrower variant and needs no special case.
 *
 * Returns the natural (pre-`Tz`) advance and the `Tz` actually used, which
 * `paintOps` folds into the shared `prevRealEnd` bookkeeping unchanged.
 */
async function paintTrackedRun(
  page: PDFPage,
  run: TextRun,
  fonts: PdfFontCache,
  pageHeightPt: number,
  xPt: number,
  domWidthPt: number
): Promise<{ advanceWidthPt: number; tzPct: number }> {
  const pieces = await trackedPieces(run, fonts)
  const naturalPt = pieces.reduce((sum, p) => sum + p.widthPt, 0)
  let tzPct = 100
  if (domWidthPt > 0 && naturalPt > 0) {
    tzPct = Math.min(110, Math.max(90, (100 * domWidthPt) / naturalPt))
  }
  if (tzPct !== 100) {
    page.pushOperators(PDFOperator.of(PDFOperatorNames.SetTextHorizontalScaling, [PDFNumber.of(tzPct)]))
  }
  try {
    const yPt = flipY(pxToPt(run.baselinePx), pageHeightPt)
    const color = rgb(run.color.r, run.color.g, run.color.b)
    let pieceXPt = xPt
    for (const piece of pieces) {
      page.drawText(piece.text, {
        x: pieceXPt,
        y: yPt,
        size: piece.sizePt,
        font: piece.font,
        color,
        opacity: run.color.a,
      })
      // Tz scales the advances after the text origin, not the origin itself.
      pieceXPt += piece.widthPt * (tzPct / 100)
    }
  } catch (e) {
    // Drawing SHAPES the run, and fontkit's Indic syllable shaper is a
    // regenerator-transpiled state machine whose runtime is not bundled: a
    // resume containing Devanagari or Telugu threw `regeneratorRuntime is not
    // defined` from inside pdf-lib and took the ENTIRE export down with it, so
    // the author got no file at all. One run that cannot be shaped costs that
    // run, not the document - and its characters have no glyphs in this font
    // and would be dropped anyway (the export reports exactly those characters
    // to the author; see `lastUnsupportedCharacters`).
    console.warn('[pdf] could not shape a run; it is omitted from the page', e)
  } finally {
    if (tzPct !== 100) {
      page.pushOperators(PDFOperator.of(PDFOperatorNames.SetTextHorizontalScaling, [PDFNumber.of(100)]))
    }
  }
  return { advanceWidthPt: naturalPt, tzPct }
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
/**
 * `font.widthOfTextAtSize`, but a shaping failure costs one measurement rather
 * than the whole export.
 *
 * Measuring runs the font's OpenType shaper, and fontkit's Indic syllable
 * shaper is a regenerator-transpiled state machine whose runtime is not
 * bundled - so a resume containing Devanagari or Telugu threw
 * `regeneratorRuntime is not defined` from deep inside pdf-lib and took the
 * entire export down with it. Reproduced on the polished and creative
 * templates; the fonts that route through the simpler shaper were unaffected,
 * which is why it only showed on some.
 *
 * The characters that trigger it have no glyphs in these fonts and are dropped
 * from the output anyway (the export reports them - see
 * `lastUnsupportedCharacters`), so the browser's own laid-out width for the run
 * is both available and the right answer here.
 */
function safeWidthPt(font: PDFFont, text: string, sizePt: number, fallbackPt: number): number {
  try {
    return font.widthOfTextAtSize(text, sizePt)
  } catch {
    return fallbackPt
  }
}

/** How far past its natural width a measured run has to be before the extra
 *  width is read as JUSTIFICATION - the browser widening the inter-word
 *  spaces - and not as the fraction of a percent our embedded fonts drift
 *  from the ones the browser rendered. The upper bound is the same sanity
 *  guard the 90-110 scaling band is: nothing legitimately justified needs
 *  half again its own width, so a rect that claims it is a mismeasure. */
const JUSTIFY_SLACK_MIN_FRACTION = 0.02
const JUSTIFY_SLACK_MAX_FRACTION = 0.3

/** Splits a justified run into one piece per word - each carrying its own
 *  trailing space, so the gap that follows lands BETWEEN two words - and
 *  works out the gap that spreads the pieces across the measured width.
 *  Returns null when the run is not a justified one, or when there is no
 *  gap to put the extra width into. */
function justifiedPieces(
  font: PDFFont,
  text: string,
  sizePt: number,
  naturalPt: number,
  domWidthPt: number
): { texts: string[]; widthsPt: number[]; gapPt: number } | null {
  if (naturalPt <= 0 || domWidthPt <= 0) return null
  const slackPt = domWidthPt - naturalPt
  if (slackPt <= JUSTIFY_SLACK_MIN_FRACTION * naturalPt) return null
  if (slackPt > JUSTIFY_SLACK_MAX_FRACTION * naturalPt) return null
  const texts: string[] = []
  let start = 0
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== ' ') continue
    texts.push(text.slice(start, i + 1))
    start = i + 1
  }
  if (start < text.length) texts.push(text.slice(start))
  if (texts.length < 2) return null
  const widthsPt = texts.map((piece) => safeWidthPt(font, piece, sizePt, 0))
  const gapPt = (domWidthPt - widthsPt.reduce((sum, w) => sum + w, 0)) / (texts.length - 1)
  return gapPt > 0 ? { texts, widthsPt, gapPt } : null
}

/** What `paintOps` remembers about the last REAL text run it drew — enough to
 *  place the next one against it, and to bridge the gap between them. */
interface PrevRealEnd {
  baselinePx: number
  endXPt: number
  chainStartXPt: number
  lineBoxId?: number
  sizePx: number
  sizePt: number
  font: PDFFont
  endsWithSpace: boolean
  color: TextRun['color']
}

/**
 * Two baselines this close, as a fraction of the SMALLER of the two type
 * sizes, are one row. A title and its date sit half a point apart (different
 * sizes, one shared line box) and must count as one; two stacked lines of a
 * bullet are a whole line-height apart and must not. 0.35 sits far from both.
 */
const LINE_BOX_BASELINE_FRACTION = 0.35
/** Narrower than half a space is not a gap the reader can see, and the
 *  same-line snap above has already closed anything under a full space. */
const BRIDGE_MIN_SPACE_FRACTION = 0.5
/**
 * How far one space glyph may be stretched before a second is added.
 *
 * `Tz` has no ceiling in the PDF spec, and the gap across an entry's title/date
 * row wants a lot of it: measured across all 68 designs and 34 examples
 * (_local/gate-hidden-text.cjs), the widest any of them uses is 19936%. pdf.js
 * and PyMuPDF both read such a row back as ONE line with ONE space in it, and
 * pdftotext reads the same words (it keeps the date on its own line either way
 * - with one stretched space, with many ordinary ones, or with nothing at all
 * - because its raw mode groups by physical layout, not by the text stream).
 *
 * So the cap is a sanity bound rather than a reader limit, set just above what
 * a page that size can ask for. Past it the gap is filled with SEVERAL
 * stretched spaces instead of one enormous one - which every engine treats
 * identically, and which keeps the operand a number rather than a dare.
 */
const BRIDGE_MAX_TZ_PCT = 20000

/**
 * Draws ONE visible space across the empty gap between two runs the browser
 * put on the SAME visual row.
 *
 * The defect, measured on a real export: between two runs with nothing at all
 * between them — what the painter writes between contact items, and between an
 * entry title and its date — PyMuPDF reads two separate LINES, and so do the
 * viewers that group text the way it does, so drag-selecting a contact row
 * jumps from item to item and an extractor emits each item on a line of its
 * own. pdf.js hides this by inventing a space out of the geometry; the others
 * do not. PDF's word-spacing operator (`Tw`) is not the answer: it applies
 * only to the single-byte code 32, and our fonts embed as composite (two-byte
 * codes), so the readers that follow that rule ignore it.
 *
 * A real space glyph, horizontally scaled to exactly the gap, is: it advances
 * the pen by the same amount the void did, draws no ink, and every engine then
 * reads one line.
 *
 * It is bounded by the LINE BOX (walk.ts's `lineBoxId`), never by geometry
 * alone — so a sidebar term that happens to sit level with a main-column
 * bullet can never be joined to it, whatever the gap. And it is never drawn
 * where a space already exists on either side, so no run gains a doubled one.
 *
 * `prev` is the run drawn immediately before, so a row the painter does NOT
 * cross in one stretch is not bridged. A grid that flows down its columns
 * (atlas's header sets `grid-template-rows: repeat(3, auto)` and fills column
 * by column) paints the whole left column, then the whole right one, and its
 * visual rows stay separate lines - which is correct, and the same rule that
 * keeps a sidebar out of the main column: the reading order there really does
 * run down each column, and a row of it is a coincidence of layout. Bridging
 * from the row's own last end was tried and measured: the spaces land, and no
 * engine merges the lines anyway, because the pen had already moved on.
 */
function bridgeGapWithSpace(
  page: PDFPage,
  prev: PrevRealEnd | null,
  run: TextRun,
  xPt: number,
  pageHeightPt: number
): void {
  if (!prev) return
  if (run.lineBoxId === undefined || run.lineBoxId !== prev.lineBoxId) return
  if (prev.endsWithSpace || /^\s/.test(run.text)) return
  const baselineGapPx = Math.abs(run.baselinePx - prev.baselinePx)
  if (baselineGapPx >= LINE_BOX_BASELINE_FRACTION * Math.min(run.sizePx, prev.sizePx)) return
  const spaceWidthPt = safeWidthPt(prev.font, ' ', prev.sizePt, prev.sizePt * 0.25)
  if (spaceWidthPt <= 0) return
  const gapPt = xPt - prev.endXPt
  if (gapPt < BRIDGE_MIN_SPACE_FRACTION * spaceWidthPt) return

  const count = Math.max(1, Math.ceil((100 * gapPt) / (BRIDGE_MAX_TZ_PCT * spaceWidthPt)))
  const tzPct = (100 * gapPt) / (count * spaceWidthPt)
  page.pushOperators(PDFOperator.of(PDFOperatorNames.SetTextHorizontalScaling, [PDFNumber.of(tzPct)]))
  try {
    page.drawText(' '.repeat(count), {
      x: prev.endXPt,
      // The EARLIER run's baseline: the space belongs to the end of that run,
      // and putting it on the later run's baseline would tip a title/date row
      // half a point out of line for an engine that groups by baseline.
      y: flipY(pxToPt(prev.baselinePx), pageHeightPt),
      size: prev.sizePt,
      font: prev.font,
      color: rgb(prev.color.r, prev.color.g, prev.color.b),
      opacity: prev.color.a,
    })
  } catch (e) {
    // A space that cannot be shaped costs the bridge, not the export — the
    // page looks identical either way, since a space draws nothing.
    console.warn('[pdf] could not draw a bridging space', e)
  } finally {
    page.pushOperators(PDFOperator.of(PDFOperatorNames.SetTextHorizontalScaling, [PDFNumber.of(100)]))
  }
}

export async function paintOps(
  page: PDFPage,
  ops: DrawOp[],
  fonts: PdfFontCache,
  pageHeightPt: number,
  captureDecoBoxes?: DecoBox[],
  tagSink?: TagSink
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
  let prevRealEnd: PrevRealEnd | null = null

  for (const op of ops) {
    // Tagged PDF: every operator this loop emits belongs either to a
    // structure element (real content, gets an MCID a reader can resolve) or
    // to an artifact (decoration a reader must skip). Opened here and closed
    // in the matching `endMark` at the bottom of the loop, so the sequence
    // can never straddle two ops.
    const mark = tagSink?.begin(page, op)
    if (op.kind === 'text' && !op.run.isDecorative) {
      let { run } = op
      // Intentionally OUTSIDE the try/catch below: any failure to embed the
      // font (real content, tracked or not) must propagate, not be
      // swallowed as a cosmetic per-op issue.
      let font = await fonts.embed(run.family, run.weight)
      const sizePt = pxToPt(run.sizePx)
      let xPt = pxToPt(run.xPx)

      // A run its own font cannot draw in full (a Cyrillic name in a
      // Latin-only family, say) is split where the script changes and each
      // piece is drawn with the first chain font that has its glyphs, which
      // is the same font the browser drew it with (the chain sits in the
      // CSS stack). Latin runs never pay for this: mayNeedFallback is a
      // single regex test. See textFallback.ts.
      let pieces: Array<{ text: string; font: PDFFont | null }> | null = null
      if (mayNeedFallback(run.text)) {
        const chain = await fonts.coverage(run.family, run.weight)
        if (chain.length > 1) {
          const segs = segmentByCoverage(run.text, chain.map((c) => c.has))
          if (segs.some((s) => s.font !== 0)) {
            const chainFonts = await Promise.all(chain.map((c) => fonts.embed(c.family, run.weight)))
            if (run.letterSpacingPx !== 0 || (run.smallCapsScale ?? 0) > 0) {
              // A tracked or small-caps run is shaped and measured piece by
              // piece against ONE cut of one family (paintTrackedRun), so it
              // takes the first chain font that draws all of it; a heading is
              // one script in practice.
              const whole = fontCoveringAll(run.text, chain.map((c) => c.has))
              if (whole > 0) {
                run = { ...run, family: chain[whole].family }
                font = chainFonts[whole]
              }
            } else {
              pieces = segs.map((s) => ({ text: s.text, font: s.font >= 0 ? chainFonts[s.font] : null }))
            }
          }
        }
      }

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
        const spaceWidthPt = safeWidthPt(font, ' ', sizePt, sizePt * 0.25)
        const chainWidthPt = prevRealEnd.endXPt - prevRealEnd.chainStartXPt
        const negAllowancePt = Math.max(spaceWidthPt, DRIFT_FRACTION * chainWidthPt)
        const gapPt = xPt - prevRealEnd.endXPt
        if (gapPt > -negAllowancePt && gapPt < spaceWidthPt) {
          xPt = prevRealEnd.endXPt
          snappedToChain = true
        }
      }

      // ...and where the snap leaves a REAL gap on one visual row, bridge it
      // with one real space. See `bridgeGapWithSpace`.
      if (!snappedToChain) bridgeGapWithSpace(page, prevRealEnd, run, xPt, pageHeightPt)

      // The width the BROWSER laid the run out at, which both branches fit
      // their drawn width to with Tz. 0 means unmeasured (types.ts) — no
      // scaling at all, in either branch.
      const domWidthPt = run.widthPx > 0 ? pxToPt(run.widthPx) : 0

      // widthOfTextAtSize never applies letter-spacing, and the plain cut of
      // the font carries none, so this is the UNTRACKED width — what the
      // non-tracked branch's Tz ratio needs. The tracked branch measures its
      // own pieces against their own (tracked) cuts instead.
      const pieceWidthsPt = pieces
        ? pieces.map((p) => (p.font ? safeWidthPt(p.font, p.text, sizePt, 0) : 0))
        : null
      const embeddedWidthPt = pieceWidthsPt
        ? pieceWidthsPt.reduce((sum, w) => sum + w, 0)
        : safeWidthPt(font, run.text, sizePt, pxToPt(run.widthPx || 0))
      let tzPct = 100
      // What the run advances the pen by BEFORE Tz. The embedded (untracked)
      // metric everywhere except a justified line, whose pieces are spread
      // out to the width the browser measured (see the else branch below).
      let advanceWidthPt = embeddedWidthPt

      // Small-caps runs take the tracked path even at zero letter-spacing:
      // their glyphs are uppercase at two different sizes, which no single
      // text-showing operator can express — but every piece is ordinary
      // VISIBLE text, drawn once (see paintTrackedRun).
      if (run.letterSpacingPx !== 0 || (run.smallCapsScale ?? 0) > 0) {
        const drawn = await paintTrackedRun(page, run, fonts, pageHeightPt, xPt, domWidthPt)
        // Folded into the SAME tzPct/advanceWidthPt the non-tracked branch
        // below sets, so the shared endXPt formula just past this if/else
        // advances by the true (tracked) drawn width with no separate
        // bookkeeping path.
        tzPct = drawn.tzPct
        advanceWidthPt = drawn.advanceWidthPt
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
        //
        // A JUSTIFIED line arrives here as one run whose widthPx is the
        // WIDENED line width: the browser shared the extra width out over
        // the inter-word spaces. Stretching the run to that width would take
        // it out of the LETTERS instead, so a justified paragraph would draw
        // at a visibly different letter width line by line - and past the
        // clamp it would stop short of the right margin where the canvas is
        // flush. So the pieces are drawn at the font's own metric and the
        // slack is put back between the words, where the browser put it.
        // PDF word spacing (Tw) would be the short way to say that and is
        // not usable: it applies only to a ONE-byte code 32, and our fonts
        // embed as composite (two-byte codes), so a reader that follows that
        // rule - the one built into the common browser among them - ignores
        // it and draws every justified line short.
        // A mixed-script run is not spread as a justified line: its pieces
        // already carry their own fonts, and the Tz scaling below fits the
        // whole to the browser's width the same way it does one font.
        const spread = pieces ? null : justifiedPieces(font, run.text, sizePt, embeddedWidthPt, domWidthPt)
        if (spread) {
          advanceWidthPt = domWidthPt
        } else if (domWidthPt > 0 && embeddedWidthPt > 0) {
          tzPct = Math.min(110, Math.max(90, (100 * domWidthPt) / embeddedWidthPt))
        }
        if (tzPct !== 100) {
          page.pushOperators(PDFOperator.of(PDFOperatorNames.SetTextHorizontalScaling, [PDFNumber.of(tzPct)]))
        }
        try {
          const yPt = flipY(pxToPt(run.baselinePx), pageHeightPt)
          const style = {
            y: yPt,
            size: sizePt,
            font,
            color: rgb(run.color.r, run.color.g, run.color.b),
            opacity: run.color.a,
          }
          if (spread) {
            let pieceXPt = xPt
            for (let i = 0; i < spread.texts.length; i++) {
              page.drawText(spread.texts[i], { ...style, x: pieceXPt })
              pieceXPt += spread.widthsPt[i] + spread.gapPt
            }
          } else if (pieces && pieceWidthsPt) {
            // Each piece starts where the previous one's SCALED advance ends:
            // Tz scales the glyph advances after the text origin, not the
            // origin itself. A piece no chain font can draw is skipped (it is
            // reported by the export, as before).
            let pieceXPt = xPt
            for (let i = 0; i < pieces.length; i++) {
              const piece = pieces[i]
              if (piece.font) page.drawText(piece.text, { ...style, font: piece.font, x: pieceXPt })
              pieceXPt += pieceWidthsPt[i] * (tzPct / 100)
            }
          } else {
            page.drawText(run.text, { ...style, x: xPt })
          }
        } catch (e) {
          // Drawing SHAPES the run, and fontkit's Indic syllable shaper is a
          // regenerator-transpiled state machine whose runtime is not bundled:
          // a resume containing Devanagari or Telugu threw
          // `regeneratorRuntime is not defined` from inside pdf-lib and took
          // the ENTIRE export down with it. Losing this run is losing text the
          // font has no glyphs for anyway; losing the export is losing the
          // resume.
          console.warn('[pdf] could not shape a run; it is omitted from the page', e)
        } finally {
          if (tzPct !== 100) {
            page.pushOperators(PDFOperator.of(PDFOperatorNames.SetTextHorizontalScaling, [PDFNumber.of(100)]))
          }
        }
      }

      // When scaling is active the run's TRUE drawn width is the SCALED one
      // (DOM width for the non-tracked branch; for the tracked branch, the
      // tracked cut's own measured advance times the Tz paintTrackedRun
      // actually emitted), so bookkeeping must advance by that, not the
      // plain (untracked) metric, or the next run's same-line snap would
      // target the wrong endpoint. tzPct stays
      // 100 whenever neither branch's scaling applied, so this reduces to
      // the old `xPt + embeddedWidthPt` there.
      // Underline and strike-through are RULED, not drawn by the font, so
      // they are painted here against the run's own true advance rather than
      // an estimate. Offsets follow the usual typographic proportions of the
      // em: the underline sits just below the baseline, the strike near the
      // middle of the x-height.
      if (run.underline || run.lineThrough) {
        const widthPt = advanceWidthPt * (tzPct / 100)
        if (widthPt > 0) {
          const thickness = Math.max(0.4, sizePt * 0.055)
          const baseYPt = flipY(pxToPt(run.baselinePx), pageHeightPt)
          for (const [on, dy] of [
            [run.underline, -sizePt * 0.11],
            [run.lineThrough, sizePt * 0.26],
          ] as const) {
            if (!on) continue
            page.drawLine({
              start: { x: xPt, y: baseYPt + dy },
              end: { x: xPt + widthPt, y: baseYPt + dy },
              thickness,
              color: rgb(run.color.r / 255, run.color.g / 255, run.color.b / 255),
              opacity: run.color.a,
            })
          }
        }
      }

      const nextChainStartXPt: number = snappedToChain ? prevRealEnd!.chainStartXPt : xPt
      prevRealEnd = {
        baselinePx: run.baselinePx,
        endXPt: xPt + advanceWidthPt * (tzPct / 100),
        chainStartXPt: nextChainStartXPt,
        lineBoxId: run.lineBoxId,
        sizePx: run.sizePx,
        sizePt,
        font,
        endsWithSpace: /\s$/.test(run.text),
        color: run.color,
      }
      if (mark) tagSink?.end(page, mark)
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
              op.gradientBoxPx
                ? { topPt: pxToPt(op.gradientBoxPx.yPx - op.yPx), hPt: pxToPt(op.gradientBoxPx.hPx) }
                : undefined
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
          const img = await embedImage(page, op, images)
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
            // in this file, e.g. paintTrackedRun's Tz reset): a throw
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
          // Both draws above fill the box, which is right because the CROP
          // has already happened: a source the painter re-encodes is cut to
          // the box's own shape first (transcodeBytes, `object-fit: cover`),
          // so what is drawn here is already the picture the canvas shows.
          // A source pdf-lib embeds whole - a PNG or JPEG photo - is still
          // stretched rather than cropped; ImageCropper makes those square
          // to begin with, and re-encoding one to crop it would cost the
          // original's quality for a case that does not arise.
          break
        }
        case 'link': {
          // Not ink: a PDF link is an annotation on the page, so nothing is
          // drawn here. The glyphs under the rectangle are painted by ordinary
          // text ops - this only makes the region clickable.
          //
          // Border [0,0,0] is what keeps readers from drawing their own black
          // box around it; without it Acrobat outlines every link.
          const x1 = pxToPt(op.xPx)
          const y1 = flipY(pxToPt(op.yPx + op.hPx), pageHeightPt)
          const x2 = pxToPt(op.xPx + op.wPx)
          const y2 = flipY(pxToPt(op.yPx), pageHeightPt)
          const ctx = page.doc.context
          const annot = ctx.obj({
            Type: 'Annot',
            Subtype: 'Link',
            Rect: [x1, y1, x2, y2],
            Border: [0, 0, 0],
            F: 4, // print the annotation, per the PDF spec's flag bit 3
            A: ctx.obj({ Type: 'Action', S: 'URI', URI: PDFString.of(op.url) }),
          })
          const existing = page.node.get(PDFName.of('Annots'))
          if (existing instanceof PDFArray) existing.push(ctx.register(annot))
          else page.node.set(PDFName.of('Annots'), ctx.obj([ctx.register(annot)]))
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
          if (!svgOpts.color && !svgOpts.borderColor) break
          // A rounded `<img>` clips its picture: a drawn portrait paints a
          // backdrop rect over its whole viewBox, and the photo slot is a
          // circle, so without this the file showed a square of backdrop
          // where the page shows a disc. Same clamped bezier corner math and
          // the same tl<->bl / tr<->br vertical-mirror swap as the raster
          // `image` case below — see its comment for why that swap is needed
          // in a y-up local frame.
          const clip = op.clip
          const clipR = clip ? radiiToPt(clip.radii) : null
          const clipping = !!clipR && (clipR.tl > 0.5 || clipR.tr > 0.5 || clipR.br > 0.5 || clipR.bl > 0.5)
          if (clipping && clip && clipR) {
            const cxPt = pxToPt(clip.xPx)
            const cyPt = flipY(pxToPt(clip.yPx + clip.hPx), pageHeightPt) // bottom-left, page space
            page.pushOperators(
              pushGraphicsState(),
              concatTransformationMatrix(1, 0, 0, 1, cxPt, cyPt),
              ...roundedRectOperators(pxToPt(clip.wPx), pxToPt(clip.hPx), {
                tl: clipR.bl,
                tr: clipR.br,
                br: clipR.tr,
                bl: clipR.tl,
              }),
              PDFOperator.of(PDFOperatorNames.ClipNonZero),
              PDFOperator.of(PDFOperatorNames.EndPath)
            )
            // The local frame's origin is now the clip box's own bottom-left,
            // so the path's y-down anchor moves with it.
            svgOpts.x = pxToPt(op.xPx) - cxPt
            svgOpts.y = flipY(pxToPt(op.yPx), pageHeightPt) - cyPt
          }
          try {
            page.drawSvgPath(op.d, svgOpts)
          } finally {
            // Balanced q/Q whatever drawSvgPath does: paintOps' per-op catch
            // swallows a throw, and an unmatched clip would silently apply to
            // every op painted after this one.
            if (clipping) page.pushOperators(popGraphicsState())
          }
          break
        }
      }
    } catch {
      // Single bad rect/line/image op is swallowed: it must not sink the
      // whole export the way a lost font would.
    }
    if (mark) tagSink?.end(page, mark)
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
    case 'link':
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
    case 'link':
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

/**
 * How far below the document's own top (y = 0, which is also `bandTops[0]`)
 * a rect may begin and still be believed when it claims to be page chrome.
 *
 * Census behind the number: every template in the registry (58 of them) x
 * three page margins x two document lengths produced 452 ops carrying
 * walk.ts's `pageChrome` tag, and 450 of them sat at y = 0.0 EXACTLY — a
 * ground rect is the root's own background, or a column band that starts
 * where the artboard starts. The two exceptions were the marquee footer
 * strip's tail, at y = 1160.6 and y = 1225.1. One pixel of slack for
 * sub-pixel layout therefore sits three orders of magnitude clear of the
 * nearest impostor.
 */
const CHROME_TOP_TOLERANCE_PX = 1

/**
 * True when a `pageChrome`-tagged op really IS the document's own ground —
 * the thing that has earned the right to be redrawn edge-to-edge on every
 * sheet — rather than merely a tall piece of decoration.
 *
 * walk.ts tags on HEIGHT alone: a background rect at least 96% of the
 * document's content height. That says "tall", not "covers the document",
 * and the two part company on any document only slightly longer than one
 * page. Measured, on marquee: the strip's tail (artboard.css
 * `.rm-footer::after` — one page's worth of the strip's colour hung below
 * it so its ground reaches the paper's foot, sized by render.tsx) is
 * 1122.5px tall and begins at y = 1225.1 on a 1150.6px document, i.e. BELOW
 * the document's own bottom edge. 1122.5 >= 0.96 x 1150.6, so it was tagged;
 * `clampChromeOpToPage` then discarded its y and painted it over the whole
 * of BOTH sheets, and the export came back solid #111111 with the text layer
 * intact underneath it. The window is contentHeight in (one page's budget,
 * pageHeight / 0.96] — 1106.5 to 1169.3px on A4 — which is exactly why that
 * document blacked out at 18-24mm margins and paginated cleanly at 26mm.
 *
 * This is a class, not a template: any full-bleed block about a page tall
 * (footer strip, banner header, dark sidebar) does the same the moment the
 * document lands in that window.
 *
 * Erring strict is the cheap direction. A ground rect wrongly demoted here
 * falls through to ordinary band assignment, which still paints it in the
 * right place on every page it spans — it merely stops at the artboard's top
 * padding on a continuation page instead of bleeding to the sheet's edge.
 * Erring lax loses the whole document under a rectangle.
 */
function isDocumentGround(op: DrawOp): boolean {
  return op.kind === 'rect' && op.yPx <= CHROME_TOP_TOLERANCE_PX
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
export function clampChromeOpToPage(op: DrawOp, pageHeightPx: number, docYAtPageTopPx = 0): DrawOp {
  if (op.kind !== 'rect') return op
  const clamped: DrawOp = { ...op, yPx: 0, hPx: pageHeightPx }
  if (!op.fillGradient) return clamped
  // The band is redrawn per page, but its gradient belongs to the whole
  // document: remember where the original rect sat relative to THIS page's
  // top so the shading continues instead of restarting (2026-08-19).
  return { ...clamped, gradientBoxPx: { yPx: op.yPx - docYAtPageTopPx, hPx: op.hPx } }
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
 * A `pageChrome` op that is really the document's ground (`isDocumentGround`
 * — tagged AND starting at the document's top) skips band assignment
 * entirely and instead repeats, via `clampChromeOpToPage`, on EVERY page;
 * one that only carries the tag is assigned like any other op.
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
    // The tag alone is not enough to earn the full-bleed repeat — the op has
    // to start at the document's top as well. See `isDocumentGround`.
    if (op.pageChrome && isDocumentGround(op)) {
      // Page i shows document y starting at its own band top (page 1 starts
      // at 0); that offset is what keeps a chrome gradient continuous.
      pages.forEach((pageOps, i) =>
        pageOps.push(clampChromeOpToPage(op, pageHeightPx, i === 0 ? 0 : bandTops[i] - pageTopPaddingPx))
      )
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
  captureDecoBoxes?: DecoBox[],
  tagSink?: TagSink
): Promise<void> {
  // Page assignment first, then the per-page reading order: which column a
  // page should lead with depends on what the break actually split, which is
  // only knowable once the ops are on pages. See its own doc comment.
  const perPageOps = sidebarFirstOnContinuationPages(assignOpsToPages(ops, cutsPx, pageTopPaddingPx, pageHeightPx))
  for (let i = 0; i < pages.length; i++) {
    tagSink?.startPage(i)
    await paintOps(pages[i], perPageOps[i] ?? [], fonts, pageHeightPt, captureDecoBoxes, tagSink)
  }
}
