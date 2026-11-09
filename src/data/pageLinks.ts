import { guideBySlug } from '@/data/guides'
import { GUIDES_HUB, sampleGuideLinks, templateGuideLinks, type GuideLink } from '@/data/guideHub'
import type { Region } from '@/data/library/types'

/**
 * The links and button words a design page and an example page share between
 * their three copies: the page a person reads, the pre-rendered HTML a
 * crawler reads, and the Markdown twin. Plain data, so the routes can import
 * it without pulling the build-time SEO code into the bundle.
 *
 * Why it exists (SEO audit, 2026-11-09): the three tool pages were linked from
 * 13 of 200 pages and /guides from the home page and the guides only, and the
 * two buttons every design and example page carries said "Start a resume in
 * this design" and "Use this example" - anchors that named nothing.
 */

/** The three tool pages, each with words that say what it is. */
const TOOL_ANCHORS: readonly [slug: string, label: string][] = [
  ['free-resume-builder', 'Make it in the free resume builder'],
  ['resume-builder-no-sign-up', 'Start in a resume builder with no sign-up'],
  ['ats-resume-checker', 'Check it with the free ATS resume checker'],
]

/** Only the tool pages that exist, so a removed guide cannot leave a dead link. */
export function toolLinks(): GuideLink[] {
  return TOOL_ANCHORS.flatMap(([slug, label]) => (guideBySlug(slug) ? [{ href: `/${slug}`, label }] : []))
}

export const TOOL_PATHS: readonly string[] = toolLinks().map((l) => l.href)

/** The hub that lists every guide. */
export const ALL_GUIDES_LINK: GuideLink = { href: GUIDES_HUB.path, label: 'All guides' }

/** "Write yours:" on a design page: the writing guides, the tools, the hub. */
export function writeYoursTemplateLinks(): GuideLink[] {
  return [...templateGuideLinks(), ...toolLinks(), ALL_GUIDES_LINK]
}

/** The same row on an example page, with the CV guide for a UK sample. */
export function writeYoursSampleLinks(region: Region): GuideLink[] {
  return [...sampleGuideLinks(region), ...toolLinks(), ALL_GUIDES_LINK]
}

/** The button on a design page, naming the design. */
export function templateUseLabel(name: string): string {
  return `Use the ${name} resume template`
}

/** The button on an example page, naming the job: a CV for a UK sample. */
export function sampleEditLabel(sample: { role: string; region: Region }): string {
  return `Edit this ${sample.role} ${sample.region === 'uk' ? 'CV' : 'resume'}`
}
