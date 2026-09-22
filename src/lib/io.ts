/**
 * Import/export. Files are valid JSON Resume documents (content at top level)
 * with CVAurum visual metadata namespaced under `meta.cvaurum`, so exports
 * round-trip with the wider JSON Resume ecosystem. Import is defensive: a single
 * bad field or item never throws away the whole resume.
 */
import { z } from 'zod'
import { uid, downloadBlob, resumeFilename } from '@/lib/utils'
import { ResumeContentSchema, type JsonResumeExport, type ResumeContent, type ResumeDocument } from '@/types/document'
import {
  BasicsSchema,
  WorkSchema,
  VolunteerSchema,
  EducationSchema,
  AwardSchema,
  CertificateSchema,
  PublicationSchema,
  SkillSchema,
  LanguageSchema,
  InterestSchema,
  ReferenceSchema,
  ProjectSchema,
  CustomSectionSchema,
} from '@/types/resume'
import { MetadataSchema } from '@/types/metadata'
import { seedSectionOrder } from '@/lib/sections'
import { RETIRED_AVATARS } from './storage'
import { defaultMetadata, ensureIds, withoutSeeded } from '@/data/defaults'
import { downscaleDataUrl } from '@/lib/image'

export class ImportError extends Error {}

/* ------------------------------------------------- rich text -> plain text */

/**
 * The editor holds several fields as sanitized HTML (`<p>`, `<strong>`, `<br>`,
 * lists). JSON Resume fields are PLAIN TEXT: a consumer that prints
 * `basics.summary` into a theme, a mail merge or a job board shows the tags
 * verbatim. So the HTML is flattened at this boundary and nowhere else — the
 * document keeps its markup internally, and the exact original travels along
 * in `meta.cvaurum.rich` so a re-import is lossless (see `applyRich`).
 */
type RichShape = 'block' | 'line'

interface RichSlot {
  path: string
  shape: RichShape
  get(): string
  set(v: string): void
}

/** A field whose editor is `multiline` keeps its paragraph breaks as newlines;
 *  a one-line field (a bullet, a project's description) folds them to spaces. */
const NAMED_ENTITIES: Record<string, string> = {
  nbsp: '\u00a0',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  ndash: '–',
  mdash: '—',
  hellip: '…',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  bull: '•',
  middot: '·',
  times: '×',
  deg: '°',
  euro: '€',
  pound: '£',
  copy: '©',
  reg: '®',
  trade: '™',
}

const codePoint = (n: number) => (Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '')

/** `&amp;` is decoded LAST so an escaped entity ("&amp;lt;") survives as text. */
function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_m, h: string) => codePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_m, d: string) => codePoint(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? m)
    .replace(/&amp;/gi, '&')
}

/** The text a reader would COPY off the page: tags gone, entities decoded,
 *  `<br>` and the end of every block a line break (kept, or folded to a space
 *  when the field is a single line). No DOM — this runs in the exporter, in
 *  tests and in a worker alike. */
export function richToPlain(html?: string, shape: RichShape = 'block'): string {
  if (!html) return ''
  const broken = String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|ul|ol|h[1-6]|blockquote|tr)\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
  const lines = decodeEntities(broken)
    .replace(/\r/g, '')
    .replace(/[^\S\n]+/g, ' ')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  return shape === 'block' ? lines.join('\n') : lines.join(' ')
}

/**
 * Every field that can hold the editor's rich text, found from the fields the
 * canvas marks `rich` and the panel gives a rich editor: the summary/description
 * blocks and every bullet list. Paths key on the item's own id, so a consumer
 * that reorders entries can never re-attach one entry's formatting to another.
 */
