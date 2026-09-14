import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { TEMPLATES } from './registry'

/**
 * A numbered heading needs two halves that agree: a design whose defaults turn
 * `layout.sectionNumbers` on, and a rule that says how its numeral is set.
 *
 * The Design panel offers the switch on exactly the designs whose defaults
 * carry the first half. If a design turned numbers on without the second, the
 * switch would offer to draw an unstyled span; if a design styled a numeral it
 * never shows, the rule would be dead. Both halves are checked here so the
 * panel's rule stays true of the registry rather than of two ids someone
 * remembered.
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

  it('agrees with itself, so the panel can gate the switch on the design', () => {
    expect([...withNumbers].sort()).toEqual([...withRule].sort())
  })
})
