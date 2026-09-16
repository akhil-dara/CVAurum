import { describe, it, expect } from 'vitest'
import { siteMenuItems } from './siteNav'

/**
 * The list the phone menu is made of.
 *
 * What can go wrong here is quiet: a destination added to the desk <nav> and
 * forgotten in the sheet is invisible on a desk and is the whole bug on a
 * phone. So the roster is asserted by name, not by count.
 *
 * The sheet's own behaviour — the focus trap, Escape, the scrim, the 48px
 * rows, the 44px button — needs a real DOM and a real pointer, and this
 * repo's runner has neither (vitest.config.ts: environment 'node', no jsdom).
 * That half is measured in the browser instead, at 375x812 on all four public
 * pages; see _local/phone-menu/phone-menu-probe.cjs.
 */
const REPO = 'https://example.invalid/repo'
const keys = (o: Parameters<typeof siteMenuItems>[0]) => siteMenuItems(o).map((i) => i.key)

describe('what the phone menu offers', () => {
  it('carries every destination the desk header has', () => {
    expect(keys({ current: 'templates', repoUrl: REPO, canCreate: true })).toEqual([
      'home',
      'templates',
      'examples',
      'prompts',
      'how',
      'compare',
      'privacy',
      'app',
      'create',
      'github',
    ])
  })

  it('leaves Create out where the header has no Create button', () => {
    // The single-template and single-example pages: `<SiteHeader current=… />`
    // with no action of its own.
    expect(keys({ current: 'templates', repoUrl: REPO })).not.toContain('create')
    expect(keys({ current: 'templates', repoUrl: REPO })).toContain('prompts')
  })

  it('sends GitHub off the site and keeps everything else on it', () => {
    const items = siteMenuItems({ current: null, repoUrl: REPO })
    const github = items.find((i) => i.key === 'github')
    expect(github?.href).toBe(REPO)
    expect(github?.external).toBe(true)
    expect(items.filter((i) => i.external).map((i) => i.key)).toEqual(['github'])
  })
})

describe('marking the page the reader is already on', () => {
  it('marks exactly one row per public page', () => {
    for (const [current, key] of [
      ['home', 'home'],
      ['templates', 'templates'],
      ['examples', 'examples'],
      ['prompts', 'prompts'],
    ] as const) {
      const active = siteMenuItems({ current, repoUrl: REPO, canCreate: true }).filter((i) => i.active)
      expect(active.map((i) => i.key)).toEqual([key])
    }
  })

  it('marks nothing on a page that is none of them', () => {
    // /templates/<id> and /examples/<slug> pass their gallery's section, but a
    // page with no section at all (or a future one) must not mark a row.
    expect(siteMenuItems({ repoUrl: REPO }).some((i) => i.active)).toBe(false)
    expect(siteMenuItems({ current: null, repoUrl: REPO }).some((i) => i.active)).toBe(false)
  })
})

describe('the landing page anchors', () => {
  const hrefs = (current: 'home' | 'templates') =>
    siteMenuItems({ current, repoUrl: REPO })
      .filter((i) => i.group === 'about')
      .map((i) => i.href)

  it('are a same-page jump on the landing page', () => {
    expect(hrefs('home')).toEqual(['#how', '#compare', '#privacy'])
  })

  it('are a real navigation from anywhere else, which is what scrolls to them', () => {
    expect(hrefs('templates')).toEqual(['/#how', '/#compare', '/#privacy'])
  })
})

describe('the reader’s own résumés', () => {
  it('shows how many are saved', () => {
    const item = (n: number) => siteMenuItems({ repoUrl: REPO, libraryCount: n }).find((i) => i.key === 'app')
    expect(item(3)?.note).toBe('3')
    expect(item(1)?.note).toBe('1')
  })

  it('says nothing at all when none are', () => {
    const item = siteMenuItems({ repoUrl: REPO, libraryCount: 0 }).find((i) => i.key === 'app')
    expect(item?.note).toBeUndefined()
    expect(item?.to).toBe('/app')
  })
})
