import type { ResumeContent } from '@/types/document'
import type { Metadata } from '@/types/metadata'

/**
 * The résumé sample library: a browsable collection of complete, believable
 * résumés, one page each, that a visitor can read and open in the editor.
 *
 * Every person, company, address, phone number and email in here is invented.
 * Phone numbers use the ranges reserved for fiction (555 in North America,
 * Ofcom's 7946 0xxx in the UK, and a 12345 prefix in India, which is not a
 * valid mobile series), and every address is on example.com. Employers are
 * invented too: a sample is just as useful with a made-up firm, and inventing
 * them keeps other companies' names and marks out of a public, MIT-licensed
 * repository. Universities and schools are real, as they are in any résumé.
 */

/** The shelves the library is browsed by. */
export const LIBRARY_CATEGORIES = [
  'software',
  'data',
  'engineering',
  'design',
  'marketing',
  'business',
  'finance',
  'healthcare',
  'education',
  'legal',
  'operations',
  'student',
] as const
export type LibraryCategory = (typeof LIBRARY_CATEGORIES)[number]

export const CATEGORY_LABELS: Record<LibraryCategory, string> = {
  software: 'Software',
  data: 'Data & Analytics',
  engineering: 'Engineering',
  design: 'Design',
  marketing: 'Marketing',
  business: 'Business',
  finance: 'Finance',
  healthcare: 'Healthcare',
  education: 'Education',
  legal: 'Legal',
  operations: 'Operations',
  student: 'Students & Graduates',
}

/** How far into a career the sample sits. Drives the writing, and the filter. */
export const SENIORITIES = ['student', 'entry', 'mid', 'senior', 'lead'] as const
export type Seniority = (typeof SENIORITIES)[number]

export const SENIORITY_LABELS: Record<Seniority, string> = {
  student: 'Student',
  entry: 'Entry level',
  mid: 'Mid level',
  senior: 'Senior',
  lead: 'Lead & above',
}

/** Where the résumé is written for: it changes the phone shape, the address,
 *  the spelling, the degree names and what a reader expects to see. */
export const REGIONS = ['india', 'us', 'uk'] as const
export type Region = (typeof REGIONS)[number]

export const REGION_LABELS: Record<Region, string> = {
  india: 'India',
  us: 'United States',
  uk: 'United Kingdom',
}

export interface LibrarySample {
  /** URL segment, and the id everything else keys on. */
  slug: string
  /** The job this résumé is written for, as a person would search it. */
  role: string
  category: LibraryCategory
  seniority: Seniority
  region: Region
  /** The design it is shown in. */
  template: string
  /** One sentence for the card and the page's description. */
  blurb: string
  /** What a reader might search for to land here. */
  keywords: string[]
  content: ResumeContent
  /** Per-sample polish applied after the template's own defaults. */
  tweaks?: (m: Metadata) => void
}

/**
 * A monogram for an invented employer: a rounded tile with its initials, as
 * an inline SVG data URI. No file to fetch, nothing external, and no other
 * company's mark anywhere near the page.
 */
export function monogram(letters: string, bg: string, fg = '#ffffff'): string {
  const size = letters.length > 1 ? 24 : 32
  return (
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${bg}"/><text x="32" y="43" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="700" fill="${fg}" text-anchor="middle">${letters}</text></svg>`
    )
  )
}

/** Fills the required-but-empty lists so every sample is schema-complete. */
export function content(over: Partial<ResumeContent> & { basics: ResumeContent['basics'] }): ResumeContent {
  return {
    work: [],
    volunteer: [],
    education: [],
    awards: [],
    certificates: [],
    publications: [],
    skills: [],
    languages: [],
    interests: [],
    references: [],
    projects: [],
    custom: [],
    ...over,
  }
}
