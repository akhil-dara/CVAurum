import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { TEMPLATES } from './registry'

/**
 * A numbered heading needs two halves that agree: a design whose defaults turn
 * `layout.sectionNumbers` on, and a rule that says how its numeral is set.
 *
 * The switch itself is no longer gated on either half - the base stylesheet
 * sets the numeral on every design, so Design offers the row everywhere and
 * the document decides. What is checked here is the pairing inside the
 * registry: a design that ships numbering with no rule of its own would be
 * saying nothing about a numeral it puts on every heading, and a design that
 * styles a numeral it never shows carries a dead rule. Both are held against
 * the registry rather than against two ids someone remembered.
 */

const CSS = readFileSync(join(__dirname, 'templates.css'), 'utf8')

const stylesNumber = (id: string) => new RegExp(`\\.tpl-${id}\\s+\\.rm-section-number\\b`).test(CSS)
const numbersOn = (id: string) => TEMPLATES.find((t) => t.id === id)?.defaults.layout.sectionNumbers === true

describe('numbered section headings', () => {
  const withNumbers = TEMPLATES.filter((t) => t.defaults.layout.sectionNumbers === true).map((t) => t.id)
  const withRule = TEMPLATES.filter((t) => stylesNumber(t.id)).map((t) => t.id)

  it('is a thing at least one design does', () => {
    expect(withNumbers.length).toBeGreaterThan(0)
  })

  it('never turns numbers on for a design that does not set them', () => {
    expect(withNumbers.filter((id) => !stylesNumber(id))).toEqual([])
  })

  it('never sets a numeral for a design that does not show one', () => {
    expect(withRule.filter((id) => !numbersOn(id))).toEqual([])
  })

  it('agrees with itself, so a shipped numeral and its rule name the same designs', () => {
    expect([...withNumbers].sort()).toEqual([...withRule].sort())
  })
})
