/**
 * What is actually BEHIND a run of words.
 *
 * Not "the first ancestor that paints something", which is what a naive walk
 * takes and what let a chip's tint, a gutter wash and an art band through: a
 * ground is every layer from the paper up, composited in paint order, and
 * only the layers whose boxes actually reach these words.
 *
 * A layer can be:
 *   a flat colour, at any alpha (a chip's 12% wash of the accent);
 *   a fade, whose colour under THESE words is worked out (gradient.ts);
 *   a picture, whose extremes were sampled from its own pixels;
 * and a layer that covers only part of the words contributes BOTH answers -
 * the covered ground and the uncovered one - because a word that straddles
 * the edge of a band stands on both and has to read on both.
 */
import { luminance as luminanceOf, over, parseColor, quantise, toHex, type Rgba } from './color'
import { groundsUnder, parseGradient, splitLayers } from './gradient'
import { boxContains, coverage, type Box } from './geometry'

export interface PaintLayer {
  /** The box the layer paints into. */
  box: Box
  /** `background-color`, as the computed style reports it. */
  color?: string | null
  /** `background-image`, as the computed style reports it. */
  image?: string | null
  /** The extremes of a picture painted here, when they could be sampled. */
  pictureGrounds?: string[]
  /** The same picture read cell by cell, for the ground under THESE words. */
  pictureCells?: {
    cols: number
    rows: number
    natural: { w: number; h: number }
    grounds: string[][]
    modes?: { key: number; hex: string; n: number }[][]
  }
  /** `object-fit` / `background-size`, and `object-position` /
   *  `background-position`: how the picture is laid into this box. */
  pictureFit?: string
  picturePosition?: string
  /** A picture is painted here but nothing could read it. */
  picture?: boolean
  /** The cumulative opacity of the element that paints the layer. */
  opacity: number
  /** A readable name for the element, for the report. */
  source: string
}

export type GroundKind = 'flat' | 'gradient' | 'image' | 'unknown'

export interface GroundCandidate {
  color: Rgba
  kind: GroundKind
  /** The layer that decided this candidate, innermost first. */
  source: string
  /**
   * When this ground is a WASH of an ink rather than a colour of its own -
   * a card is 4% of the body ink laid over the page, a row tint is 6% -
   * what it is made of.
   *
   * It matters to a suggestion and to nothing else: darken the body ink and
   * the card darkens with it, so a colour solved against the card AS IT
   * STANDS lands short of the line once the page repaints. Twenty-two
   * findings survived their own fix that way, by six hundredths.
   */
  tint?: { ink: Rgba; amount: number; partner: Rgba }
}

/** How many grounds one run of words is measured against. A fade sampled
 *  nine ways under two half-covering layers would multiply without this;
 *  the cap keeps a keystroke's worth of work bounded, and the candidates
 *  are deduplicated before it bites, so it only ever drops near-twins. */
const MAX_CANDIDATES = 32

/**
 * Every colour the page puts under `box`, given the layers behind it in
 * paint order (farthest first) and the paper they all stand on.
 */
export function compositeGrounds(layers: PaintLayer[], box: Box, paper: Rgba): GroundCandidate[] {
  let candidates: GroundCandidate[] = [{ color: paper, kind: 'flat', source: 'page' }]
  for (const layer of layers) {
    const cov = coverage(layer.box, box)
    if (cov <= 0.002) continue
    const painted = layerColors(layer, box)
    if (!painted.length) continue
    const covers = boxContains(layer.box, box)
    const next: GroundCandidate[] = covers ? [] : candidates.slice()
    for (const base of candidates)
      for (const p of painted) {
        const alpha = p.color[3] * layer.opacity
        next.push({
          color: over([p.color[0], p.color[1], p.color[2], alpha], base.color),
          kind: p.kind === 'flat' && base.kind !== 'flat' ? base.kind : p.kind,
          source: layer.source,
          // A wash at alpha `a` over an opaque base IS the ink mixed with
          // that base at `a` - the same shape as a `color-mix`, so both are
          // carried the same way and a solver has one case to answer.
          tint:
            p.kind === 'flat' && alpha < 0.999
              ? { ink: [p.color[0], p.color[1], p.color[2], 1], amount: alpha, partner: base.color }
              : undefined,
        })
      }
    candidates = dedupe(next)
  }
  return candidates.slice(0, MAX_CANDIDATES).map((c) => ({ ...c, color: quantise(c.color) }))
}

/** The colours ONE layer paints under THESE words: its background colour,
 *  then every image layer over it - the order a browser paints them in. The
 *  words' own box is passed down so a fade is sampled across the stretch of
 *  it they actually sit on, and not end to end. */
