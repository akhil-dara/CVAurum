import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { FOLIO_ICON_KINDS, FolioIcon, folioGlyph, folioIconKind } from './folioIcons'

// The PDF painter (walk.ts svgIconOps) refuses any inline <svg> whose viewBox
// does not start at 0 0 - it emits no op at all, so the chip would paint as an
// empty square in every export while looking fine on the canvas. The glyph
// table is authored in its source coordinate space, with non-zero origins, so
// the module has to normalise it once at load. These tests pin that contract
// from both sides: the rendered markup the walker reads, and the shifted path
// data behind it.

const VIEWBOX_RE = /viewBox="([^"]+)"/g
const NUMBER_RE = /-?\d*\.?\d+/g

describe('folio glyphs - viewBox origin (the painter gate at walk.ts svgIconOps)', () => {
  it('renders every kind with every svg viewBox starting at 0 0', () => {
    for (const kind of FOLIO_ICON_KINDS) {
      const html = renderToStaticMarkup(createElement(FolioIcon, { kind }))
      const boxes = Array.from(html.matchAll(VIEWBOX_RE), (m) => m[1])
      expect(boxes.length, `${kind} renders at least one svg`).toBeGreaterThan(0)
      for (const vb of boxes) {
        const [x, y, w, h] = vb.trim().split(/[\s,]+/).map(Number)
        expect([x, y], `${kind} viewBox origin`).toEqual([0, 0])
        expect(w, `${kind} viewBox width`).toBeGreaterThan(0)
        expect(h, `${kind} viewBox height`).toBeGreaterThan(0)
      }
    }
  })

  it('shifts the path data along with the viewBox so every coordinate lies inside the box', () => {
    // A viewBox rewritten without moving the paths would pass the origin
    // check and still draw the glyph off-canvas; the coordinates have to
    // land inside the (now zero-based) box.
    for (const kind of FOLIO_ICON_KINDS) {
      const g = folioGlyph(kind)
      const [, , w, h] = g.viewBox.split(/[\s,]+/).map(Number)
      for (const piece of g.pieces) {
        const nums = Array.from(piece.d.matchAll(NUMBER_RE), (m) => Number(m[0]))
        expect(nums.length % 2, `${kind} pairs coordinates`).toBe(0)
        for (let i = 0; i < nums.length; i += 2) {
          expect(nums[i], `${kind} x`).toBeGreaterThanOrEqual(-0.05)
          expect(nums[i], `${kind} x`).toBeLessThanOrEqual(w + 0.05)
          expect(nums[i + 1], `${kind} y`).toBeGreaterThanOrEqual(-0.05)
          expect(nums[i + 1], `${kind} y`).toBeLessThanOrEqual(h + 0.05)
        }
      }
    }
  })

  it('keeps the glyphs square and keeps only absolute M/L/C/z commands', () => {
    for (const kind of FOLIO_ICON_KINDS) {
      const g = folioGlyph(kind)
      const [, , w, h] = g.viewBox.split(/[\s,]+/).map(Number)
      expect(w, `${kind} square`).toBeCloseTo(h, 5)
      for (const piece of g.pieces) {
        expect(piece.d.replace(NUMBER_RE, '').replace(/[\sMLCz]/g, ''), `${kind} commands`).toBe('')
      }
    }
  })

  it('maps custom and unknown section keys to the summary glyph', () => {
    expect(folioIconKind('custom:abc')).toBe('summary')
    expect(folioIconKind('nonsense')).toBe('summary')
    expect(folioIconKind('work')).toBe('work')
  })
})
