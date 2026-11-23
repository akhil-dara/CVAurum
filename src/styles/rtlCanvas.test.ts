/**
 * The generated RTL mirror (rtl-canvas.css) has to be scoped so it can actually
 * MATCH. The canvas root carries dozens of classes itself — `rm-icons`,
 * `sicon-folio`, `mode-preview`, `side-left`, `rm-single`, `sec-bar` — so a
 * mirror written as `.rm-root[dir='rtl'] .rm-icons .rm-section-icon` asks for a
 * container with `rm-icons` INSIDE the root, which never exists. Every rule in
 * that block silently did nothing: the section chips did not change side in RTL
 * (2026-11-15 user report). The generator now spells both readings in one
 * `:is()` selector; these tests keep it that way.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(__dirname, 'rtl-canvas.css'), 'utf8')
const SCOPE = ".rm-root[dir='rtl']"

/** The generator, loaded as the CommonJS script it is. It writes nothing when
 *  required (only when run directly), so this is safe in a test process. */
const requireCjs = createRequire(import.meta.url)
const { generate } = requireCjs('../../scripts/make-rtl-css.cjs') as { generate: () => string }

/** Body of every rule whose selector text contains `needle`. */
function rulesWith(needle: string): string[] {
  const out: string[] = []
  const re = /([^{}]+)\{([^{}]*)\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(css))) {
    if (m[1].includes(needle)) out.push(m[1].trim() + '{' + m[2] + '}')
  }
  return out
}

describe('rtl-canvas.css scoping', () => {
  it('mirrors a root-level class on the root itself, not on a child of it', () => {
    const merged = `:is(${SCOPE}.rm-icons, ${SCOPE} .rm-icons) .rm-section-icon`
    const rule = rulesWith(merged)
    expect(rule.length).toBeGreaterThan(0)
    // `right: 100%` in the design means "hang off the end side", so in RTL the
    // chip hangs off the right, where the reading starts. An inset has to be
    // swapped PHYSICALLY: as `inset-inline-end` the base rule's `right: 100%`
    // kept applying, both sides were set, and the over-constrained pair
    // resolved back to where the chip started.
    expect(rule[0]).toMatch(/right:\s*auto/)
    expect(rule[0]).toMatch(/left:\s*100%/)
  })

  it('reserves column room LOGICALLY in the design itself, so the page margin on the other side survives', () => {
    // A column's gutter rule (`.side-right ... > .rm-col-main { padding-right }`)
    // used to be physical in artboard.css with a logical copy in the mirror.
    // The copy put the gutter on the reading side, but the design's own
    // physical declaration kept applying on the side the gutter LEFT - the
    // page's outer edge - so in RTL the main column lost its page margin and a
    // hanging section icon was cut off at the paper's edge (garnet, and every
    // two-column design with its sidebar on the right). Written as
    // padding-inline-* in the design, one rule means the right thing in both
    // directions and the mirror has nothing to add.
    const column = /\.rm-col-(?:main|aside)(?::[\w-]+(?:\([^)]*\))?)*\s*$|\.rm-body(?::[\w-]+(?:\([^)]*\))?)*\s*$/
    for (const file of ['artboard.css', '../templates/templates.css']) {
      const sheet = readFileSync(resolve(__dirname, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
      const re = /([^{}]+)\{([^{}]*)\}/g
      let m: RegExpExecArray | null
      while ((m = re.exec(sheet))) {
        if (!m[1].split(',').some((sel) => column.test(sel.trim()))) continue
        expect(m[2], `${file}: ${m[1].trim()}`).not.toMatch(/(?:^|;)\s*padding-(?:left|right)\s*:/)
        const shorthand = /(?:^|;)\s*padding\s*:\s*([^;]+)/.exec(m[2])
        if (shorthand) expect(shorthand[1].trim().split(/\s+(?![^(]*\))/).length, `${file}: ${m[1].trim()}`).toBeLessThan(4)
      }
    }
    expect(rulesWith('> .rm-col-main').filter((r) => /padding/.test(r))).toEqual([])
    expect(rulesWith('> .rm-col-aside').filter((r) => /padding/.test(r))).toEqual([])
  })

  it('swaps a row\'s own padding physically, so it is not indented on both sides', () => {
    // `.rm-item-head` indents one side to open the date column; that IS the
    // row's whole padding on the axis, so the other side has to go back to 0.
    const head = rulesWith('.sec-date-left .rm-item-head')
    expect(head.some((r) => /padding-left:\s*0/.test(r) && /padding-right:\s*calc\(/.test(r))).toBe(true)
  })

  it('keeps a pseudo-element outside :is(), where a selector may carry one', () => {
    // `:is()` takes no pseudo-elements: `:is(.a::before, .b::before)` is an
    // invalid selector and the browser drops the whole rule. Flare's spine is
    // the root's own ::before, pinned with `left: 0`, so in RTL it stayed on
    // the left while the column reserved its room on the right.
    expect(css).not.toMatch(/:is\([^)]*::?(?:before|after|marker)\b/)
    const spine = rulesWith(`:is(${SCOPE}.tpl-flare, ${SCOPE} .tpl-flare)::before`)
    expect(spine.some((r) => /right:\s*0/.test(r) && /left:\s*auto/.test(r))).toBe(true)
  })

  it('never scopes a root-level class as a descendant-only selector', () => {
    const impossible = rulesWith(`${SCOPE} .rm-icons .rm-section-icon`)
    expect(impossible).toEqual([])
  })

  it('moves an auto margin, and stops the side it leaves from absorbing space', () => {
    // `.rm-item-date { margin-left: auto }` is what pushes a date to the far
    // edge of the row. As a logical property the base `auto` also stayed on the
    // other side, both autos split the free space evenly and the date floated
    // to the middle of the line in RTL.
    const date = rulesWith('.rm-item-head > .rm-item-date')
    expect(date.some((r) => /margin-right:\s*auto/.test(r) && /margin-left:\s*0/.test(r))).toBe(true)
  })

  it('flips a left/right that hides inside a var() fallback', () => {
    // --rm-align is set inline by Artboard.tsx; artboard.css reads it as
    // `text-align: var(--rm-align, left)`, which the mirror has to answer with
    // `right` for the fallback case to be usable in RTL.
    expect(css).toContain('text-align: var(--rm-align, right)')
  })

  it('is the file the generator produces from today\'s stylesheets', () => {
    // The committed file is generated, and nothing else checks it: editing
    // artboard.css or templates.css without `npm run rtl-css` used to leave an
    // RTL page mirrored by yesterday's rules, with every test green.
    expect(generate()).toBe(css)
  })
})
