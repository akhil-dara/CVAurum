import { GUIDES, guideBySlug, type Guide } from '@/data/guides'
import type { Region } from '@/data/library/types'

/**
 * How the guides are arranged as a set: the hub at /guides, which kind of
 * page each guide is, who writes them, and which guides a design or an
 * example page points at.
 *
 * Its own small module, beside guides.ts rather than in seoPages.ts, because
 * the router, the footer, the hub route and the design and example pages all
 * read it, and none of them should pull the build-time SEO code into the
 * bundle to do so. Every copy of the hub (the route, the pre-rendered HTML,
 * the Markdown twin and the structured data) renders from what is here.
 */

/** The three pages that describe the app itself rather than give writing advice. */
const TOOL_SLUGS: readonly string[] = ['free-resume-builder', 'ats-resume-checker', 'resume-builder-no-sign-up']

/**
 * writing: advice on writing a resume; an article with an author and a date.
 * tool:    what the builder or its ATS check does; a plain page.
 * about:   who makes the site.
 */
export type GuideKind = 'writing' | 'tool' | 'about'

export function guideKind(slug: string): GuideKind {
  if (slug === 'about') return 'about'
  return TOOL_SLUGS.includes(slug) ? 'tool' : 'writing'
}

/** The person who writes the guides; the same @id the homepage's Person declares. */
export const AUTHOR = {
  id: 'https://cvaurum.com/#author',
  name: 'Akhil Dara',
  url: 'https://github.com/akhil-dara',
} as const

const ofKind = (kind: GuideKind) => GUIDES.filter((g) => guideKind(g.slug) === kind)

export interface GuideGroup {
  heading: string
  guides: readonly Guide[]
}

/** The hub's two lists, in GUIDES order within each. */
export const GUIDE_GROUPS: readonly GuideGroup[] = [
  { heading: 'Writing a resume', guides: ofKind('writing') },
  { heading: 'The free tools', guides: ofKind('tool') },
]

/** The About page, which the hub links on its own rather than as a guide. */
export const ABOUT_GUIDE: Guide | undefined = guideBySlug('about')

export const GUIDES_HUB = {
  path: '/guides',
  title: 'Resume Guides: Format, Summary, Skills and Templates · CVAurum',
  heading: 'Resume guides',
  description: `${ofKind('writing').length} guides to writing a resume (format, summary, skills, action verbs, CV and Word templates), plus ${ofKind('tool').length} free tools: the resume builder, the ATS checker and building with no sign-up.`,
  intro:
    'Each guide answers one question about a resume on one page, with links to complete example resumes and designs where they help. The tool pages say what CVAurum’s builder and ATS check do. All of it is free to read and free to use, with no account.',
} as const

/** One guide as a link: its address and its short name. */
export interface GuideLink {
  href: string
  label: string
}

function linksTo(slugs: readonly string[]): GuideLink[] {
  return slugs.flatMap((slug) => {
    const g = guideBySlug(slug)
    return g ? [{ href: `/${g.slug}`, label: g.short }] : []
  })
}

/** What a design page points at: writing the resume that goes in the design. */
export function templateGuideLinks(): GuideLink[] {
  return linksTo(['how-to-write-a-resume', 'resume-format', 'resume-template-word'])
}

/**
 * What an example page points at: the parts of a resume an example shows
 * best. A sample written for the UK is a CV there, so it also points at the
 * CV guide.
 */
export function sampleGuideLinks(region: Region): GuideLink[] {
  const base = ['resume-summary-examples', 'resume-skills', 'resume-action-verbs']
  return linksTo(region === 'uk' ? ['cv-template', ...base] : base)
}
