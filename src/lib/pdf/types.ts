/**
 * Structure types the tagger emits (PDF standard structure namespace).
 * `Artifact` is not a structure type — it marks content a reader must SKIP
 * (rules, backgrounds, decorative glyphs), which is just as important for
 * accessibility as tagging the real content.
 */
export type TagRole = 'H1' | 'H2' | 'H3' | 'P' | 'L' | 'LI' | 'Link' | 'Figure' | 'Artifact'

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
   * `text-decoration-line` on the run, painted as a ruled line rather than by
   * the font. Without this, text the author underlines or strikes through on
   * the canvas looks right on screen and loses the decoration entirely in the
   * exported PDF - the canvas would be lying about the output, which is the
   * one thing the editing surface must not do.
   */
  underline?: boolean
  lineThrough?: boolean
  /**
   * Synthetic small-caps size ratio for this run (`font-variant: small-caps`),
   * measured off Chromium by `smallCapsScaleFor` — 0 (or absent) means the run
   * has no small-caps treatment, which is every synthesized run and every
   * normally-cased piece of DOM text. It changes the SIZE the reduced pieces
   * are drawn at, and the font CUT that draws them (fonts.ts's
   * `smallCapsVariant`, whose cmap turns each lowercase letter into its
   * capital's glyph while the letter itself stays lowercase). The extractable
   * text layer keeps the source's natural case, so an ATS still reads
   * "Summary", never "SUMMARY" (see smallcaps.ts).
   */
  smallCapsScale?: number
  /**
   * The run's laid-out width in CSS px, straight off the same client rect(s)
   * `xPx` came from — 0 when unknown/unmeasured (paint.ts's Tz horizontal-
   * scaling never applies at 0; see task-12 brief). extractRuns (real DOM
   * text.ts text) sets it from the rect; walk.ts's `markerOps` sets it from a
   * layout probe, because a list marker IS one laid-out string even though it
   * has no client rect of its own. Every other synthesized run (pseudo
   * content, a logo monogram) sets 0 rather than guess.
   */
  widthPx: number
  /**
   * True for text that is DECORATION rather than résumé content — SVG logo
   * monogram marks and CSS `::before`/`::after` separator glyphs. paint.ts
   * draws these as vector glyph outlines (fontkit) instead of a real PDF
   * text-showing operator, so they stay pixel-identical without polluting the
   * extractable text layer an ATS reads (see GitHub issue #4 and the task-10b
   * brief, defect B). Real DOM text (text.ts's extractRuns) is always `false`
   * — never touch this rule for actual résumé content, and a LIST MARKER is
   * actual content: it is the only thing saying where one item ends and the
   * next begins, so walk.ts's `markerOps` draws it as ordinary visible text.
   */
  isDecorative: boolean
  /**
   * Which LINE BOX this run belongs to — the row the browser laid it out in.
   *
   * It is the nearest block-level ancestor of the run's text, climbed once
   * more when that ancestor is a flex or grid ITEM, because a flex item does
   * not own the row it sits on: its container does. So an entry's title and
   * its date (two blocks in one `.rm-item-head` flex row) share an id, and so
   * do a header's contact items, while a sidebar term and a main-column bullet
   * that happen to sit at the same height never can — the climb stops inside
   * the column (walk.ts's `lineBoxId`).
   *
   * paint.ts needs it to decide where a VISIBLE space may be drawn to bridge a
   * gap between two runs. A run with no id (a synthesized pseudo/marker run,
   * anything walk.ts could not place) is never bridged.
   *
   * Why the file needs one at all: between two runs with an empty void between
   * them, PyMuPDF - and viewers that group the way it does - read separate
   * LINES, so drag-selecting a contact row jumps from item to item and an
   * extractor emits each one on its own line. pdf.js hides this by inventing a
   * space from the geometry; the others do not. One real space, stretched to
   * the gap, makes every engine agree it is one line.
   */
  lineBoxId?: number
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

/**
 * Common to every DrawOp variant (intersected below rather than repeated on
 * each union member) — TS distributes an intersection with a union member-by-
 * member, so `op.kind === 'rect'` still narrows to `DrawOpChrome & { kind:
 * 'rect'; ... }`, exposing both `pageChrome` and the rect-specific fields.
 */
