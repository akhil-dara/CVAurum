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
  /** What the reader SEES for this link. Empty means "derive it from the URL",
   *  which is what every profile did before: the displayed text was the
   *  address, so wanting to show "Portfolio" instead was simply not possible,
   *  and editing the text on the canvas overwrote the address itself. */
  label: z.string().optional(),
  /** An explicit icon choice, overriding the guess made from `network`. */
  icon: z.string().optional(),
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
  /** What the reader sees for `url` - see ProfileSchema.label. */
  urlLabel: z.string().optional(),
  /** An explicit icon for the website link. Profiles could already choose one
   *  and this row could not, so the first link on the page was the only one
   *  stuck with the globe. */
  urlIcon: z.string().optional(),
  profiles: z.array(ProfileSchema).optional().default([]),
})

/* ------------------------------------------------------------ section items */

export const WorkSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional().default(''), // company
  /** small company logo, locally-encoded data URI only (CVAurum extension) */
  logo: z.string().optional(),
  /** per-entry badge override: absent follows the section's showBadges
   *  setting; true/false forces it for this entry (CVAurum extension) */
  badge: z.boolean().optional(),
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
  /** small institution logo, locally-encoded data URI only (CVAurum extension) */
  logo: z.string().optional(),
  /** per-entry badge override (see WorkSchema.badge) */
  badge: z.boolean().optional(),
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

/** One named link. The label is what the reader sees, the url is where it
 *  goes. A project routinely has more than one - a repository, a demo, a
 *  write-up - and three bare addresses read far worse than three short names. */
export const NamedLinkSchema = z.object({
  id: z.string().optional(),
  label: z.string().optional().default(''),
  url: z.string().optional().default(''),
})

export type NamedLink = z.infer<typeof NamedLinkSchema>

export const ProjectSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional().default(''),
  description: z.string().optional().default(''),
  url: z.string().optional().default(''),
  /** Further named links, printed after the description as short names rather
   *  than addresses. `url` above stays the project's primary link. */
  links: z.array(NamedLinkSchema).optional(),
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
  /** Where the award can be checked, and the short word that stands for it -
   *  the same Verify a credential line ends with. Leave the name empty and the
   *  award's own title carries the link instead. */
  url: z.string().optional(),
  urlLabel: z.string().optional(),
  summary: z.string().optional().default(''),
})

export const CertificateSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional().default(''),
  date: z.string().optional().default(''),
  issuer: z.string().optional().default(''),
  url: z.string().optional().default(''),
  /** Name the link and it is printed AFTER the issuer as a short word - the
   *  "Verify" that a credential line usually ends with - leaving the title as
   *  plain text. Leave it empty and the title itself is the link, which is how
   *  this behaved before. */
  urlLabel: z.string().optional(),
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
  /** small organization logo, locally-encoded data URI only (CVAurum extension) */
  logo: z.string().optional(),
  /** per-entry badge override (see WorkSchema.badge) */
  badge: z.boolean().optional(),
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
