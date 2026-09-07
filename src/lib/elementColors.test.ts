import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ELEMENT_COLORS, elementColorVars, lighten, readableOn, veilAlpha } from './elementColors'
import { ART_BANDS, ART_BAND_GROUNDS } from '@/templates/_shared/headerStyles'
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

describe('the colours a coloured header derives', () => {
  // A block or band header sits its text on the accent, and a band's
  // gradient runs from the accent to a lighter stop the author may never
  // have chosen. Both come from the accent alone, so a template with only a
  // primary colour still draws a readable block and a two-stop band.
  it('lighten mixes a hex colour toward white by the amount', () => {
    expect(lighten('#000000', 0.5)).toBe('#808080')
    expect(lighten('#2563eb', 0)).toBe('#2563eb')
    expect(lighten('#2563eb', 1)).toBe('#ffffff')
    expect(lighten('#0f766e', 0.18)).toBe('#3a8f88')
  })

  it('lighten expands a short hex and leaves what it cannot read alone', () => {
    expect(lighten('#fff', 0.3)).toBe('#ffffff')
    expect(lighten('#08c', 0)).toBe('#0088cc')
    expect(lighten('rebeccapurple', 0.3)).toBe('rebeccapurple')
  })

  it('readableOn picks white on a dark ground and the text colour on a light one', () => {
    // The WCAG contrast ratio decides: white reads better on a navy or a
    // mid blue, the dark text colour on a yellow.
    expect(readableOn('#0f172a', '#1a1a1a')).toBe('#ffffff')
    expect(readableOn('#2563eb', '#1a1a1a')).toBe('#ffffff')
    expect(readableOn('#fde047', '#1a1a1a')).toBe('#1a1a1a')
    expect(readableOn('#ffffff', '#334155')).toBe('#334155')
  })

  it('readableOn falls back to white when the ground cannot be read', () => {
    expect(readableOn('not a colour', '#1a1a1a')).toBe('#ffffff')
    expect(readableOn('#fde047')).toBe('#1a1a1a')
  })
})

/**
 * The wash a header lays over its art band (P10). The promise the spec makes
 * is that the words stay readable over the art, and a flat wash at a fixed
 * strength cannot keep it: two of the four bands are near-black grounds, and
 * a third of the page colour over one of those leaves ordinary text at about
 * 2.7:1 - under even the large-text bar. The painter cannot draw a gradient
 * with a translucent stop (paint.ts registerAxialShading), so the fade the
 * spec describes has to be a flat wash; what is derived instead is its
 * strength, from the same contrast maths readableOn uses.
 */
describe('the art wash is strong enough to read the words through', () => {
  const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  /** The composited colour: the wash at `a` over the art's own ground. */
  const over = (page: string, ground: string, a: number) => {
    const [p, g] = [channels(page), channels(ground)]
    return `#${p.map((v, i) => Math.round(a * v + (1 - a) * g[i]).toString(16).padStart(2, '0')).join('')}`
  }
  /** The accessibility contrast ratio, written out here so the assertion does
   *  not lean on the same private helper the code under test uses. */
  const ratio = (a: string, b: string) => {
    const lum = (hex: string) =>
      channels(hex)
        .map((v) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : Math.pow((v / 255 + 0.055) / 1.055, 2.4)))
        .reduce((s, v, i) => s + [0.2126, 0.7152, 0.0722][i] * v, 0)
    const [x, y] = [lum(a), lum(b)]
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
  }

  const pages = [
    { name: 'the default light page', bg: '#ffffff', text: '#1b1b1f' },
    { name: 'a dark page', bg: '#15181e', text: '#e8ebef' },
    { name: 'a cream page', bg: '#faf7f2', text: '#241f1b' },
  ]

  it('clears 4.5:1 over every ground each band can put under the words', () => {
    for (const page of pages) {
      for (const [band, grounds] of Object.entries(ART_BAND_GROUNDS)) {
        const a = veilAlpha(page.bg, page.text, grounds)
        for (const ground of grounds) {
          const seen = ratio(over(page.bg, ground, a), page.text)
          expect(seen, `${band} on ${page.name} (${ground}, wash ${a})`).toBeGreaterThanOrEqual(4.5)
        }
      }
    }
  })

  it('never washes the art out further than it has to', () => {
    // One step lighter has to fail somewhere, or the wash is heavier than the
    // words need and the art is being hidden for nothing.
    for (const page of pages) {
      for (const grounds of Object.values(ART_BAND_GROUNDS)) {
        const a = veilAlpha(page.bg, page.text, grounds)
        if (a <= 0.35) continue // the floor, which is not derived
        const worst = Math.min(...grounds.map((g) => ratio(over(page.bg, g, a - 0.01), page.text)))
        expect(worst).toBeLessThan(4.5)
      }
    }
  })

  it('keeps a floor under the wash, and never goes fully opaque on a readable page', () => {
    // A document with no band asks for no constraint at all and still gets
    // the wash the page always drew.
    expect(veilAlpha('#ffffff', '#1b1b1f', [])).toBe(0.35)
    for (const page of pages)
      for (const grounds of Object.values(ART_BAND_GROUNDS))
        expect(veilAlpha(page.bg, page.text, grounds)).toBeLessThan(1)
  })

  it('leaves a colour it cannot read at the floor', () => {
    expect(veilAlpha('rebeccapurple', '#1b1b1f', ['#000000'])).toBe(0.35)
  })

  it('names a light and a dark extreme for every band the picker offers', () => {
    for (const band of ART_BANDS.filter((b) => b.value !== 'none'))
      expect(ART_BAND_GROUNDS[band.value], band.value).toHaveLength(2)
  })
})
