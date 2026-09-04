import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ELEMENT_COLORS, elementColorVars } from './elementColors'
import { MetadataSchema } from '@/types/metadata'

/**
 * The five element colours - the name, the headline, the section titles, the
 * contact line and the links - each ride one CSS variable that the base
 * stylesheet and every template read through a fallback chain, so an unset
 * colour draws exactly what the page always drew and a set one reaches the
 * PDF as a computed colour the painter reads back.
 */
const theme = (over: Record<string, unknown> = {}) => MetadataSchema.parse({ theme: over }).theme

describe('elementColorVars', () => {
  it('a document that chose nothing emits no variable at all', () => {
    // Absent, not empty: a var set to '' would make every fallback chain
    // resolve to nothing and drop the element's colour.
    expect(elementColorVars(theme())).toEqual({})
  })

  it('emits one variable per colour set, and only those', () => {
    const v = elementColorVars(theme({ name: '#112233', headings: '#b45309', links: '#0a0b0c' }))
    expect(v).toEqual({
      '--rm-name-color': '#112233',
      '--rm-heading-color': '#b45309',
      '--rm-link-color': '#0a0b0c',
    })
  })

  it('all five have a variable, and an empty string counts as unset', () => {
    const all = elementColorVars(
      theme({ name: '#1', headline: '#2', headings: '#3', contacts: '#4', links: '#5' })
    )
    expect(Object.keys(all).sort()).toEqual(ELEMENT_COLORS.map((c) => c.cssVar).sort())
    expect(elementColorVars(theme({ headline: '' }))).toEqual({})
  })
})