function richSlots(content: ResumeContent): RichSlot[] {
  const out: RichSlot[] = []
  const field = (owner: Record<string, unknown>, key: string, path: string, shape: RichShape) => {
    out.push({
      path,
      shape,
      get: () => (typeof owner[key] === 'string' ? (owner[key] as string) : ''),
      set: (v: string) => {
        owner[key] = v
      },
    })
  }
  const bullets = (owner: Record<string, unknown>, key: string, path: string) => {
    const arr = owner[key]
    if (!Array.isArray(arr)) return
    arr.forEach((_v, i) => {
      out.push({
        path: `${path}.${i}`,
        shape: 'line',
        get: () => (typeof arr[i] === 'string' ? (arr[i] as string) : ''),
        set: (v: string) => {
          arr[i] = v
        },
      })
    })
  }
  const items = (key: keyof ResumeContent) =>
    (Array.isArray(content[key]) ? (content[key] as Array<Record<string, unknown>>) : []).filter(
      (it) => it && typeof it === 'object'
    )
  const at = (key: string, it: Record<string, unknown>, sub: string) => `${key}.${String(it.id ?? '')}.${sub}`

  if (content.basics) field(content.basics as unknown as Record<string, unknown>, 'summary', 'basics.summary', 'block')
  for (const w of items('work')) {
    field(w, 'summary', at('work', w, 'summary'), 'block')
    bullets(w, 'highlights', at('work', w, 'highlights'))
  }
  for (const v of items('volunteer')) {
    field(v, 'summary', at('volunteer', v, 'summary'), 'block')
    bullets(v, 'highlights', at('volunteer', v, 'highlights'))
  }
  for (const e of items('education')) field(e, 'summary', at('education', e, 'summary'), 'block')
  for (const p of items('projects')) {
    field(p, 'description', at('projects', p, 'description'), 'line')
    bullets(p, 'highlights', at('projects', p, 'highlights'))
  }
  for (const a of items('awards')) field(a, 'summary', at('awards', a, 'summary'), 'block')
  for (const p of items('publications')) field(p, 'summary', at('publications', p, 'summary'), 'block')
  for (const s of items('custom')) {
    const list = Array.isArray(s.items) ? (s.items as Array<Record<string, unknown>>) : []
    for (const it of list) {
      if (!it || typeof it !== 'object') continue
      const base = `custom.${String(s.id ?? '')}.${String(it.id ?? '')}`
      field(it, 'summary', `${base}.summary`, 'block')
      bullets(it, 'highlights', `${base}.highlights`)
    }
  }
  return out
}

/** Flatten every rich field in place; return the originals that carried markup. */
function plainifyContent(content: ResumeContent): Record<string, string> {
  const rich: Record<string, string> = {}
  for (const slot of richSlots(content)) {
    const html = slot.get()
    if (!html) continue
    const plain = richToPlain(html, slot.shape)
    if (plain !== html) rich[slot.path] = html
    slot.set(plain)
  }
  return rich
}

/**
 * Put the rich originals back after an import. Each one is only restored when
 * its plain text still MATCHES the field it belongs to: a consumer that edited
 * the exported plain text keeps their edit, and a reordered or rewritten file
 * can never paint one entry's formatting onto another's words.
 */
function applyRich(content: ResumeContent, rich: unknown) {
  if (!rich || typeof rich !== 'object' || Array.isArray(rich)) return
  const map = rich as Record<string, unknown>
  for (const slot of richSlots(content)) {
    const html = map[slot.path]
    if (typeof html !== 'string' || !html) continue
    if (richToPlain(html, slot.shape) === slot.get()) slot.set(html)
  }
}

export function toJsonResume(doc: ResumeDocument): JsonResumeExport {
  // What leaves the app is the AUTHOR's data: values an example seeded into
  // fields the page never shows go first (withoutSeeded), then the editor's
  // HTML is flattened to the plain text a JSON Resume consumer expects.
  const own = withoutSeeded(doc)
  const content = structuredClone(own.content)
  const rich = plainifyContent(content)
  const { custom, ...rest } = content
  // No `$schema` URL: the export stays fully self-contained (no external
  // references). `meta.version` still marks it as JSON Resume v1, and the file
  // re-imports cleanly here and in the wider JSON Resume ecosystem.
  return {
    ...rest,
    custom,
    meta: {
      version: 'v1.0.0',
      lastModified: new Date(doc.updatedAt).toISOString(),
      cvaurum: {
        ...own.metadata,
        title: own.title,
        jobDescription: own.jobDescription,
        ...(Object.keys(rich).length ? { rich } : {}),
      },
    },
  }
}

export function exportDocumentJson(doc: ResumeDocument, filename?: string) {
  const json = JSON.stringify(toJsonResume(doc), null, 2)
  downloadBlob(new Blob([json], { type: 'application/json' }), filename || resumeFilename(doc.content.basics.name, doc.title, 'json'))
}

/** Keep only the array items that individually validate — drop the rest. */
function salvageArray<T>(schema: z.ZodTypeAny, arr: unknown): T[] {
  if (!Array.isArray(arr)) return []
  return arr.map((x) => schema.safeParse(x)).filter((r) => r.success).map((r) => (r as { data: T }).data)
}

/** Parse arbitrary JSON Resume / CVAurum content WITHOUT ever throwing away the
 *  whole document on one bad value. */
