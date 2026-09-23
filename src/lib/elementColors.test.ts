import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ELEMENT_COLORS,
  contrastOn,
  darkenToContrast,
  darkenToContrastAll,
  elementColorVars,
  gradientGrounds,
  lighten,
  mix,
  readableOn,
  readableOnAll,
  veilAlpha,
} from './elementColors'
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

  // A rule may read the element's variable, pass the parent's colour on with
  // `inherit`, or read the DERIVED twin of the element's variable - the one a
  // coloured header takes, the author's colour carried onto the ground that
  // header paints (Artboard.tsx --rm-name-on-primary and its siblings). The
  // guarantee this audit exists for is that the author's colour is never
  // silently dropped, and the derived twin keeps it: a colour that reads on
  // the band comes through untouched, and one that does not is moved the
  // smallest distance that makes it read rather than being thrown away. What
  // the audit still forbids is a rule that names a colour of its own.
  const honours = (c: string, cssVar: string) =>
    c === 'inherit' || c.includes(`var(${cssVar}`) || c.includes(`var(${cssVar.replace(/-color$/, '')}-on-`)
  const audit = (name: string, matches: (s: string) => boolean, cssVar: string) => {
    it(`${name}: ${cssVar}`, () => {
      const hits = rules.filter((r) => matches(r.selector) && !exempt(r.selector))
      expect(hits.length).toBeGreaterThan(0)
      const offenders = hits
        .filter((r) => r.colors.some((c) => !honours(c, cssVar)))
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
        // 4.55, not 4.5: the wash is derived a twentieth of a point above the
        // bar, because the composite is painted twice - once by the browser,
        // once by the PDF painter - and each rounds its own way.
        const worst = Math.min(...grounds.map((g) => ratio(over(page.bg, g, a - 0.01), page.text)))
        expect(worst).toBeLessThan(4.55)
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

/**
 * The accent as INK.
 *
 * An accent is chosen to be a COLOUR - a rule, a band, a chip's ground - and
 * every design's accent was picked for that job. Set as small TEXT it has a
 * second job, and 23 of the 68 designs failed it: the same #0ea5e9 that
 * reads as a confident line reads at 2.46:1 as a word. So the accent itself
 * is never touched; a derived ink is, and only where the accent is text.
 */
describe('darkenToContrast', () => {
  const ratio = (a: string, b: string) => {
    const lum = (h: string) => {
      const c = [1, 3, 5].map((i) => parseInt(h.replace('#', '').slice(i - 1, i + 1), 16))
      const lin = (v: number) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : Math.pow((v / 255 + 0.055) / 1.055, 2.4))
      return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2])
    }
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
    return (hi + 0.05) / (lo + 0.05)
  }

  it('leaves a colour that already reads exactly as it was', () => {
    // Forty-five of the sixty-eight designs are in this case, and none of
    // them may move a single channel.
    expect(darkenToContrast('#1d4ed8', '#ffffff')).toBe('#1d4ed8')
    expect(darkenToContrast('#111111', '#ffffff')).toBe('#111111')
  })

  it('moves a pale accent toward black on a light page, until it reads', () => {
    const ink = darkenToContrast('#0ea5e9', '#ffffff')
    expect(ink).not.toBe('#0ea5e9')
    expect(ratio(ink, '#ffffff')).toBeGreaterThanOrEqual(4.5)
  })

  it('moves toward white on a dark page instead', () => {
    const ink = darkenToContrast('#1d4ed8', '#111827')
    expect(ratio(ink, '#111827')).toBeGreaterThanOrEqual(4.5)
    // Lighter than it started, not darker: the only direction a dark page has.
    expect(parseInt(ink.slice(1, 3), 16)).toBeGreaterThan(0x1d)
  })

  it('moves the SMALLEST step that reads - one step back fails', () => {
    // The whole point: a design keeps as much of its colour as AA allows.
    // One hundredth of the way back toward the accent has to fail, or the
    // search stepped further than the words needed and the design lost
    // colour for nothing.
    const chan = (h: string, i: number) => parseInt(h.replace('#', '').slice(i * 2, i * 2 + 2), 16)
    const stepBack = (ink: string, accent: string, target: string) =>
      '#' +
      [0, 1, 2]
        .map((i) => Math.round(chan(ink, i) + 0.01 * (chan(accent, i) - chan(target, i))))
        .map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0'))
        .join('')
    for (const [accent, page, target] of [
      ['#0ea5e9', '#ffffff', '#000000'],
      ['#ff5a1f', '#fff8f0', '#000000'],
      ['#8b5cf6', '#ffffff', '#000000'],
      ['#d9531e', '#ffffff', '#000000'],
      ['#1d4ed8', '#111827', '#ffffff'],
    ] as const) {
      const ink = darkenToContrast(accent, page)
      expect(ratio(ink, page), `${accent} on ${page}`).toBeGreaterThanOrEqual(4.5)
      expect(ratio(stepBack(ink, accent, target), page), `${accent} on ${page} one step back`).toBeLessThan(4.5)
    }
  })

  it('honours a ratio other than the small-text one', () => {
    const large = darkenToContrast('#0ea5e9', '#ffffff', 3)
    const small = darkenToContrast('#0ea5e9', '#ffffff', 4.5)
    expect(ratio(large, '#ffffff')).toBeGreaterThanOrEqual(3)
    expect(ratio(large, '#ffffff')).toBeLessThan(4.5)
    expect(ratio(small, '#ffffff')).toBeGreaterThanOrEqual(4.5)
  })

  it('always answers a six-digit hex', () => {
    expect(darkenToContrast('#0ea5e9', '#ffffff')).toMatch(/^#[0-9a-f]{6}$/)
    expect(darkenToContrast('#abc', '#ffffff')).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('hands back anything that is not a hex colour untouched', () => {
    expect(darkenToContrast('rebeccapurple', '#ffffff')).toBe('rebeccapurple')
    expect(darkenToContrast('#0ea5e9', 'var(--x)')).toBe('#0ea5e9')
  })

  it('goes all the way to the extreme on a ground no ink can reach', () => {
    // Every ground carries one extreme at 4.5:1, so this needs a harder
    // ratio to reach: a mid grey carries neither black nor white at 7:1.
    // The answer is then the best either direction can do, not a colour
    // that quietly fails.
    expect(darkenToContrast('#0ea5e9', '#767676', 7)).toBe('#000000')
  })
})

describe('mix', () => {
  it('reads as CSS color-mix in srgb does', () => {
    // The chip's ground is exactly this mix (artboard.css .rm-chip), so the
    // ink derived against it has to be derived against the same maths.
    expect(mix('#2563eb', '#ffffff', 0.12)).toBe('#e5ecfd')
    expect(mix('#c8941f', '#ffffff', 0.08)).toBe('#fbf6ed')
    expect(mix('#000000', '#ffffff', 0)).toBe('#ffffff')
    expect(mix('#000000', '#ffffff', 1)).toBe('#000000')
  })

  it('hands back anything that is not a hex colour untouched', () => {
    expect(mix('currentColor', '#ffffff', 0.5)).toBe('currentColor')
  })
})

/** The accessibility contrast ratio, written out here so an assertion never
 *  leans on the same private helper the code under test uses. */
const contrastRatio = (a: string, b: string) => {
  const lum = (h: string) => {
    const c = [1, 3, 5].map((i) => parseInt(h.replace('#', '').slice(i - 1, i + 1), 16))
    const lin = (v: number) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : Math.pow((v / 255 + 0.055) / 1.055, 2.4))
    return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2])
  }
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/**
 * Words that stand ON a colour.
 *
 * readableOn offers two candidates - white, and the document's own text
 * colour - and takes the better of the two on the ground. Choosing the
 * BETTER of two is not choosing one that READS, and that was the defect: on
 * a light accent over a dark page both candidates are light, so the better
 * of them was white on gold at 1.78:1. Eleven of the sixty-eight designs
 * failed that way on a block, band or stepped header, seventeen on a filled
 * heading or a banner, eight on the monogram badge.
 */
describe('readableOn', () => {
  it('keeps white on a ground white reads on', () => {
    // A deep accent carries white, and a coloured header has always drawn
    // its words in white: nothing may move there.
    expect(readableOn('#1d4ed8', '#1b1b1f')).toBe('#ffffff')
    expect(readableOn('#7a1020', '#1b1b1f')).toBe('#ffffff')
  })

  it('keeps the document own ink where that is what reads', () => {
    // A pale accent on a light page: the page's ink wins, unchanged, which
    // is what keeps a warm near-black warm instead of flipping to flat black.
    expect(readableOn('#e7c873', '#1b1b1f')).toBe('#1b1b1f')
  })

  it('reads on a ground where NEITHER candidate did', () => {
    // A light accent with a light page ink - a dark design's gold - is the
    // failing case: white measured 1.78:1 and the page's own ink no better.
    const gold = '#e3bd6d'
    const lightInk = '#eceef2'
    expect(contrastRatio('#ffffff', gold)).toBeLessThan(4.5)
    expect(contrastRatio(lightInk, gold)).toBeLessThan(4.5)
    expect(contrastRatio(readableOn(gold, lightInk), gold)).toBeGreaterThanOrEqual(4.5)
  })

  it('reads on every ground a colour can be', () => {
    // The worst ground any colour can be sits at luminance 0.179, and still
    // carries black at 4.59:1 - so this has no failing case, at any page ink.
    for (let r = 0; r < 256; r += 17)
      for (let g = 0; g < 256; g += 17)
        for (const ink of ['#1b1b1f', '#eceef2', '#767676']) {
          const bg = `#${[r, g, (r + g) % 256].map((v) => v.toString(16).padStart(2, '0')).join('')}`
          expect(contrastRatio(readableOn(bg, ink), bg), `${bg} / ${ink}`).toBeGreaterThanOrEqual(4.5)
        }
  })

  it('holds a harder ratio when one is asked for', () => {
    expect(contrastRatio(readableOn('#e3bd6d', '#eceef2', 7), '#e3bd6d')).toBeGreaterThanOrEqual(7)
  })

  it('hands back white for a ground that is not a hex colour', () => {
    expect(readableOn('var(--x)', '#1b1b1f')).toBe('#ffffff')
  })
})

/**
 * The stepped header's treads, the strip at the foot, the card and the band's
 * own paper: the grounds a word can land on that are NOT the page. Each one's
 * ink is derived against the ground the page actually paints there
 * (Artboard.tsx useVars); the sweep found every one of them carrying an ink
 * derived against the plain page instead.
 */
describe('the grounds that are not the page', () => {
  /* The designs the sweep measured worst on each ground. */
  const designs = [
    { name: 'obsidian', primary: '#e3bd6d', text: '#eceef2', muted: '#98a1b0', bg: '#0e1014' },
    { name: 'folio-noir', primary: '#c9a227', text: '#eae7e0', muted: '#9a958c', bg: '#12131a' },
    { name: 'marquee', primary: '#ff5a1f', text: '#1a1a1a', muted: '#6b6b6b', bg: '#fff8f0' },
    { name: 'measure', primary: '#12151a', text: '#12151a', muted: '#6a6f78', bg: '#ffffff' },
    { name: 'cascade', primary: '#0b7970', text: '#1f2933', muted: '#66727f', bg: '#ffffff' },
  ]

  it('each tread of the stepped header carries an ink its own shade can hold', () => {
    // The ink was derived against the accent while the ground was the accent
    // LIGHTENED: twenty-eight designs failed on the third tread.
    for (const d of designs)
      for (const amount of [0.14, 0.28]) {
        const tread = lighten(d.primary, amount)
        expect(contrastRatio(readableOn(tread, d.text), tread), `${d.name} +${amount}`).toBeGreaterThanOrEqual(4.5)
      }
  })

  it('the strip at the foot re-inks the page muted and the page accent', () => {
    // The strip's ground is the page's own INK, which on a dark design is a
    // LIGHT colour - so every colour the page chose for paper is the wrong
    // way round inside it, and on the designs whose accent IS their text
    // colour the title measured 1:1.
    for (const d of designs) {
      const strip = d.text
      expect(contrastRatio(darkenToContrast(d.muted, strip, 4.55), strip), `${d.name} muted`).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(darkenToContrast(d.primary, strip, 4.55), strip), `${d.name} title`).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(readableOn(strip, d.text, 4.55), strip), `${d.name} body`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('a card is a ground, and the inks follow it there', () => {
    // 4% of the page's ink laid under the entry's own words: enough to drop
    // five designs sitting at 4.2-4.5:1 under the line.
    for (const d of designs) {
      const card = mix(d.text, d.bg, 0.04)
      expect(contrastRatio(darkenToContrast(d.muted, card, 4.55), card), `${d.name} muted`).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(darkenToContrast(d.primary, card, 4.55), card), `${d.name} accent`).toBeGreaterThanOrEqual(4.5)
      const chip = mix(d.primary, card, 0.12)
      expect(contrastRatio(darkenToContrast(d.primary, chip, 4.55), chip), `${d.name} chip`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('a link tag inside the band stands on the band own paper', () => {
    // The one folio ground with no ink of its own: the raw accent there
    // measured 1.01:1.
    for (const d of designs)
      for (const sidebar of ['#1f2933', '#e8eef2', '#7a8a99']) {
        const paper = mix(d.text, sidebar, 0.16)
        expect(
          contrastRatio(darkenToContrast(d.primary, paper, 4.55), paper),
          `${d.name} / ${sidebar}`
        ).toBeGreaterThanOrEqual(4.5)
      }
  })
})

/**
 * The accent wash over an art band. Its sibling --rm-art-veil was derived
 * from the first; this one was a constant 0.55 while the words standing on it
 * were white, and the composite ground was the one nothing checked -
 * obsidian's banner over the navy band measured 1.38:1 and the contact line
 * simply was not there.
 */
describe('the accent wash over the art', () => {
  const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  const over = (wash: string, ground: string, a: number) => {
    const [p, g] = [channels(wash), channels(ground)]
    return `#${p
      .map((v, i) =>
        Math.round(a * v + (1 - a) * g[i])
          .toString(16)
          .padStart(2, '0')
      )
      .join('')}`
  }
  const accents = ['#e3bd6d', '#ff5a1f', '#1d4ed8', '#0b7970', '#c9a227']
  const inks = ['#1b1b1f', '#eceef2']

  it('carries the header own words over every ground each band shows', () => {
    for (const accent of accents)
      for (const ink of inks) {
        // 4.55, the ratio the renderer derives this ink at: the wash is held
        // to the same twentieth of a point above the bar, and a fully opaque
        // wash IS the accent - so the two meeting at the same number is what
        // makes the last hundredth an answer rather than a fallback.
        const on = readableOn(accent, ink, 4.55)
        for (const [band, grounds] of Object.entries(ART_BAND_GROUNDS)) {
          const a = veilAlpha(accent, on, grounds, 0.55)
          for (const g of grounds)
            expect(
              contrastRatio(over(accent, g, a), on),
              `${band} / ${accent} / ${ink} (wash ${a})`
            ).toBeGreaterThanOrEqual(4.5)
        }
      }
  })

  it('never washes the art lighter than the strength it always had', () => {
    for (const accent of accents)
      for (const grounds of Object.values(ART_BAND_GROUNDS))
        expect(veilAlpha(accent, readableOn(accent, '#1b1b1f', 4.55), grounds, 0.55)).toBeGreaterThanOrEqual(0.55)
  })

  it('leaves the page wash on its own floor, unchanged', () => {
    // The default floor is not the accent wash's floor, and passing one must
    // not have moved the other.
    expect(veilAlpha('#ffffff', '#1b1b1f', [])).toBe(0.35)
    expect(veilAlpha('#ffffff', '#1b1b1f', [], 0.55)).toBe(0.55)
  })
})

describe('a derived ink is never worse than the ink it replaces', () => {
  /* The one ground in the shipped set where NOTHING reaches the target: a
     banner that fades from an accent with four hundredths of black in it to a
     darkened cyan. White is worst at 4.517:1 over the fade, flat black at
     4.526:1 - nine thousandths apart, and for those nine thousandths the
     whole signature of the design flipped from white on purple to black on
     purple, which then measured LOWER on the file than the white it
     replaced. */
  const fade = gradientGrounds(mix('#8b5cf6', '#000000', 0.96), mix('#8b5cf6', '#168b9d', 0.55))

  it('holds the design own ink when nothing on the walk can reach the target', () => {
    expect(contrastOn('#ffffff', fade)).toBeLessThan(4.55)
    expect(contrastOn('#000000', fade)).toBeLessThan(4.55)
    expect(contrastOn('#000000', fade) - contrastOn('#ffffff', fade)).toBeLessThan(0.05)
    expect(readableOnAll(fade, '#27272a', 4.55)).toBe('#ffffff')
  })

  it('still takes a walked ink when the gain is one worth having', () => {
    // A ground that carries white at 1.78:1 and has a real answer further on:
    // the walk is a rescue here, and it is allowed to run.
    const ink = readableOnAll(['#f7e8bc'], '#f7e8bc', 4.55)
    expect(contrastOn(ink, ['#f7e8bc'])).toBeGreaterThanOrEqual(4.55)
  })

  it('never answers with an ink that measures worse than the one it started from', () => {
    for (const a of ['#8b5cf6', '#f43f5e', '#0b1f3a', '#d9531e', '#ef4239', '#2e96a8']) {
      for (const b of ['#168b9d', '#ec4899', '#0e7c86', '#ffffff', '#111111']) {
        const g = gradientGrounds(a, b)
        const ink = readableOnAll(g, '#1a1a1a', 4.55)
        const best = Math.max(contrastOn('#ffffff', g), contrastOn('#1a1a1a', g))
        expect(contrastOn(ink, g)).toBeGreaterThanOrEqual(Math.min(best, 4.55) - 1e-9)
      }
    }
  })
})

describe('darkenToContrastAll: a colour chosen for the page, carried onto a band', () => {
  it('leaves a colour that already reads on every ground exactly as it was', () => {
    expect(darkenToContrastAll('#ffffff', ['#1c5a44', '#0f172a'], 4.55)).toBe('#ffffff')
  })

  it('moves a page colour the smallest distance that makes it read on the band', () => {
    // signal name blue: right on white, 2.47:1 on a mid-tone band header.
    const band = ['#2e3d50']
    expect(contrastRatio('#4b6de4', band[0])).toBeLessThan(4.55)
    const ink = darkenToContrastAll('#4b6de4', band, 4.55)
    expect(contrastOn(ink, band)).toBeGreaterThanOrEqual(4.55)
    // Still recognisably the same blue, not a flat white or black.
    expect(ink).not.toBe('#ffffff')
    expect(ink).not.toBe('#000000')
  })

  it('reads on EVERY stop of a fade, not only its ends', () => {
    const fade = gradientGrounds('#0b1f3a', '#0e7c86')
    const ink = darkenToContrastAll('#4b6de4', fade, 4.55)
    expect(contrastOn(ink, fade)).toBeGreaterThanOrEqual(4.55)
  })

  it('hands back anything that is not a hex colour untouched', () => {
    expect(darkenToContrastAll('currentColor', ['#ffffff'], 4.55)).toBe('currentColor')
    expect(darkenToContrastAll('#4b6de4', [], 4.55)).toBe('#4b6de4')
  })
})
