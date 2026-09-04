/**
 * The per-element colours - the name, the headline, the section titles, the
 * contact line and the links - resolved in one place for the canvas and the
 * Word export. On the page each rides one CSS variable that the base
 * stylesheet and every template read through a fallback chain, so an unset
 * colour draws exactly what the page always drew, and a set one is a plain
 * computed colour the PDF painter reads back from the DOM.
 */
import type { Theme } from '@/types/metadata'

export type ElementColorKey = 'name' | 'headline' | 'headings' | 'contacts' | 'links'

/** Each colour and the variable it becomes on .rm-root. */
export const ELEMENT_COLORS: readonly { key: ElementColorKey; cssVar: string }[] = [
  { key: 'name', cssVar: '--rm-name-color' },
  { key: 'headline', cssVar: '--rm-headline-color' },
  { key: 'headings', cssVar: '--rm-heading-color' },
  { key: 'contacts', cssVar: '--rm-contact-color' },
  { key: 'links', cssVar: '--rm-link-color' },
]

/** The variables for the colours that are set, and nothing for the rest: a
 *  variable set to an empty value would make its fallback chain resolve to
 *  nothing and drop the element's colour altogether. */
export function elementColorVars(theme: Theme): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const { key, cssVar } of ELEMENT_COLORS) {
    const v = theme[key]
    if (v) vars[cssVar] = v
  }
  return vars
}
