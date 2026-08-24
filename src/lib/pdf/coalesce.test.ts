import { describe, expect, it } from 'vitest'
import { coalesceTextOps } from './coalesce'
import type { DrawOp, TextRun } from './types'

const RUN: TextRun = {
  text: 'x',
  xPx: 0,
  widthPx: 10,
  baselinePx: 100,
  sizePx: 12,
  family: 'Inter',
  weight: 400,
  italic: false,
  color: { r: 0, g: 0, b: 0, a: 1 },
  letterSpacingPx: 0,
  smallCapsScale: 0,
  isDecorative: false,
}

const op = (text: string, xPx: number, widthPx: number, over: Partial<TextRun> = {}, rest: Partial<Extract<DrawOp, { kind: 'text' }>> = {}): DrawOp => ({
  kind: 'text',
  run: { ...RUN, ...over, text, xPx, widthPx },
  role: 'P',
  column: 'main',
  blockId: 1,
  ...rest,
})

const texts = (ops: DrawOp[]) => ops.filter((o) => o.kind === 'text').map((o) => (o as Extract<DrawOp, { kind: 'text' }>).run.text)

describe('coalesceTextOps', () => {
  it('joins runs that sit flush against each other on one baseline', () => {
    const out = coalesceTextOps([op('Architected an', 65, 57), op(' ', 122, 2), op('event-driven', 124, 47)])
    expect(texts(out)).toEqual(['Architected an event-driven'])
    const run = (out[0] as Extract<DrawOp, { kind: 'text' }>).run
    expect(run.xPx).toBe(65)
    expect(run.widthPx).toBeCloseTo(106, 5) // 124 + 47 - 65
  })

  it('keeps runs separated by a real gap apart — that gap is a column, not a word space', () => {
    const out = coalesceTextOps([op('Engineer Role 7', 56, 90), op('Mar 2021', 486, 60)])
    expect(texts(out)).toEqual(['Engineer Role 7', 'Mar 2021'])
  })

  it('never joins across a baseline, a style change, or a different logical block', () => {
    expect(texts(coalesceTextOps([op('a', 0, 10), op('b', 10, 10, { baselinePx: 120 })]))).toEqual(['a', 'b'])
    expect(texts(coalesceTextOps([op('a', 0, 10), op('b', 10, 10, { weight: 700 })]))).toEqual(['a', 'b'])
    expect(texts(coalesceTextOps([op('a', 0, 10), op('b', 10, 10, {}, { blockId: 2 })]))).toEqual(['a', 'b'])
  })

  it('leaves non-text ops and their order alone', () => {
    const rect = { kind: 'rect', xPx: 0, yPx: 0, wPx: 5, hPx: 5, fill: RUN.color } as unknown as DrawOp
    const out = coalesceTextOps([op('a', 0, 10), rect, op('b', 10, 10)])
    expect(out).toHaveLength(3)
    expect(texts(out)).toEqual(['a', 'b'])
  })
})
