/**
 * Between the SETTING and the INK there is usually a transform.
 *
 * A person opens "Muted text" and picks a colour. What lands on the page is
 * often not that colour: a separator is painted at 45% of it, a date in a
 * band is painted at 85% of the band's ink, a sub-line is painted as 72% of
 * the body ink mixed with the muted one. The browser resolves all of that
 * before a script sees it, so the checker reads ONE `rgba()` and has to work
 * backwards: which setting, and through what.
 *
 * Getting this wrong is worse than saying nothing. A colour solved for the
 * PAINTED ink and then written into the setting is repainted through the
 * same transform and measures exactly what it measured before - the author
 * changes their colour, the warning stays, and the product has sent them
 * round a loop. So every candidate colour this module offers is evaluated
 * THROUGH the transform: what is measured is what the page will paint.
 *
 * Everything here is arithmetic over numbers, so all of it is held to a test
 * without a page (transform.test.ts).
 */
import { mixRgba, parseColor, type Rgba } from './color'

/**
 * How a setting's value becomes the ink the page paints.
 *
 *   value    the setting's own colour, when one could be resolved
 *   amount   how much of it survives a `color-mix` with another colour
 *   partner  the colour the rest of that mix came from
 *   alpha    the alpha the ink carries onto the ground
 *
 * `amount: 1, alpha: 1` is the plain case: the setting's colour is painted
 * as it stands, and solving for the setting is solving for the ink.
 */
export interface PaintPath {
  value?: Rgba
  amount: number
  partner?: Rgba
  alpha: number
}

/** The setting's colour painted as it stands. */
export const straight = (value?: Rgba): PaintPath => ({ value, amount: 1, alpha: value ? value[3] : 1 })

/** True when the page paints this setting through something - a mix, an
 *  alpha, or both - rather than straight. */
export const isTransformed = (p: PaintPath): boolean => p.amount < 0.999 || p.alpha < 0.999

/** The ink this setting VALUE would paint, through this transform: the
 *  colour a browser would compute, alpha included and not yet composited. */
export function paintWith(path: PaintPath, value: Rgba): Rgba {
  const rgb = path.amount >= 0.999 || !path.partner ? value : mixRgba(path.partner, value, path.amount)
  return [rgb[0], rgb[1], rgb[2], path.alpha]
}

/** A colour the page could have been painted from, with a name to report. */
export interface PaintCandidate {
  key: string
  color: Rgba
}

/** One way the painted ink could have been made. */
export interface PaintMatch {
  key: string
  path: PaintPath
  /** The other colour in the mix, when the ink is a mix of two settings. */
  partnerKey?: string
}

const channelsClose = (a: Rgba, b: Rgba, tol: number): boolean =>
  Math.abs(a[0] - b[0]) <= tol && Math.abs(a[1] - b[1]) <= tol && Math.abs(a[2] - b[2]) <= tol

/** The channel spread between two colours - how determined a mix of them is.
 *  Two near-identical colours can be mixed in any proportion and land on the
 *  same ink, so a solve over them says nothing. */
const spread = (a: Rgba, b: Rgba): number =>
  Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]))

/**
 * Every way the painted ink could have come from one of `inks`.
 *
 * Tried in order of how much the answer is KNOWN:
 *
 *   1. the ink's own channels are a tracked value's channels. The alpha is
 *      whatever the page painted it at - `color-mix(X 45%, transparent)` and
 *      `rgba(X, .45)` both resolve to X's channels at .45, which is why the
 *      alpha is recorded rather than matched on. Matching on it is the defect
 *      that named a sidebar's own ink "Muted text": at .85 it matched nothing
 *      and the report fell through to a guess.
 *   2. the ink is two tracked values mixed. The proportion is solved on the
 *      channel that separates them furthest and then verified on all three,
 *      so a coincidence does not pass for a derivation.
 *
 * Nothing is returned when neither holds: a caller that cannot name the
 * setting must say so rather than guess.
 */
export function matchPaints(painted: Rgba, inks: PaintCandidate[], partners: PaintCandidate[]): PaintMatch[] {
  const direct = inks.filter((c) => channelsClose(painted, c.color, 1))
  if (direct.length) return direct.map((c) => ({ key: c.key, path: { value: c.color, amount: 1, alpha: painted[3] } }))

  const out: PaintMatch[] = []
  for (const ink of inks)
    for (const partner of partners) {
      if (partner.key === ink.key) continue
      if (spread(ink.color, partner.color) < 10) continue
      const t = solveAmount(painted, ink.color, partner.color)
      if (t === null) continue
      out.push({
        key: ink.key,
        partnerKey: partner.key,
        path: { value: ink.color, amount: t, partner: partner.color, alpha: painted[3] },
      })
    }
  // The strongest reading of a mix is the one the setting dominates: a person
  // told "this is 72% your body ink" can act; "this is 28% your muted ink"
  // is the same fact told from the wrong end.
  return out.sort((a, b) => b.path.amount - a.path.amount)
}

/**
 * The proportion of `ink` in `painted`, given the other colour in the mix,
 * or null when no single proportion explains all three channels.
 *
 * A stylesheet writes whole percentages, so the answer is snapped to a
 * hundredth and then checked again: an unsnapped proportion that only fits
 * because it was fitted is not evidence of anything.
 */
export function solveAmount(painted: Rgba, ink: Rgba, partner: Rgba): number | null {
  let best = -1
  let axis = -1
  for (let i = 0; i < 3; i++) {
    const d = Math.abs(ink[i] - partner[i])
    if (d > best) {
      best = d
      axis = i
    }
  }
  if (best < 10) return null
  const raw = (painted[axis] - partner[axis]) / (ink[axis] - partner[axis])
  const t = Math.round(raw * 100) / 100
  if (t < 0.05 || t > 0.95) return null
  if (!channelsClose(painted, mixRgba(partner, ink, t), 1.5)) return null
  return t
}

/** A colour string as channels, for a caller holding hexes. */
export const asRgba = (v: string | null | undefined): Rgba | null => parseColor(v ?? '')
