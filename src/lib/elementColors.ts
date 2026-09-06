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

/** The text colour that reads better on `bg`: white, or `dark` (the
 *  document's own text colour), by contrast ratio. A block or band header
 *  sets its name and contacts in this unless the author coloured them. A
 *  ground that cannot be read takes white, the colour a coloured header
 *  always drew its text in. */
export function readableOn(bg: string, dark: string = '#1a1a1a'): string {
  const ground = hexChannels(bg)
  if (!ground) return '#ffffff'
  const l = luminance(ground)
  const onDark = luminance(hexChannels(dark) ?? [26, 26, 26])
  return contrast(l, 1) >= contrast(l, onDark) ? '#ffffff' : dark
}
