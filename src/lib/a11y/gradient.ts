/**
 * The ground a FADE puts under a word.
 *
 * Two traps live here, and both were paid for in measured failures.
 *
 * The first: a lerp in sRGB is not a lerp in luminance. The middle of a fade
 * between two colours of the same lightness is DARKER than either end, so the
 * two stops are not the extremes of the ground (elementColors.ts
 * gradientGrounds records the same fact from the deriving side). Sampling,
 * not the stops.
 *
 * The second: a word does not sit on the whole fade. A banner three hundred
 * points wide carries a name at its left edge and a contact line under it,
 * and the file's own checker samples the ground UNDER THE SPAN. Measuring a
 * name against the far end of a fade it never touches reports a failure the
 * file cannot see, which is how a checker loses a reader's trust. So the
 * gradient's own geometry is worked out and only the stretch of it beneath
 * the words is sampled.
 */
import { mixRgba, parseColor, type Rgba } from './color'
import type { Box } from './geometry'
import { boxesIntersect } from './geometry'

export interface GradientStop {
  color: Rgba
  /** 0..1 along the gradient line. */
  at: number
}

export interface Gradient {
  kind: 'linear' | 'other'
  /** CSS angle in degrees: 0 points up the page, 90 to the right. */
  angle: number
  stops: GradientStop[]
}

/** Split a computed `background-image` into its comma-separated layers,
 *  respecting the brackets inside `rgb(...)` and `linear-gradient(...)`. */
export function splitLayers(image: string | null | undefined): string[] {
  if (!image || image === 'none') return []
  const out: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < image.length; i++) {
    const ch = image[i]
    if (ch === '(') depth++
    else if (ch === ')') depth--
    else if (ch === ',' && depth === 0) {
      out.push(image.slice(start, i).trim())
      start = i + 1
    }
  }
  const tail = image.slice(start).trim()
  if (tail) out.push(tail)
  return out.filter(Boolean)
}

/** The same split, one level in: the arguments of a gradient function. */
function splitArgs(inner: string): string[] {
  return splitLayers(inner)
}

const ANGLE_WORDS: Record<string, number> = {
  'to top': 0,
  'to right': 90,
  'to bottom': 180,
  'to left': 270,
  'to top right': 45,
  'to right top': 45,
  'to bottom right': 135,
  'to right bottom': 135,
  'to bottom left': 225,
  'to left bottom': 225,
  'to top left': 315,
  'to left top': 315,
}

/**
 * One `background-image` layer as a gradient, or nothing when the layer is a
 * picture or something this does not model. A radial or conic fade parses as
 * 'other': its stops are still the colours it paints, but where each one
 * lands under a given word is not worked out, so the caller measures against
 * all of them.
 */
