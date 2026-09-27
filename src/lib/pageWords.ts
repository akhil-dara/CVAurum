/**
 * The words the decorative page furniture prints: the line above the name
 * (the kicker header) and the page foot. Every one of them is decoration -
 * drawn as outlines in the PDF, absent from the text layer, the Word file and
 * the ATS text - so nothing here can change a word a parser reads.
 *
 * And every word is either the author's own or read from their content. An
 * early cut printed a made-up "case file" reference and signed the last page
 * off as the "end of file": furniture that says something the author never
 * said. The defaults are plain and true; the author can rewrite them or turn
 * the line off (layout.kicker, layout.pageFootLabel).
 *
 * They live in one place because two trees print them: the canvas, which
 * knows one page, and the exporter, which fills in the real count once it has
 * paginated (pdf/render.tsx) and redraws the number on every page
 * (pdf/paint.ts).
 */

/** How the page foot writes its number (layout.pageFootNumber). */
export type PageNumberStyle = 'slash' | 'of' | 'plain' | 'none'

export const PAGE_NUMBER_STYLES: readonly PageNumberStyle[] = ['slash', 'of', 'plain', 'none']

/** The foot's number on page `page` of `pages`, the way the author picked,
 *  and nothing at all on a single page: "1 / 1" numbers nothing. */
export function pageFootText(page: number, pages: number, style: PageNumberStyle = 'slash'): string {
  if (pages <= 1) return ''
  switch (style) {
    case 'of':
      return `Page ${page} of ${pages}`
    case 'plain':
      return String(page)
    case 'none':
      return ''
    default:
      return `${page} / ${pages}`
  }
}

/** The year the page furniture dates itself by: the year the document was
 *  last touched, so a résumé keeps its date until it is edited again. */
export function furnitureYear(updatedAt?: number): number {
  const at = updatedAt ? new Date(updatedAt) : new Date()
  return Number.isFinite(at.getTime()) ? at.getFullYear() : new Date().getFullYear()
}

/** The label the line above the name carries unless the author writes their
 *  own. */
export const KICKER_LABEL = 'Curriculum vitae'

/** The line's right-hand words by default: the author's place as their
 *  contact line writes it (city and region, else city and country), then the
 *  year - a letterhead's dateline. */
export function kickerPlace(
  location: { city?: string; region?: string; countryCode?: string } | undefined,
  year: number
): string {
  const city = location?.city?.trim()
  const where = [city, location?.region?.trim() || location?.countryCode?.trim()].filter(Boolean)
  const place = city ? where.join(', ') : ''
  return place ? `${place} · ${year}` : String(year)
}

/** The author's settings for the line above the name (layout.kicker). */
export interface KickerSettings {
  show?: boolean
  left?: string
  right?: string
}

/** What the line above the name prints: the author's own words where they
 *  wrote them (an empty string leaves that side blank), the defaults where
 *  they did not, and nothing at all when they turned the line off. */
export function kickerWords(
  settings: KickerSettings | undefined,
  basics: { location?: { city?: string; region?: string; countryCode?: string } },
  year: number
): { left: string; right: string } {
  if (settings?.show === false) return { left: '', right: '' }
  return {
    left: settings?.left ?? KICKER_LABEL,
    right: settings?.right ?? kickerPlace(basics.location, year),
  }
}
