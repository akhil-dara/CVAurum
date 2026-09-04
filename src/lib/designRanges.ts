/**
 * Slider bounds for the Design panel, read from the schema itself. The panel
 * used to carry its own min/max, narrower than the document's on every axis,
 * so a value a template could ship (or an imported file could carry) was out
 * of the author's reach. One source now; the step is the only panel choice.
 */
import { PageSchema, TypographySchema, LayoutSchema } from '@/types/metadata'
import type { ZodDefault, ZodNumber } from 'zod'

export interface DesignRange {
  min: number
  max: number
  step: number
}

function range(field: ZodDefault<ZodNumber>, step: number): DesignRange {
  const n = field.removeDefault()
  return { min: n.minValue ?? NaN, max: n.maxValue ?? NaN, step }
}

export const DESIGN_RANGES = {
  fontSize: range(TypographySchema.shape.fontSize, 0.25),
  lineHeight: range(TypographySchema.shape.lineHeight, 0.02),
  letterSpacing: range(TypographySchema.shape.letterSpacing, 0.005),
  headingScale: range(TypographySchema.shape.headingScale, 0.05),
  sectionTitleScale: range(TypographySchema.shape.sectionTitleScale, 0.02),
  headlineScale: range(TypographySchema.shape.headlineScale, 0.02),
  contactScale: range(TypographySchema.shape.contactScale, 0.02),
  headingGap: range(TypographySchema.shape.headingGap, 0.05),
  bulletIndent: range(TypographySchema.shape.bulletIndent, 0.05),
  bulletGap: range(TypographySchema.shape.bulletGap, 0.02),
  sectionGap: range(LayoutSchema.shape.sectionGap, 1),
  itemGap: range(LayoutSchema.shape.itemGap, 1),
  sidebarWidth: range(LayoutSchema.shape.sidebarWidth, 0.01),
  margin: range(PageSchema.shape.margin, 1),
} as const

/**
 * What a typed design box commits when the author leaves it.
 *
 * The box owns its text while it is being typed in: committing every
 * keystroke meant "1" on the way to "1.5" and "2" on the way to "25" each
 * landed on the document and reflowed the whole canvas, so a two-character
 * value was three documents. Nothing is committed until focus leaves (or
 * Enter says the value is finished), and then the number lands inside the
 * range. Text that is not a number at all - an empty box, a stray letter -
 * commits nothing, so the field keeps the value it had.
 */
export function commitTyped(raw: string, min: number, max: number): number | null {
  const v = parseFloat(raw)
  if (!Number.isFinite(v)) return null
  return Math.min(max, Math.max(min, v))
}
