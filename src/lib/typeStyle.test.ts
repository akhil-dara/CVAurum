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

describe('every stylesheet rule that spaces or rules a section title reads its variable', () => {
  // The two heading controls reach the page only through their variables:
  // the air under a title through --rm-heading-gap, the hairline under it
  // through --rm-heading-rule. A template's own rule is a class deeper than
  // the base one and outranks it, so a heading margin or a rule width
  // written as a plain length silently ignores the slider on that template
  // alone - the kind of hole nobody notices until an author reports that a
  // control does nothing. Both sheets are parsed here, the way the element
  // colours are audited in elementColors.test.ts, and every such
  // declaration must go through the variable.
  const here = path.dirname(fileURLToPath(import.meta.url))
  const read = (rel: string) => fs.readFileSync(path.join(here, rel), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const sheets = { artboard: read('../styles/artboard.css'), templates: read('../templates/templates.css') }

  interface Rule {
    sheet: string
    selector: string
    decls: Array<{ prop: string; value: string }>
    /** the title itself is the subject of some part of the selector */
    onTitle: boolean
    /** a ::before/::after the title draws is the subject of some part */
    onMark: boolean
  }

  // The SUBJECT of a selector is its last compound. A rule ending in
  // .rm-section-title styles the heading; one ending in .rm-section-icon
  // styles the chip inside it, and the chip's own margins are the chip's
  // business (artboard.css hangs it in the gutter by them).
  const subject = (part: string) => part.trim().split(/\s*[\s>+~]\s*/).pop() ?? ''
  const isTitle = (compound: string) => /\.rm-section-title(?![\w-])/.test(compound)
  const isMark = (compound: string) => /::?(?:before|after)\b/.test(compound)

  const rules: Rule[] = []
  for (const [sheet, css] of Object.entries(sheets)) {
    const re = /([^{}]+)\{([^{}]*)\}/g
    let m: RegExpExecArray | null
    while ((m = re.exec(css))) {
      const selector = m[1].trim().replace(/\s+/g, ' ')
      const subjects = selector.split(',').map(subject).filter(isTitle)
      if (!subjects.length) continue
      const decls = m[2]
        .split(';')
        .map((d) => d.trim())
        .filter(Boolean)
        .map((d) => ({ prop: d.slice(0, d.indexOf(':')).trim(), value: d.slice(d.indexOf(':') + 1).trim() }))
      rules.push({
        sheet,
        selector,
        decls,
        onTitle: subjects.some((s) => !isMark(s)),
        onMark: subjects.some(isMark),
      })
    }
  }

  // A length of zero draws nothing, so there is nothing for a multiplier to
  // scale and nothing for a width control to set: `border-bottom: none` and
  // `margin: 0` are not opt-outs, they are the absence of the thing.
  const ZERO = /^0(?:px|em|rem|%)?$/
  const nothing = (value: string) => value === 'none' || value.split(/\s+/).every((v) => ZERO.test(v))
  const offenders = (
    take: (r: Rule, d: { prop: string; value: string }) => boolean,
    ok: (value: string) => boolean
  ) => {
    const hits = rules.flatMap((r) => r.decls.filter((d) => take(r, d)).map((d) => ({ r, d })))
    expect(hits.length).toBeGreaterThan(0)
    return hits
      .filter(({ d }) => !nothing(d.value) && !ok(d.value))
      .map(({ r, d }) => `${r.sheet}: ${r.selector} => ${d.prop}: ${d.value}`)
  }

  it('the air under a heading rides --rm-heading-gap', () => {
    // Only margins that can set the BOTTOM edge: a boxed heading centres
    // itself with `margin-left/right: auto`, which is placement, not air.
    expect(
      offenders(
        (r, d) => r.onTitle && /^margin(?:-bottom|-block|-block-end)?$/.test(d.prop),
        (v) => v.includes('var(--rm-heading-gap')
      )
    ).toEqual([])
  })

  it('the rule under a heading rides --rm-heading-rule', () => {
    expect(
      offenders(
        (r, d) => r.onTitle && /^border-(?:bottom|block-end)(?:-width)?$/.test(d.prop),
        (v) => v.includes('var(--rm-heading-rule')
      )
    ).toEqual([])
  })

  it('so does a rule a heading draws as a pseudo box', () => {
    // A mark measured in px is the same hairline the control sets, drawn as
    // a box because it is short, tinted or offset. One measured in em is a
    // GLYPH - the modernist tick, the badge diamond - which scales with the
    // type it sits beside and has no business following a 1px/2px switch.
    expect(
      offenders(
        (r, d) => r.onMark && d.prop === 'height' && /[\d.]px/.test(d.value),
        (v) => v.includes('var(--rm-heading-rule')
      )
    ).toEqual([])
  })
})
