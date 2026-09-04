import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { headingCase, headingCaseClasses, headingVars, typeScaleVars, FONT_WEIGHTS, OFFERED_WEIGHTS } from './typeStyle'
import { MetadataSchema } from '@/types/metadata'

/**
 * The per-element type scale, the heading case and the two weights are
 * resolved here for the canvas and the Word export alike, so a heading the
 * page sets in small caps is marked small caps in Word from the same answer.
 */
const typo = (over: Record<string, unknown> = {}) => MetadataSchema.parse({ typography: over }).typography

describe('headingCase', () => {
  it('an explicit choice wins over the legacy uppercase flag', () => {
    expect(headingCase(typo({ headingCase: 'smallcaps', uppercaseHeadings: true }))).toBe('smallcaps')
    expect(headingCase(typo({ headingCase: 'none', uppercaseHeadings: true }))).toBe('none')
    expect(headingCase(typo({ headingCase: 'upper', uppercaseHeadings: false }))).toBe('upper')
  })

  it('without one, the flag means upper and nothing else is decided', () => {
    // Undecided is not 'none': a template that sets its own small caps keeps
    // them, exactly as it did before the choice existed.
    expect(headingCase(typo({ uppercaseHeadings: true }))).toBe('upper')
    expect(headingCase(typo({ uppercaseHeadings: false }))).toBeUndefined()
  })
})

describe('headingCaseClasses', () => {
  it('keeps the legacy root class for the flag alone', () => {
    expect(headingCaseClasses(typo({ uppercaseHeadings: true }))).toBe('rm-uppercase')
    expect(headingCaseClasses(typo({ uppercaseHeadings: false }))).toBe('')
  })

  it('adds an override class the template cannot outrank', () => {
    expect(headingCaseClasses(typo({ headingCase: 'upper', uppercaseHeadings: false }))).toBe('rm-uppercase rm-case-upper')
    expect(headingCaseClasses(typo({ headingCase: 'smallcaps', uppercaseHeadings: true }))).toBe('rm-case-smallcaps')
    expect(headingCaseClasses(typo({ headingCase: 'none', uppercaseHeadings: true }))).toBe('rm-case-none')
  })
})

describe('typeScaleVars', () => {
  it('a document on defaults multiplies nothing and sets no weight', () => {
    expect(typeScaleVars(typo())).toEqual({
      '--rm-section-title-mul': '1',
      '--rm-headline-mul': '1',
      '--rm-contact-mul': '1',
    })
  })

  it('scales ride over the stock ratios, weights appear only when chosen', () => {
    const v = typeScaleVars(
      typo({ sectionTitleScale: 1.325, headlineScale: 0.92, contactScale: 1.14, nameWeight: 'light', headingWeight: 'regular' })
    )
    expect(v).toEqual({
      '--rm-section-title-mul': '1.25',
      '--rm-headline-mul': '0.8',
      '--rm-contact-mul': '1.2',
      '--rm-name-weight': '300',
      '--rm-heading-weight': '400',
    })
  })
})

describe('FONT_WEIGHTS', () => {
  it('maps the three named weights onto CSS numbers', () => {
    expect(FONT_WEIGHTS).toEqual({ bold: 700, regular: 400, light: 300 })
  })
})

describe('OFFERED_WEIGHTS', () => {
  // A weight the panel offers must draw differently from its neighbours in
  // every output, which needs a bundled face at that exact number: the canvas
  // synthesises nothing lighter than the lightest face it has, and the PDF
  // painter picks the nearest static face. The bundled set is the registry
  // in src/data/fonts.ts (families without a list get the fetch script's
  // default four) and the generated @font-face rules in src/styles/fonts.css;
  // both must carry every offered weight, or the button is a no-op.
  const here = path.dirname(fileURLToPath(import.meta.url))
  const css = fs.readFileSync(path.join(here, '..', 'styles', 'fonts.css'), 'utf8')
  const cssWeights = new Set([...css.matchAll(/font-weight:\s*(\d+)/g)].map((m) => Number(m[1])))

  it('offers only named weights with at least one bundled face', async () => {
    const { FONTS } = await import('@/data/fonts')
    const registry = new Set(FONTS.flatMap((f) => f.weights ?? [400, 500, 600, 700]))
    for (const name of OFFERED_WEIGHTS) {
      const w = FONT_WEIGHTS[name]
      expect(registry.has(w), `${name} (${w}) has no face in the registry`).toBe(true)
      expect(cssWeights.has(w), `${name} (${w}) has no @font-face rule`).toBe(true)
    }
  })

  it('leaves out light until a face lighter than regular ships', () => {
    // The schema keeps 'light' so an old document still parses; the panel
    // hides it because nothing bundled is lighter than 400 and the button
    // would draw exactly what Regular draws.
    expect(cssWeights.has(FONT_WEIGHTS.light)).toBe(false)
    expect(OFFERED_WEIGHTS).toEqual(['bold', 'regular'])
  })
})

describe('headingVars', () => {
  // The gap multiplier is always present, so the stylesheet's calc has a
  // number to multiply by; the rule width is emitted only when chosen, so an
  // unset width leaves every template's own rule in place.
  it('a document on defaults emits the stock gap and no rule width', () => {
    expect(headingVars(typo())).toEqual({ '--rm-heading-gap': '1' })
  })

  it('the gap rides the multiplier and a chosen rule width becomes pixels', () => {
    expect(headingVars(typo({ headingGap: 1.5, headingRuleWidth: 2 }))).toEqual({
      '--rm-heading-gap': '1.5',
      '--rm-heading-rule': '2px',
    })
    expect(headingVars(typo({ headingRuleWidth: 1 }))['--rm-heading-rule']).toBe('1px')
  })
})
