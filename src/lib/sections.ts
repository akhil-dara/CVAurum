/**
 * Section metadata shared by the rendering engine and the editor: the canonical
 * body-section list, default labels, content-presence checks, and the logic that
 * resolves the final ordered main/aside columns for a document.
 */
import type { Metadata } from '@/types/metadata'
import { DEFAULT_ASIDE_ORDER, DEFAULT_MAIN_ORDER, DEFAULT_TWO_COL_MAIN } from '@/data/defaults'
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
      return {
        id,
        institution: '',
        area: '',
        studyType: '',
        location: '',
        startDate: '',
        endDate: '',
        score: '',
        courses: [],
        summary: '',
      }
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

/**
 * Move an item one place earlier or later within its own section.
 *
 * Shares `listFor` with the delete above so the canvas and the side panel
 * agree about where a section's items live, custom sections included. Moving
 * past either end does nothing rather than wrapping, because a keyboard user
 * holding the shortcut down should stop at the end, not cycle forever.
 */
export function moveItem(content: ResumeContent, sectionKey: string, id: string, delta: number): void {
  const list = listFor(content, sectionKey)
  if (!list) return
  const from = list.findIndex((x: AnyItem) => x.id === id)
  if (from < 0) return
  const to = from + delta
  if (to < 0 || to >= list.length) return
  const [moved] = list.splice(from, 1)
  list.splice(to, 0, moved)
}

/** The content array a section key names, or null when it names no list. */
function listFor(content: ResumeContent, sectionKey: string): AnyItem[] | null {
  if (sectionKey.startsWith('custom-')) {
    const scId = sectionKey.slice('custom-'.length)
    return content.custom.find((c) => c.id === scId)?.items ?? null
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const list = (content as any)[sectionKey]
  return Array.isArray(list) ? list : null
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

/* --------------------------------------------------------- reorder helpers
 * One implementation for every control surface (side panel, canvas arrows,
 * canvas drag), so an order mutation can never behave differently depending
 * on where the user triggered it. All three mutate in place — call them
 * inside a store recipe. */

/** The three places a section can live: the main flow, the sidebar and the
 *  footer strip. The strip is optional here so a layout written before it
 *  existed still moves. */
type LayoutCols = { main: string[]; aside: string[]; footer?: string[] }

/** Where a section lives. */
export type SectionPlace = 'main' | 'aside' | 'footer'

/** Move a section one step within its own column. Clamped no-op at the
 *  edges. A key in no array (a content-bearing section resolveOrder
 *  appends implicitly) is adopted into `main` first, then moved. */
export function moveSection(layout: LayoutCols, key: string, dir: -1 | 1): void {
  let col: string[] | undefined
  if (layout.main.includes(key)) col = layout.main
  else if (layout.aside.includes(key)) col = layout.aside
  else if (layout.footer?.includes(key)) col = layout.footer
  else {
    layout.main.push(key)
    col = layout.main
  }
  const from = col.indexOf(key)
  const to = from + dir
  if (to < 0 || to >= col.length) return
  col.splice(from, 1)
  col.splice(to, 0, key)
}

/** Place a section at an exact index in a column (same column = reorder,
 *  other column = membership change + insert). Index is clamped. A key is
 *  one place's alone: moving it into the footer strip takes it out of the
 *  main flow and the sidebar in the same move, and moving it out of the
 *  strip leaves the strip. */
export function moveSectionTo(layout: LayoutCols, key: string, col: SectionPlace, index: number): void {
  layout.main = layout.main.filter((k) => k !== key)
  layout.aside = layout.aside.filter((k) => k !== key)
  const footer = (layout.footer ?? []).filter((k) => k !== key)
  layout.footer = footer
  const target = col === 'main' ? layout.main : col === 'aside' ? layout.aside : footer
  target.splice(Math.max(0, Math.min(index, target.length)), 0, key)
}

/** The place the move menu offers next. The places cycle: main, sidebar,
 *  footer strip and back on a two-column template; main, footer strip and
 *  back on a single column, which has no sidebar to offer. A key in no list
 *  sits at the end of the main flow, so it moves as a main section does. */
export function nextSectionPlace(layout: LayoutCols, key: string, twoCol: boolean): SectionPlace {
  if (layout.footer?.includes(key)) return 'main'
  if (layout.aside.includes(key)) return 'footer'
  return twoCol ? 'aside' : 'footer'
}

/** Move an entry (by id) to an exact index within its section's items array
 *  (standard or `custom-<id>` sections). Clamped; unknown id/section no-op. */
export function moveEntry(content: ResumeContent, sectionKey: string, id: string, toIndex: number): void {
  let list: AnyItem[] | undefined
  if (sectionKey.startsWith('custom-')) {
    const scId = sectionKey.slice('custom-'.length)
    list = content.custom.find((c) => c.id === scId)?.items
  } else {
    const l = (content as any)[sectionKey]
    if (Array.isArray(l)) list = l
  }
  if (!list) return
  const from = list.findIndex((x) => x.id === id)
  if (from < 0) return
  const [item] = list.splice(from, 1)
  list.splice(Math.max(0, Math.min(toIndex, list.length)), 0, item)
}

/** Per-entry badge tri-state (inline-reorder spec): the item's own `badge`
 *  override wins; otherwise the section's opt-in showBadges setting rules. */
export function entryBadgeOn(item: { badge?: boolean }, opts?: { showBadges?: boolean }): boolean {
  return item.badge ?? opts?.showBadges === true
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
        return (
          !!sec && sec.items.some((it) => txt(it.name) || txt(it.subtitle) || has(it.summary) || anyTxt(it.highlights))
        )
      }
      return false
  }
}

