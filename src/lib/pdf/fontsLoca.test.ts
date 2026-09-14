import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * No bundled PDF font may ship on the LONG loca format.
 *
 * `head.indexToLocFormat` says whether a TrueType font stores its glyph
 * offsets as uint16 half-offsets (0, "short") or uint32 (1, "long"). fontkit's
 * subsetter — the one pdf-lib runs for us when we embed with `subset: true` —
 * produces a broken `glyf` table for a LONG-loca source: the PDF still carries
 * correct, extractable text and a correct ToUnicode map, and simply draws
 * almost none of the glyphs.
 *
 * That is the worst shape a bug can take here, because every check the project
 * had passed straight over it. The text-layer gates compare extracted text and
 * saw the right words; the parity gates compare geometry and saw the right
 * boxes; contrast, charset and selectable all passed. Seven templates —
 * Plainsong, Scribe, Ivy, Garamond, Elegant, Aurum Editorial and Folio Noir —
 * exported a résumé a person could not read, and it took rasterizing the
 * native PDF and looking at it to notice.
 *
 * So the invariant is asserted on the FILES, where it is cheap and total:
 * `scripts/make-pdf-fonts.py` trims a font's scripts until it fits short loca
 * (widest set first), and this fails the build if one ever slips through.
 */

const here = path.dirname(fileURLToPath(import.meta.url))
const DIR = path.resolve(here, '../../../public/fonts-pdf')

/** `head.indexToLocFormat`, read straight out of the file. */
function locaFormat(file: string): number {
  const d = fs.readFileSync(path.join(DIR, file))
  const numTables = d.readUInt16BE(4)
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16
    if (d.toString('latin1', rec, rec + 4) === 'head') {
      return d.readInt16BE(d.readUInt32BE(rec + 8) + 50)
    }
  }
  throw new Error(`${file}: no head table`)
}

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.ttf')).sort()

describe('the bundled PDF fonts', () => {
  it('ships some', () => {
    expect(files.length).toBeGreaterThan(20)
  })

  it('never ships one on the long loca format, which fontkit subsets into blank glyphs', () => {
    const long = files.filter((f) => locaFormat(f) !== 0)
    // Listed by name: the fix is to re-run scripts/make-pdf-fonts.py, which
    // trims the offending font's scripts until it fits.
    expect(long).toEqual([])
  })
})
