export interface Rgba { r: number; g: number; b: number; a: number }

/** getComputedStyle always resolves to rgb()/rgba() — including color-mix(). */
export function parseColor(css: string): Rgba | null {
  const m = (css || '').match(/rgba?\(([^)]+)\)/)
  if (!m) return null
  const parts = m[1].split(/[,\s/]+/).filter(Boolean).map(Number)
  if (parts.length < 3 || parts.slice(0, 3).some(Number.isNaN)) return null
  return { r: parts[0] / 255, g: parts[1] / 255, b: parts[2] / 255, a: parts.length > 3 ? parts[3] : 1 }
}

export function parseFontWeight(css: string): number {
  const s = (css || '').trim()
  if (s === 'bold') return 700
  if (s === 'normal' || s === '') return 400
  const n = parseInt(s, 10)
  return Number.isFinite(n) ? n : 400
}

export const parsePx = (css: string): number => parseFloat(css || '0') || 0
