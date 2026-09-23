/**
 * The per-element colours - the name, the headline, the section titles, the
 * contact line and the links - resolved in one place for the canvas and the
 * Word export. On the page each rides one CSS variable that the base
 * stylesheet and every template read through a fallback chain, so an unset
 * colour draws exactly what the page always drew, and a set one is a plain
 * computed colour the PDF painter reads back from the DOM.
 */
import type { Theme } from '@/types/metadata'

export type ElementColorKey = 'name' | 'headline' | 'headings' | 'contacts' | 'links'

/** Each colour and the variable it becomes on .rm-root. */
export const ELEMENT_COLORS: readonly { key: ElementColorKey; cssVar: string }[] = [
  { key: 'name', cssVar: '--rm-name-color' },
  { key: 'headline', cssVar: '--rm-headline-color' },
  { key: 'headings', cssVar: '--rm-heading-color' },
  { key: 'contacts', cssVar: '--rm-contact-color' },
  { key: 'links', cssVar: '--rm-link-color' },
]

/** The variables for the colours that are set, and nothing for the rest: a
 *  variable set to an empty value would make its fallback chain resolve to
 *  nothing and drop the element's colour altogether. */
export function elementColorVars(theme: Theme): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const { key, cssVar } of ELEMENT_COLORS) {
    const v = theme[key]
    if (v) vars[cssVar] = v
  }
  return vars
}

/** The three channels of a hex colour (#rgb or #rrggbb, the hash optional),
 *  or nothing for anything else: a named colour, an rgb() string, a blank. */
function hexChannels(hex: string): [number, number, number] | null {
  let s = (hex || '').trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(s))
    s = s
      .split('')
      .map((x) => x + x)
      .join('')
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)) as [number, number, number]
}

const channelHex = (n: number) => Math.round(n).toString(16).padStart(2, '0')

/** The colour mixed toward white by `amount` (0 leaves it, 1 is white): the
 *  band header's second gradient stop when the author chose none. A value
 *  that is not a hex colour comes back as it was. */
export function lighten(hex: string, amount: number): string {
  const c = hexChannels(hex)
  if (!c) return hex
  const t = Math.min(1, Math.max(0, amount))
  return `#${c.map((v) => channelHex(v + (255 - v) * t)).join('')}`
}

/** `a` mixed into `b` by `amount` (0 is all `b`, 1 all `a`) - the same maths
 *  CSS `color-mix(in srgb, a <amount>, b)` does, so a ground the stylesheet
 *  mixes and a ground this file mixes are the same colour. A value that is
 *  not a hex colour comes back as it was. */
export function mix(a: string, b: string, amount: number): string {
  const ca = hexChannels(a)
  const cb = hexChannels(b)
  if (!ca || !cb) return a
  const t = Math.min(1, Math.max(0, amount))
  return `#${ca.map((v, i) => channelHex(v * t + cb[i] * (1 - t))).join('')}`
}

/** The colour as an `rgba()` at `alpha`: the wash a header lays over its art
 *  band, written in the one translucent form the painter reads back from the
 *  computed style (walk.ts parseColor). A value that is not a hex colour
 *  comes back as it was. */
