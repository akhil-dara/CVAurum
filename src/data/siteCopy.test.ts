import { describe, expect, it } from 'vitest'
import { SITE } from './siteCopy'
import { TEMPLATE_COUNT } from '@/templates/registry'

describe('the site copy', () => {
  it('has the facts a reader needs, once', () => {
    expect(SITE.oneLiner).toMatch(/browser/)
    expect(SITE.comparison.length).toBeGreaterThanOrEqual(5)
    expect(SITE.faq.length).toBeGreaterThanOrEqual(10)
    expect(new Set(SITE.faq.map((f) => f.q)).size).toBe(SITE.faq.length)
    expect(SITE.links.repo).toMatch(/^https:\/\/github\.com\//)
  })
  it('quotes the template count from the registry, never a stale number', () => {
    expect(SITE.oneLiner).toContain(`${TEMPLATE_COUNT} templates`)
    expect(SITE.comparison.find((r) => r.capability === 'Templates')?.cvaurum).toContain(String(TEMPLATE_COUNT))
    expect(SITE.steps[0].body).toContain(String(TEMPLATE_COUNT))
  })
  it('every step, row and answer is a sentence, not a stub', () => {
    for (const s of SITE.steps) expect(s.body.length).toBeGreaterThan(20)
    for (const r of SITE.comparison) expect(r.cvaurum.length + r.others.length).toBeGreaterThan(20)
    for (const f of SITE.faq) expect(f.a.length).toBeGreaterThan(40)
    for (const p of SITE.privacy) expect(p.length).toBeGreaterThan(20)
  })
})
