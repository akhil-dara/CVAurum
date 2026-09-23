/**
 * The colour to write into the SETTING.
 *
 * elementColors.ts carries one ink the smallest distance toward black or
 * white that makes it read on a ground. This is the same walk asked the
 * question a person actually has to answer: not "what ink would read here",
 * but "what VALUE of this control would read everywhere the control is
 * painted". Three things separate the two, and each of them was a wrong
 * suggestion:
 *
 *   the transform  a value painted at 45% of itself is not the value. Every
 *                  candidate is painted through its own transform before it
 *                  is measured (transform.ts), so what is measured is what
 *                  the page will draw.
 *   the grounds    one setting paints on the page, on a lifted card and on a
 *                  row tint. A colour solved against the worst of those alone
 *                  leaves the others failing, so all of them are held at once.
 *   the threshold  a large heading needs 3:1 and the small print under it
 *                  needs 4.5:1. Each target carries its own.
 *
 * And when nothing reaches, nothing is offered. A 45% tint of ANY colour over
 * white tops out at 3.36:1 - no value of that setting can make it read, and
 * the only true answer is to say so and name the mix that caps it.
 */
import { over, quantise, ratio as ratioOf, toHex, type Rgba } from './color'
import { fails } from './geometry'
import { isTransformed, paintWith, type PaintPath } from './transform'

/** One of the colours the words stand on. A ground that is a wash of the
 *  same setting moves when the setting moves, so it is carried as what it is
 *  MADE of rather than as the colour it happens to be today. */
export interface TargetGround {
  color: Rgba
  tint?: { amount: number; partner: Rgba }
}

/** One run of words the setting has to read for: how it is painted, what it
 *  stands on, and what it has to reach. */
export interface InkTarget {
  path: PaintPath
  grounds: TargetGround[]
  required: number
}

export interface SolveResult {
  /** The value to write into the setting, when one reaches. */
  color?: string
  /** What that value measures at its worst, across every target. */
  worst?: number
  /** The best worst-case any value reached, for the reason when none did. */
  best: number
  /** The colour that reached it. */
  bestColor: string
}

/** The worst ratio this setting VALUE measures across one target's grounds -
 *  painted through the target's own transform first. */
export function worstOn(target: InkTarget, value: Rgba): number {
  const ink = paintWith(target.path, value)
  let worst = Infinity
  for (const g of target.grounds) {
    // The ground as it will be once the setting carries this value - the
    // colour it is today, unless the ground is a wash of the setting itself.
    const ground = g.tint
      ? quantise(paintWith({ amount: g.tint.amount, partner: g.tint.partner, alpha: 1 }, value))
      : g.color
    const painted = quantise(over(ink, ground))
    const r = ratioOf(painted, ground)
    if (r < worst) worst = r
  }
  return worst === Infinity ? 0 : worst
}

/** True when this value makes every one of these targets read. */
export const clears = (targets: InkTarget[], value: Rgba): boolean =>
  targets.every((t) => !fails(worstOn(t, value), t.required))

/**
 * Headroom a SUGGESTED value must clear by. The page and the file do not
 * paint a colour-mix in the same channel: a chip washed at 8% came out 244 in
 * the browser and 243 in the exported raster, so a value that measured
 * exactly 4.50:1 live measured 4.46:1 on the file - a suggestion that fixed
 * the pair where the author was looking and left it failing where it counts.
 * The derived inks already keep this margin (4.55 for 4.5).
 */
export const SUGGEST_MARGIN = 0.05

const clearsWithMargin = (targets: InkTarget[], value: Rgba): boolean =>
  targets.every((t) => worstOn(t, value) >= t.required + SUGGEST_MARGIN)

/**
 * The nearest value of the setting that clears every target.
 *
 * `start` is the setting's own value - not the painted ink - and the walk
 * carries it toward black and toward white a hundredth at a time, in whole
 * channels, because the page is painted in whole channels. The first step
 * that clears everything wins, which leaves a colour that already reads
 * exactly as it was: this is a correction, not a restyling.
 */
