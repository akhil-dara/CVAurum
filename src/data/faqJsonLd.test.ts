import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { SITE } from './siteCopy'

/**
 * The homepage's FAQPage JSON-LD is written into index.html by hand, beside
 * the visible questions that come from SITE.faq. Structured data must say
 * what the page says: an answer the reader cannot see is a mismatch search
 * engines count against a page, and this one had drifted (the phone answer
 * still said the panel was the only editor; audit, 2026-11-07).
 */
describe('homepage FAQ structured data', () => {
  const html = fs.readFileSync(path.resolve(__dirname, '../../index.html'), 'utf8')
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]))
  const nodes = blocks.flatMap((b) => (b['@graph'] ? b['@graph'] : [b]))
  const faq = nodes.find((n) => n['@type'] === 'FAQPage')
  const visible = new Map(SITE.faq.map((f) => [f.q, f.a]))

  it('exists', () => expect(faq).toBeTruthy())

  it('asks only questions the page shows, answered word for word as the page answers them', () => {
    for (const q of faq.mainEntity) {
      expect(visible.has(q.name), `not on the page: ${q.name}`).toBe(true)
      expect(q.acceptedAnswer.text, q.name).toBe(visible.get(q.name))
    }
  })
})
