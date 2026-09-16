/**
 * Where the phone menu can take you — as data, so both public headers build
 * the same list and a missing destination is a failing test rather than a
 * page a phone cannot reach.
 *
 * Below `md` the header's <nav> is display:none, which is how /templates came
 * to offer a reader on a 375px phone no way at all to /prompts or /examples
 * except the footer. This is that nav, plus the two things that live in the
 * header's right-hand cluster, written once.
 */

/** Which public page the reader is on. `'home'` is the landing page. */
export type SiteMenuSection = 'home' | 'templates' | 'examples' | 'prompts' | null

/** The bands the sheet draws a hairline between: pages, the landing's own
 *  sections, and the reader's own work. */
export type SiteMenuGroup = 'pages' | 'about' | 'yours'

export interface SiteMenuItem {
  key: string
  label: string
  group: SiteMenuGroup
  /** A page of this app: a router link. */
  to?: string
  /** A landing fragment or the repository: a plain anchor. */
  href?: string
  /** Leaves the site, so it opens in its own tab. */
  external?: boolean
  /** Does something on this page instead of going anywhere. */
  action?: boolean
  /** A small trailing figure — how many résumés are saved. */
  note?: string
  /** The page the reader is already on. */
  active: boolean
}

export function siteMenuItems({
  current = null,
  repoUrl,
  libraryCount = 0,
  canCreate = false,
}: {
  current?: SiteMenuSection
  repoUrl: string
  libraryCount?: number
  canCreate?: boolean
}): SiteMenuItem[] {
  const onLanding = current === 'home'
  // The landing sections are fragment targets, and a client-side navigation to
  // another route's fragment does not scroll to it — only a real one does. So
  // these stay plain anchors from every page; on the landing itself the same
  // anchor is a same-page jump and costs no reload.
  const anchor = (id: string) => (onLanding ? `#${id}` : `/#${id}`)

  const items: SiteMenuItem[] = [
    { key: 'home', label: 'Home', group: 'pages', to: '/', active: onLanding },
    { key: 'templates', label: 'Templates', group: 'pages', to: '/templates', active: current === 'templates' },
    { key: 'examples', label: 'Examples', group: 'pages', to: '/examples', active: current === 'examples' },
    { key: 'prompts', label: 'Prompts', group: 'pages', to: '/prompts', active: current === 'prompts' },
    { key: 'how', label: 'How it works', group: 'about', href: anchor('how'), active: false },
    { key: 'compare', label: 'Compare', group: 'about', href: anchor('compare'), active: false },
    { key: 'privacy', label: 'Privacy', group: 'about', href: anchor('privacy'), active: false },
    {
      key: 'app',
      label: 'My resumes',
      group: 'yours',
      to: '/app',
      note: libraryCount ? String(libraryCount) : undefined,
      active: false,
    },
  ]
  // Only where the header itself offers it: the single-template and
  // single-example pages carry their own "start from this one" instead.
  if (canCreate) items.push({ key: 'create', label: 'Create résumé', group: 'yours', action: true, active: false })
  items.push({ key: 'github', label: 'GitHub', group: 'yours', href: repoUrl, external: true, active: false })
  return items
}
