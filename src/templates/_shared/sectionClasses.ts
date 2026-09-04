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

/** Sections whose entries have a title AND an organisation line, so either
 *  can lead or be bold. The gear shows the two rows for these alone. */
export const HAS_ENTRY_ORG = new Set(['work', 'education', 'volunteer', 'custom'])

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
  'scoreStyle',
  'bulletStyle',
  'meterStyle',
  'badgeSize',
  'badgeShape',
] as const

/**
 * Paint a copied style onto one section: its own style fields are cleared
 * first, so a copied Auto (unset) lands too, and its content toggles stay.
 * The entry order and emphasis only land on a section whose entries have an
 * organisation line; painted onto one without (projects, awards, skills)
 * they would leave nothing bold, and that section's gear, which never shows
 * the two rows, could not clear them again.
 */
export function paintStyle(m: Metadata, key: string, copied: Record<string, string>): void {
  if (!m.layout.sectionSettings) m.layout.sectionSettings = {}
  const cur = { ...(m.layout.sectionSettings[key] ?? {}) } as Record<string, unknown>
  for (const f of STYLE_FIELDS) delete cur[f]
  Object.assign(cur, copied)
  if (!HAS_ENTRY_ORG.has(sectionBase(key))) {
    delete cur.entryOrder
    delete cur.entryEmphasis
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
  ].filter(Boolean)
}
