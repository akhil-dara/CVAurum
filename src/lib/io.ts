/**
 * Import/export. Files are valid JSON Resume documents (content at top level)
 * with CVAurum visual metadata namespaced under `meta.cvaurum`, so exports
 * round-trip with the wider JSON Resume ecosystem. Import is defensive: a single
 * bad field or item never throws away the whole resume.
 */
import { z } from 'zod'
import { uid, downloadBlob, resumeFilename } from '@/lib/utils'
import { ResumeContentSchema, type JsonResumeExport, type ResumeDocument } from '@/types/document'
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
import { defaultMetadata, ensureIds } from '@/data/defaults'
import { downscaleDataUrl } from '@/lib/image'

export class ImportError extends Error {}

export function toJsonResume(doc: ResumeDocument): JsonResumeExport {
  const { custom, ...rest } = doc.content
  // No `$schema` URL: the export stays fully self-contained (no external
  // references). `meta.version` still marks it as JSON Resume v1, and the file
  // re-imports cleanly here and in the wider JSON Resume ecosystem.
  return {
    ...rest,
    custom,
    meta: {
      version: 'v1.0.0',
      lastModified: new Date(doc.updatedAt).toISOString(),
      cvaurum: { ...doc.metadata, title: doc.title, jobDescription: doc.jobDescription },
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
  // safeParse so one out-of-range visual setting can't reject the whole resume.
  const parsedMeta = rmRaw ? MetadataSchema.safeParse(rmRaw) : null
  const metadata = parsedMeta && parsedMeta.success ? parsedMeta.data : defaultMetadata()
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
  return downscaleDataUrl(image, 512)
}