interface DrawOpChrome {
  /**
   * True for a DrawOp that is PAGE CHROME rather than page-specific content —
   * the root's own full-height background, or any other background `rect`
   * spanning >= 96% of the document's total content height (the heuristic
   * for "this is a full-column band", e.g. a two-column template's dark
   * sidebar fill — see the native-multipage-pdf plan spec section 2).
   * walk.ts's `buildDrawList` tags these in a post-pass over the finished op
   * list; paint.ts (task 3) repeats a page-chrome op on EVERY output page,
   * clamped to that page's own height, instead of assigning it to a single
   * page's band the way ordinary content ops are assigned. Absent (not
   * `false`) on every op for a single-page document's ordinary content.
   *
   * The >= 96% test measures HEIGHT, so the tag alone does not establish
   * that the rect covers the document — a page-tall decoration hung near the
   * foot of a document barely longer than one page passes it too. paint.ts's
   * `isDocumentGround` re-checks that the rect starts at the document's top
   * before granting the full-bleed repeat; read its comment before trusting
   * this flag anywhere else.
   */
  pageChrome?: true
}

export type DrawOp = DrawOpChrome &
  (
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
        /**
         * Where the GRADIENT's own box lives, when it differs from the rect
         * being painted. Page chrome (a full-height sidebar band) is clamped
         * to each page, but its gradient must keep running across the whole
         * DOCUMENT: without this the shading restarts on every page and page
         * 3 of a 3-page resume paints the gradient's start colour where the
         * layout has its end colour. Same coordinate space as the rect.
         */
        gradientBoxPx?: { yPx: number; hPx: number }
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
        /** The element's own `object-fit`, when it has one (a photo and an
         *  art band crop with `cover`, an entry logo fits inside with
         *  `contain`; absent means the CSS default, which stretches). It
         *  decides how a re-encoded source is drawn into the box, so the
         *  export shows the same picture the canvas does. */
        fit?: 'cover' | 'contain'
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
        /**
         * A rounded box the path is clipped to, in the same root-relative
         * CSS-px space as `xPx/yPx` — the `<img>`'s own BORDER box when it
         * carries a border-radius (walk.ts's `svgLogoOps`). A drawn portrait
         * fills its whole viewBox with a background rect, and the photo slot's
         * default shape is a full circle: without the clip the file showed a
         * square of backdrop where the page shows a disc. Absent for every
         * unrounded source, which keeps the common case on exactly the
         * operators it had before.
         */
        clip?: { xPx: number; yPx: number; wPx: number; hPx: number; radii: CornerRadii }
      }
    | {
        kind: 'text'
        run: TextRun
        /**
         * Structure type for the tagged-PDF tree (tagging.ts). Absent means
         * "not tagged yet" and is treated as a paragraph; decorative runs
         * carry 'Artifact' so a screen reader skips them.
         */
        role?: TagRole
        /**
         * Which column the run came from. The structure tree orders the main
         * column before the aside so a screen reader hears the person's name
         * first, even on templates that paint the sidebar first.
         */
        column?: 'main' | 'aside'
        /**
         * Identifies the LOGICAL block (paragraph, bullet, heading) this run
         * belongs to, shared by every visual line of that block.
         *
         * Without it the structure tree gets one element per visual LINE -
         * measured on a real export, 128 `/P` elements for a resume with
         * about 25 paragraphs - so anything that reads the tree (Acrobat's
         * copy and reflow, screen readers, structure-aware parsers) emits a
         * line break mid-sentence at every wrap.
         */
        blockId?: number
        /**
         * Normalized hyperlink destination (links.ts `linkTarget`) for the
         * anchor this run's text belongs to. Set exactly when `role` is
         * 'Link': structure.ts pairs the link's TEXT with its Link
         * annotation by this URL, so the annotation's OBJR lands in the
         * SAME /Link structure element as the text — the pairing
         * accessibility validators require. Two adjacent Link runs with
         * different URLs must never coalesce, so coalesce.ts treats this
         * as part of a run's identity.
         */
        linkUrl?: string
      }
    | {
        /**
         * A clickable region. This paints no ink at all - the glyphs under it
         * are drawn by ordinary `text` ops - it only tells the reader that the
         * rectangle is a link, which in PDF is an annotation rather than page
         * content. One op per LINE of a link, so a URL that wraps is clickable
         * on both of its lines.
         */
        kind: 'link'
        xPx: number
        yPx: number
        wPx: number
        hPx: number
        /** Already normalised and vetted by `linkTarget` - never raw input. */
        url: string
      }
  )
