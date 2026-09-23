import { folioIconKind, type FolioIconKind } from './folioIcons'

/**
 * Which glyph a section's heading badge wears.
 *
 * Every glyph exists in every badge style - the folio's layered drawing and
 * the line icon the other styles use - so the choice is a KIND, not a picture:
 * the badge style decides how the kind is drawn. The set is the twelve kinds
 * the standard sections already use, named for what they show rather than for
 * the section that happens to use them, so a custom section can wear any of
 * them.
 */
export const ICON_KINDS: { kind: FolioIconKind; label: string; words: string[] }[] = [
  { kind: 'summary', label: 'Lines', words: ['summary', 'profile', 'about', 'objective', 'overview', 'statement'] },
  { kind: 'work', label: 'Briefcase', words: ['work', 'experience', 'employment', 'career', 'leadership', 'internship', 'freelance', 'consulting', 'positions'] },
  { kind: 'education', label: 'Cap', words: ['education', 'course', 'coursework', 'training', 'study', 'school', 'academic', 'degree', 'thesis', 'teaching'] },
  { kind: 'projects', label: 'Folder', words: ['project', 'portfolio', 'work samples', 'case stud', 'open source', 'research'] },
  { kind: 'skills', label: 'Wrench', words: ['skill', 'tool', 'technolog', 'stack', 'competenc', 'expertise', 'tech'] },
  { kind: 'languages', label: 'Speech', words: ['language', 'linguistic'] },
  { kind: 'certificates', label: 'Badge', words: ['certific', 'license', 'licence', 'accreditation', 'credential', 'clearance'] },
  { kind: 'awards', label: 'Award', words: ['award', 'honor', 'honour', 'achievement', 'recognition', 'scholarship', 'prize', 'distinction', 'grant'] },
  { kind: 'publications', label: 'Book', words: ['publication', 'paper', 'writing', 'article', 'talk', 'speaking', 'conference', 'patent', 'press', 'media'] },
  { kind: 'volunteer', label: 'Helping hand', words: ['volunteer', 'community', 'charity', 'service', 'nonprofit', 'non-profit', 'outreach', 'mentoring', 'social'] },
  { kind: 'interests', label: 'Sparkle', words: ['interest', 'hobb', 'activit', 'passion', 'extracurricular', 'sport', 'travel', 'misc', 'other'] },
  { kind: 'references', label: 'Quote', words: ['reference', 'testimonial', 'recommendation', 'endorsement'] },
]

const KINDS = new Set(ICON_KINDS.map((k) => k.kind))

/**
 * Up to `max` glyphs a section's TITLE suggests, best first: every kind whose
 * words appear in the title, then the section's own kind. Custom sections are
 * named by their author ("Volunteering", "Talks & Panels"), and the title is
 * the only thing that says what one is about.
 */
export function suggestedIcons(title: string, sectionKey: string, max = 4): FolioIconKind[] {
  const t = title.toLowerCase()
  const hits = ICON_KINDS.filter((k) => k.words.some((w) => t.includes(w))).map((k) => k.kind)
  const own = sectionKey.startsWith('custom-') ? [] : [folioIconKind(sectionKey)]
  const out: FolioIconKind[] = []
  for (const k of [...hits, ...own]) if (!out.includes(k)) out.push(k)
  return out.slice(0, max)
}

/**
 * The glyph a section shows, or 'none'. The author's pick wins; unset, a
 * standard section keeps the glyph it always had, and a custom one takes the
 * first glyph its title suggests (it used to get one generic mark whatever
 * it was called).
 */
export function sectionIconKind(sectionKey: string, title: string, chosen?: string): FolioIconKind | 'none' {
  if (chosen === 'none') return 'none'
  if (chosen && KINDS.has(chosen as FolioIconKind)) return chosen as FolioIconKind
  if (sectionKey.startsWith('custom-')) return suggestedIcons(title, sectionKey, 1)[0] ?? 'interests'
  return folioIconKind(sectionKey)
}
