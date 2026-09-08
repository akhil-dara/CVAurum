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
import { SCRIPT_FALLBACKS } from '@/data/fonts'

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
const families = [...new Set(Object.keys(INDEX).map((k) => k.split('|')[0]))]

describe('the bundled PDF fonts', () => {
  it('every script-fallback family draws Cyrillic, Greek and Vietnamese, at every weight it ships', () => {
    const fallbacks = new Set(Object.values(SCRIPT_FALLBACKS).flat())
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
    // 28 families draw the Cyrillic letters; the sample also carries the
    // Bulgarian grave-accented ѝ, which four of them lack.
    expect(cyrillic).toBeGreaterThanOrEqual(24)
  })
})
