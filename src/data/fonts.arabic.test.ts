import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { ARABIC_FALLBACK_FAMILY, ARABIC_FAMILY, FONT_MAP, fontStack } from './fonts'

/**
 * Vazirmatn as a FALLBACK draws Arabic script and nothing else.
 *
 * It sits in every family's CSS chain. Under its own name it also ships latin
 * and latin-ext files, so an arrow, a minus sign or an accented letter the
 * chosen face lacks was drawn in Vazirmatn on a resume with no Arabic at all.
 * The chain therefore names an alias declared with the arabic files alone;
 * a resume SET in Vazirmatn still gets every subset under the real name.
 */

const STYLES = path.join(process.cwd(), 'src', 'styles')
const generated = fs.readFileSync(path.join(STYLES, 'fonts.css'), 'utf8')
const alias = fs.readFileSync(path.join(STYLES, 'fonts-arabic-fallback.css'), 'utf8')

/** The generated sheet's Vazirmatn arabic blocks, each labelled by the generator. */
const arabicSheet = [...generated.matchAll(/\/\* Vazirmatn arabic \*\/\s*(@font-face\s*\{[^}]*\})/g)]
  .map((m) => m[1])
  .join('\n')

interface Face {
  family: string
  weight: string
  src: string
  range: string
}

const faces = (css: string): Face[] =>
  [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(([, body]) => ({
    family: /font-family:\s*'([^']+)'/.exec(body)?.[1] ?? '',
    weight: /font-weight:\s*(\d+)/.exec(body)?.[1] ?? '',
    src: /src:\s*([^;]+);/.exec(body)?.[1].trim() ?? '',
    range: /unicode-range:\s*([^;]+);/.exec(body)?.[1].trim() ?? '',
  }))

describe('the Arabic fallback alias', () => {
  it('a Latin family falls back to the alias, never to bare Vazirmatn', () => {
    for (const name of ['Inter', 'Lora', 'JetBrains Mono', 'Bebas Neue', 'Dancing Script']) {
      const stack = fontStack(name)
      expect(stack).toContain(`"${ARABIC_FALLBACK_FAMILY}"`)
      expect(stack).not.toContain(`"${ARABIC_FAMILY}"`)
    }
  })

  it('Vazirmatn chosen as the face leads its own stack, under its real name', () => {
    const stack = fontStack(ARABIC_FAMILY)
    expect(stack.startsWith(`"${ARABIC_FAMILY}"`)).toBe(true)
    // The alias would only repeat the arabic files the face already has.
    expect(stack).not.toContain(`"${ARABIC_FALLBACK_FAMILY}"`)
  })

  it('declares only the arabic subset, file for file and weight for weight', () => {
    const arabicBlocks = faces(arabicSheet)
    const declared = faces(alias)
    expect(declared.length).toBeGreaterThan(0)
    expect(declared.every((f) => f.family === ARABIC_FALLBACK_FAMILY)).toBe(true)
    expect(declared.map((f) => Number(f.weight))).toEqual(FONT_MAP[ARABIC_FAMILY].weights)
    for (const f of declared) {
      const twin = arabicBlocks.find((g) => g.weight === f.weight)
      expect(twin, `weight ${f.weight}`).toBeDefined()
      expect(f.src).toBe(twin!.src)
      expect(f.range).toBe(twin!.range)
      // No Basic Latin, no Latin-1, no general punctuation block: the range
      // starts in the Arabic block.
      expect(f.range.startsWith('U+0600')).toBe(true)
      expect(f.range).not.toMatch(/U\+00[0-9A-F]{2}/)
    }
  })

  it('every arabic block of the generated sheet has its alias twin', () => {
    expect(faces(arabicSheet).length).toBe(faces(alias).length)
  })

  it('ships with the app, right after the generated sheet', () => {
    const index = fs.readFileSync(path.join(process.cwd(), 'src', 'index.css'), 'utf8')
    const a = index.indexOf("@import './styles/fonts.css';")
    const b = index.indexOf("@import './styles/fonts-arabic-fallback.css';")
    expect(a).toBeGreaterThanOrEqual(0)
    expect(b).toBeGreaterThan(a)
  })
})
