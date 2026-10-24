import type { Metadata } from '@/types/metadata'
import type { TemplateDefaults } from '@/types/template'

/**
 * How much air a page has, as one choice: compact, balanced or airy.
 *
 * Text size, line height, the space between sections and between entries,
 * and the page margins were five sliders an author had to move together to
 * make a page denser or roomier, and moved one at a time they fought each
 * other (2026-10-24). A density sets all five at once - measured from the
 * DESIGN's own values, so "balanced" is the design as it ships and the other
 * two scale it the same way on every design. The sliders stay: a page tuned
 * by hand reads as "custom", and a density gives back a clean set.
 */
export type Density = 'compact' | 'balanced' | 'airy'

interface Scale {
  /** points added to the body size */
  size: number
  lineHeight: number
  gaps: number
  margin: number
}

export const DENSITY: Record<Density, Scale> = {
  compact: { size: -0.5, lineHeight: 0.93, gaps: 0.7, margin: 0.8 },
  balanced: { size: 0, lineHeight: 1, gaps: 1, margin: 1 },
  airy: { size: 0.5, lineHeight: 1.07, gaps: 1.3, margin: 1.15 },
}

const r2 = (n: number) => Math.round(n * 100) / 100
const r1 = (n: number) => Math.round(n * 10) / 10

/** The five values a density sets, for one design. */
function valuesFor(level: Density, d: TemplateDefaults, marginBase: number) {
  const s = DENSITY[level]
  return {
    fontSize: r1(d.typography.fontSize + s.size),
    lineHeight: r2(d.typography.lineHeight * s.lineHeight),
    sectionGap: r1(d.layout.sectionGap * s.gaps),
    itemGap: r1(d.layout.itemGap * s.gaps),
    margin: Math.round(marginBase * s.margin),
  }
}

/** Sets a density on the document, from its design's own values. */
export function applyDensity(m: Metadata, level: Density, d: TemplateDefaults, marginBase = 13): void {
  const v = valuesFor(level, d, marginBase)
  m.typography.fontSize = v.fontSize
  m.typography.lineHeight = v.lineHeight
  m.layout.sectionGap = v.sectionGap
  m.layout.itemGap = v.itemGap
  m.page.margin = v.margin
}

/** Which density the document is at, or 'custom' when the values were
 *  tuned by hand to something none of them sets. */
export function densityOf(m: Metadata, d: TemplateDefaults, marginBase = 13): Density | 'custom' {
  for (const level of ['compact', 'balanced', 'airy'] as const) {
    const v = valuesFor(level, d, marginBase)
    if (
      Math.abs(m.typography.fontSize - v.fontSize) < 0.05 &&
      Math.abs(m.typography.lineHeight - v.lineHeight) < 0.005 &&
      Math.abs(m.layout.sectionGap - v.sectionGap) < 0.05 &&
      Math.abs(m.layout.itemGap - v.itemGap) < 0.05 &&
      Math.abs(m.page.margin - v.margin) < 0.5
    )
      return level
  }
  return 'custom'
}
