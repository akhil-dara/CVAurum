import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Stylesheet audits for the base artboard sheet, in the manner of the ones
 * in typeStyle.test.ts and elementColors.test.ts: rules the outputs depend
 * on, asserted against the sheet itself because nothing else can catch a
 * declaration quietly going away.
 */
const here = path.dirname(fileURLToPath(import.meta.url))
const css = fs.readFileSync(path.join(here, 'artboard.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/** The SUBJECT of a selector is its last compound - what the rule styles. */
const subject = (part: string) => part.trim().split(/\s*[\s>+~]\s*/).pop() ?? ''

const rulesFor = (context: string, target: RegExp) =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .map((m) => ({ selector: m[1].trim().replace(/\s+/g, ' '), body: m[2] }))
    .filter((r) => r.selector.includes(context) && r.selector.split(',').map(subject).some((s) => target.test(s)))

const declared = (body: string, prop: string) =>
  [...body.matchAll(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, 'g'))].map((m) => m[1].trim())

describe('the display header keeps the role line off the name', () => {
  // A PDF has no lines. Text extraction infers them from how far the next
  // run's baseline dropped, and a drop under half the previous run's type
  // size reads as the SAME line - so under a display-sized name a role line
  // set close beneath it comes back joined to the last word of the name
  // ("MorganSENIOR" for a name and role the canvas shows on two lines).
  // The air above the role line is therefore not decoration, it is what
  // makes the role line a line at all in the extracted text, in the PDF and
  // for every reader that walks it. It is written as a margin-top on the
  // headline, in em so it grows with the type, and it has to be large
  // enough to CLEAR the name's own bottom margin: adjacent block siblings
  // collapse their margins, so the gap is the larger of the two, never the
  // sum.
  const headline = rulesFor('.rm-header-display', /\.rm-headline(?![\w-])/)

  it('gives the role line a margin above it', () => {
    expect(headline.length).toBeGreaterThan(0)
    const tops = headline.flatMap((r) => declared(r.body, 'margin-top'))
    expect(tops.length).toBeGreaterThan(0)
    for (const value of tops) {
      // em, so a bigger document type scale opens the same gap in proportion;
      // a zero would be the absence of the separation this guards.
      expect(value).toMatch(/^\d*\.?\d+em$/)
      expect(parseFloat(value)).toBeGreaterThan(0)
    }
  })
})
