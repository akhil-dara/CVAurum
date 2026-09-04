import { describe, it, expect } from 'vitest'
import { DESIGN_RANGES } from './designRanges'
import { PageSchema, TypographySchema, LayoutSchema } from '@/types/metadata'
import type { ZodDefault, ZodNumber } from 'zod'

/**
 * The Design panel's sliders used to carry their own min/max, narrower than
 * the schema's on every axis (font size 8-14 against 7-16, margins 6-30
 * against 0-40), so a value the document accepts could not be reached from
 * the panel. The ranges now come from one place, and this pins that place to
 * the schema.
 */
const bounds = (field: ZodDefault<ZodNumber>) => {
  const n = field.removeDefault()
  return { min: n.minValue, max: n.maxValue }
}

describe('design panel ranges match the schema', () => {
  it('typography', () => {
    const t = TypographySchema.shape
    expect(DESIGN_RANGES.fontSize).toMatchObject(bounds(t.fontSize))
    expect(DESIGN_RANGES.lineHeight).toMatchObject(bounds(t.lineHeight))
    expect(DESIGN_RANGES.letterSpacing).toMatchObject(bounds(t.letterSpacing))
    expect(DESIGN_RANGES.headingScale).toMatchObject(bounds(t.headingScale))
    expect(DESIGN_RANGES.bulletIndent).toMatchObject(bounds(t.bulletIndent))
    expect(DESIGN_RANGES.bulletGap).toMatchObject(bounds(t.bulletGap))
    expect(DESIGN_RANGES.sectionTitleScale).toMatchObject(bounds(t.sectionTitleScale))
    expect(DESIGN_RANGES.headlineScale).toMatchObject(bounds(t.headlineScale))
    expect(DESIGN_RANGES.contactScale).toMatchObject(bounds(t.contactScale))
    expect(DESIGN_RANGES.headingGap).toMatchObject(bounds(t.headingGap))
  })

  it('layout and page', () => {
    const l = LayoutSchema.shape
    expect(DESIGN_RANGES.sectionGap).toMatchObject(bounds(l.sectionGap))
    expect(DESIGN_RANGES.itemGap).toMatchObject(bounds(l.itemGap))
    expect(DESIGN_RANGES.sidebarWidth).toMatchObject(bounds(l.sidebarWidth))
    expect(DESIGN_RANGES.margin).toMatchObject(bounds(PageSchema.shape.margin))
  })

  it('reaches the full documented span, with a finite step on every axis', () => {
    expect(DESIGN_RANGES.fontSize).toEqual({ min: 7, max: 16, step: 0.25 })
    expect(DESIGN_RANGES.margin).toEqual({ min: 0, max: 40, step: 1 })
    for (const r of Object.values(DESIGN_RANGES)) {
      expect(Number.isFinite(r.min)).toBe(true)
      expect(Number.isFinite(r.max)).toBe(true)
      expect(r.step).toBeGreaterThan(0)
      expect(r.max).toBeGreaterThan(r.min)
    }
  })
})
