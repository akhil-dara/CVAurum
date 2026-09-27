import { describe, expect, it } from 'vitest'
import { defaultMetadata } from '@/data/defaults'
import { autoFloorPt, fitRulesOf } from './fitReadout'
import { typeFloor } from './fitOnePage'
import type { Metadata } from '@/types/metadata'

/**
 * Smart fit (2026-09-26): a new résumé prints at the size set and fits only
 * to save a nearly empty last page, never below its own floor; an author's
 * minimum is exact; a saved résumé fits exactly as it always did.
 */
const meta = (fit: Partial<Metadata['page']['fit']>, fontSize = 9.6): Metadata => {
  const m = defaultMetadata()
  m.typography.fontSize = fontSize
  Object.assign(m.page.fit, fit)
  return m
}

describe('typeFloor prints a floor at or above itself', () => {
  it('for every set size 7-16pt and floors 8.5 and 9', () => {
    for (let s = 70; s <= 160; s++) {
      for (const f of [8.5, 9]) {
        if (f > s / 10) continue
        expect(typeFloor({ minBody: f, fontSize: s / 10 }) * (s / 10)).toBeGreaterThanOrEqual(f - 1e-9)
      }
    }
  })
})

describe('fitRulesOf', () => {
  it('Auto: its own floor min(set, max(9, 0.94 x set)), a spacing floor of 0.80, no growth', () => {
    const r = fitRulesOf(meta({ mode: 'auto', minBodyBy: 'app', minBody: null }))
    expect(r.auto).toBe(true)
    expect(r.grow).toBe(false)
    expect(r.spaceMin).toBe(0.8)
    expect(r.minBody).toBeCloseTo(9.02, 2) // 6% below 9.6pt
    expect(autoFloorPt(9.4)).toBe(9)
    expect(autoFloorPt(11)).toBeCloseTo(10.34, 2)
    expect(autoFloorPt(8.8)).toBe(8.8)
  })

  it('a floor the app chose never raises text set small', () => {
    expect(fitRulesOf(meta({ mode: 'auto', minBodyBy: 'app', minBody: null }, 8)).minBody).toBe(8)
    expect(fitRulesOf(meta({ mode: 'pages', minBodyBy: 'app', minBody: null }, 8)).minBody).toBe(8)
  })

  it('a page count on a new résumé: floor min(set, 8.5), no growth', () => {
    const r = fitRulesOf(meta({ mode: 'pages', minBodyBy: 'app', minBody: null, target: 1 }))
    expect(r.minBody).toBe(8.5)
    expect(r.grow).toBe(false)
    expect(r.auto).toBe(false)
  })

  it('an author floor is exact in every mode, even above the size set', () => {
    expect(fitRulesOf(meta({ mode: 'auto', minBodyBy: 'author', minBody: 9 })).minBody).toBe(9)
    expect(fitRulesOf(meta({ mode: 'pages', minBodyBy: 'author', minBody: 11 }, 7.25)).minBody).toBe(11)
  })

  it('a saved résumé fits as it always did: no floor of its own (0.66 of the body), growth allowed', () => {
    const r = fitRulesOf(defaultMetadata())
    expect(r.minBody).toBeNull()
    expect(r.grow).not.toBe(false)
    expect(r.auto).toBe(false)
  })

  it('knows when a break is pinned and which page count the author kept', () => {
    const m = meta({ mode: 'auto', minBodyBy: 'app', minBody: null, keptPages: 2 })
    m.page.breaks = [{ section: 'work', itemId: 'x' }]
    const r = fitRulesOf(m)
    expect(r.pinned).toBe(true)
    expect(r.keptPages).toBe(2)
  })
})
