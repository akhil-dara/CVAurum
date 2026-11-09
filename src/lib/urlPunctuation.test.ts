import { describe, expect, it } from 'vitest'
import { TEMPLATES } from '@/templates/registry'
import { LIBRARY } from '@/data/library'
import { GUIDES } from '@/data/guides'
import {
  PROMPTS,
  galleryMarkdown,
  guideMarkdown,
  guidesHubMarkdown,
  landingMarkdown,
  llmsFullTxt,
  llmsTxt,
  promptsMarkdown,
  skillMd,
  templateMarkdown,
} from './seoPages'
import { examplesMarkdown, sampleMarkdown } from './seoLibrary'

/**
 * A bare URL in plain text is turned into a link by whoever reads it, and a
 * crawler's link-finder keeps punctuation glued to the end: Search Console
 * listed /sitemap.xml; (a 404) and /skills/cvaurum/SKILL.md; (a soft 404),
 * both from sentences in llms-full.txt and a prompt that ran "…sitemap.xml;
 * the sitemap…" (2026-11-09). A URL in the text the site publishes for
 * machines ends at whitespace, or is wrapped (<url>, a Markdown link).
 */
describe('bare URLs in the text the site publishes', () => {
  const texts: [string, string][] = [
    ['llms.txt', llmsTxt()],
    ['llms-full.txt', llmsFullTxt()],
    ['SKILL.md', skillMd()],
    ['index.md', landingMarkdown()],
    ['templates.md', galleryMarkdown()],
    ['prompts.md', promptsMarkdown()],
    ['guides.md', guidesHubMarkdown()],
    ['examples.md', examplesMarkdown()],
    ...PROMPTS.map((p): [string, string] => [`prompt ${p.id}`, p.prompt]),
    ...TEMPLATES.map((t): [string, string] => [`${t.id}.md`, templateMarkdown(t.id)]),
    ...LIBRARY.map((s): [string, string] => [`${s.slug}.md`, sampleMarkdown(s.slug)]),
    ...GUIDES.map((g): [string, string] => [`${g.slug}.md`, guideMarkdown(g.slug)]),
  ]

  /** Each bare URL token: not a Markdown link's target `](…)` and not an
   *  autolink `<…>`, both of which say exactly where the URL ends. */
  function bareUrls(text: string): string[] {
    const out: string[] = []
    for (const m of text.matchAll(/https?:\/\/[^\s<>`[\]]+/g)) {
      const before = text.slice(Math.max(0, m.index - 2), m.index)
      if (before === '](' || before.endsWith('<')) continue
      out.push(m[0])
    }
    return out
  }

  it('never end in punctuation a link-finder would keep', () => {
    const bad: string[] = []
    for (const [name, text] of texts) {
      for (const url of bareUrls(text)) {
        if (/[;,:.)'"’”]$/.test(url)) bad.push(`${name}: ${url}`)
      }
    }
    expect(bad).toEqual([])
  })

  /** "/templates/<id>.md" reads as a pattern to a person and as an address to
   *  a crawler, which requested it and got a 404. */
  it('never put a <placeholder> inside a URL', () => {
    const bad: string[] = []
    for (const [name, text] of texts) {
      for (const m of text.matchAll(/https?:\/\/[^\s"`]*?<(?:id|slug|guide)>/g)) bad.push(`${name}: ${m[0]}`)
    }
    expect(bad).toEqual([])
  })

  it('finds the punctuation it is looking for', () => {
    expect(bareUrls('see https://cvaurum.com/app. Then')).toEqual(['https://cvaurum.com/app.'])
    expect(bareUrls('(at https://cvaurum.com/app)')).toEqual(['https://cvaurum.com/app)'])
    expect(bareUrls('[app](https://cvaurum.com/app) and <https://cvaurum.com/app>.')).toEqual([])
  })
})
