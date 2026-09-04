import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { sectionOverrideClasses } from './sectionClasses'

/**
 * The per-section style overrides become scoped classes on the section
 * element, where the stylesheet's .rm-root-anchored rules beat any template's
 * own. A section that decided nothing gets no class at all.
 */
describe('sectionOverrideClasses', () => {
  it('a section with no settings adds nothing', () => {
    expect(sectionOverrideClasses(undefined)).toEqual([])
    expect(sectionOverrideClasses({})).toEqual([])
  })

  it('a centred heading is a class the alignment rules key on; left is one too', () => {
    expect(sectionOverrideClasses({ headingAlign: 'center' })).toEqual(['sec-align-center'])
    expect(sectionOverrideClasses({ headingAlign: 'left' })).toEqual(['sec-align-left'])
  })

  it('the existing overrides keep their classes, in the order the stylesheet expects', () => {
    expect(sectionOverrideClasses({ headingStyle: 'rule-after', skillsStyle: 'chips', chipSize: 's', entryLayout: 'cards', scoreStyle: 'pill', headingAlign: 'center' })).toEqual([
      'sec-ov-rule-after',
      'skl-ov-chips',
      'chip-s',
      'lay-ov-cards',
      'score-ov-pill',
      'sec-align-center',
    ])
  })
})

describe('a fixed-width marker under a section title follows a centred heading', () => {
  // A template that draws its partial rule as an absolutely positioned box
  // at the left edge (a short underline marker, not a flex item) is not
  // moved by text-align: the words go to the middle and the marker stays
  // pinned left. Each such marker needs a centred twin that shifts the box
  // to the middle by its own half width, as a plain left offset the export
  // already places from computed style (no transform, no gradient).
  const here = path.dirname(fileURLToPath(import.meta.url))
  const css = fs.readFileSync(path.join(here, '../templates.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

  type Rule = { selector: string; body: string }
  const rules: Rule[] = []
  const re = /([^{}]+)\{([^{}]*)\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(css))) rules.push({ selector: m[1].trim().replace(/\s+/g, ' '), body: m[2] })

  const markers = rules.filter(
    (r) =>
      /^\.tpl-[\w-]+ \.rm-section-title::(after|before)$/.test(r.selector) &&
      /position\s*:\s*absolute/.test(r.body) &&
      /(?:^|;|\s)width\s*:\s*[\d.]+em/.test(r.body) &&
      !/(?:^|;|\s)right\s*:/.test(r.body),
  )

  it('the audit sees the markers it guards', () => {
    expect(markers.map((r) => r.selector)).toContain('.tpl-aurum .rm-section-title::after')
  })

  for (const marker of markers) {
    const [, tpl, pseudo] = /^(\.tpl-[\w-]+) \.rm-section-title::(after|before)$/.exec(marker.selector)!
    const width = /(?:^|;|\s)width\s*:\s*([\d.]+)em/.exec(marker.body)![1]
    it(`${tpl}: the centred twin shifts the ${width}em marker left by half its width`, () => {
      const twin = rules.find((r) => r.selector === `${tpl} .rm-section.sec-align-center .rm-section-title::${pseudo}`)
      expect(twin, `no centred twin for ${marker.selector}`).toBeDefined()
      const left = /(?:^|;|\s)left\s*:\s*calc\(50% - ([\d.]+)em\)/.exec(twin!.body)
      expect(left, `twin must set left: calc(50% - <half width>em)`).not.toBeNull()
      expect(Number(left![1])).toBeCloseTo(Number(width) / 2, 5)
      expect(twin!.body).not.toMatch(/transform|gradient/)
    })
  }
})
