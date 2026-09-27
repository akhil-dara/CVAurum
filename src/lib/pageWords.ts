/**
 * The words the decorative page furniture prints: the page foot's number and
 * the kicker line over the name. Every one of them is decoration - drawn as
 * outlines in the PDF, absent from the text layer, the Word file and the ATS
 * text - so nothing here can change a word a parser reads. They live in one
 * place because two trees print them: the canvas, which knows one page, and
 * the exporter, which fills in the real count once it has paginated
 * (pdf/render.tsx) and redraws the number on every page (pdf/paint.ts).
 */

/** What a design's page foot says beside the number. */
export interface PageFootWords {
  /** A word before the number on every page ("Sheet"). */
  page?: string
  /** What the last page says ("End of file"). */
  end?: string
}

/** The foot's right-hand words on page `page` of `pages`. A single page has
 *  no number to give unless the design names its pages (a sheet is "1 / 1"). */
export function pageFootText(page: number, pages: number, words: PageFootWords = {}): string {
  const lead = words.page ? `${words.page} ` : ''
  if (pages <= 1 && !lead) return words.end ?? ''
  const count = `${lead}${page} / ${pages}`
  return page === pages && words.end ? `${words.end} · ${count}` : count
}

/** The kicker's right-hand words: the author's city and country, then the
 *  year - a letterhead's dateline. */
export function kickerPlace(location: { city?: string; countryCode?: string } | undefined, year: number): string {
  const where = [location?.city?.trim(), location?.countryCode?.trim()].filter(Boolean).join(', ')
  return where ? `${where} · ${year}` : String(year)
}

/** A case-file reference drawn from the name: its initials, the year and four
 *  figures hashed from the name, so a document keeps the same one for good. */
export function fileReference(name: string, year: number): string {
  const words = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Za-z]/g, ''))
    .filter(Boolean)
  const initials = words.map((w) => w[0].toUpperCase()).join('').slice(0, 3) || 'CV'
  let h = 2166136261
  for (const ch of name) h = Math.imul(h ^ ch.codePointAt(0)!, 16777619)
  const figures = String((h >>> 0) % 10000).padStart(4, '0')
  return `${initials}-${year}-${figures}`
}
