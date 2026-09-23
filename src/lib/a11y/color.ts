/**
 * The colour maths the live contrast check is built on - every function here
 * takes numbers and returns numbers, so all of it is testable without a page.
 *
 * It measures what the PAGE paints, which is not the same question
 * elementColors.ts answers. That file derives ONE ink against ONE ground, in
 * hex, before anything is drawn. This file starts from what a browser hands
 * back: `rgba()` with an alpha, `color(srgb ...)`, a gradient string, a stack
 * of half-transparent layers over a page colour. The two agree where they
 * overlap, and a test holds them to it (color.test.ts).
 */

/** A colour as the page paints it: three channels 0..255 and an alpha 0..1. */
export type Rgba = [number, number, number, number]

const clampChannel = (v: number) => Math.min(255, Math.max(0, v))

/**
 * Any colour string a computed style can hand back, as channels.
 *
 * Chrome resolves `color-mix()`, a named colour and a hex to `rgb()` or
 * `rgba()` before a script ever sees them, so those need no case of their
 * own - but a hex is accepted anyway, because the SETTINGS this checker
 * names are stored as hex and the same parser reads both ends of the
 * comparison. `transparent` is a colour with no alpha, not a failure to
 * parse: a layer that is transparent contributes nothing and must not be
 * mistaken for a layer that could not be read.
 */
export function parseColor(input: string | null | undefined): Rgba | null {
  if (!input) return null
  const s = input.trim().toLowerCase()
  if (!s || s === 'none') return null
  if (s === 'transparent') return [0, 0, 0, 0]
  if (s.startsWith('#')) {
    let h = s.slice(1)
    if (/^[0-9a-f]{3,4}$/.test(h))
      h = h
        .split('')
        .map((c) => c + c)
        .join('')
    if (!/^[0-9a-f]{6}$/.test(h) && !/^[0-9a-f]{8}$/.test(h)) return null
    const n = [0, 2, 4, 6].map((i) => (i < h.length ? parseInt(h.slice(i, i + 2), 16) : 255))
    return [n[0], n[1], n[2], n[3] / 255]
  }
  // color(srgb 0.14 0.39 0.92 / 0.45) - the form a wide-gamut page reports
  if (s.startsWith('color(')) {
    const m = s.match(/color\(\s*srgb\s+([^)]*)\)/)
    if (!m) return null
    const [head, tail] = m[1].split('/')
    const n = head.trim().split(/\s+/).map(Number)
    if (n.length < 3 || n.some(Number.isNaN)) return null
    const a = tail === undefined ? 1 : parseAlpha(tail.trim())
    return [clampChannel(n[0] * 255), clampChannel(n[1] * 255), clampChannel(n[2] * 255), a]
  }
  const m = s.match(/rgba?\(([^)]*)\)/)
  if (!m) return null
  const parts = m[1]
    .replace(/\//g, ' ')
    .split(/[\s,]+/)
    .filter(Boolean)
  const n = parts.slice(0, 3).map((p) => (p.endsWith('%') ? (parseFloat(p) * 255) / 100 : parseFloat(p)))
  if (n.length < 3 || n.some(Number.isNaN)) return null
  const a = parts.length > 3 ? parseAlpha(parts[3]) : 1
  return [clampChannel(n[0]), clampChannel(n[1]), clampChannel(n[2]), a]
}

function parseAlpha(raw: string): number {
  const v = raw.endsWith('%') ? parseFloat(raw) / 100 : parseFloat(raw)
  return Number.isNaN(v) ? 1 : Math.min(1, Math.max(0, v))
}

/** The colour as `#rrggbb`, which is how a setting is stored and shown. */
export function toHex(c: Rgba): string {
  return '#' + [0, 1, 2].map((i) => Math.round(clampChannel(c[i])).toString(16).padStart(2, '0')).join('')
}

/** Relative luminance, as the accessibility contrast formula defines it. */
export function luminance(c: Rgba): number {
  const lin = (v: number) => {
    const s = clampChannel(v) / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2])
}

/** The contrast ratio of two painted colours. Alpha is ignored: by the time a
 *  ratio is taken both sides must already have been composited (`over`). */
export function ratio(a: Rgba, b: Rgba): number {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/** `src` painted over `dst`, the way a browser composites it. The result is
 *  opaque whenever `dst` is, which is the only case this checker composites:
 *  every stack starts from the page's own paper. */
export function over(src: Rgba, dst: Rgba): Rgba {
  const a = Math.min(1, Math.max(0, src[3]))
  if (a >= 0.999) return [src[0], src[1], src[2], 1]
  return [src[0] * a + dst[0] * (1 - a), src[1] * a + dst[1] * (1 - a), src[2] * a + dst[2] * (1 - a), 1]
}

/** The colour the page ROUNDS to. A composite is painted in whole channels,
 *  so a ratio read off the float is a ratio nothing draws - the same reason
 *  elementColors.ts rounds inside its search. */
export function quantise(c: Rgba): Rgba {
  return [Math.round(clampChannel(c[0])), Math.round(clampChannel(c[1])), Math.round(clampChannel(c[2])), c[3]]
}

/** `a` and `b` mixed, `t` of the way from `a` to `b`, in sRGB - the space a
 *  browser interpolates a plain gradient in. */
export function mixRgba(a: Rgba, b: Rgba, t: number): Rgba {
  const u = Math.min(1, Math.max(0, t))
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u, a[3] + (b[3] - a[3]) * u]
}
