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
    const claims = [...html.matchAll(/(\d+)\s+(?:premium\s+)?(?:templates|designs)/g)].map((m) => Number(m[1]))
    expect(claims.length).toBeGreaterThan(0)
    for (const c of claims) expect(c).toBe(TEMPLATE_COUNT)
  })
})
