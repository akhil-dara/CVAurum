/**
 * Boxes, and the one rule that turns a box of type into a number a pair has
 * to reach. Pure arithmetic, no page - so the thresholds this checker holds
 * a word to can be read straight out of a test.
 */

/** A painted rectangle in page coordinates, y growing downward. */
export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export const boxesIntersect = (a: Box, b: Box): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

/** True when `outer` covers every pixel of `inner` - the only case where a
 *  layer can be taken as THE ground rather than as one of two possibilities.
 *  A hair of tolerance, because a sub-pixel layout rounds a box's edge. */
export const boxContains = (outer: Box, inner: Box, slack = 0.5): boolean =>
  outer.x <= inner.x + slack &&
  outer.y <= inner.y + slack &&
  outer.x + outer.w >= inner.x + inner.w - slack &&
  outer.y + outer.h >= inner.y + inner.h - slack

/** How much of `inner` the layer `outer` covers, 0..1. */
export function coverage(outer: Box, inner: Box): number {
  const area = Math.max(0, inner.w) * Math.max(0, inner.h)
  if (area <= 0) return 0
  const w = Math.max(0, Math.min(outer.x + outer.w, inner.x + inner.w) - Math.max(outer.x, inner.x))
  const h = Math.max(0, Math.min(outer.y + outer.h, inner.y + inner.h) - Math.max(outer.y, inner.y))
  return (w * h) / area
}

/** The page renders at 96 CSS px to the inch and type is set in points. */
export const PX_TO_PT = 0.75

export const ptFromPx = (px: number): number => px * PX_TO_PT

/**
 * The size a run of words is actually DRAWN at.
 *
 * Normally its own font size. In small capitals it is not: no bundled face
 * ships a real small-capitals feature, so every lowercase letter is drawn as
 * its capital at a reduced size - measured, not assumed (pdf/text.ts
 * smallCapsScaleFor) - and the run's own font size describes only the
 * letters that were already capitals. A name set at 24pt in small capitals
 * draws "lex" at 17.2pt: small text at 4.5:1, not large text at 3:1. Held to
 * its computed size instead, a gold name passed here at 3.62:1 and the file
 * faulted it.
 */
export function drawnPt(pt: number, text: string, smallCapsScale: number | undefined): number {
  if (!smallCapsScale || smallCapsScale <= 0) return pt
  // Only a run with a lowercase letter in it has anything reduced.
  return /\p{Ll}/u.test(text) ? pt * smallCapsScale : pt
}

/**
 * Large text, as the success criterion defines it: at least 18pt, or at
 * least 14pt when bold. Everything else is small text.
 *
 * Measured in POINTS, which is why the page's pixels are converted first: a
 * 18px heading is 13.5pt and is small text, and a checker that read pixels
 * would let it through at 3:1.
 */
export const isLargeText = (pt: number, weight: number): boolean =>
  pt >= 18 - 1e-6 || (pt >= 14 - 1e-6 && weight >= 700)

/** What the pair has to reach: 3:1 for large text, 4.5:1 for the rest. */
export const requiredRatio = (pt: number, weight: number): number => (isLargeText(pt, weight) ? 3 : 4.5)

/**
 * The slack a measured ratio is judged with.
 *
 * The page composites in floats and the file's own checker samples a raster,
 * so the two disagree in the third decimal. A pair at 4.4999 is a pair the
 * author set to 4.5 and must not be told off for; a pair at 4.49 is a real
 * shortfall. Half a hundredth, the same tolerance the file-side checker uses.
 */
export const RATIO_SLACK = 0.005

export const fails = (measured: number, required: number): boolean => measured < required - RATIO_SLACK
