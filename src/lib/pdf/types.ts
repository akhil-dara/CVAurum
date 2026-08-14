import type { Rgba } from './style'

export interface TextRun {
  text: string
  xPx: number
  baselinePx: number
  sizePx: number
  family: string
  weight: number
  italic: boolean
  color: Rgba
  letterSpacingPx: number
  /**
   * The run's laid-out width in CSS px, straight off the same client rect(s)
   * `xPx` came from — 0 when unknown/unmeasured (paint.ts's Tz horizontal-
   * scaling never applies at 0; see task-12 brief). Only extractRuns (real
   * DOM text.ts text) sets a real value; every TextRun synthesized elsewhere
   * (walk.ts's pseudo/marker/logo content) sets 0 rather than guess.
   */
  widthPx: number
  /**
   * True for text that is DECORATION rather than résumé content — SVG logo
   * monogram marks, CSS `::before`/`::after`/`::marker` separator and bullet
   * glyphs. paint.ts draws these as vector glyph outlines (fontkit) instead
   * of a real PDF text-showing operator, so they stay pixel-identical without
   * polluting the extractable text layer an ATS reads (see GitHub issue #4
   * and the task-10b brief, defect B). Real DOM text (text.ts's extractRuns)
   * is always `false` — never touch this rule for actual résumé content.
   */
  isDecorative: boolean
}

/**
 * A CSS `linear-gradient(<angle>deg, <color1>, <color2>)` — the only shape
 * our own templates.css uses (creative's header banner and sidebar,
 * spotlight's header banner; see task-10c report). `angleDeg` follows CSS's
 * own convention (0deg = "to top", clockwise) so paint.ts can reuse the CSS
 * spec's own gradient-line-length formula directly, and stops are plain RGBA
 * (already resolved from any `color-mix()`/custom property by the time
 * `getComputedStyle` reports them). Not a general N-stop/keyword-direction/
 * radial-gradient parser — anything else falls through to no background,
 * same as before this existed.
 */
export interface LinearGradient {
  angleDeg: number
  stops: [Rgba, Rgba]
}

/**
 * A decorative glyph-outline run's approximate on-page bounding box, in CSS
 * px relative to the page — task 15's gate-instrumentation hook (see
 * render.tsx's `renderResumePdf` and paint.ts's `paintOps`). The gate's
 * structural-diff detector excludes blobs that overlap a pdf.js text-item
 * box, but DECORATIVE marks (entry-logo monograms, marker glyphs) are vector
 * outlines with no pdf.js text item at all, so they flag as false-positive
 * structural blobs; exposing their boxes lets a harness fold them into the
 * same exclusion set. `wPx` is the font's own measured advance width for the
 * run (not a guess), `hPx` is `sizePx * 1.2` — an approximation the consumer
 * is expected to pad, not an exact glyph-ink bound.
 */
export interface DecoBox {
  xPx: number
  yPx: number
  wPx: number
  hPx: number
}

/**
 * Per-corner border radii, CSS order (top-left, top-right, bottom-right,
 * bottom-left) — fix-round-2 (task 13): `boxOps` used to read only
 * `border-top-left-radius` and apply that ONE value to all four corners, so
 * an asymmetric box (spotlight's header banner, `border-radius: 0 0 18px
 * 18px` — square top, rounded bottom) painted as a plain rectangle. Present
 * alongside the older `radiusPx?: number` on `rect`/`image` ops rather than
 * replacing it: `radiusPx` stays the uniform-radius shape for callers that
 * only ever need one value (markerOps' disc/circle marker dot, svgLogoOps'
 * hand-authored logo mark's `rx`) — paint.ts prefers `radii` when present
 * and falls back to a `radiusPx`-uniform box otherwise, so a caller that
 * only knows one radius never needs to spell out all four.
 */
export interface CornerRadii {
  tl: number
  tr: number
  br: number
  bl: number
}

export type DrawOp =
  | {
      kind: 'rect'
      xPx: number
      yPx: number
      wPx: number
      hPx: number
      fill?: Rgba
      radiusPx?: number
      radii?: CornerRadii
      fillGradient?: LinearGradient
    }
  | {
      kind: 'line'
      x1Px: number
      y1Px: number
      x2Px: number
      y2Px: number
      widthPx: number
      color: Rgba
      dashed?: boolean
    }
  /**
   * A STROKED rounded-rect border (task 22) — replaces the four straight
   * `line` ops a UNIFORM border (same width/style/color on all four edges)
   * would otherwise produce when the box also has a nonzero corner radius: a
   * straight line's flat ends overshoot the curve, visible as a straight
   * sliver poking past a rounded corner (.tpl-obsidian's entry cards,
   * `border: 1px solid` + `border-radius: 12px`). Paint.ts strokes this via
   * the same `roundedRectPath` machinery the radiused `rect` fill case uses,
   * with `color`/`widthPx` as the stroke instead of a fill.
   *
   * `xPx/yPx/wPx/hPx` and `radii` are the box ALREADY INSET by `widthPx / 2`
   * — same CSS-edge convention `BORDER_EDGES` uses for the straight-line case
   * (task 14: CSS paints a border INSIDE the box, but a centered stroke needs
   * its centerline pulled in by half the stroke width to land on the same
   * pixels) — walk.ts computes this inset once, so paint.ts only has to
   * convert units and stroke, not re-derive it.
   *
   * Only ever emitted for the UNIFORM case (see walk.ts's `borderOps`): a
   * rounded box with MIXED per-edge borders (different width/style/color)
   * falls back to plain `line` ops instead, since there is no single
   * centerline that correctly represents edges of different widths.
   */
  | {
      kind: 'roundedBorder'
      xPx: number
      yPx: number
      wPx: number
      hPx: number
      radii: CornerRadii
      widthPx: number
      color: Rgba
      dashed?: boolean
    }
  | {
      kind: 'image'
      xPx: number
      yPx: number
      wPx: number
      hPx: number
      src: string
      radiusPx?: number
      radii?: CornerRadii
    }
  /**
   * An inline `<svg>` icon (section-heading chips, contact-row marks — task
   * 13), e.g. lucide's `viewBox="0 0 24 24"` set. `xPx/yPx/wPx/hPx` are the
   * svg's own on-page box, same root-relative CSS-px convention as every
   * other op — but `d` and `strokeWidthPx` are DELIBERATELY left in the
   * svg's OWN viewBox/user-unit space (min-x/min-y always 0 — walk.ts skips
   * anything else), NOT pre-scaled to that box: paint.ts's drawSvgPath
   * `scale` option maps viewBox units to the page at paint time, and PDF
   * line width is interpreted in the user space active when the path is
   * STROKED (i.e. after that scale's `cm`), so a raw, unscaled
   * `strokeWidthPx` comes out the correct final thickness for free —
   * verified empirically against a rasterized probe, see the task-13
   * report. Combines every shape child of one `<svg>` into a single `d`
   * (lucide icons share one stroke/fill across all their children).
   */
  | {
      kind: 'svg'
      xPx: number
      yPx: number
      wPx: number
      hPx: number
      d: string
      stroke?: Rgba
      fill?: Rgba
      strokeWidthPx: number
      viewBox: [number, number, number, number]
    }
  | { kind: 'text'; run: TextRun }
