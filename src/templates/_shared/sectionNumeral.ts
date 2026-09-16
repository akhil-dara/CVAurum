import type { Metadata } from '@/types/metadata'

/** The four shapes a running section numeral can take (layout.sectionNumberStyle). */
export type SectionNumberStyle = Metadata['layout']['sectionNumberStyle']

/**
 * The shapes on offer, each labelled with the figure it actually draws.
 *
 * ONE list, beside the formatter that gives those figures their meaning: the
 * choice is offered in two places now - the Design panel's Layout group and
 * the section Style sheet, where a person looking to switch the numbering off
 * went first - and two hand-written copies of four value/label pairs is
 * exactly the kind of pair that drifts a label at a time.
 */
export const SECTION_NUMBER_STYLES: { value: SectionNumberStyle; label: string; title: string }[] = [
  { value: 'padded', label: '01', title: 'Two-figure folio (01, 02, 03)' },
  { value: 'plain', label: '1', title: 'A plain figure (1, 2, 3)' },
  { value: 'dot', label: '1.', title: 'A figure and a full stop (1., 2., 3.)' },
  { value: 'roman', label: 'I', title: 'Roman capitals (I, II, III)' },
]

/** Value, numeral - largest first, subtractive pairs included, so the walk
 *  below emits ordinary roman (IV, not IIII; XL, not XXXX). */
const ROMAN: ReadonlyArray<readonly [number, string]> = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
]

function roman(n: number): string {
  let left = n
  let out = ''
  for (const [value, numeral] of ROMAN) {
    while (left >= value) {
      out += numeral
      left -= value
    }
  }
  return out
}

/**
 * How a numbered heading opens, given the section's own index (0 for the
 * first section the page shows) and the style the document asked for.
 *
 * Pure and design-free on purpose: the preview tree and the export tree both
 * call it with the same index, so the two can never draw a different numeral
 * for one document. It produces DECORATION - the caller wraps it in the Deco
 * atom - so nothing here ever reaches the Word file or the ATS text.
 *
 * The index is floored to the first section: it arrives as an array index, so
 * a negative or fractional one would be a caller bug, and a heading opening
 * with "NaN" or with nothing at all is the worst possible way to learn of it.
 */
export function sectionNumeral(index: number, style: SectionNumberStyle): string {
  const n = Number.isFinite(index) ? Math.max(1, Math.floor(index) + 1) : 1
  switch (style) {
    case 'plain':
      return String(n)
    case 'dot':
      return `${n}.`
    case 'roman':
      return roman(n)
    case 'padded':
    default:
      return String(n).padStart(2, '0')
  }
}
