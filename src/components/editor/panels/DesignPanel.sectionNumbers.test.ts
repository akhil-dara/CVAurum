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
 */

const SRC = readFileSync(join(__dirname, 'DesignPanel.tsx'), 'utf8')

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
    const block = SRC.slice(SRC.indexOf('Numeral style'), SRC.indexOf('Numeral style') + 1200)
    const offered = [...block.matchAll(/\{ value: '([a-z]+)', label: '[^']*' \}/g)].map((m) => m[1])
    const schema = ['padded', 'plain', 'dot', 'roman']
    expect([...offered].sort()).toEqual([...schema].sort())
    // ...and every one of them parses, so the control cannot write a value
    // that fails the document.
    for (const style of offered) {
      expect(LayoutSchema.parse({ sectionNumberStyle: style }).sectionNumberStyle).toBe(style)
    }
  })

  it('shows each style as the figure it draws', () => {
    const block = SRC.slice(SRC.indexOf('Numeral style'), SRC.indexOf('Numeral style') + 1200)
    expect(block).toContain("{ value: 'padded', label: '01' }")
    expect(block).toContain("{ value: 'plain', label: '1' }")
    expect(block).toContain("{ value: 'dot', label: '1.' }")
    expect(block).toContain("{ value: 'roman', label: 'I' }")
  })

  it('writes the document field, and only while the numbers are drawn', () => {
    expect(SRC).toContain('md.layout.sectionNumberStyle = v')
    const at = SRC.indexOf('Numeral style')
    // The control sits inside the row's own "numbers are on" branch: a style
    // picker above a switch that is off would style nothing.
    expect(SRC.lastIndexOf('m.layout.sectionNumbers && (', at)).toBeGreaterThan(-1)
  })
})
