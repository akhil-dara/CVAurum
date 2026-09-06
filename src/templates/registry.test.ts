import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { getTemplate } from './registry'

/**
 * The Signature collection: every one of its templates is a single column,
 * carries the tag the gallery derives its chip from, and names only fonts
 * the app bundles, so a card never falls back to a system face.
 */
describe('the signature templates', () => {
  it('are single-column, tagged, and use bundled fonts', () => {
    const fonts = readFileSync('src/styles/fonts.css', 'utf8')
    for (const id of ['broadsheet', 'marquee', 'atlas']) {
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
  })

  it('a section placed in the footer strip is not listed in the body too', () => {
    const { main, footer } = getTemplate('marquee').defaults.layout
    for (const key of footer) expect(main).not.toContain(key)
  })
})
