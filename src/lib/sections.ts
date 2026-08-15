/**
 * Section metadata shared by the rendering engine and the editor: the canonical
 * body-section list, default labels, content-presence checks, and the logic that
 * resolves the final ordered main/aside columns for a document.
 */
import type { ResumeContent, ResumeDocument } from '@/types/document'
import { htmlToText, uid } from '@/lib/utils'

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyItem = Record<string, any>

/** Singular, lowercase label for "+ Add <label>" affordances. */
export const ADD_LABEL: Record<string, string> = {
  work: 'experience',
  education: 'education',
  projects: 'project',
  skills: 'skill group',
  languages: 'language',
  certificates: 'certificate',
  awards: 'award',
  publications: 'publication',
  volunteer: 'role',
  interests: 'interest',
  references: 'reference',
}

/** A blank, fully-formed item for a given section (all fields present). */
export function newItem(sectionKey: string): AnyItem {
  const id = uid()
  switch (sectionKey) {
    case 'work':
      return { id, name: '', position: '', location: '', startDate: '', endDate: '', summary: '', highlights: [] }
    case 'education':
      return { id, institution: '', area: '', studyType: '', location: '', startDate: '', endDate: '', score: '', courses: [], summary: '' }
    case 'projects':
      return { id, name: '', description: '', url: '', startDate: '', endDate: '', highlights: [], keywords: [] }
    case 'skills':
      return { id, name: '', keywords: [], level: '' }
    case 'languages':
      return { id, language: '', fluency: '' }
    case 'certificates':
      return { id, name: '', issuer: '', date: '', url: '' }
    case 'awards':
      return { id, title: '', awarder: '', date: '', summary: '' }
    case 'publications':
      return { id, name: '', publisher: '', releaseDate: '', url: '', summary: '' }
    case 'volunteer':
      return { id, organization: '', position: '', startDate: '', endDate: '', summary: '', highlights: [] }
    case 'interests':
      return { id, name: '', keywords: [] }
    case 'references':
      return { id, name: '', reference: '' }
    default:
      // custom item
      return { id, name: '', subtitle: '', date: '', location: '', url: '', summary: '', highlights: [] }
  }
}

/** An item that carries the multi-entry-icons fields (work/education/volunteer). */
type MarkedItem = { logo?: string; logos?: string[] }

/**
 * The marks (logos) an entry actually shows, newest schema first: `logos`
 * wins whenever it's non-empty, otherwise the legacy single `logo` supplies
 * the one mark it always has. An import/old document that only ever set
 * `logo` parses and renders through the SAME path it always has — nothing
 * about `logo` changes just because `logos` now exists on the schema.
 */
export function effectiveMarks(item: MarkedItem): string[] {
  return item.logos && item.logos.length ? item.logos : item.logo ? [item.logo] : []
}

/**
 * Writes back a full next set of marks, routing to whichever field is
 * authoritative for THIS entry. An entry that has never used the multi-mark
 * facepile (`logos` empty/absent) keeps writing its one mark through the
 * legacy `logo` field — exactly like the single-logo editor always did — so
 * a plain replace/remove on an ordinary single-logo entry is the same
 * mutation, and therefore the same rendered/exported bytes, as before this
 * feature existed. The moment a SECOND mark is added the entry is
 * "promoted": `logos` becomes the source of truth for every future edit on
 * it (including shrinking back down to 1 or 0 marks) and `logo` is left
 * alone — per the design spec, legacy `logo` is never migrated/cleared just
 * because `logos` is now in play — EXCEPT when the next array is emptied
 * out entirely, where `logo` is cleared too so a stale pre-promotion value
 * can't silently resurrect a mark the user just deleted (`effectiveMarks`
 * falls back to `logo` whenever `logos` is empty, by design, for documents
 * that never touched this feature at all).
 */
export function applyMarks(item: MarkedItem, next: string[]): void {
  const promoted = !!(item.logos && item.logos.length)
  if (!promoted && next.length <= 1) {
    item.logo = next[0] ?? ''
    return
  }
  item.logos = next
  if (next.length === 0) item.logo = ''
}

/** Append a blank item to the right content array for a section key (standard or custom). */
export function pushNewItem(content: ResumeContent, sectionKey: string): void {
  if (sectionKey === 'summary') return
  const item = newItem(sectionKey)
  if (sectionKey.startsWith('custom-')) {
    const id = sectionKey.slice('custom-'.length)
    content.custom.find((c) => c.id === id)?.items.push(item as any)
    return
  }
  const list = (content as any)[sectionKey]
  if (Array.isArray(list)) list.push(item)
}

/** Remove an item by id from the right content array for a section key (standard or
 *  custom). Shared by the side panel's Trash2 delete and the canvas's hover trash
 *  button — one splice-by-id implementation, so both stay in sync. */
export function removeItem(content: ResumeContent, sectionKey: string, id: string): void {
  if (sectionKey.startsWith('custom-')) {
    const scId = sectionKey.slice('custom-'.length)
    const list = content.custom.find((c) => c.id === scId)?.items
    if (!list) return
    const idx = list.findIndex((x) => x.id === id)
    if (idx >= 0) list.splice(idx, 1)
    return
  }
  const list = (content as any)[sectionKey]
  if (!Array.isArray(list)) return
  const idx = list.findIndex((x: AnyItem) => x.id === id)
  if (idx >= 0) list.splice(idx, 1)
}

