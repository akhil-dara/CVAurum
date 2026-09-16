import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LayoutSchema } from '@/types/metadata'

/**
 * The running-numeral row in Design → Layout.
 *
 * Two facts about it kept drifting and neither is visible from a unit test of
 * anything else, so they are held against the panel's own source:
 *
 * 1. There is ONE row. The panel carried two "Number the sections" toggles -
 *    the same field written from two places, one of them gated differently -
 *    so on a numbered design the panel offered the identical switch twice,
 *    and whichever one a person found first was a coin toss.
 * 2. It is offered on EVERY design. The old gate gave the row to the two
 *    designs whose defaults ship numerals, because only those two styled the
 *    numeral. The base stylesheet now sets the numeral on all of them, so
 *    the reason for the gate is gone and the row belongs everywhere.
 *
 * And the new half: when the numbers are on, the row says in what figures.
 * Those figures are no longer spelled in this panel - they come from the
 * formatter that draws them, because the section Style sheet offers the same
 * four and a second hand-written copy is what drifts. So the shapes are held
 * against THAT list, and the panel is held to using it.
 */

const SRC = readFileSync(join(__dirname, 'DesignPanel.tsx'), 'utf8')
const NUMERAL_SRC = readFileSync(join(__dirname, '../../../templates/_shared/sectionNumeral.ts'), 'utf8')
const GEAR_SRC = readFileSync(join(__dirname, '../../../templates/_shared/SectionGear.tsx'), 'utf8')
/** The value/label pairs of the one shared list, read from its source. */
const SHARED = NUMERAL_SRC.slice(NUMERAL_SRC.indexOf('SECTION_NUMBER_STYLES'))

describe('the Number the sections row', () => {
  it('exists exactly once', () => {
    expect([...SRC.matchAll(/label="Number the sections"/g)].length).toBe(1)
    expect([...SRC.matchAll(/md\.layout\.sectionNumbers = v/g)].length).toBe(1)
  })

  it('is not gated on the design, and the gate it used is gone', () => {
    expect(SRC).not.toContain('numbersDesign')
    expect(SRC).not.toContain('defaults.layout.sectionNumbers')
  })

  it('still answers a click on a numeral on the canvas', () => {
    // The canvas numeral is decoration, so it cannot be edited in place; it
    // asks for this row by name and the row is scrolled to and flashed.
    expect(SRC).toContain('numbersRef')
    expect(SRC).toContain('numbersFlash')
    expect(SRC).toContain('cvaurum:open-section-numbers')
  })

  it('says the numerals are decoration a parser never reads', () => {
    expect(SRC).toMatch(/decoration only, never in the text a parser reads/)
  })
})

describe('the Numeral style control', () => {
  it('offers every style the schema takes, and no other', () => {
    const offered = [...SHARED.matchAll(/\{ value: '([a-z]+)', label: '[^']*'/g)].map((m) => m[1])
    const schema = ['padded', 'plain', 'dot', 'roman']
    expect([...offered].sort()).toEqual([...schema].sort())
    // ...and every one of them parses, so the control cannot write a value
    // that fails the document.
    for (const style of offered) {
      expect(LayoutSchema.parse({ sectionNumberStyle: style }).sectionNumberStyle).toBe(style)
    }
  })

  it('shows each style as the figure it draws', () => {
    expect(SHARED).toContain("{ value: 'padded', label: '01'")
    expect(SHARED).toContain("{ value: 'plain', label: '1'")
    expect(SHARED).toContain("{ value: 'dot', label: '1.'")
    expect(SHARED).toContain("{ value: 'roman', label: 'I'")
  })

  it('takes those figures from the shared list rather than spelling its own', () => {
    expect(SRC).toContain("import { SECTION_NUMBER_STYLES } from '@/templates/_shared/sectionNumeral'")
    const block = SRC.slice(SRC.indexOf('Numeral style'), SRC.indexOf('Numeral style') + 1200)
    expect(block).toContain('options={SECTION_NUMBER_STYLES}')
  })

  it('writes the document field, and only while the numbers are drawn', () => {
    expect(SRC).toContain('md.layout.sectionNumberStyle = v')
    const at = SRC.indexOf('Numeral style')
    // The control sits inside the row's own "numbers are on" branch: a style
    // picker above a switch that is off would style nothing.
    expect(SRC.lastIndexOf('m.layout.sectionNumbers && (', at)).toBeGreaterThan(-1)
  })
})

/**
 * The same choice, in the other place a person looks for it: the section
 * Style sheet, whose "(all sections)" rows are its own way of saying a
 * control is document-wide. Someone on a numbered design opened that sheet
 * to drop the numbering and found no way to; the row below is that way, and
 * it draws its figures from the one shared list so the two cannot drift.
 */
describe('the section Style sheet row', () => {
  it('offers the same list, with an Off of its own', () => {
    expect(GEAR_SRC).toContain("import { SECTION_NUMBER_STYLES } from './sectionNumeral'")
    expect(GEAR_SRC).toContain('Numbering (all sections)')
    expect(GEAR_SRC).toContain('SECTION_NUMBER_STYLES.map')
    expect(GEAR_SRC).toContain('label="Off"')
  })

  it('writes both document fields — off is the switch, a figure is both', () => {
    expect(GEAR_SRC).toContain('m.layout.sectionNumbers = false')
    expect(GEAR_SRC).toContain('m.layout.sectionNumbers = true')
    expect(GEAR_SRC).toContain('m.layout.sectionNumberStyle = v')
  })
})
