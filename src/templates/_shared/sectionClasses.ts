import type { Metadata } from '@/types/metadata'

/** One section's own settings (layout.sectionSettings[key]). */
export type SectionSettings = Metadata['layout']['sectionSettings'][string]

/** One of an entry's two head fields: the title (position, degree) or the
 *  organisation (company, institution; a custom entry's subtitle). */
export type EntryField = 'title' | 'org'

/** A section key's base: every custom section shares the 'custom' base. */
export function sectionBase(key: string): string {
  return key.startsWith('custom-') ? 'custom' : key
}

/* Which entry fields a section prints at all. The gear shows a field's rows
 * for these sections alone, and the style painter drops a painted value that
 * lands anywhere else - a section whose gear never shows the row could not
 * clear it again. One place for both readers, so the two cannot disagree. */

/** Sections whose entries have a title AND an organisation line, so either
 *  can lead or be bold. */
export const HAS_ENTRY_ORG = new Set(['work', 'education', 'volunteer', 'custom'])

/** Sections whose entries carry a date, so it can take a side of the row. */
export const HAS_DATES = new Set([
  'work',
  'education',
  'projects',
  'volunteer',
  'certificates',
  'awards',
  'publications',
  'custom',
])

/** Sections whose entries carry a location, so it can move beside the date. */
export const HAS_LOCATION = new Set(['work', 'education', 'custom'])

/** The visual-style fields the style painter copies (NOT the show* content
 *  toggles). */
export const STYLE_FIELDS = [
  'headingStyle',
  'headingAlign',
  'skillsStyle',
  'chipSize',
  'entryLayout',
  'entryOrder',
  'entryEmphasis',
  'locationPlacement',
  'dateAlign',
  'scoreStyle',
  'bulletStyle',
  'meterStyle',
  'badgeSize',
  'badgeShape',
] as const

/** A painted field that only means something where the section prints the
 *  entry field it styles: the set of sections that do, per field. */
const PAINT_NEEDS: [field: string, sections: Set<string>][] = [
  ['entryOrder', HAS_ENTRY_ORG],
  ['entryEmphasis', HAS_ENTRY_ORG],
  ['locationPlacement', HAS_LOCATION],
  ['dateAlign', HAS_DATES],
]

/**
 * Paint a copied style onto one section: its own style fields are cleared
 * first, so a copied Auto (unset) lands too, and its content toggles stay.
 * The fields that style an entry field only land on a section that prints
 * that field. The entry order and emphasis painted onto a section with no
 * organisation line (projects, awards, skills) would leave nothing bold; a
 * location placement painted where no location prints, and a date side
 * where no date does, would sit in the settings doing nothing. In every
 * case that section's gear never shows the row, so nothing could clear the
 * value again.
 */
export function paintStyle(m: Metadata, key: string, copied: Record<string, string>): void {
  if (!m.layout.sectionSettings) m.layout.sectionSettings = {}
  const cur = { ...(m.layout.sectionSettings[key] ?? {}) } as Record<string, unknown>
  for (const f of STYLE_FIELDS) delete cur[f]
  Object.assign(cur, copied)
  const base = sectionBase(key)
  for (const [field, sections] of PAINT_NEEDS) {
    if (!sections.has(base)) delete cur[field]
  }
  m.layout.sectionSettings[key] = cur
}

/**
 * Which field leads an entry and which is bold. Unset is the page as it
 * always was: the title leads and is bold. The two are independent, so a
 * section can lead with the company and still stress the position. Read by
 * the canvas, the Word export and the ATS text alike, so the three agree.
 */
export function entryOrderOf(
  ss: { entryOrder?: string; entryEmphasis?: string } | undefined
): { lead: EntryField; bold: EntryField } {
  return {
    lead: ss?.entryOrder === 'org-first' ? 'org' : 'title',
    bold: ss?.entryEmphasis === 'org' ? 'org' : 'title',
  }
}

/** What sits between an entry's location and its date when the two share the
 *  head row. One glyph, spaced, and real text everywhere: the page, the PDF
 *  text layer and the Word file all print it, so nothing runs the two
 *  together for a reader that only gets the text. */
export const LOCATION_DATE_SEPARATOR = ' | '

/**
 * Where an entry's location and date sit. Unset is the page as it always
 * was: the location on the sub-line under the title, the date at the right
 * edge of the head row. The two are independent - a left date can still have
 * the location under the title. Read by the canvas and the Word export
 * alike, so the two place the pair the same way.
 */
export function entryMetaOf(
  ss: { locationPlacement?: string; dateAlign?: string } | undefined
): { locWithDate: boolean; dateLeft: boolean } {
  return {
    locWithDate: ss?.locationPlacement === 'with-date',
    dateLeft: ss?.dateAlign === 'left',
  }
}

/**
 * Whether a page break may fall inside one of this section's entries. The
 * document decides (page.keepEntriesWhole) until the section decides for
 * itself, so a section can hold its entries whole while the rest of the page
 * breaks freely, and can break freely while the rest holds. Read by the
 * renderer (which stamps the class the paginator looks for) and by the Word
 * export, so the page and the file break on one answer.
 */
export function keepEntriesOn(
  page: { keepEntriesWhole?: boolean } | undefined,
  ss: { keepTogether?: boolean } | undefined
): boolean {
  return ss?.keepTogether ?? page?.keepEntriesWhole === true
}

/** True when the bold line is the sub-line. The renderer puts the leading
 *  field in the head slot and the other under it, so this is the one thing
 *  the stylesheet needs to know. */
export function entryEmphasisOnSub(ss: { entryOrder?: string; entryEmphasis?: string } | undefined): boolean {
  const { lead, bold } = entryOrderOf(ss)
  return lead !== bold
}

/**
 * The per-section style overrides as scoped classes on the section element,
 * where the .rm-root-anchored rules in the stylesheets beat any template's
 * own. A setting the section never made adds no class, so the template's own
 * treatment stands.
 */
export function sectionOverrideClasses(ss: SectionSettings | undefined): string[] {
  if (!ss) return []
  return [
    ss.headingStyle ? `sec-ov-${ss.headingStyle}` : '',
    ss.skillsStyle ? `skl-ov-${ss.skillsStyle}` : '',
    ss.chipSize ? `chip-${ss.chipSize}` : '',
    ss.entryLayout ? `lay-ov-${ss.entryLayout}` : '',
    ss.scoreStyle ? `score-ov-${ss.scoreStyle}` : '',
    ss.headingAlign ? `sec-align-${ss.headingAlign}` : '',
    entryEmphasisOnSub(ss) ? 'sec-emph-sub' : '',
    // Which edge the date sits on is ink, so it travels as a class. Where
    // the location prints is a different slot in the markup, so it does not.
    ss.dateAlign ? `sec-date-${ss.dateAlign}` : '',
  ].filter(Boolean)
}
