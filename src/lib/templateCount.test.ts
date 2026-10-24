import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { TEMPLATE_COUNT, TEMPLATES } from '@/templates/registry'

describe('the collection never claims a count it does not have', () => {
  it('counts what the registry holds', () => {
    expect(TEMPLATE_COUNT).toBe(TEMPLATES.length)
  })

  // index.html is served before any script runs, so its meta tags cannot read
  // the registry. They are the one place the number is written by hand, and
  // this is what catches them the day a template is added.
  it('agrees with the static tags in index.html', () => {
    const html = readFileSync('index.html', 'utf8')
    // up to two words between the number and the noun: "68 premium
    // data-driven templates" slipped past a pattern that allowed one
    const claims = [...html.matchAll(/(\d+)\s+(?:[\w-]+\s+){0,2}(?:templates|designs)\b/g)].map((m) => Number(m[1]))
    expect(claims.length).toBeGreaterThan(0)
    for (const c of claims) expect(c).toBe(TEMPLATE_COUNT)
  })
})
