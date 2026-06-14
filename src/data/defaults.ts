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
  })
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

  return {
    id: uid('res'),
    title: opts.title ?? (opts.sample ? 'My Resume' : 'Untitled Resume'),
    createdAt: now,
    updatedAt: now,
    jobDescription: '',
    content,
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
