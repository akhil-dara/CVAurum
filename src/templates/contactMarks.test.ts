/**
 * Every mark between contacts sits AFTER a contact, never before one (a
 * wrapped line must not open on a stray mark), and only on an inline line -
 * pills, the strip and a stacked list separate their details by themselves.
 * Before 2026-10-24 eight designs drew theirs before each contact with air
 * on one side only, so the mark leaned on one neighbour in the PDF.
 */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const css = fs.readFileSync(path.join(here, 'templates.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ sel: m[1].trim().replace(/\s+/g, ' '), body: m[2] }))

describe('template contact marks', () => {
  it('no design draws a mark before a contact', () => {
    const before = rules.filter((r) => /\.rm-contact \+ \.rm-contact::before/.test(r.sel))
    expect(before.map((r) => r.sel)).toEqual([])
  })

  it('each mark after a contact is limited to an inline line and carries air on both sides', () => {
    const marks = rules.filter((r) => /\.rm-contact:not\(:last-child\)::after/.test(r.sel) && /content\s*:/.test(r.body))
    expect(marks.length).toBeGreaterThanOrEqual(8)
    for (const r of marks) {
      expect(r.sel, r.sel).toContain('.rm-contacts-inline')
      expect(r.body, r.sel).toMatch(/margin-left\s*:/)
      expect(r.body, r.sel).toMatch(/margin-right\s*:/)
    }
  })
})
