import { describe, expect, it } from 'vitest'
import { TEMPLATES } from '@/templates/registry'
import { LIBRARY } from '@/data/library'
import { GUIDES } from '@/data/guides'
import {
  examplesPageMeta,
  galleryPageMeta,
  galleryStaticHtml,
  guidePageMeta,
  guideStaticHtml,
  guidesHubPageMeta,
  guidesHubStaticHtml,
  promptsPageMeta,
  promptsStaticHtml,
  samplePageMeta,
  staticHtml,
  templatePageMeta,
} from './seoPages'
import { examplesStaticHtml, sampleStaticHtml } from './seoLibrary'
import { plainResume } from './searchSpelling'

/**
 * People search "resume", not "résumé". The body copy may keep the accent,
 * but the three places a search engine reads first - the title, the meta
 * description and the h1 - use the spelling people type (audit, 2026-11-07:
 * 109 h1s and 12 descriptions still carried the accent, and the static
 * example h1 disagreed with the React one, which already said "resume").
 */
describe('the spelling people search for', () => {
  it('plainResume drops the accents and keeps the case', () => {
    expect(plainResume('108 résumé examples · Résumé · RÉSUMÉ')).toBe('108 resume examples · Resume · RESUME')
    expect(plainResume('no change here')).toBe('no change here')
  })

  const metas = [
    galleryPageMeta(),
    examplesPageMeta(),
    promptsPageMeta(),
    guidesHubPageMeta(),
    ...TEMPLATES.map((t) => templatePageMeta(t.id)),
    ...LIBRARY.map((s) => samplePageMeta(s.slug)),
    ...GUIDES.map((g) => guidePageMeta(g.slug)),
  ]
  const accented = /r[ée]sum[ée]/i
  const hasAccent = (s: string) => /résumé|résume|resumé/i.test(s)

  it('no public title or meta description carries the accent', () => {
    for (const m of metas) {
      expect(hasAccent(m.title), m.title).toBe(false)
      expect(hasAccent(m.description), `${m.title}: ${m.description}`).toBe(false)
    }
    expect(accented.test('resume')).toBe(true)
  })

  it('no public h1 carries the accent', () => {
    const pages = [
      galleryStaticHtml(),
      examplesStaticHtml(),
      promptsStaticHtml(),
      guidesHubStaticHtml(),
      ...TEMPLATES.map((t) => staticHtml(t.id)),
      ...LIBRARY.map((s) => sampleStaticHtml(s.slug)),
      ...GUIDES.map((g) => guideStaticHtml(g.slug)),
    ]
    for (const html of pages) {
      const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? ''
      expect(hasAccent(h1), h1).toBe(false)
    }
  })
})
