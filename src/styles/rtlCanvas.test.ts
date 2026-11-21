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

  it('reserves column room LOGICALLY, on top of the page margin it must not eat', () => {
    // A column's page margin comes from another rule. Swapping the gutter
    // physically (`padding-left` -> `right` + `left: 0`) wiped that margin, and
    // the body text ran flush into the paper's edge in RTL while the chip
    // floated in the opposite margin.
    expect(css).toMatch(/rm-icons\.rm-single[^{]*\{[^}]*padding-inline-start:/)
    expect(css).toMatch(/rm-col-aside[^{]*\{[^}]*padding-inline-start:/)
  })

  it('swaps a row\'s own padding physically, so it is not indented on both sides', () => {
    // `.rm-item-head` indents one side to open the date column; that IS the
    // row's whole padding on the axis, so the other side has to go back to 0.
    const head = rulesWith('.sec-date-left .rm-item-head')
    expect(head.some((r) => /padding-left:\s*0/.test(r) && /padding-right:\s*calc\(/.test(r))).toBe(true)
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
