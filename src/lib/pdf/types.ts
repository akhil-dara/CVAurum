import type { Rgba } from './style'

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