describe('every stylesheet rule that colours an element reads its variable', () => {
  // The audit the feature rests on: a template that sets `.tpl-x .rm-headline
  // { color: var(--rm-text) }` outranks the base rule, so unless it too reads
  // the element's variable first, the author's headline colour is silently
  // ignored on that template. Both stylesheets are parsed here and every
  // colour declaration on a name / headline / section-title / contact / link
  // selector must go through the chain, or pass the parent's colour on with
  // `inherit`.
  const here = path.dirname(fileURLToPath(import.meta.url))
  const read = (rel: string) => fs.readFileSync(path.join(here, rel), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const sheets = { artboard: read('../styles/artboard.css'), templates: read('../templates/templates.css') }

  type Rule = { sheet: string; selector: string; colors: string[] }
  const rules: Rule[] = []
  for (const [sheet, css] of Object.entries(sheets)) {
    const re = /([^{}]+)\{([^{}]*)\}/g
    let m: RegExpExecArray | null
    while ((m = re.exec(css))) {
      const selector = m[1].trim().replace(/\s+/g, ' ')
      const colors = [...m[2].matchAll(/(?:^|;|\s)color\s*:\s*([^;]+)/g)].map((x) => x[1].trim())
      if (colors.length) rules.push({ sheet, selector, colors })
    }
  }

  // Editing chrome and hover marks never print; the sidebar keeps the band's
  // own text colour (the author has a control for that); a boxed heading is
  // white on its accent box.
  const chrome = /rm-title-link|rm-editable|mode-preview|no-print|rm-section-gear|rm-kw-|rm-chip-edit|::marker/
  const exempt = (selector: string) => chrome.test(selector) || /rm-col-aside|boxed/.test(selector)

  const audit = (name: string, matches: (s: string) => boolean, cssVar: string) => {
    it(`${name}: ${cssVar}`, () => {
      const hits = rules.filter((r) => matches(r.selector) && !exempt(r.selector))
      expect(hits.length).toBeGreaterThan(0)
      const offenders = hits
        .filter((r) => r.colors.some((c) => c !== 'inherit' && !c.includes(`var(${cssVar}`)))
        .map((r) => `${r.sheet}: ${r.selector} => ${r.colors.join(' | ')}`)
      expect(offenders).toEqual([])
    })
  }

  const token = (cls: string) => new RegExp(`\\.${cls}(?![\\w-])`)
  const isContact = (s: string) => token('rm-contacts').test(s) || token('rm-contact').test(s)
  audit('the name', (s) => token('rm-name').test(s), '--rm-name-color')
  audit('the headline', (s) => /\.rm-headline(?:-inline)?(?![\w-])/.test(s), '--rm-headline-color')
  audit('section titles', (s) => token('rm-section-title').test(s), '--rm-heading-color')
  // A linked contact keeps the contact line's colour, so contact rules are
  // audited as contacts even when they name an anchor.
  audit('the contact line', isContact, '--rm-contact-color')
  audit(
    'links',
    (s) => !isContact(s) && (/(?:^|[\s,>+~])a(?:\[href\])?(?![\w-])/.test(s) || /rm-named-link|rm-verify-link|rm-item-link(?!s)|rm-rich a/.test(s)),
    '--rm-link-color'
  )
})

describe('a mark drawn on a section title follows the heading colour', () => {
  // The words of a heading read the heading colour, and every mark drawn
  // with them - the rule after the title, the lead rule before it, the
  // diamond a badge heading draws - belongs to the same heading. Most are
  // painted with currentColor, which follows for free; one filled from the
  // accent instead stays accent-coloured under a heading whose colour the
  // author changed, and the mark and its words drift apart. A template's own
  // brand token is its own business - this guards the shared accent alone.
  const here = path.dirname(fileURLToPath(import.meta.url))
  const read = (rel: string) => fs.readFileSync(path.join(here, rel), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const sheets = { artboard: read('../styles/artboard.css'), templates: read('../templates/templates.css') }

  it('no pseudo box under a section title is filled straight from the accent', () => {
    const offenders: string[] = []
    for (const [sheet, css] of Object.entries(sheets)) {
      const re = /([^{}]+)\{([^{}]*)\}/g
      let m: RegExpExecArray | null
      while ((m = re.exec(css))) {
        const selector = m[1].trim().replace(/\s+/g, ' ')
        if (!/rm-section-title[^,]*::(before|after)/.test(selector)) continue
        for (const decl of m[2].split(';')) {
          if (!/var\(--rm-primary\)/.test(decl)) continue
          if (/var\(--rm-heading-color\s*,/.test(decl)) continue
          offenders.push(`${sheet}: ${selector} => ${decl.trim()}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })
})

describe('every anchor the shared sections render carries a class', () => {
  // `.rm-root a` paints the author's link colour, and the audit above reads
  // colours by selector - so an anchor with no class of its own is invisible
  // to it and silently takes the link colour. A certificate, award or
  // publication whose NAME is the link is a title first, like a linked work
  // or project title, and must ride rm-title-link to keep the title's colour.
  const here = path.dirname(fileURLToPath(import.meta.url))
  const src = fs.readFileSync(path.join(here, '../templates/_shared/sections.tsx'), 'utf8')
  const openings = [...src.matchAll(/<a\b[^>]*>/g)].map((m) => ({ at: m.index, tag: m[0].replace(/\s+/g, ' ') }))

  it('no bare <a>', () => {
    expect(openings.length).toBeGreaterThan(0)
    expect(openings.filter((o) => !/className=/.test(o.tag)).map((o) => o.tag)).toEqual([])
  })

  it('an anchor inside a mini title is a title link', () => {
    const inMini: string[] = []
    const spans = [...src.matchAll(/<span className="rm-mini-title">/g)]
    expect(spans.length).toBeGreaterThan(0)
    for (const s of spans) {
      const end = src.indexOf('</span>', s.index)
      const body = src.slice(s.index, end)
      for (const m of body.matchAll(/<a\b[^>]*>/g)) inMini.push(m[0].replace(/\s+/g, ' '))
    }
    expect(inMini.length).toBeGreaterThan(0)
    expect(inMini.filter((t) => !/className="[^"]*\brm-title-link\b/.test(t))).toEqual([])
  })
})