/** Header-rendered, not reorderable. */
export const HEADER_KEYS = ['profiles'] as const

/** Reorderable body sections, in their natural default order. */
export const BODY_SECTION_KEYS = [
  'summary',
  'work',
  'education',
  'projects',
  'skills',
  'languages',
  'certificates',
  'awards',
  'publications',
  'volunteer',
  'interests',
  'references',
] as const

export const DEFAULT_LABELS: Record<string, string> = {
  summary: 'Summary',
  work: 'Experience',
  education: 'Education',
  projects: 'Projects',
  skills: 'Skills',
  languages: 'Languages',
  certificates: 'Certifications',
  awards: 'Awards',
  publications: 'Publications',
  volunteer: 'Volunteering',
  interests: 'Interests',
  references: 'References',
}

/** Icon hint per section (lucide icon name resolved in the editor). */
export const SECTION_ICONS: Record<string, string> = {
  summary: 'AlignLeft',
  work: 'Briefcase',
  education: 'GraduationCap',
  projects: 'FolderGit2',
  skills: 'Wrench',
  languages: 'Languages',
  certificates: 'BadgeCheck',
  awards: 'Award',
  publications: 'BookOpen',
  volunteer: 'HeartHandshake',
  interests: 'Sparkles',
  references: 'Quote',
}

const has = (s?: string) => !!s && htmlToText(s).length > 0

export function sectionLabel(key: string, doc: ResumeDocument): string {
  const override = doc.metadata.layout.headings?.[key]
  if (override) return override
  if (key.startsWith('custom-')) {
    const id = key.slice('custom-'.length)
    return doc.content.custom.find((c) => c.id === id)?.name || 'Custom'
  }
  return DEFAULT_LABELS[key] ?? key
}

export function customKey(id: string): string {
  return `custom-${id}`
}

export function allSectionKeys(content: ResumeContent): string[] {
  return [...BODY_SECTION_KEYS, ...content.custom.map((c) => customKey(c.id))]
}

const txt = (s?: string) => !!s && s.trim().length > 0
const anyTxt = (arr?: string[]) => !!arr && arr.some(txt)

/**
 * Does the section carry REAL text? An array of blank items (added, never
 * filled) does not count — otherwise an empty "References" heading leaks into
 * the printed PDF with nothing under it.
 */
export function sectionHasContent(key: string, content: ResumeContent): boolean {
  switch (key) {
    case 'summary':
      return has(content.basics.summary)
    case 'work':
      return content.work.some((w) => txt(w.position) || txt(w.name) || has(w.summary) || anyTxt(w.highlights))
    case 'education':
      return content.education.some((e) => txt(e.institution) || txt(e.area) || txt(e.studyType))
    case 'projects':
      return content.projects.some((p) => txt(p.name) || has(p.description) || anyTxt(p.highlights))
    case 'skills':
      return content.skills.some((s) => txt(s.name) || anyTxt(s.keywords) || typeof s.rating === 'number')
    case 'languages':
      return content.languages.some((l) => txt(l.language))
    case 'certificates':
      return content.certificates.some((c) => txt(c.name))
    case 'awards':
      return content.awards.some((a) => txt(a.title))
    case 'publications':
      return content.publications.some((p) => txt(p.name))
    case 'volunteer':
      return content.volunteer.some((v) => txt(v.position) || txt(v.organization) || anyTxt(v.highlights))
    case 'interests':
      return content.interests.some((i) => txt(i.name) || anyTxt(i.keywords))
    case 'references':
      return content.references.some((r) => txt(r.name) || has(r.reference))
    default:
      if (key.startsWith('custom-')) {
        const id = key.slice('custom-'.length)
        const sec = content.custom.find((c) => c.id === id)
        return !!sec && sec.items.some((it) => txt(it.name) || txt(it.subtitle) || has(it.summary) || anyTxt(it.highlights))
      }
      return false
  }
}

/**
 * Compute the final ordered section keys for each column, honoring hidden flags
 * and content presence, and folding aside → main for single-column layouts.
 * Any content-bearing section missing from the configured order is appended so
 * data is never silently dropped.
 */
export function resolveOrder(doc: ResumeDocument, opts?: { includeEmpty?: boolean }): { main: string[]; aside: string[] } {
  const { layout } = doc.metadata
  const { content } = doc
  const hidden = new Set(layout.hidden)
  const twoCol = layout.columns === 2

  // In edit mode (`includeEmpty`), keep every non-hidden section the user has
  // added so an empty section still renders on the canvas with its inline
  // "Add item" affordance. In print/thumb, only content-bearing sections show.
  const keep = (k: string) => !hidden.has(k) && (opts?.includeEmpty || sectionHasContent(k, content))

  let main = layout.main.filter(keep)
  let aside = twoCol ? layout.aside.filter(keep) : []

  const present = new Set([...main, ...aside, ...layout.hidden])
  for (const k of allSectionKeys(content)) {
    if (!present.has(k) && sectionHasContent(k, content)) main.push(k)
  }

  if (!twoCol) {
    main = [...main]
    aside = []
  }
  return { main, aside }
}