export function withAlpha(hex: string, alpha: number): string {
  const c = hexChannels(hex)
  if (!c) return hex
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${Math.min(1, Math.max(0, alpha))})`
}

/** Relative luminance, as the accessibility contrast formula defines it. */
function luminance([r, g, b]: [number, number, number]): number {
  const lin = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function contrast(a: number, b: number): number {
  const [hi, lo] = a > b ? [a, b] : [b, a]
  return (hi + 0.05) / (lo + 0.05)
}

/** The wash the header lays over its art band is never lighter than this,
 *  whatever the maths asks for: a page whose own text barely reads on its own
 *  ground would otherwise drive the wash to nothing. It is the strength the
 *  wash always had. */
const VEIL_FLOOR = 0.35
/** The contrast the words are held to: a body line is small text, so 4.5:1,
 *  not 3:1 - and a twentieth of a point above it, for the same reason the ink
 *  is derived a twentieth above (Artboard.tsx INK_RATIO). The composite this
 *  wash makes is painted by the browser and by the PDF painter, each rounding
 *  its own way, and the sweep measured a wash derived at exactly 4.5 landing
 *  at 4.47-4.49 on the file. The headroom costs a hundredth of a wash. */
const VEIL_TARGET = 4.55

/** How strong the wash a header lays over its art band has to be: the
 *  SMALLEST strength of the page's own colour that still leaves `text` at
 *  4.5:1 over every ground the art puts under the words (the light and dark
 *  extremes of its palette, headerStyles.tsx). A flat wash rather than a
 *  fade, because the painter drops any gradient with a translucent stop
 *  (paint.ts registerAxialShading) and a wash the PDF cannot draw is a page
 *  the export does not match - but its STRENGTH is derived, so the art is
 *  never lighter than the words need, and never heavier. No grounds (a
 *  document carrying no band) asks nothing, and takes the floor. */
export function veilAlpha(page: string, text: string, grounds: string[], floor: number = VEIL_FLOOR): number {
  const wash = hexChannels(page)
  const ink = hexChannels(text)
  if (!wash || !ink) return floor
  const l = luminance(ink)
  const reads = (a: number) =>
    grounds.every((g) => {
      const art = hexChannels(g)
      if (!art) return true
      // Rounded, like darkenToContrast: the composite is painted in whole
      // channels, so a strength that only reads before rounding is a
      // strength that does not read.
      const mixed = art.map((v, i) => Math.round(a * wash[i] + (1 - a) * v)) as [number, number, number]
      return contrast(luminance(mixed), l) >= VEIL_TARGET
    })
  // A hundredth at a time, from the floor up: the first strength that reads
  // is the answer. Fully opaque is tried too - a wash of the ACCENT carries
  // an ink derived against the accent by construction, so that case has an
  // answer and it is the last hundredth - but a wash that reads at NO
  // strength ends at 0.99 rather than erasing the art altogether, because a
  // page whose own colour cannot carry its own text is not a page the art
  // can fix.
  for (let step = Math.round(floor * 100); step <= 100; step++) if (reads(step / 100)) return step / 100
  return 0.99
}

/** The contrast a word is held to: small text, so 4.5:1. */
const INK_TARGET = 4.5

/** How much better than a design's OWN ink a derived one has to measure
 *  before it is worth taking, when neither of them reaches the target.
 *
 *  A derivation that cannot reach the target is not a rescue; it is a
 *  restyling, and it should only happen when the restyling BUYS something. A
 *  twentieth of a point is the width of the disagreement between this
 *  arithmetic and the file: the model mixes in floats and the painter in
 *  whole channels, which is the whole reason the callers ask for 4.55 when
 *  they need 4.5 (Artboard.tsx INK_RATIO). A gain smaller than that is a gain
 *  nothing can measure - and it cost one design its signature: white on a
 *  purple banner flipped to pure BLACK for nine thousandths of a point, and
 *  measured WORSE on the file than the white it replaced. */
const INK_GAIN_MIN = 0.05

/** The accessibility contrast ratio of two colours, for a caller that needs
 *  to ask how a derivation came out - the Design panel telling a person what
 *  the pair they just picked measures, or a header asking whether its own
 *  second stop is still one its words can stand on. 1 for anything that is
 *  not a hex colour, which is the answer that reads as "cannot tell". */
export function contrastRatio(a: string, b: string): number {
  const ca = hexChannels(a)
  const cb = hexChannels(b)
  if (!ca || !cb) return 1
  return contrast(luminance(ca), luminance(cb))
}

/** The worst this ink does anywhere on a ground of several colours. */
export function contrastOn(ink: string, grounds: string[]): number {
  const gs = grounds.filter((g) => hexChannels(g))
  if (!gs.length) return 1
  return Math.min(...gs.map((g) => contrastRatio(ink, g)))
}

/**
 * The accent as INK.
 *
 * An accent is chosen to be a COLOUR - a rule, a band, a chip's ground, a
 * spine - and every design's accent was picked for that job. Set as small
 * TEXT it has a second job, and it is the job it keeps failing: the same
 * sky blue that reads as a confident hairline reads at 2.46:1 as a word.
 *
 * So the accent itself is never touched. This derives the ink the words are
 * set in: `color` moved toward black on a light `background`, or toward
 * white on a dark one, by the SMALLEST hundredth of the way that reaches
 * `ratio`. A colour that already reads comes back exactly as it was, which
 * is most of them - the ink is a correction, not a restyling.
 *
 * Both ends are considered, so a dark page lightens rather than darkening
 * into its own ground; and because the search runs at render time the ink
 * follows an accent chosen in the Design panel as readily as a design's own.
 */
export function darkenToContrast(color: string, background: string, ratio: number = INK_TARGET): string {
  const ink = hexChannels(color)
  const ground = hexChannels(background)
  if (!ink || !ground) return color
  const lg = luminance(ground)
  if (contrast(luminance(ink), lg) >= ratio) return color
  // Whichever extreme this ground can carry further: black on a light page,
  // white on a dark one. At 4.5:1 one of the two always reaches.
  const target: [number, number, number] = contrast(0, lg) >= contrast(1, lg) ? [0, 0, 0] : [255, 255, 255]
  // A hundredth at a time, and the channels are ROUNDED before the ratio is
  // read: the page is painted in whole channels, so a step that only reads
  // before rounding is a step that does not read.
  for (let step = 1; step <= 100; step++) {
    const t = step / 100
    const mixed = ink.map((v, i) => Math.round(v + (target[i] - v) * t)) as [number, number, number]
    if (contrast(luminance(mixed), lg) >= ratio) return `#${mixed.map(channelHex).join('')}`
  }
  return `#${target.map(channelHex).join('')}`
}

