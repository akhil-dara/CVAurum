import { describe, expect, it } from 'vitest'
import { createDocument } from '@/data/defaults'
import { applyTemplateToMetadata } from '@/lib/templateApply'
import { TEMPLATES, getTemplate } from '@/templates/registry'
import { applyDensity, densityOf } from './density'

const on = (id: string) => applyTemplateToMetadata(createDocument({ sample: true }).metadata, getTemplate(id).defaults)

describe('page density, one choice for five values', () => {
  it('reads a design as it ships as balanced, on every design', () => {
    for (const t of TEMPLATES) expect(densityOf(on(t.id), t.defaults), t.id).toBe('balanced')
  })

  it('makes compact tighter and airy roomier than balanced on all five values', () => {
    const t = getTemplate('modern')
    const c = on('modern')
    const a = on('modern')
    applyDensity(c, 'compact', t.defaults)
    applyDensity(a, 'airy', t.defaults)
    const b = on('modern')
    expect(c.typography.fontSize).toBeLessThan(b.typography.fontSize)
    expect(a.typography.fontSize).toBeGreaterThan(b.typography.fontSize)
    expect(c.typography.lineHeight).toBeLessThan(b.typography.lineHeight)
    expect(c.layout.sectionGap).toBeLessThan(b.layout.sectionGap)
    expect(a.layout.itemGap).toBeGreaterThan(b.layout.itemGap)
    expect(c.page.margin).toBeLessThan(b.page.margin)
    expect(a.page.margin).toBeGreaterThan(b.page.margin)
  })

  it('reads back the density it set, and custom once a value is tuned by hand', () => {
    const t = getTemplate('sapphire')
    const m = on('sapphire')
    applyDensity(m, 'compact', t.defaults)
    expect(densityOf(m, t.defaults)).toBe('compact')
    m.typography.fontSize += 0.25
    expect(densityOf(m, t.defaults)).toBe('custom')
    applyDensity(m, 'airy', t.defaults)
    expect(densityOf(m, t.defaults)).toBe('airy')
  })

  it('touches nothing but the five values it names', () => {
    const t = getTemplate('broadsheet')
    const m = on('broadsheet')
    const before = JSON.stringify({ ...m, typography: { ...m.typography, fontSize: 0, lineHeight: 0 }, layout: { ...m.layout, sectionGap: 0, itemGap: 0 }, page: { ...m.page, margin: 0 } })
    applyDensity(m, 'airy', t.defaults)
    const after = JSON.stringify({ ...m, typography: { ...m.typography, fontSize: 0, lineHeight: 0 }, layout: { ...m.layout, sectionGap: 0, itemGap: 0 }, page: { ...m.page, margin: 0 } })
    expect(after).toBe(before)
  })
})
