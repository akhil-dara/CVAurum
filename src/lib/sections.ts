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

export function sectionHasContent(key: string, content: ResumeContent): boolean {
  switch (key) {
    case 'summary':
      return has(content.basics.summary)
    case 'work':
      return content.work.length > 0
    case 'education':
      return content.education.length > 0
    case 'projects':
      return content.projects.length > 0
    case 'skills':
      return content.skills.length > 0
    case 'languages':
      return content.languages.length > 0
    case 'certificates':
      return content.certificates.length > 0
    case 'awards':
      return content.awards.length > 0
    case 'publications':
      return content.publications.length > 0
    case 'volunteer':
      return content.volunteer.length > 0
    case 'interests':
      return content.interests.length > 0
    case 'references':
      return content.references.length > 0
    default:
      if (key.startsWith('custom-')) {
        const id = key.slice('custom-'.length)
        const sec = content.custom.find((c) => c.id === id)
        return !!sec && sec.items.length > 0
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