export function parseGradient(layer: string): Gradient | null {
  const m = layer.match(/^(repeating-)?(linear|radial|conic)-gradient\((.*)\)$/s)
  if (!m) return null
  const kind = m[2]
  const args = splitArgs(m[3])
  if (!args.length) return null
  let angle = 180
  let first = 0
  const head = args[0].trim().toLowerCase()
  if (kind === 'linear') {
    if (/^-?[\d.]+deg$/.test(head)) {
      angle = parseFloat(head)
      first = 1
    } else if (/^-?[\d.]+(turn|rad|grad)$/.test(head)) {
      const v = parseFloat(head)
      angle = head.endsWith('turn') ? v * 360 : head.endsWith('rad') ? (v * 180) / Math.PI : v * 0.9
      first = 1
    } else if (head in ANGLE_WORDS) {
      angle = ANGLE_WORDS[head]
      first = 1
    }
  } else if (!/^(rgb|color|#|[a-z]+\()/.test(head) && !parseColor(head)) {
    // radial/conic: drop a shape/position preamble that carries no colour
    first = 1
  }

  const raw: { color: Rgba; at: number | null }[] = []
  for (const arg of args.slice(first)) {
    const txt = arg.trim()
    const colorText = txt.match(/^(rgba?\([^)]*\)|color\([^)]*\)|#[0-9a-fA-F]{3,8}|[a-z]+)/)
    if (!colorText) continue
    const color = parseColor(colorText[1])
    if (!color) continue
    const rest = txt.slice(colorText[1].length).trim()
    // A stop can name two positions (a colour hint pair); the first is the
    // one that says where this colour starts.
    const pos = rest.match(/(-?[\d.]+)%/)
    raw.push({ color, at: pos ? parseFloat(pos[1]) / 100 : null })
  }
  if (raw.length < 2) return null

  // Positions the author left out are spread evenly between the ones they
  // gave - the rule the specification states, and the one a browser draws.
  if (raw[0].at === null) raw[0].at = 0
  if (raw[raw.length - 1].at === null) raw[raw.length - 1].at = 1
  for (let i = 1; i < raw.length - 1; i++) {
    if (raw[i].at !== null) continue
    let j = i
    while (j < raw.length && raw[j].at === null) j++
    const from = raw[i - 1].at as number
    const to = raw[j].at as number
    for (let k = i; k < j; k++) raw[k].at = from + ((to - from) * (k - i + 1)) / (j - i + 1)
    i = j - 1
  }
  let last = 0
  const stops = raw.map(({ color, at }) => {
    const v = Math.min(1, Math.max(last, at as number))
    last = v
    return { color, at: v }
  })
  return { kind: kind === 'linear' ? 'linear' : 'other', angle: ((angle % 360) + 360) % 360, stops }
}

/** The colour the fade paints at `t` (0..1 along its line). */
export function colorAt(stops: GradientStop[], t: number): Rgba {
  if (!stops.length) return [0, 0, 0, 0]
  const u = Math.min(1, Math.max(0, t))
  if (u <= stops[0].at) return stops[0].color
  for (let i = 1; i < stops.length; i++) {
    if (u > stops[i].at) continue
    const a = stops[i - 1]
    const b = stops[i]
    const span = b.at - a.at
    return span <= 0 ? b.color : mixRgba(a.color, b.color, (u - a.at) / span)
  }
  return stops[stops.length - 1].color
}

/**
 * How far along the gradient line the four corners of `box` fall, inside a
 * layer painted over `layerBox`. A box that lies outside the layer still
 * answers (clamped), because a word half off the edge of a banner still
 * stands on the part of it that is under the word.
 */
export function spanUnder(g: Gradient, layerBox: Box, box: Box): [number, number] {
  if (g.kind !== 'linear') return [0, 1]
  const rad = (g.angle * Math.PI) / 180
  // CSS angles run clockwise from "up"; the page's y grows downward.
  const dx = Math.sin(rad)
  const dy = -Math.cos(rad)
  const len = Math.abs(layerBox.w * dx) + Math.abs(layerBox.h * dy)
  if (len <= 0) return [0, 1]
  const cx = layerBox.x + layerBox.w / 2
  const cy = layerBox.y + layerBox.h / 2
  const corners: [number, number][] = [
    [box.x, box.y],
    [box.x + box.w, box.y],
    [box.x, box.y + box.h],
    [box.x + box.w, box.y + box.h],
  ]
  let lo = 1
  let hi = 0
  for (const [px, py] of corners) {
    const t = 0.5 + ((px - cx) * dx + (py - cy) * dy) / len
    lo = Math.min(lo, t)
    hi = Math.max(hi, t)
  }
  return [Math.min(1, Math.max(0, lo)), Math.min(1, Math.max(0, hi))]
}

/**
 * Every colour this fade actually puts under `box`, sampled densely enough
 * that the dark belly of a same-lightness fade is caught. Nine samples across
 * the stretch under the words, plus the stops that fall inside it, so a stop
 * is never stepped over.
 */
export function groundsUnder(g: Gradient, layerBox: Box, box: Box, steps = 8): Rgba[] {
  const [lo, hi] = g.kind === 'linear' && boxesIntersect(layerBox, box) ? spanUnder(g, layerBox, box) : [0, 1]
  const ts: number[] = []
  for (let i = 0; i <= steps; i++) ts.push(lo + ((hi - lo) * i) / steps)
  for (const s of g.stops) if (s.at >= lo && s.at <= hi) ts.push(s.at)
  return ts.map((t) => colorAt(g.stops, t))
}