/**
 * Compute the final ordered section keys for each column, honoring hidden flags
 * and content presence, and folding aside → main for single-column layouts.
 * Any content-bearing section missing from the configured order is appended so
 * data is never silently dropped. Sections in the footer strip come back
 * in their own list, read last, and leave the main flow and the sidebar.
 */
/**
 * Give a document's layout an explicit section order.
 *
 * An imported file often carries none: JSON Resume has no notion of one, and
 * a file whose settings object is empty parses to the schema's own defaults,
 * where `main` is []. The canvas still drew such a document, because
 * `resolveOrder` appends anything with content, but the editor's section list
 * reads the layout itself and so came up EMPTY - nothing to reorder, move or
 * rename, on a resume that plainly had sections.
 *
 * Seeds the usual order when nothing is placed anywhere, then appends every
 * content-bearing section the layout has not placed, so the panel and the
 * page agree. A section the author hid stays hidden.
 */
export function seedSectionOrder(metadata: Metadata, content: ResumeContent): Metadata {
  const layout = metadata.layout
  const twoCol = layout.columns === 2
  const placed = new Set([...layout.main, ...layout.aside, ...(layout.footer ?? []), ...layout.hidden])
  if (placed.size === 0) {
    layout.main = twoCol ? [...DEFAULT_TWO_COL_MAIN] : [...DEFAULT_MAIN_ORDER]
    if (twoCol) layout.aside = [...DEFAULT_ASIDE_ORDER]
    for (const k of [...layout.main, ...layout.aside]) placed.add(k)
  }
  for (const key of allSectionKeys(content)) {
    if (!placed.has(key) && sectionHasContent(key, content)) {
      layout.main.push(key)
      placed.add(key)
    }
  }
  return metadata
}

export function resolveOrder(
  doc: ResumeDocument,
  opts?: { includeEmpty?: boolean }
): { main: string[]; aside: string[]; footer: string[] } {
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
  // The strip is read last whatever the column count, and a key placed there
  // is the strip's alone: a body that still lists it never repeats it.
  const footer = layout.footer.filter(keep)
  const footerSet = new Set(layout.footer)
  main = main.filter((k) => !footerSet.has(k))
  aside = aside.filter((k) => !footerSet.has(k))

  const present = new Set([...main, ...aside, ...layout.footer, ...layout.hidden])
  for (const k of allSectionKeys(content)) {
    if (!present.has(k) && sectionHasContent(k, content)) main.push(k)
  }

  if (!twoCol) {
    main = [...main]
    aside = []
  }
  return { main, aside, footer }
}
