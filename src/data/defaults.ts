import { uid } from '@/lib/utils'
import type { Metadata } from '@/types/metadata'
import type { ResumeContent, ResumeDocument } from '@/types/document'
import { MetadataSchema } from '@/types/metadata'
import { BODY_SECTION_KEYS, sectionHasContent } from '@/lib/sections'
import { SAMPLE_CONTENT, BLANK_CONTENT } from './sample'

/** Default section order in a single-column resume (excludes header `profiles`). */
export const DEFAULT_MAIN_ORDER = [
  'summary',
  'work',
  'projects',
  'education',
  'skills',
  'certificates',
  'awards',
  'publications',
  'languages',
  'volunteer',
  'interests',
  'references',
]

/** Sensible defaults for a two-column template. */
export const DEFAULT_ASIDE_ORDER = ['skills', 'languages', 'certificates', 'awards', 'interests']
export const DEFAULT_TWO_COL_MAIN = ['summary', 'work', 'projects', 'education', 'publications', 'volunteer', 'references']

export interface MetadataOverrides {
  template?: string
  page?: Partial<Metadata['page']>
  theme?: Partial<Metadata['theme']>
  typography?: Partial<Metadata['typography']>
  layout?: Partial<Metadata['layout']>
  links?: Partial<Metadata['links']>
  dates?: Partial<Metadata['dates']>
}

export function defaultMetadata(overrides: MetadataOverrides = {}): Metadata {
  // MetadataSchema fills every nested default; then layer overrides.
  const base = MetadataSchema.parse({
    template: 'modern',
    layout: { main: DEFAULT_MAIN_ORDER },
  })
  return MetadataSchema.parse({
    ...base,
    ...overrides,
    page: { ...base.page, ...overrides.page },
    theme: { ...base.theme, ...overrides.theme },
    typography: { ...base.typography, ...overrides.typography },
    layout: { ...base.layout, ...overrides.layout },
    links: { ...base.links, ...overrides.links },
    dates: { ...base.dates, ...overrides.dates },
  })
}

/* ------------------------------------------------------- seeded provenance */

/**
 * The QUIET fields: the ones a design only ever uses as a link TARGET, drawn
 * on some other words. Measured against the app's own serialization of the
 * example resume (`resumeToAtsText`): of the 100 filled fields an example
 * carries, the entry `url`s are the only ones whose value never appears as
 * readable text anywhere on the page. So they are the only ones an author can
 * carry for months without ever seeing them — and, until now, export as
 * though they had typed them.
 *
 * Everything else an example seeds is printed: the author reads it, keeps it
 * or rewrites it, and it is theirs either way. Those need no provenance.
 *
 * A project's `url` is deliberately NOT here: designs print it (as a tag link
 * beside the description), so the author does see it.
 */
const QUIET_FIELDS: Array<[keyof ResumeContent, string]> = [
  ['work', 'url'],
  ['education', 'url'],
  ['volunteer', 'url'],
  ['awards', 'url'],
  ['certificates', 'url'],
  ['publications', 'url'],
]

interface Slot {
  path: string
  get(): string
  set(v: string): void
}

/** Every quiet field in a document's content, keyed by the item's stable id so
 *  reordering or deleting entries can never move a mark onto another entry. */
function quietSlots(content: ResumeContent): Slot[] {
  const out: Slot[] = []
  for (const [section, field] of QUIET_FIELDS) {
    const list = content[section] as Array<Record<string, unknown>> | undefined
    if (!Array.isArray(list)) continue
    for (const item of list) {
      if (!item || typeof item !== 'object' || !item.id) continue
      out.push({
        path: `${section}.${String(item.id)}.${field}`,
        get: () => (typeof item[field] === 'string' ? (item[field] as string) : ''),
        set: (v: string) => {
          item[field] = v
        },
      })
    }
  }
  return out
}

/** The provenance map for content an EXAMPLE supplied: quiet field -> the
 *  value the example put there. Ids must already be stable (`ensureIds`). */
export function markSeeded(content: ResumeContent): Record<string, string> {
  const marks: Record<string, string> = {}
  for (const slot of quietSlots(content)) {
    const v = slot.get().trim()
    if (v) marks[slot.path] = slot.get()
  }
  return marks
}

/**
 * The document as the AUTHOR's own data: every quiet field that still holds
 * exactly what the example seeded is emptied, and the provenance map itself is
 * dropped so no exporter can serialize it.
 *
 * "The author edited it" is decided by the value, not by an event: a field
 * they can only reach through the form panel has no other signal, and a mark
 * that describes a value stops applying the instant the value changes — so
 * clearing the mark needs no hook anywhere in the editor, and it cannot go
 * stale across a save and reload.
 */
export function withoutSeeded(doc: ResumeDocument): ResumeDocument {
  const marks = doc.seeded
  const { seeded: _seeded, ...rest } = doc
  if (!marks || Object.keys(marks).length === 0) return rest
  const content = structuredClone(doc.content)
  let changed = false
  for (const slot of quietSlots(content)) {
    const seed = marks[slot.path]
    if (seed !== undefined && slot.get() === seed) {
      slot.set('')
      changed = true
    }
  }
  return changed ? { ...rest, content } : rest
}

interface CreateOpts {
  title?: string
  content?: ResumeContent
  metadata?: Partial<Metadata>
  sample?: boolean
}

/** Core sections a blank resume starts with; the rest are added on demand. */
const STARTER_SECTIONS = ['summary', 'work', 'education', 'skills']

export function createDocument(opts: CreateOpts = {}): ResumeDocument {
  const now = Date.now()
  const content = opts.content ?? (opts.sample ? structuredClone(SAMPLE_CONTENT) : structuredClone(BLANK_CONTENT))
  // Ensure every list item has a stable id.
  ensureIds(content)

  // Seed the section list: for examples, everything that has content; for blanks,
  // a sensible core that the user extends via "Add section".
  const main = opts.sample
    ? BODY_SECTION_KEYS.filter((k) => sectionHasContent(k, content))
    : [...STARTER_SECTIONS]

  // Content an EXAMPLE supplied carries values the page never shows; mark them
  // now, while we still know they are not the author's (see markSeeded).
  const seeded = opts.sample ? markSeeded(content) : {}

  return {
    id: uid('res'),
    title: opts.title ?? (opts.sample ? 'My Resume' : 'Untitled Resume'),
    createdAt: now,
    updatedAt: now,
    jobDescription: '',
    content,
    ...(Object.keys(seeded).length ? { seeded } : {}),
    // The example resume ships with the photo shown so people discover the DP
    // feature; a blank resume leaves it off (toggle in Design / the photo picker).
    metadata: defaultMetadata({ ...opts.metadata, layout: { main, showPhoto: !!opts.sample, ...(opts.metadata?.layout ?? {}) } }),
  }
}

/** Mutates content so every item across every list section has an `id`. */
export function ensureIds(content: ResumeContent): ResumeContent {
  const lists: (keyof ResumeContent)[] = [
    'work',
    'volunteer',
    'education',
    'awards',
    'certificates',
    'publications',
    'skills',
    'languages',
    'interests',
    'references',
    'projects',
  ]
  for (const key of lists) {
    const arr = content[key] as Array<{ id?: string }>
    if (Array.isArray(arr)) arr.forEach((it) => { if (!it.id) it.id = uid() })
  }
  content.basics.profiles?.forEach((p) => { if (!p.id) p.id = uid() })
  content.custom?.forEach((c) => {
    if (!c.id) c.id = uid('custom')
    c.items?.forEach((it) => { if (!it.id) it.id = uid() })
  })
  return content
}