export function solveValue(start: Rgba, targets: InkTarget[]): SolveResult {
  const score = (v: Rgba) => Math.min(...targets.map((t) => worstOn(t, v) - t.required))
  const measure = (v: Rgba) => Math.min(...targets.map((t) => worstOn(t, v)))
  if (!targets.length) return { best: 0, bestColor: toHex(start) }
  let bestSeen = quantise(start)
  let bestScore = score(bestSeen)
  if (clears(targets, bestSeen))
    return {
      color: toHex(bestSeen),
      worst: round(measure(bestSeen)),
      best: round(measure(bestSeen)),
      bestColor: toHex(bestSeen),
    }
  const black: Rgba = [0, 0, 0, 1]
  const white: Rgba = [255, 255, 255, 1]
  for (let step = 1; step <= 100; step++) {
    const t = step / 100
    let reachedHere: Rgba | null = null
    for (const target of [black, white]) {
      const mixed = quantise([
        start[0] + (target[0] - start[0]) * t,
        start[1] + (target[1] - start[1]) * t,
        start[2] + (target[2] - start[2]) * t,
        1,
      ])
      const s = score(mixed)
      if (s > bestScore) {
        bestScore = s
        bestSeen = mixed
      }
      // Both extremes are tried at every step, and the better of the two is
      // taken when both reach: the extra margin costs nothing here and
      // leaves more room for the next thing the author changes.
      if (clearsWithMargin(targets, mixed) && (!reachedHere || measure(mixed) > measure(reachedHere))) reachedHere = mixed
    }
    if (reachedHere)
      return {
        color: toHex(reachedHere),
        worst: round(measure(reachedHere)),
        best: round(measure(reachedHere)),
        bestColor: toHex(reachedHere),
      }
  }
  return { best: round(measure(bestSeen)), bestColor: toHex(bestSeen) }
}

const round = (n: number) => Math.round(n * 100) / 100

/**
 * Why no value of this setting can make these words read, in the words a
 * person can act on.
 *
 * Two things cap a setting, and they call for different answers:
 *
 *   the transform  the page paints the setting at a fraction of itself. Even
 *                  black at 45% over white is 3.36:1, so the mix is what
 *                  would have to change - in the design, not in the setting.
 *   the grounds    the same words stand on a light ground and a dark one at
 *                  once. No ink reads on both; one of the two grounds is what
 *                  would have to change.
 */
export function capReason(targets: InkTarget[], best: number, label: string): string {
  const tinted = targets.filter((t) => isTransformed(t.path))
  if (tinted.length) {
    const t = tinted[0]
    const strength = Math.round(t.path.amount * t.path.alpha * 100)
    const extreme = bestExtreme(t)
    const ground = t.grounds.length ? toHex(t.grounds[0].color) : '#ffffff'
    return (
      `${label} is not painted here as it stands: the design paints it at ${strength}% of its own strength. ` +
      `Even ${extreme.which} at that strength over ${ground} reaches ${round(extreme.ratio)}:1, short of ${t.required}:1, ` +
      `so no value of this setting can make these words read - the ${strength}% in the design's own rule is what would have to change.`
    )
  }
  const grounds = [...new Set(targets.flatMap((t) => t.grounds.map((g) => toHex(g.color))))]
  return (
    `These words stand on ${grounds.length > 1 ? grounds.slice(0, 3).join(', ') : grounds[0]} at once, and no one ink reads on all of them: ` +
    `the best any value of ${label} reaches is ${round(best)}:1. One of those grounds is what would have to change.`
  )
}

/** The better of black and white, painted through this target's transform. */
function bestExtreme(target: InkTarget): { which: 'black' | 'white'; ratio: number } {
  const b = worstOn(target, [0, 0, 0, 1])
  const w = worstOn(target, [255, 255, 255, 1])
  return b >= w ? { which: 'black', ratio: b } : { which: 'white', ratio: w }
}
