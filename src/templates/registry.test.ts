import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { getTemplate, TEMPLATES } from './registry'

/**
 * The id is what a saved document stores, so two entries sharing one would send
 * an author to the wrong design; the name is all a card in the gallery shows,
 * so two entries sharing one leave a reader with no way to tell them apart.
 * Names are compared case-insensitively - 'Nova' and 'NOVA' read as one name.
 */
describe('the registry', () => {
  const repeated = (values: string[]) => [...new Set(values.filter((v, i) => values.indexOf(v) !== i))]

  it('gives every template an id of its own', () => {
    expect(repeated(TEMPLATES.map((t) => t.id))).toEqual([])
  })

  it('gives every template a display name of its own', () => {
    expect(repeated(TEMPLATES.map((t) => t.name.toLowerCase()))).toEqual([])
  })
})

/**
 * The Signature collection: every one of its templates is a single column,
 * carries the tag the gallery derives its chip from, and names only fonts
 * the app bundles, so a card never falls back to a system face.
 */
describe('the signature templates', () => {
  it('are single-column, tagged, and use bundled fonts', () => {
    const fonts = readFileSync('src/styles/fonts.css', 'utf8')
    for (const id of ['broadsheet', 'marquee', 'atlas', 'chronicle', 'folio-noir', 'terrace']) {
      const t = getTemplate(id)
      expect(t.id).toBe(id)
      expect(t.defaults.layout.columns).toBe(1)
      expect(t.tags).toContain('signature')
      for (const f of [t.defaults.typography.fontFamily, t.defaults.typography.headingFamily, t.defaults.typography.nameFamily]) {
        expect(fonts).toContain(`font-family: '${f}'`)
      }
    }
  })

  it('ship the structure that makes each one itself', () => {
    expect(getTemplate('broadsheet').defaults.layout.sectionNumbers).toBe(true)
    expect(getTemplate('broadsheet').header).toBe('display')
    expect(getTemplate('marquee').defaults.layout.footer).toEqual(['skills', 'languages'])
    expect(getTemplate('marquee').header).toBe('block')
    expect(getTemplate('atlas').defaults.layout.stats).toBe(true)
    expect(getTemplate('atlas').header).toBe('band')
    expect(getTemplate('atlas').defaults.layout.sectionSettings?.skills?.skillsStyle).toBe('rings')
    expect(getTemplate('chronicle').defaults.layout.metaColumn).toBe('gutter')
    expect(getTemplate('chronicle').header).toBe('compact')
    expect(getTemplate('folio-noir').defaults.layout.metaColumn).toBe('margin')
    expect(getTemplate('folio-noir').defaults.theme.artBand).toBe('navy-gold')
    expect(getTemplate('terrace').defaults.layout.headingPlacement).toBe('side')
    expect(getTemplate('terrace').header).toBe('stepped')
  })

  /**
   * A template's own look is a scoped block in templates.css, and an entry
   * whose block was never written renders in the engine's stock colours -
   * indistinguishable from its neighbours in the gallery.
   */
  it('each one has a scoped block of its own in the stylesheet', () => {
    const css = readFileSync('src/templates/templates.css', 'utf8')
    for (const id of ['broadsheet', 'marquee', 'atlas', 'chronicle', 'folio-noir', 'terrace']) {
      expect(css).toContain(`.tpl-${id} `)
    }
  })

  /**
   * The renderer writes --rm-step-2 and --rm-step-3 inline on the root
   * (Artboard.tsx useVars), and an inline declaration beats every stylesheet
   * rule however specific - so a template naming its own stepped shades has
   * to declare them on an element BELOW the root, where its own declaration
   * wins over the value inherited from there. On the root itself the two
   * lines would be dead, and the stepped header would grade through the
   * stock pair with nothing to show the template ever asked.
   */
  it('names its own stepped shades below the root, where a stylesheet can win', () => {
    const css = readFileSync('src/templates/templates.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .map((m) => ({ selector: m[1].trim().replace(/\s+/g, ' '), body: m[2] }))
      .filter((r) => /--rm-step-[23]\s*:/.test(r.body))
    expect(rules.length).toBeGreaterThan(0)
    const onTheRoot = rules
      .flatMap((r) => r.selector.split(','))
      .filter((part) => part.trim().split(/\s+/).length < 2)
    expect(onTheRoot).toEqual([])
  })

  /**
   * The art band is an image the header lays behind its words, fetched by
   * name from a fixed folder: a template naming a band with no file behind
   * it draws a broken image on the page and in the export.
   */
  it('names only art bands the app ships', () => {
    for (const t of TEMPLATES) {
      const band = t.defaults.theme.artBand
      if (!band || band === 'none') continue
      expect(existsSync(`public/art/bands/${band}.webp`)).toBe(true)
    }
  })

  it('a section placed in the footer strip is not listed in the body too', () => {
    const { main, footer } = getTemplate('marquee').defaults.layout
    for (const key of footer) expect(main).not.toContain(key)
  })
})
