import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Stylesheet audits for the base artboard sheet, in the manner of the ones
 * in typeStyle.test.ts and elementColors.test.ts: rules the outputs depend
 * on, asserted against the sheet itself because nothing else can catch a
 * declaration quietly going away.
 */
const here = path.dirname(fileURLToPath(import.meta.url))
const css = fs.readFileSync(path.join(here, 'artboard.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/** The SUBJECT of a selector is its last compound - what the rule styles. */
const subject = (part: string) => part.trim().split(/\s*[\s>+~]\s*/).pop() ?? ''

const rulesFor = (context: string, target: RegExp) =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .map((m) => ({ selector: m[1].trim().replace(/\s+/g, ' '), body: m[2] }))
    .filter((r) => r.selector.includes(context) && r.selector.split(',').map(subject).some((s) => target.test(s)))

const declared = (body: string, prop: string) =>
  [...body.matchAll(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, 'g'))].map((m) => m[1].trim())

describe('the display header keeps the role line off the name', () => {
  // A PDF has no lines. Text extraction infers them from how far the next
  // run's baseline dropped, and a drop under half the previous run's type
  // size reads as the SAME line - so under a display-sized name a role line
  // set close beneath it comes back joined to the last word of the name
  // ("MorganSENIOR" for a name and role the canvas shows on two lines).
  // The air above the role line is therefore not decoration, it is what
  // makes the role line a line at all in the extracted text, in the PDF and
  // for every reader that walks it. It is written as a margin-top on the
  // headline, as a length that grows with the type, and it has to be large
  // enough to CLEAR the name's own bottom margin: adjacent block siblings
  // collapse their margins, so the gap is the larger of the two, never the
  // sum.
  const headline = rulesFor('.rm-header-display', /\.rm-headline(?![\w-])/)
  const nameFactor = /^calc\(\s*var\(--rm-name-size\)\s*\*\s*(\d*\.?\d+)\s*\)$/
  const tops = () => headline.flatMap((r) => declared(r.body, 'margin-top'))

  it('gives the role line a margin above it', () => {
    expect(headline.length).toBeGreaterThan(0)
    const values = tops()
    expect(values.length).toBeGreaterThan(0)
    for (const value of values) {
      // Either an em, which grows with the headline's own type, or a share
      // of the name size; a zero either way would be the absence of the
      // separation this guards.
      const factor = nameFactor.exec(value)
      expect(value).toMatch(/^(?:\d*\.?\d+em|calc\(\s*var\(--rm-name-size\)\s*\*\s*\d*\.?\d+\s*\))$/)
      expect(parseFloat(factor ? factor[1] : value)).toBeGreaterThan(0)
    }
  })

  it('measures the gap against the name, which is what sets the threshold', () => {
    // The threshold is half the NAME's size, and the name and the headline
    // are moved by two different sliders (heading size and headline size),
    // both phone-reachable. An em of the HEADLINE therefore only clears the
    // threshold near the stock settings: turning the headline size down, or
    // the heading size up, moves one side of the comparison and not the
    // other, and the role line joins the name's last word again. Measured
    // against the name it clears at both ends of both sliders - the worst
    // corner (largest heading, smallest headline) needs about 0.71 of the
    // name size.
    const values = tops()
    expect(values.length).toBeGreaterThan(0)
    for (const value of values) {
      const factor = nameFactor.exec(value)
      expect(factor, `margin-top is ${value}, which is not measured against --rm-name-size`).not.toBeNull()
      expect(parseFloat(factor![1])).toBeGreaterThanOrEqual(0.71)
    }
  })
})

/**
 * The gutter and the entry layouts both want the entry's left padding, and
 * they are in two different sheets: templates.css is imported second
 * (TemplateRenderer.tsx), so a TIE there beats this one. Nothing in either
 * sheet uses a cascade layer, so the only thing that settles it is
 * specificity - which is why these rules carry the section and its body.
 */
describe('the meta gutter takes back the entry padding that would move its cells', () => {
  const templates = fs
    .readFileSync(path.join(here, '../templates/templates.css'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
  const parse = (sheet: string) =>
    [...sheet.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .map((m) => ({ selector: m[1].trim().replace(/\s+/g, ' '), body: m[2] }))
      .flatMap((r) => r.selector.split(',').map((selector) => ({ selector: selector.trim(), body: r.body })))
  // Class-level weight: every `.name`, every `[attr]` and every simple
  // pseudo-class counts one, including the ones inside :not(), which is all
  // these selectors are built from.
  const weight = (selector: string) => (selector.match(/[.[]|:(?!not\b)[a-z-]+/g) ?? []).length
  // The classes on the LAST compound - what the rule actually styles.
  const subjectClasses = (selector: string) =>
    (subject(selector).match(/\.[\w-]+/g) ?? []).map((c) => c.slice(1)).sort()
  const isEntry = (selector: string) => /^\.rm-item(?:\.[\w-]+)*$/.test(subject(selector))
  const padsEntries = (sheet: string) =>
    parse(sheet).filter((r) => isEntry(r.selector) && declared(r.body, 'padding-left').length > 0)

  const resets = padsEntries(css).filter(
    (r) => r.selector.includes('.meta-gutter') && declared(r.body, 'padding-left').every((v) => parseFloat(v) === 0)
  )

  it('resets the entry padding for every entry, marked or not', () => {
    const subjects = resets.map((r) => subjectClasses(r.selector).join('.'))
    expect(subjects).toContain('rm-item')
    expect(subjects).toContain('rm-has-mark.rm-item')
  })

  it('outranks every entry layout that pads an entry', () => {
    const layouts = padsEntries(templates)
    expect(layouts.length).toBeGreaterThan(0)
    for (const layout of layouts) {
      const target = subjectClasses(layout.selector)
      // A reset only settles this rule if it matches the same entries.
      const covering = resets.filter((r) => subjectClasses(r.selector).every((c) => target.includes(c)))
      const best = Math.max(0, ...covering.map((r) => weight(r.selector)))
      expect(best, `${layout.selector} is not outranked by the gutter's reset`).toBeGreaterThan(weight(layout.selector))
    }
  })

  it('moves the timeline rail and its dots into the content column', () => {
    // Both are drawn against the section body's left edge, which under a
    // gutter is the GUTTER's left edge - the rail would run down the tint
    // and every dot would land in it.
    const moved = parse(css).filter(
      (r) => r.selector.includes('.meta-gutter') && r.selector.includes('lay-ov-timeline') && r.selector.includes('::before')
    )
    expect(moved.length).toBe(2)
    for (const rule of moved) {
      const left = declared(rule.body, 'left')
      expect(left.length).toBe(1)
      expect(left[0]).toContain('var(--rm-meta-w)')
    }
  })
})

/**
 * Side headings (P4): the title goes in a column of its own beside the
 * content. A PDF has no lines - a reader infers them from baselines - so a
 * title whose words sat level with the first line of the body would come
 * back joined to it. The guarantee is structural rather than a measured
 * gap: the title takes the grid's first row and the body the second, so
 * however tall the heading style makes the title, and however many lines
 * its words wrap to, the body starts below all of them.
 */
describe('a side heading keeps its own line', () => {
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .map((m) => ({ selector: m[1].trim().replace(/\s+/g, ' '), body: m[2] }))
    .filter((r) => r.selector.includes('.heads-side'))
  /** The rule that places `target` on the grid - the one that says which
   *  row and column it takes. */
  const placing = (target: RegExp) =>
    rules.filter(
      (r) => r.selector.split(',').map(subject).some((s) => target.test(s)) && declared(r.body, 'grid-row').length > 0
    )

  it('lays the section out as a column for the title and a column for the body', () => {
    const section = rules.filter((r) => r.selector.split(',').map(subject).some((s) => /^\.rm-section$/.test(s)))
    expect(section.length).toBe(1)
    expect(declared(section[0].body, 'display')).toEqual(['grid'])
    expect(declared(section[0].body, 'grid-template-columns').length).toBe(1)
  })

  it('gives the body a row below the title, not beside it', () => {
    const title = placing(/^\.rm-section-title$/)
    const body = placing(/^\.rm-section-body$/)
    expect(title.length).toBe(1)
    expect(body.length).toBe(1)
    expect(declared(title[0].body, 'grid-row')).toEqual(['1'])
    expect(declared(title[0].body, 'grid-column')).toEqual(['1'])
    expect(declared(body[0].body, 'grid-row')).toEqual(['2'])
    expect(declared(body[0].body, 'grid-column')).toEqual(['2'])
  })

  it('reaches the main column only, never the sidebar or the footer strip', () => {
    // The strip renders its sections as compact rows and a sidebar column is
    // narrower than the title column would be, so neither can hold a title
    // beside its content. A rule that only declares the page's own custom
    // properties moves nothing on its own and is left out.
    const laying = rules.filter((r) => r.selector.split(',').map(subject).some((s) => !/^\.rm-root/.test(s)))
    expect(laying.length).toBeGreaterThan(2)
    for (const rule of laying) {
      for (const selector of rule.selector.split(',')) {
        expect(selector.trim(), selector).toContain('.rm-col-main')
      }
    }
  })

  it('sets the title against the right edge as a block AND as a flex row', () => {
    // The title is a flex container for a large share of documents: the
    // rule-after heading style makes it one, and so does every section
    // whose gear picked a heading style of its own. text-align does not
    // position flex items, so on those the words sat at the LEFT edge of
    // the title column - the far side from the content they label - and
    // the popover's own note said the opposite of what the page drew.
    const titles = rules.filter((r) => r.selector.split(',').map(subject).some((s) => /^\.rm-section-title$/.test(s)))
    const aligning = titles.filter((r) => declared(r.body, 'text-align').length > 0)
    expect(aligning.length).toBe(1)
    expect(declared(aligning[0].body, 'text-align')).toEqual(['right'])
    expect(declared(aligning[0].body, 'justify-content')).toEqual(['flex-end'])
  })

  it('stops a heading rule growing across the title column', () => {
    // A heading style whose rule fills the space beside the words (the
    // flex: 1 pseudo of rule-after and its per-section twin) would fill
    // the whole title column, leaving the words where they started. The
    // side-heading layout cannot express that rule, so it collapses it,
    // the way the gutter-label layout drops the badge it cannot seat.
    const pseudos = rules.filter((r) =>
      r.selector.split(',').map(subject).some((s) => /^\.rm-section-title::(before|after)$/.test(s))
    )
    expect(pseudos.length).toBeGreaterThan(0)
    for (const rule of pseudos) expect(declared(rule.body, 'flex')).toEqual(['0 0 auto'])
  })
})
