import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { portrait } from './avatar'
import { brandmark } from './brandmark'

/**
 * Both of these pick their colours by indexing a palette with a shifted hash,
 * and `>>` coerces to a SIGNED 32-bit integer first: every hash above 2^31 —
 * about half of them — shifted negative, `% length` stayed negative, the
 * lookup returned undefined, and the SVG fell back to black. On the drawn
 * portraits that produced a black disc with a face floating on it, the hair
 * and shoulders swallowed whole; six of the first twenty-four names in the
 * library were drawn that way before it was caught by eye.
 *
 * So the invariant is checked against the names the library actually holds,
 * rather than against a handful of made-up ones that might all hash small.
 */

const NAMES: string[] = (() => {
  const dir = join(__dirname, 'samples')
  const out: string[] = []
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.ts'))) {
    const m = readFileSync(join(dir, f), 'utf8').match(/\n {6}name: '([^']+)',/)
    if (m) out.push(m[1])
  }
  return out
})()

/** The colours an SVG data URI actually asks for. */
function fills(uri: string): string[] {
  const svg = decodeURIComponent(uri.replace('data:image/svg+xml;utf8,', ''))
  return [...svg.matchAll(/(?:fill|stroke)="([^"]*)"/g)].map((m) => m[1])
}

describe('the drawn portraits', () => {
  it('has names to check against', () => {
    expect(NAMES.length).toBeGreaterThan(50)
  })

  it('never asks for a colour the palette does not hold', () => {
    const bad: string[] = []
    for (const name of NAMES) {
      for (const fill of fills(portrait(name))) {
        // "none" is a real value on the glasses; everything else must be a hex
        // colour. `undefined` or an empty string is the signed-shift bug.
        if (fill !== 'none' && !/^#[0-9a-f]{6}$/i.test(fill)) bad.push(`${name}: ${fill || '(empty)'}`)
      }
    }
    expect(bad).toEqual([])
  })

  it('draws a face, hair, shoulders and a backdrop every time', () => {
    for (const name of NAMES) {
      const svg = decodeURIComponent(portrait(name).replace('data:image/svg+xml;utf8,', ''))
      expect(svg, name).toContain('<ellipse') // the head
      expect(svg, name).toContain('<path') // hair and shoulders
      expect(svg.startsWith('<svg'), name).toBe(true)
    }
  })

  it('gives the same name the same face every time', () => {
    expect(portrait('Ananya Deshpande')).toBe(portrait('Ananya Deshpande'))
    expect(portrait('Ananya Deshpande')).not.toBe(portrait('Ananya Deshmukh'))
  })

  it('spreads the faces across the palettes rather than drawing one person', () => {
    // A hash that collapsed would leave one face repeated a hundred times.
    expect(new Set(NAMES.map((n) => portrait(n))).size).toBeGreaterThan(NAMES.length * 0.8)
  })
})

describe('the drawn brandmarks', () => {
  it('never asks for a colour the palette does not hold', () => {
    const bad: string[] = []
    for (const name of NAMES) {
      for (const fill of fills(brandmark(name))) {
        if (fill !== 'none' && !/^#[0-9a-f]{6}$/i.test(fill)) bad.push(`${name}: ${fill || '(empty)'}`)
      }
    }
    expect(bad).toEqual([])
  })

  it('gives the same company the same mark every time', () => {
    expect(brandmark('Northbank Payments')).toBe(brandmark('Northbank Payments'))
  })
})
