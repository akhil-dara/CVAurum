import { describe, expect, it } from 'vitest'
import { nameGround, nameInk, roleOf, sectionKeyOf, ALL_VARS, TRACKED_VARS, type ChainStep } from './settings'

const VARS: Record<string, string> = {
  '--rm-text': '#1a1a1a',
  '--rm-muted': '#9aa3ad',
  '--rm-primary': '#2563eb',
  '--rm-bg': '#ffffff',
  '--rm-sidebar-bg': '#0f172a',
  '--rm-sidebar-text': '#e2e8f0',
  '--rm-footer-bg': '#101418',
  '--rm-primary-ink': '#1d4fbb',
  '--rm-muted-on-footer': '#9aa3ad',
  '--rm-heading-color': '#8ab4f8',
}

const chain = (...steps: (string | ChainStep)[]): ChainStep[] =>
  steps.map((s) => (typeof s === 'string' ? { tag: 'div', classes: s.split(' ').filter(Boolean) } : s))

describe('naming the ink', () => {
  it('names a theme colour as its own control does', () => {
    expect(nameInk('#9aa3ad', 'muted', VARS).setting.label).toBe('Muted text')
    expect(nameInk('rgb(26, 26, 26)', 'body', VARS).setting.path).toBe('theme.text')
    expect(nameInk('#e2e8f0', 'body', VARS).setting.label).toBe('Sidebar text')
  })

  it('names an element colour over the theme colour it was derived from', () => {
    const named = nameInk('#8ab4f8', 'headings', VARS)
    expect(named.setting.label).toBe('Section titles')
    expect(named.setting.path).toBe('theme.headings')
    expect(named.origin).toBe('author')
  })

  it('separates a colour the product derives from one the author chose', () => {
    const derived = nameInk('#1d4fbb', 'headings', VARS)
    expect(derived.origin).toBe('derived')
    expect(derived.derivation).toMatch(/accent as ink/)
    expect(nameInk('#9aa3ad', 'muted', VARS).origin).toBe('author')
  })

  it('carries the other controls that resolve to the same colour rather than guessing', () => {
    // The muted ink on the footer strip is the muted colour itself here, so
    // two controls answer to it and the checker says so.
    const named = nameInk('#9aa3ad', 'muted', VARS)
    expect(named.setting.cssVar).toBe('--rm-muted')
    expect(named.alsoMatches?.some((s) => s.cssVar === '--rm-muted-on-footer')).toBe(true)
  })

  it('falls back to what the words ARE when no control matches', () => {
    const named = nameInk('#ff00aa', 'contacts', VARS)
    expect(named.setting.label).toBe('Contacts')
    expect(named.origin).toBe('author')
  })
})

describe('the role of a run of words', () => {
  it('reads it innermost-first off the class chain', () => {
    expect(roleOf(chain('rm-root', 'rm-header', 'rm-name'), 'text')).toBe('name')
    expect(roleOf(chain('rm-root', 'rm-section', 'rm-section-title'), 'text')).toBe('headings')
    expect(roleOf(chain('rm-root', 'rm-item', 'rm-item-date'), 'text')).toBe('muted')
    expect(roleOf(chain('rm-root', { tag: 'a', classes: [] }), 'text')).toBe('links')
    expect(roleOf(chain('rm-root'), 'marker')).toBe('marker')
    expect(roleOf(chain('rm-root'), 'decorative')).toBe('decorative')
  })
})

describe('naming the ground', () => {
  it('names the sidebar, the footer strip and the art band', () => {
    expect(nameGround(chain('rm-root', 'rm-col-aside', 'rm-section'), VARS, '#0f172a').path).toBe('theme.sidebar')
    expect(nameGround(chain('rm-root', 'rm-footer', 'rm-section'), VARS, '#101418').path).toBe('theme.footer')
    expect(nameGround(chain('rm-root', 'rm-header rm-header-art', 'rm-contacts'), VARS, '#01010e').path).toBe(
      'theme.artBand'
    )
  })

  it('names a per-section style with the section it belongs to', () => {
    const c = chain('rm-root skl-chips', 'rm-section sec-skills skl-ov-rings', 'rm-ring-value')
    const named = nameGround(c, VARS, '#ffffff')
    expect(named.label).toBe('Skills style: Rings')
    expect(named.section).toBe('skills')
    expect(named.path).toBe('layout.sectionSettings.skills.skillsStyle')
  })

  it('names a filled heading as the panel names it', () => {
    const c = chain('rm-root sec-underline', 'rm-section sec-work sec-ov-boxed', 'rm-section-title')
    expect(nameGround(c, VARS, '#2563eb').label).toBe('Heading style: Filled')
  })

  it('does not mistake the ROOT style class for a section key', () => {
    // The root carries `sec-<style>` and a section carries `sec-<key>`: same
    // shape, different meaning, and reading the wrong one names a section
    // that does not exist.
    expect(sectionKeyOf(chain('rm-root sec-underline'))).toBeUndefined()
    expect(sectionKeyOf(chain('rm-root sec-underline', 'rm-section sec-work'))).toBe('work')
    expect(sectionKeyOf(chain('rm-root sec-underline', 'rm-section sec-work sec-ov-boxed sec-align-center'))).toBe(
      'work'
    )
  })

  it('falls back to the page itself', () => {
    expect(nameGround(chain('rm-root', 'rm-section'), VARS, '#ffffff').path).toBe('theme.background')
  })
})

describe('the tracked properties', () => {
  it('lists every property the naming table can match', () => {
    expect(TRACKED_VARS).toEqual(ALL_VARS.map((v) => v.cssVar))
    expect(new Set(TRACKED_VARS).size).toBe(TRACKED_VARS.length)
    // The five element colours ride their own properties; none may be lost.
    for (const v of [
      '--rm-name-color',
      '--rm-headline-color',
      '--rm-heading-color',
      '--rm-contact-color',
      '--rm-link-color',
    ])
      expect(TRACKED_VARS).toContain(v)
  })
})

describe('the raw accent as words', () => {
  it('is a defect in the wiring, not a colour to tell the author about', () => {
    // An accent is chosen to be a COLOUR; the product derives an ink from it
    // for words. Words wearing the accent itself went round that derivation.
    const named = nameInk('#2563eb', 'headings', VARS)
    expect(named.origin).toBe('derived')
    expect(named.derivation).toMatch(/without being derived/)
  })
})

describe('the paper decides which setting paints the words', () => {
  // A design that ships body text and sidebar text as ONE colour still paints
  // each column from its own control. Ties were broken by role alone, so a
  // sidebar date was named Body text and offered a colour that moved nothing.
  const SAME: Record<string, string> = { '--rm-text': '#1e2532', '--rm-sidebar-text': '#1e2532', '--rm-muted': '#6b7280' }

  it('names Sidebar text for words in the sidebar, with no doubt about it', () => {
    const named = nameInk('#1e2532', 'body', SAME, 'aside')
    expect(named.setting.label).toBe('Sidebar text')
    expect(named.uncertain).toBeFalsy()
  })

  it('names Body text for the same colour in the main column', () => {
    const named = nameInk('#1e2532', 'body', SAME, 'main')
    expect(named.setting.path).toBe('theme.text')
    expect(named.uncertain).toBeFalsy()
  })

  it('never names a sidebar ink for words that are not in the sidebar', () => {
    expect(nameInk('#1e2532', 'muted', SAME, 'main').setting.label).not.toBe('Sidebar text')
  })
})