export function layerColors(layer: PaintLayer, box: Box): { color: Rgba; kind: GroundKind }[] {
  const out: { color: Rgba; kind: GroundKind }[] = []
  const flat = parseColor(layer.color)
  if (flat && flat[3] > 0.002) out.push({ color: flat, kind: 'flat' })
  for (const img of splitLayers(layer.image)) {
    const g = parseGradient(img)
    if (g) {
      for (const c of groundsUnder(g, layer.box, box)) out.push({ color: c, kind: 'gradient' })
      continue
    }
    if (/^(url|image|-webkit-image-set|image-set)\(/.test(img)) {
      const hexes = pictureUnder(layer, box)
      for (const hex of hexes) {
        const c = parseColor(hex)
        if (c) out.push({ color: c, kind: 'image' })
      }
      if (!hexes.length) out.push({ color: [0, 0, 0, 0], kind: 'unknown' })
    }
  }
  if (layer.picture) {
    const hexes = pictureUnder(layer, box)
    if (hexes.length) {
      for (const hex of hexes) {
        const c = parseColor(hex)
        if (c) out.push({ color: c, kind: 'image' })
      }
    } else out.push({ color: [0, 0, 0, 0], kind: 'unknown' })
  }
  return out
}

/**
 * The picture's colours UNDER these words, when the picture can be mapped
 * onto the box it paints into, and its colours end to end when it cannot.
 *
 * A band is one picture and a header has words all across it. Measured
 * against the whole picture's extremes, a name on the dark left of the band
 * was faulted at 2.02:1 against a mid grey that is nowhere near it - the
 * file measured 5.68:1 under the same words. Erring dark is the safe
 * direction, but a warning on a shipped band that the file does not agree
 * with teaches people to ignore the warnings that are real.
 *
 * Only the fits this can map exactly are mapped: `cover` and a picture
 * stretched to the box, at a position given in keywords or percentages.
 * Anything else - a tiled background, a length offset, `contain` with the
 * box showing through around it - falls back to the whole picture, which is
 * the conservative answer.
 */
function pictureUnder(layer: PaintLayer, box: Box): string[] {
  const region = regionGrounds(layer, box)
  return region ?? layer.pictureGrounds ?? []
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/** How much of the pooled readings under a run of words is discounted at
 *  each end. A tenth: what the words stand on, not the rarest pixel in the
 *  neighbourhood. */
const REGION_TAIL = 0.25

/** A `background-position` / `object-position` axis as a fraction of the free
 *  space, or null for anything this cannot place exactly. */
function positionFraction(raw: string | undefined, which: 0 | 1): number | null {
  const parts = (raw ?? '50% 50%').trim().toLowerCase().split(/\s+/)
  const word = parts.length === 1 ? (which === 0 ? parts[0] : 'center') : parts[which]
  if (!word) return null
  if (word === 'center') return 0.5
  if (word === 'left' || word === 'top') return 0
  if (word === 'right' || word === 'bottom') return 1
  if (word.endsWith('%')) {
    const n = parseFloat(word)
    return Number.isFinite(n) ? n / 100 : null
  }
  return null
}

function regionGrounds(layer: PaintLayer, box: Box): string[] | null {
  const cells = layer.pictureCells
  if (!cells || cells.cols < 1 || cells.rows < 1) return null
  if (cells.cols === 1 && cells.rows === 1) return null
  const nw = cells.natural.w
  const nh = cells.natural.h
  const bw = layer.box.w
  const bh = layer.box.h
  if (!(nw > 0 && nh > 0 && bw > 1 && bh > 1)) return null

  const fit = (layer.pictureFit ?? 'cover').trim().toLowerCase()
  let dw = bw
  let dh = bh
  if (fit === 'cover') {
    const s = Math.max(bw / nw, bh / nh)
    dw = nw * s
    dh = nh * s
  } else if (fit === 'fill' || fit === '100% 100%' || fit === '100%' || fit === 'none 100% 100%') {
    dw = bw
    dh = bh
  } else return null

  const fx = positionFraction(layer.picturePosition, 0)
  const fy = positionFraction(layer.picturePosition, 1)
  if (fx === null || fy === null) return null
  const dx = layer.box.x + (bw - dw) * fx
  const dy = layer.box.y + (bh - dh) * fy

  // The same couple of pixels of slack the file-side sampler takes around a
  // span's box, so a word sitting on the seam between two cells is measured
  // against both.
  const pad = 2
  const u0 = clamp01((box.x - pad - dx) / dw)
  const u1 = clamp01((box.x + box.w + pad - dx) / dw)
  const v0 = clamp01((box.y - pad - dy) / dh)
  const v1 = clamp01((box.y + box.h + pad - dy) / dh)
  if (u1 <= u0 || v1 <= v0) return null

  const c0 = Math.min(cells.cols - 1, Math.floor(u0 * cells.cols))
  const c1 = Math.min(cells.cols - 1, Math.max(c0, Math.ceil(u1 * cells.cols) - 1))
  const r0 = Math.min(cells.rows - 1, Math.floor(v0 * cells.rows))
  const r1 = Math.min(cells.rows - 1, Math.max(r0, Math.ceil(v1 * cells.rows) - 1))

  if (cells.modes && cells.modes.length === cells.cols * cells.rows) {
    const modal = modalGrounds(cells.modes, cells.cols, { u0, u1, v0, v1 }, { c0, c1, r0, r1 }, cells.rows)
    if (modal) return modal
  }

  // Every reading from every cell the words cover, pooled and then taken a
  // tenth in from each end. Taking the darkest and lightest readings instead
  // is taking an extreme of extremes: one vein in one corner of one cell
  // becomes the ground of the whole line.
  const pool: { hex: string; l: number }[] = []
  for (let r = r0; r <= r1; r++)
    for (let c = c0; c <= c1; c++)
      for (const hex of cells.grounds[r * cells.cols + c] ?? []) {
        const rgba = parseColor(hex)
        if (rgba) pool.push({ hex, l: luminanceOf(rgba) })
      }
  if (!pool.length) return null
  pool.sort((a, b) => a.l - b.l)
  const at = (q: number) => pool[Math.min(pool.length - 1, Math.max(0, Math.round(q * (pool.length - 1))))].hex
  const dark = at(REGION_TAIL)
  const light = at(1 - REGION_TAIL)
  return dark === light ? [dark] : [dark, light]
}

/** A colour that holds at least this share of the top colour's pixels under
 *  the words is a ground too. Where two flat colours split the box nearly
 *  evenly, which one the file's finer raster calls the mode can go either
 *  way, and a checker that bet on one of them could pass what the file
 *  fails - so both are measured and the worse one answers. */
const MODE_TIE = 0.6

/**
 * The ground under a run of words as the file-side checker takes it: the
 * commonest colour in the words' box.
 *
 * Each covered cell's commonest colours are tallied, weighted by how much of
 * the cell the box actually covers, so a word overlapping a cell's edge does
 * not take that whole cell's colour. The top colour is the ground, and so is
 * every colour within a tie of it.
 */
function modalGrounds(
  modes: { key: number; hex: string; n: number }[][],
  cols: number,
  span: { u0: number; u1: number; v0: number; v1: number },
  range: { c0: number; c1: number; r0: number; r1: number },
  rows: number
): string[] | null {
  const tally = new Map<number, { n: number; r: number; g: number; b: number }>()
  for (let r = range.r0; r <= range.r1; r++)
    for (let c = range.c0; c <= range.c1; c++) {
      const cu = Math.max(0, Math.min(span.u1, (c + 1) / cols) - Math.max(span.u0, c / cols)) * cols
      const cv = Math.max(0, Math.min(span.v1, (r + 1) / rows) - Math.max(span.v0, r / rows)) * rows
      const weight = cu * cv
      if (weight <= 0) continue
      for (const m of modes[r * cols + c] ?? []) {
        const rgba = parseColor(m.hex)
        if (!rgba) continue
        const n = m.n * weight
        const t = tally.get(m.key) ?? { n: 0, r: 0, g: 0, b: 0 }
        t.n += n
        t.r += rgba[0] * n
        t.g += rgba[1] * n
        t.b += rgba[2] * n
        tally.set(m.key, t)
      }
    }
  if (!tally.size) return null
  const top = Math.max(...[...tally.values()].map((t) => t.n))
  const out: string[] = []
  for (const t of tally.values())
    if (t.n >= top * MODE_TIE) out.push(toHex([Math.round(t.r / t.n), Math.round(t.g / t.n), Math.round(t.b / t.n), 1]))
  return out.length ? out : null
}

function dedupe(list: GroundCandidate[]): GroundCandidate[] {
  const seen = new Map<string, GroundCandidate>()
  for (const c of list) {
    const key = toHex(quantise(c.color)) + '|' + c.kind
    if (!seen.has(key)) seen.set(key, c)
  }
  return [...seen.values()]
}

/** The page's own paper: the artboard's background over a white floor, so a
 *  root that paints nothing still measures against something real. */
export function paperOf(backgroundColor: string | null | undefined): Rgba {
  const c = parseColor(backgroundColor)
  return over(c ?? [0, 0, 0, 0], [255, 255, 255, 1])
}
