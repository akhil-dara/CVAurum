import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * The entry-mark gutter widens with the most logos any entry in a section
 * shows (issue #8). Every rule that pads an entry for its mark has to pad by
 * that gutter, or the marks hang outside the entry: over the timeline's rail,
 * past a card's border. Asserted on the sheets, since nothing else sees a
 * layout rule still padding by one mark's width.
 */
const here = path.dirname(fileURLToPath(import.meta.url))
const strip = (f: string) => fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const artboard = strip(path.join(here, 'artboard.css'))
const templates = strip(path.join(here, '..', 'templates', 'templates.css'))
const rules = (css: string) =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ selector: m[1].trim().replace(/\s+/g, ' '), body: m[2] }))

describe('the entry-mark gutter', () => {
  it('pads every marked entry by the section gutter, in every entry layout', () => {
    const padding = [...rules(artboard), ...rules(templates)].filter(
      (r) => /\.rm-has-mark(?![\w-])/.test(r.selector) && /(?:^|;)\s*padding-left\s*:/.test(r.body)
    )
    expect(padding.length).toBeGreaterThanOrEqual(3) // the base rule, timeline, cards
    // 0 is the year-rail layout, which moves the content with a margin that reads the gutter itself.
    for (const r of padding) expect(r.body, r.selector).toMatch(/padding-left\s*:\s*(?:0\s*;|[^;]*var\(--rm-mark-gutter\))/)
  })

  it('top-aligns a head with a row of logos, like a head with one', () => {
    const has = rules(artboard).find((r) => r.selector.startsWith('.rm-item-head:has(') && /align-items\s*:\s*flex-start/.test(r.body))
    expect(has?.selector).toContain('> .rm-item-logos')
  })

  it('never shrinks a sidebar row of logos out of step with its gutter', () => {
    const aside = rules(artboard).filter((r) => r.selector.includes('.rm-col-aside') && r.selector.includes('.rm-item-logos'))
    expect(aside).toEqual([])
  })
})