/**
 * The words that stand ON a colour: a filled heading, a monogram badge, a
 * banner, a block or band or stepped header.
 *
 * Two candidates are offered - white, and `dark` (the document's own text
 * colour) - and the better of the two on `bg` is taken, which is what keeps
 * a design's character: a page whose ink is a warm near-black keeps that
 * near-black on its pale accent rather than flipping to flat black.
 *
 * Choosing the BETTER of two is not the same as choosing one that READS,
 * though, and that was the defect: on a light accent over a dark page both
 * candidates are light, so the better of them was white on gold at 1.78:1.
 * So the winner is then carried the rest of the way, which leaves it exactly
 * as it was when it already reads - which is most of the time - and otherwise
 * moves it the smallest hundredth that does. A ground of ONE colour always
 * has one extreme that reaches 4.5:1 (the worst ground any colour can be,
 * luminance 0.179, still carries black at 4.59:1), so this has no failing
 * case; `readableOnAll` below, which takes a ground of several, can.
 */
export function readableOn(bg: string, dark: string = '#1a1a1a', ratio: number = INK_TARGET): string {
  return readableOnAll([bg], dark, ratio)
}

/**
 * The colours a two-stop fade actually puts under a word.
 *
 * A lerp in sRGB is not a lerp in luminance: the middle of a fade between two
 * colours of the same lightness is DARKER than either end - creative's banner
 * runs from luminance 0.180 to 0.182 and passes through 0.175 - so the ground
 * a word sits on halfway along a band is not either of its two stops, and an
 * ink derived against the stops alone measured 4.2:1 in the middle. Nine
 * samples, both ends included.
 */
export function gradientGrounds(a: string, b: string, steps: number = 8): string[] {
  const out: string[] = []
  for (let i = 0; i <= steps; i++) out.push(mix(a, b, 1 - i / steps))
  return out
}

/**
 * The same, for a ground with more than one colour in it.
 *
 * A header is rarely one flat colour: a band fades from the accent to a
 * second stop, and two designs paint their banner as the accent mixed with a
 * colour of their own. One ink stands on all of it, so it has to read on all
 * of it - deriving against the accent alone derived against a ground the
 * header never draws, and on a mid-tone accent that flipped the ink to a
 * near-black which then measured 4.2:1 on the stop the header does draw.
 */
