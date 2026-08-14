export interface Rgba { r: number; g: number; b: number; a: number }

function parseRgbFunction(s: string): Rgba | null {
  const m = s.match(/^rgba?\(([^)]+)\)$/i)
  if (!m) return null
  const parts = m[1].split(/[,\s/]+/).filter(Boolean).map(Number)
  if (parts.length < 3 || parts.slice(0, 3).some(Number.isNaN)) return null
  return { r: parts[0] / 255, g: parts[1] / 255, b: parts[2] / 255, a: parts.length > 3 ? parts[3] : 1 }
}

/** `color(srgb R G B)` / `color(srgb R G B / A)` — the CSS Color 4 function
 *  Chromium's computed-style serializer emits for a `color-mix()` result
 *  whenever one side of the mix is `transparent` (0..1 float channels,
 *  though percentages are valid syntax too and tolerated here). */
function parseColorFunction(s: string): Rgba | null {
  const m = s.match(/^color\(\s*srgb\s+([\d.]+)(%)?\s+([\d.]+)(%)?\s+([\d.]+)(%)?(?:\s*\/\s*([\d.]+)(%)?)?\s*\)$/i)
  if (!m) return null
  const chan = (n: string, pct?: string) => (pct ? Number(n) / 100 : Number(n))
  return { r: chan(m[1], m[2]), g: chan(m[3], m[4]), b: chan(m[5], m[6]), a: m[7] === undefined ? 1 : chan(m[7], m[8]) }
}

function parseHexColor(s: string): Rgba | null {
  const m = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (!m) return null
  let hex = m[1]
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('')
  const n = parseInt(hex, 16)
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255, a: 1 }
}

// Last-resort fallback state: a lazily created 1x1 canvas 2d context (there's
// no DOM in the vitest unit-test environment — `canvasCtx` stays `null` there
// and every lookup short-circuits) plus a bounded memoization cache, since
// parseColor runs per element during a walk.
let canvasCtx: CanvasRenderingContext2D | null | undefined
const canvasColorCache = new Map<string, Rgba | null>()
const CANVAS_CACHE_LIMIT = 500

/** Anything parseColor's fast paths don't recognise (oklab()/oklch()/named
 *  colors/future syntax) — paint it onto an offscreen canvas and read
 *  `fillStyle` back. Browsers normalize any valid CSS color to `#rrggbb`
 *  (opaque) or `rgba(...)` (translucent) on that round-trip, which
 *  parseHexColor/parseRgbFunction can then read directly. `CSS.supports`
 *  rejects invalid input up front so an unparseable string can't silently
 *  keep the canvas's previous fillStyle. */
function normalizeViaCanvas(s: string): Rgba | null {
  if (canvasCtx === undefined) {
    canvasCtx = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d')
  }
  if (!canvasCtx || typeof CSS === 'undefined' || !CSS.supports?.('color', s)) return null
  canvasCtx.fillStyle = s
  const normalized = canvasCtx.fillStyle
  return normalized.startsWith('#') ? parseHexColor(normalized) : parseRgbFunction(normalized)
}

/**
 * Resolves a `getComputedStyle()` color string to `{r,g,b,a}` (0..1
 * channels). getComputedStyle does NOT always resolve to rgb()/rgba(): a
 * `color-mix()` result with a `transparent` side (our chip/dot/meter/pill/
 * badge tints and several muted-text colors are all authored as
 * `color-mix(in srgb, X N%, transparent)`) serializes as the CSS Color 4
 * `color(srgb ...)` function instead — Chromium-verified, not assumed (see
 * the task-13 report). Anything else unrecognized falls through to a last-
 * resort browser normalization (`normalizeViaCanvas`) rather than giving up,
 * so a future `oklch()`/named-color/etc. usage degrades gracefully instead
 * of silently dropping the color.
 */
export function parseColor(css: string): Rgba | null {
  const s = (css || '').trim()
  if (!s) return null
  const rgb = parseRgbFunction(s)
  if (rgb) return rgb
  const colorFn = parseColorFunction(s)
  if (colorFn) return colorFn
  if (canvasColorCache.has(s)) return canvasColorCache.get(s)!
  const resolved = normalizeViaCanvas(s)
  if (canvasColorCache.size >= CANVAS_CACHE_LIMIT) canvasColorCache.clear()
  canvasColorCache.set(s, resolved)
  return resolved
}

export function parseFontWeight(css: string): number {
  const s = (css || '').trim()
  if (s === 'bold') return 700
  if (s === 'normal' || s === '') return 400
  const n = parseInt(s, 10)
  return Number.isFinite(n) ? n : 400
}

export const parsePx = (css: string): number => parseFloat(css || '0') || 0
