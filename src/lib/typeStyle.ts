/**
 * The per-element type choices - how large the section titles, the headline
 * and the contact line sit against the body, how section titles are cased,
 * and how heavy the name and the headings are - resolved in one place for the
 * canvas and the Word export, so the two never disagree about a heading.
 */
import type { Typography } from '@/types/metadata'

export type HeadingCase = NonNullable<Typography['headingCase']>

/** CSS font-weight numbers for the three named weights. */
export const FONT_WEIGHTS = { bold: 700, regular: 400, light: 300 } as const

/** The name weights the panel offers. 'light' stays in the schema so a
 *  document that chose it still parses, but no bundled face is lighter than
 *  400 - the canvas falls back to the regular face and the PDF painter picks
 *  the nearest static one - so the button would draw exactly what Regular
 *  draws. It joins this list once a 300 face ships. */
export const OFFERED_WEIGHTS: readonly (keyof typeof FONT_WEIGHTS)[] = ['bold', 'regular']

/** The ratios the page drew before the scales existed. Each scale is a
 *  multiple of the body size, and a document that never chose one gets
 *  exactly these. Templates keep their own ratios in CSS and multiply them
 *  by scale / stock, so the one slider moves every template's headings. */
export const STOCK_SCALE = { sectionTitle: 1.06, headline: 1.15, contact: 0.95 } as const

/**
 * How section titles are cased. An explicit choice wins; without one the
 * legacy uppercase flag means 'upper', and a flag that is off decides
 * NOTHING - the template keeps whatever case its own CSS sets (six templates
 * draw small caps), exactly as it did before the choice existed.
 */
export function headingCase(t: Pick<Typography, 'headingCase' | 'uppercaseHeadings'>): HeadingCase | undefined {
  return t.headingCase ?? (t.uppercaseHeadings ? 'upper' : undefined)
}

/** Root classes for the case: the legacy class for the flag, plus an
 *  override class (rm-case-*) whose rule outranks any template's when the
 *  author chose explicitly. */
export function headingCaseClasses(t: Pick<Typography, 'headingCase' | 'uppercaseHeadings'>): string {
  switch (t.headingCase) {
    case 'upper':
      return 'rm-uppercase rm-case-upper'
    case 'smallcaps':
      return 'rm-case-smallcaps'
    case 'none':
      return 'rm-case-none'
    default:
      return t.uppercaseHeadings ? 'rm-uppercase' : ''
  }
}

/** The CSS variables the type scale and the weights become on .rm-root. The
 *  multipliers are the author's scale over the stock ratio, so a template's
 *  own ratio (0.82 of the body, say) rides the slider; a weight is emitted
 *  only when chosen, and its absence leaves the template's own in place. */
export function typeScaleVars(t: Typography): Record<string, string> {
  const mul = (n: number, stock: number) => String(Number((n / stock).toFixed(4)))
  const vars: Record<string, string> = {
    '--rm-section-title-mul': mul(t.sectionTitleScale, STOCK_SCALE.sectionTitle),
    '--rm-headline-mul': mul(t.headlineScale, STOCK_SCALE.headline),
    '--rm-contact-mul': mul(t.contactScale, STOCK_SCALE.contact),
  }
  if (t.nameWeight) vars['--rm-name-weight'] = String(FONT_WEIGHTS[t.nameWeight])
  if (t.headingWeight) vars['--rm-heading-weight'] = String(FONT_WEIGHTS[t.headingWeight])
  return vars
}

/** The heading rhythm on .rm-root: the gap multiplier is always present so
 *  the stylesheet's calc has a number to multiply by, the rule width only
 *  when chosen, so an unset width leaves every template's own rule in place. */
export function headingVars(t: Pick<Typography, 'headingGap' | 'headingRuleWidth'>): Record<string, string> {
  const vars: Record<string, string> = { '--rm-heading-gap': String(t.headingGap) }
  if (t.headingRuleWidth) vars['--rm-heading-rule'] = `${t.headingRuleWidth}px`
  return vars
}