export function readableOnAll(grounds: string[], dark: string = '#1a1a1a', ratio: number = INK_TARGET): string {
  const lums = groundLums(grounds)
  if (!lums.length) return '#ffffff'
  const darkHex = hexChannels(dark) ? dark : '#1a1a1a'
  const worst = worstOn(lums)
  const white: [number, number, number] = [255, 255, 255]
  const darkC = hexChannels(darkHex) as [number, number, number]
  // The better of the two candidates on this ground, which is what keeps a
  // design's character - and then, if it does not read, the walk below.
  const best = worst(white) >= worst(darkC) ? white : darkC
  return walkToContrast(best, lums, ratio)
}

/**
 * The same walk, starting from a colour SOMEONE CHOSE rather than from white
 * or the document's ink - `darkenToContrast` over a ground of several colours.
 *
 * A template's own name colour, or one an author picked in the Design panel,
 * was chosen for the page. Set in a header that paints its own ground it is
 * standing on a colour it was never chosen for, and a blue that reads
 * perfectly well on white measured 1.08:1 on a band. The choice is still
 * theirs, so it is not discarded: it is carried the smallest distance that
 * makes it read, exactly as the accent is everywhere else. A colour that
 * already reads on the band comes back untouched.
 */
export function darkenToContrastAll(color: string, grounds: string[], ratio: number = INK_TARGET): string {
  const ink = hexChannels(color)
  const lums = groundLums(grounds)
  if (!ink || !lums.length) return color
  return walkToContrast(ink, lums, ratio)
}

/** The luminance of every ground that is a colour at all. */
function groundLums(grounds: string[]): number[] {
  return (grounds.map(hexChannels).filter(Boolean) as [number, number, number][]).map(luminance)
}

/** The worst a candidate ink does anywhere on a ground of several colours. */
function worstOn(lums: number[]) {
  return (c: [number, number, number]) => {
    const l = luminance(c)
    return Math.min(...lums.map((g) => contrast(l, g)))
  }
}

/**
 * `start` carried toward black or toward white by the smallest hundredth that
 * reaches `ratio` on EVERY ground at once - the walk `darkenToContrast` does,
 * over a ground of several colours, and in whole channels because the page is
 * painted in whole channels.
 *
 * A colour that already reads comes back exactly as it was, which is most of
 * them: this is a correction, not a restyling.
 *
 * A ground of ONE colour always has an answer. A ground of SEVERAL need not: a
 * gradient whose two ends sit either side of the middle of the range leaves
 * every ink poor on one end or the other, and the best any ink can do there
 * may be 4.53:1. So the walk keeps the best it has seen and answers with that
 * when nothing reaches - never with an extreme that is WORSE than where it
 * started, which is how a header asked to clear 4.55:1 ended up with a
 * near-black that measured 4.2:1.
 *
 * And never with one that is barely BETTER, either. When nothing reaches, the
 * walk is no longer rescuing a word - every answer it can give is a word that
 * falls short - so the only reason to leave the ink the design chose is a gain
 * big enough to be worth the change. On a purple banner white measured
 * 4.517:1 over the fade and flat black 4.526:1, and for those nine thousandths
 * the whole signature of the design flipped from white on purple to BLACK on
 * purple - and then measured LOWER on the file than the white it replaced,
 * because the file's ground is the stop under the words and not the worst stop
 * of the fade. A gain has to clear INK_GAIN_MIN, the width of the
 * disagreement between this arithmetic and the painter's, or the ink the
 * design chose stands.
 */
function walkToContrast(start: [number, number, number], lums: number[], ratio: number): string {
  const worst = worstOn(lums)
  const startWorst = worst(start)
  if (startWorst >= ratio) return `#${start.map(channelHex).join('')}`
  const black: [number, number, number] = [0, 0, 0]
  const white: [number, number, number] = [255, 255, 255]
  let bestSeen = start
  let bestWorst = startWorst
  for (let step = 1; step <= 100; step++) {
    const t = step / 100
    for (const target of [black, white]) {
      const mixed = start.map((v, i) => Math.round(v + (target[i] - v) * t)) as [number, number, number]
      const w = worst(mixed)
      if (w >= ratio) return `#${mixed.map(channelHex).join('')}`
      if (w > bestWorst) {
        bestWorst = w
        bestSeen = mixed
      }
    }
  }
  return `#${(bestWorst >= startWorst + INK_GAIN_MIN ? bestSeen : start).map(channelHex).join('')}`
}
