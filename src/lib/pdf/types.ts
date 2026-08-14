import type { Rgba } from './style'

/**
 * getComputedStyle can serialize a `color-mix()` result as the CSS Color 4
 * `color(srgb r g b / a)` function (0–1 channels) instead of rgb()/rgba() —
 * Chromium does this whenever one side of the mix is `transparent`, which is
 * exactly how our chip/dot/meter/pill/badge tints and several muted-text
 * colors are authored (`color-mix(in srgb, X 12%, transparent)`). style.ts's
 * `parseColor` only recognises rgb()/rgba(), so those backgrounds and text
 * colors were being read as `null` and silently dropped rather than drawn.
 * Shared by walk.ts (backgrounds/borders) and text.ts (text color) as a
 * fallback after `parseColor` returns null.
 */
export function parseCssColorFunction(css: string): Rgba | null {
  const m = (css || '').match(/^color\(\s*srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+)(%)?)?\s*\)$/i)
  if (!m) return null
  const a = m[4] === undefined ? 1 : m[5] ? Number(m[4]) / 100 : Number(m[4])
  return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]), a }
}

export interface TextRun {
  text: string; xPx: number; baselinePx: number; sizePx: number
  family: string; weight: number; italic: boolean; color: Rgba; letterSpacingPx: number
}

export type DrawOp =
  | { kind: 'rect'; xPx: number; yPx: number; wPx: number; hPx: number; fill?: Rgba; radiusPx?: number }
  | { kind: 'line'; x1Px: number; y1Px: number; x2Px: number; y2Px: number; widthPx: number; color: Rgba; dashed?: boolean }
  | { kind: 'image'; xPx: number; yPx: number; wPx: number; hPx: number; src: string; radiusPx?: number }
  | { kind: 'svg'; xPx: number; yPx: number; wPx: number; hPx: number; d: string; stroke?: Rgba; fill?: Rgba; strokeWidthPx: number; viewBox: [number, number, number, number] }
  | { kind: 'text'; run: TextRun }
