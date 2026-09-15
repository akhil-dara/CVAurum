import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { defaultMetadata } from '@/data/defaults'
import { applyTemplateToMetadata } from '@/lib/templateApply'
import { MetadataSchema } from '@/types/metadata'
import { getTemplate } from './registry'

/**
 * Measure: the design modelled on a page set by a typesetting engine.
 *
 * Every number here was read off that page's own text layer, so the test is a
 * record of the measurement as much as a guard: A4, a 43.2pt (0.6in) side
 * margin, a 10pt body on a 12.0pt baseline, a 20.7pt name, a contact line at
 * 0.9 of the body, section titles at the BODY size differing by case and a
 * rule alone, and justified prose.
 */
const measure = getTemplate('measure')

describe('the Measure design states the page it was measured from', () => {
  it('is A4-shaped single-column type with nothing drawn on it', () => {
    expect(measure.defaults.layout.columns).toBe(1)
    expect(measure.defaults.layout.icons).toBe(false)
    expect(measure.header).toBe('centered')
    expect(measure.section).toBe('underline')
  })

  it('carries the measured type', () => {
    const t = measure.defaults.typography
    expect(t.fontSize).toBe(10)
    expect(t.lineHeight).toBe(1.2)
    expect(t.letterSpacing).toBe(0)
    // 20.66 / 9.96 off the source's name.
    expect(t.nameScale).toBe(2.07)
    expect(t.uppercaseHeadings).toBe(true)
  })

  /**
   * The two that make it this design rather than a quiet serif: the prose is
   * justified, and a section title is NOT bold - in the source its stems
   * measure 83 thousandths of its type size against the body's 66 and the
   * bold face's 116, so case and the rule carry the hierarchy on their own.
   */
  it('is justified, and its section titles are not bold', () => {
    expect(measure.defaults.typography.align).toBe('justify')
    expect(measure.defaults.typography.headingWeight).toBe('regular')
  })

  it('names a face the app bundles', () => {
    const fonts = readFileSync('src/styles/fonts.css', 'utf8')
    const t = measure.defaults.typography
    for (const f of [t.fontFamily, t.headingFamily, t.nameFamily]) expect(fonts).toContain(`font-family: '${f}'`)
  })

  it('is a document the schema accepts', () => {
    expect(MetadataSchema.safeParse(measure.defaults).success).toBe(true)
  })
})

/**
 * Stating a value is not the same as a page getting it. applyTemplateToMetadata
 * keeps a long list of fields from the DOCUMENT so that a switch never resets
 * an author's own choice - and for three of them that meant no template could
 * ever state one at all: an alignment, a heading weight and a contact
 * separator written in the registry were dropped on the floor every time.
 * These are the fields this design cannot be drawn without.
 */
describe('picking the design actually hands the document its identity', () => {
  const fresh = () => applyTemplateToMetadata(defaultMetadata(), measure.defaults)

  it('a résumé that never chose gets the justification, the weight and the separator', () => {
    const m = fresh()
    expect(m.typography.align).toBe('justify')
    expect(m.typography.headingWeight).toBe('regular')
    expect(m.layout.contactSeparator).toBe('dash')
  })

  it('and the rest of the measured type with them', () => {
    const m = fresh()
    expect(m.typography.fontSize).toBe(10)
    expect(m.typography.lineHeight).toBe(1.2)
    expect(m.typography.nameScale).toBe(2.07)
    expect(m.layout.sectionGap).toBe(5)
  })

  it("but an author's own choice still outranks it, in both directions", () => {
    // Justified by the author, switching to a design that says nothing:
    const chose = MetadataSchema.parse({ template: 'plainsong', typography: { align: 'justify', headingWeight: 'bold' } })
    const next = applyTemplateToMetadata(chose, getTemplate('bare').defaults)
    expect(next.typography.align).toBe('justify')
    expect(next.typography.headingWeight).toBe('bold')
    // ...and a hand-set weight is not replaced by this design's own.
    expect(applyTemplateToMetadata(chose, measure.defaults).typography.headingWeight).toBe('bold')
  })
})

/**
 * The measure itself - the 0.6in side margin - is the one number a template
 * cannot say in its defaults: page.margin is the author's and is carried
 * across every switch. It lives in templates.css, and WHERE it lives is the
 * whole trick: --rm-pad is written inline on .rm-root, an inline declaration
 * beats any stylesheet rule on that element, and a custom property may not
 * reference itself even across inheritance. So the page margin is read into a
 * second name one level down and multiplied one level below that. A rule that
 * set either on .rm-root would be dead, exactly as the stepped-shade rules
 * would be (registry.test.ts pins the same trap for those).
 */
describe('the measure is set where a stylesheet can win', () => {
  const css = readFileSync('src/templates/templates.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
    selector: m[1].trim().replace(/\s+/g, ' '),
    body: m[2],
  }))

  it('gives the design a scoped block of its own', () => {
    expect(css).toContain('.tpl-measure ')
  })

  it('declares the padding below the root, never on it', () => {
    const pad = rules.filter((r) => /--rm-pad\s*:/.test(r.body) && r.selector.includes('.tpl-measure'))
    expect(pad.length).toBeGreaterThan(0)
    for (const r of pad)
      for (const part of r.selector.split(',')) expect(part.trim().split(/\s+/).length, r.selector).toBeGreaterThan(1)
  })

  it('scales the author\'s margin rather than pinning one, so the slider still moves the page', () => {
    const pad = rules.find((r) => /--rm-pad\s*:/.test(r.body) && r.selector.includes('.tpl-measure'))!
    // 15.24mm (0.6in) over the schema's own 13mm.
    expect(pad.body).toContain('1.1723')
    expect(pad.body).toContain('var(--rm-page-margin)')
  })
})
