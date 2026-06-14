/**
 * CVAurum data model.
 *
 * The resume CONTENT follows the JSON Resume schema (https://jsonresume.org/schema)
 * for instant interoperability with the wider ecosystem (importers, validators,
 * hundreds of community themes). Everything visual/structural lives in `metadata`,
 * which is a CVAurum extension (`meta.cvaurum`) so an exported document is still
 * a valid JSON Resume document.
 *
 * Zod schemas double as runtime validators for safe import of untrusted JSON.
 */
import { z } from 'zod'

/* ------------------------------------------------------------------ basics */

export const LocationSchema = z.object({
  address: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  countryCode: z.string().optional(),
  region: z.string().optional(),
})

export const ProfileSchema = z.object({
  id: z.string().optional(),
  network: z.string().optional().default(''),
  username: z.string().optional().default(''),
  url: z.string().optional().default(''),
})

export const BasicsSchema = z.object({
  name: z.string().default(''),
  label: z.string().optional().default(''),
  image: z.string().optional().default(''),
  email: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  url: z.string().optional().default(''),
  /** Rich-text (sanitized HTML) professional summary. */
  summary: z.string().optional().default(''),
  location: LocationSchema.optional().default({}),
  profiles: z.array(ProfileSchema).optional().default([]),
})

/* ------------------------------------------------------------ section items */

export const WorkSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional().default(''), // company
  position: z.string().optional().default(''),
  url: z.string().optional().default(''),
  location: z.string().optional().default(''),
  startDate: z.string().optional().default(''),
  endDate: z.string().optional().default(''),
  /** rich-text HTML summary line(s) */
  summary: z.string().optional().default(''),
  /** rich-text HTML bullet points */
  highlights: z.array(z.string()).optional().default([]),
})

export const EducationSchema = z.object({
  id: z.string().optional(),
  institution: z.string().optional().default(''),
  url: z.string().optional().default(''),
  area: z.string().optional().default(''),
  studyType: z.string().optional().default(''),
  location: z.string().optional().default(''),
  startDate: z.string().optional().default(''),
  endDate: z.string().optional().default(''),
  score: z.string().optional().default(''),
  summary: z.string().optional().default(''),
  courses: z.array(z.string()).optional().default([]),
})

export const ProjectSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional().default(''),
  description: z.string().optional().default(''),
  url: z.string().optional().default(''),
  startDate: z.string().optional().default(''),
  endDate: z.string().optional().default(''),
  highlights: z.array(z.string()).optional().default([]),
  keywords: z.array(z.string()).optional().default([]),
})

export const SkillSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional().default(''),
  level: z.string().optional().default(''),
  /** 0-5 proficiency for visual level meters (CVAurum extension) */
  rating: z.number().min(0).max(5).optional().catch(undefined),
  keywords: z.array(z.string()).optional().default([]),
})

export const AwardSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional().default(''),
  date: z.string().optional().default(''),
  awarder: z.string().optional().default(''),
  summary: z.string().optional().default(''),
})

export const CertificateSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional().default(''),
  date: z.string().optional().default(''),
  issuer: z.string().optional().default(''),
  url: z.string().optional().default(''),
})

export const PublicationSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional().default(''),
  publisher: z.string().optional().default(''),
  releaseDate: z.string().optional().default(''),
  url: z.string().optional().default(''),
  summary: z.string().optional().default(''),
})

export const LanguageSchema = z.object({
  id: z.string().optional(),
  language: z.string().optional().default(''),
  fluency: z.string().optional().default(''),
  /** 0-5 for visual meters (CVAurum extension) */
  rating: z.number().min(0).max(5).optional().catch(undefined),
})

export const InterestSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional().default(''),
  keywords: z.array(z.string()).optional().default([]),
})

export const ReferenceSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional().default(''),
  reference: z.string().optional().default(''),
})

export const VolunteerSchema = z.object({
  id: z.string().optional(),
  organization: z.string().optional().default(''),
  position: z.string().optional().default(''),
  url: z.string().optional().default(''),
  startDate: z.string().optional().default(''),
  endDate: z.string().optional().default(''),
  summary: z.string().optional().default(''),
  highlights: z.array(z.string()).optional().default([]),
})

/** A free-form custom section item (CVAurum extension). */
export const CustomItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional().default(''),
  subtitle: z.string().optional().default(''),
  date: z.string().optional().default(''),
  location: z.string().optional().default(''),
  url: z.string().optional().default(''),
  summary: z.string().optional().default(''),
  highlights: z.array(z.string()).optional().default([]),
})

export const CustomSectionSchema = z.object({
  id: z.string().default(''), // back-filled by ensureIds so a missing id can't reject the import
  name: z.string().default('Custom Section'),
  items: z.array(CustomItemSchema).default([]),
})

/* ------------------------------------------------------------- type exports */

export type Location = z.infer<typeof LocationSchema>
export type Profile = z.infer<typeof ProfileSchema>
export type Basics = z.infer<typeof BasicsSchema>
export type Work = z.infer<typeof WorkSchema>
export type Education = z.infer<typeof EducationSchema>
export type Project = z.infer<typeof ProjectSchema>
export type Skill = z.infer<typeof SkillSchema>
export type Award = z.infer<typeof AwardSchema>
export type Certificate = z.infer<typeof CertificateSchema>
export type Publication = z.infer<typeof PublicationSchema>
export type Language = z.infer<typeof LanguageSchema>
export type Interest = z.infer<typeof InterestSchema>
export type Reference = z.infer<typeof ReferenceSchema>
export type Volunteer = z.infer<typeof VolunteerSchema>
export type CustomItem = z.infer<typeof CustomItemSchema>
export type CustomSection = z.infer<typeof CustomSectionSchema>
