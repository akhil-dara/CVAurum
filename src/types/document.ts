/**
 * The full CVAurum document = JSON Resume content + CVAurum metadata.
 */
import { z } from 'zod'
import {
  AwardSchema,
  BasicsSchema,
  CertificateSchema,
  CustomSectionSchema,
  EducationSchema,
  InterestSchema,
  LanguageSchema,
  ProjectSchema,
  PublicationSchema,
  ReferenceSchema,
  SkillSchema,
  VolunteerSchema,
  WorkSchema,
} from './resume'
import { MetadataSchema, type Metadata } from './metadata'

/** Resume content following JSON Resume v1. */
export const ResumeContentSchema = z.object({
  basics: BasicsSchema.default({}),
  work: z.array(WorkSchema).default([]),
  volunteer: z.array(VolunteerSchema).default([]),
  education: z.array(EducationSchema).default([]),
  awards: z.array(AwardSchema).default([]),
  certificates: z.array(CertificateSchema).default([]),
  publications: z.array(PublicationSchema).default([]),
  skills: z.array(SkillSchema).default([]),
  languages: z.array(LanguageSchema).default([]),
  interests: z.array(InterestSchema).default([]),
  references: z.array(ReferenceSchema).default([]),
  projects: z.array(ProjectSchema).default([]),
  /** CVAurum extension: free-form custom sections */
  custom: z.array(CustomSectionSchema).default([]),
})

export type ResumeContent = z.infer<typeof ResumeContentSchema>

/** A persisted document in the local library. */
export const ResumeDocumentSchema = z.object({
  id: z.string(),
  title: z.string().default('Untitled Resume'),
  createdAt: z.number(),
  updatedAt: z.number(),
  /** optional pasted job description for tailoring/ATS */
  jobDescription: z.string().optional().default(''),
  content: ResumeContentSchema,
  metadata: MetadataSchema,
  /**
   * Provenance for values that came from an EXAMPLE rather than from the
   * author: a map of field path -> the value the example seeded there. It is
   * written once, when a resume is started from an example (see
   * `markSeeded`), and it only covers the quiet fields — the ones no design
   * prints as readable text, so the author never sees them and never thinks
   * to correct them.
   *
   * A mark is a claim about a VALUE, so it stops applying the moment the
   * author edits that field: nothing has to remember to clear it. Exporters
   * drop a still-seeded value (see `withoutSeeded`), and the map itself lives
   * outside `content`/`metadata` so no export can ever carry it.
   */
  seeded: z.record(z.string()).optional(),
})

export type ResumeDocument = z.infer<typeof ResumeDocumentSchema>

/**
 * A valid JSON Resume export shape. Content fields sit at the top level and our
 * metadata is namespaced under `meta.cvaurum` so the file remains importable by
 * other JSON Resume tools.
 */
export interface JsonResumeExport extends Omit<ResumeContent, 'custom'> {
  custom?: ResumeContent['custom']
  meta: {
    canonical?: string
    version?: string
    lastModified?: string
    cvaurum?: Metadata & {
      title?: string
      jobDescription?: string
      /**
       * The rich-text ORIGINAL of every field whose top-level value had to be
       * flattened to plain text for the JSON Resume consumer: field path ->
       * the sanitized HTML the editor holds. Re-importing restores it, so the
       * round trip is exact, while a plain JSON Resume reader still sees the
       * words and nothing else.
       */
      rich?: Record<string, string>
    }
  }
}