function parseContentResilient(obj: Record<string, unknown>) {
  const input = {
    basics: obj.basics ?? {},
    work: obj.work ?? [],
    volunteer: obj.volunteer ?? [],
    education: obj.education ?? [],
    awards: obj.awards ?? [],
    certificates: obj.certificates ?? [],
    publications: obj.publications ?? [],
    skills: obj.skills ?? [],
    languages: obj.languages ?? [],
    interests: obj.interests ?? [],
    references: obj.references ?? [],
    projects: obj.projects ?? [],
    custom: obj.custom ?? [],
  }
  const whole = ResumeContentSchema.safeParse(input)
  if (whole.success) return whole.data
  // Fall back to per-section salvage so a single malformed item is dropped, not
  // the entire resume.
  return ResumeContentSchema.parse({
    basics: BasicsSchema.safeParse(obj.basics).success ? obj.basics : {},
    work: salvageArray(WorkSchema, obj.work),
    volunteer: salvageArray(VolunteerSchema, obj.volunteer),
    education: salvageArray(EducationSchema, obj.education),
    awards: salvageArray(AwardSchema, obj.awards),
    certificates: salvageArray(CertificateSchema, obj.certificates),
    publications: salvageArray(PublicationSchema, obj.publications),
    skills: salvageArray(SkillSchema, obj.skills),
    languages: salvageArray(LanguageSchema, obj.languages),
    interests: salvageArray(InterestSchema, obj.interests),
    references: salvageArray(ReferenceSchema, obj.references),
    projects: salvageArray(ProjectSchema, obj.projects),
    custom: salvageArray(CustomSectionSchema, obj.custom),
  })
}

/** Parse an arbitrary JSON Resume (or CVAurum) object into a fresh document. */
export function fromJsonResume(raw: unknown): ResumeDocument {
  const obj = (raw ?? {}) as Record<string, unknown>
  const content = parseContentResilient(obj)
  ensureIds(content)

  const meta = (obj.meta ?? {}) as Record<string, unknown>
  const rmRaw = meta.cvaurum as Record<string, unknown> | undefined
  // Our own file carries the rich-text originals of the fields the top level
  // had to flatten; putting them back is what makes the round trip exact. A
  // plain JSON Resume has none, and simply keeps its plain text.
  applyRich(content, rmRaw?.rich)
  // safeParse so one out-of-range visual setting can't reject the whole resume.
  const parsedMeta = rmRaw ? MetadataSchema.safeParse(rmRaw) : null
  const parsed = parsedMeta && parsedMeta.success ? parsedMeta.data : defaultMetadata()
  // A file can arrive with no section order at all (plain JSON Resume, or an
  // empty settings object): give it one, or the editor's section list stands
  // empty while the page shows those sections anyway.
  const metadata = seedSectionOrder(parsed, content)
  const title =
    (rmRaw?.title as string) ||
    (content.basics.name ? `${content.basics.name}'s Resume` : 'Imported Resume')

  const now = Date.now()
  return {
    id: uid('res'),
    title,
    createdAt: now,
    updatedAt: now,
    jobDescription: (rmRaw?.jobDescription as string) ?? '',
    content,
    metadata,
  }
}

export async function importDocumentFromFile(file: File): Promise<ResumeDocument> {
  const text = await file.text()
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new ImportError('That file is not valid JSON.')
  }
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    throw new ImportError('That file does not look like a resume.')
  }
  const doc = fromJsonResume(json)
  doc.content.basics.image = await sanitizeImportedImage(doc.content.basics.image)
  // Entry logos are attacker-controllable on import too — same funnel.
  for (const list of [doc.content.work, doc.content.education, doc.content.volunteer]) {
    for (const it of list as { logo?: string }[]) {
      if (it.logo) it.logo = await sanitizeImportedImage(it.logo)
    }
  }
  return doc
}

/**
 * A photo from an imported file is only trusted if it's a locally-encoded
 * `data:image/...` URL. A remote `http(s)://` src would fire an external request
 * on every render (leaking IP/timing and breaking the offline/no-tracking
 * promise), so it's dropped. A genuine data-URL photo is downscaled before it
 * ever reaches IndexedDB.
 */
export async function sanitizeImportedImage(image?: string): Promise<string> {
  if (!image) return ''
  if (!/^data:image\//i.test(image)) return ''
  if (RETIRED_AVATARS.includes(image)) return '' // old placeholder avatars — never re-import
  return downscaleDataUrl(image, 512)
}
