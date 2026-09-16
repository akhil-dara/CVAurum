/**
 * The bundled PDF fonts must draw the scripts the app promises: every family
 * its Latin (accented names included), and the script-fallback families
 * Cyrillic, Greek and Vietnamese. Reads the real files in public/fonts-pdf
 * with the same fontkit the exporter embeds with. Before this existed the
 * whole set was Latin-only and a Bulgarian résumé exported with every
 * Cyrillic letter dropped, whatever font was chosen (issue #10).
 */
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as fontkitNs from '@pdf-lib/fontkit'
import { MARKS_FAMILY, SCRIPT_FALLBACKS } from '@/data/fonts'

const fontkit = ((fontkitNs as unknown as { default?: unknown }).default ?? fontkitNs) as {
  create(data: Uint8Array): { hasGlyphForCodePoint(cp: number): boolean }
}
const here = path.dirname(fileURLToPath(import.meta.url))
const DIR = path.resolve(here, '../../../public/fonts-pdf')
const INDEX = JSON.parse(fs.readFileSync(path.join(DIR, 'index.json'), 'utf8')) as Record<string, string>

const SAMPLES = {
  cyrillic: 'Даниил Гогов Опит Образование Умения ѝ ъ ю я щ',
  greek: 'Αλέξανδρος Παπαδόπουλος Εμπειρία',
  vietnamese: 'Nguyễn Văn Thắng',
  latinExt: 'Ştefan Łukasz Đorđe Ünal Çağrı',
}
const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
const load = (file: string) => fontkit.create(new Uint8Array(fs.readFileSync(path.join(DIR, file))))
const covers = (font: { hasGlyphForCodePoint(cp: number): boolean }, s: string) =>
  [...s].filter((ch) => ch !== ' ').every((ch) => font.hasGlyphForCodePoint(ch.codePointAt(0) ?? 0))
// The marks family is four bullet glyphs and a space (scripts/make-marks-font.py)
// - it exists precisely because no TEXT family carries them, and it is never
// set as a resume's font. It is in the index so the painter can reach it
// through the fallback chain, and it is excluded from the text-coverage
// expectations below for the same reason it exists.
const MARKS = 'cvaurum-marks'
const families = [...new Set(Object.keys(INDEX).map((k) => k.split('|')[0]))].filter((f) => f !== MARKS)

describe('the bundled PDF fonts', () => {
  it('every script-fallback family draws Cyrillic, Greek and Vietnamese, at every weight it ships', () => {
    const fallbacks = new Set(Object.values(SCRIPT_FALLBACKS).flat())
    expect(fallbacks.has(MARKS_FAMILY), 'the marks font is not a script fallback').toBe(false)
    for (const family of fallbacks) {
      const keys = Object.keys(INDEX).filter((k) => k.startsWith(`${slug(family)}|`))
      expect(keys.length, `${family} has static fonts`).toBeGreaterThan(0)
      for (const key of keys) {
        const font = load(INDEX[key])
        // Inter, Source Serif 4 and Source Code Pro cover all three; Oswald
        // (the display chain's own face) has no Greek on Google Fonts, which
        // is why Inter follows it in the chain.
        expect(covers(font, SAMPLES.cyrillic), `${key} Cyrillic`).toBe(true)
        expect(covers(font, SAMPLES.vietnamese), `${key} Vietnamese`).toBe(true)
        if (family !== 'Oswald') expect(covers(font, SAMPLES.greek), `${key} Greek`).toBe(true)
      }
    }
  })
  it('most families draw Cyrillic on their own now, and none lost its Latin', () => {
    let cyrillic = 0
    // Two faces Google ships without Latin Extended-A/B letters (Volkhov has
    // Latin only; Lato's file lacks a few) - a pre-existing gap, kept honest.
    const latinExtGaps = new Set(['lato', 'volkhov'])
    for (const family of families) {
      const font = load(INDEX[Object.keys(INDEX).find((k) => k.startsWith(`${family}|`))!])
      if (covers(font, SAMPLES.cyrillic)) cyrillic++
      if (!latinExtGaps.has(family)) expect(covers(font, SAMPLES.latinExt), `${family} Latin-ext`).toBe(true)
    }
    // 22 families draw the Cyrillic letters; the sample also carries the
    // Bulgarian grave-accented ѝ, which several of them lack.
    //
    // It was 24 until the two Garamonds gave their non-Latin up. Both shipped
    // on the long loca format, which fontkit's subsetter turns into blank
    // glyphs, so they drew NOTHING legible in a PDF — in any script. Short
    // loca can only address about 128 KB of outlines, and their outlines are
    // heavy: EB Garamond fits Latin and Vietnamese, Cormorant Garamond fits
    // Latin alone. Losing Cyrillic in two display serifs, where the fallback
    // chain steps in, buys back every Latin glyph in seven templates.
    expect(cyrillic).toBeGreaterThanOrEqual(22)
  })

  it('ships the four bullet marks no text family has, in the marks font', () => {
    // Measured 2026-09-16 over this whole directory: 0 of 158 instances carry
    // any of these four, which is why the marks font is bundled at all.
    const marks = '◦▪✓◆'
    const key = Object.keys(INDEX).find((k) => k.startsWith(`${MARKS}|`))
    expect(key, 'the marks font is indexed').toBeTruthy()
    expect(covers(load(INDEX[key!]), marks)).toBe(true)
    for (const family of families) {
      const font = load(INDEX[Object.keys(INDEX).find((k) => k.startsWith(`${family}|`))!])
      expect(covers(font, marks), `${family} does NOT carry the marks`).toBe(false)
      // ...while the three that every family does have stay universal, which
      // is why those bullet styles keep using the resume's own face.
      expect(covers(font, '•–›'), `${family} carries bullet/dash/angle`).toBe(true)
    }
  })

  it('kept every script on the long-loca families whose outlines left room', () => {
    // Tinos and Arimo had the same defect and the same fix, and their lighter
    // outlines fit the whole set — so the trimming took nothing from them.
    // This is what stops a future trim from being wider than it needs to be.
    for (const family of ['tinos', 'arimo']) {
      const key = Object.keys(INDEX).find((k) => k.startsWith(`${family}|`))
      expect(key, `${family} ships`).toBeTruthy()
      const font = load(INDEX[key!])
      expect(covers(font, SAMPLES.cyrillic), `${family} Cyrillic`).toBe(true)
      expect(covers(font, SAMPLES.greek), `${family} Greek`).toBe(true)
      expect(covers(font, SAMPLES.vietnamese), `${family} Vietnamese`).toBe(true)
    }
  })
})
