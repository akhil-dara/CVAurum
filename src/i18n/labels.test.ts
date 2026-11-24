/**
 * The label table, checked against the source that uses it.
 *
 * `<T>Layout</T>` and `L('Company')` are looked up by the English string
 * itself (src/i18n/labels.ts), which is what keeps forty call sites readable —
 * and what makes a typo silent: one letter changed in a JSX string and the
 * label quietly renders in English for ever. The dictionaries are checked by
 * src/i18n/dict.test.ts; this is the other half, the table.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LABELS } from './labels'

const ROOT = join(__dirname, '..', '..')

/** Every `.tsx` file under src/, tests excluded: a test may spell a label to
 *  assert it, and that spelling is not a call site. */
function sources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    const stat = statSync(path)
    if (stat.isDirectory()) sources(path, out)
    else if (name.endsWith('.tsx') && !name.endsWith('.test.tsx')) out.push(path)
  }
  return out
}

/** The literals handed to the two translation entry points. */
function usedLabels(source: string): string[] {
  const found: string[] = []
  // <T>Layout</T> and <T>{'Layout'}</T>, single or double quoted, no template
  // literals (a computed label cannot be checked here).
  const t = /<T>\s*\{?\s*(["'])((?:\\.|(?!\1)[^\\])*)\1\s*\}?\s*<\/T>/g
  for (const m of source.matchAll(t)) found.push(m[2])
  // L('Company')
  const l = /\bL\(\s*(["'])((?:\\.|(?!\1)[^\\])*)\1\s*\)/g
  for (const m of source.matchAll(l)) found.push(m[2])
  return found
}

describe('the label table', () => {
  const files = sources(join(ROOT, 'src'))
  const used = new Map<string, string>()
  for (const file of files) {
    for (const label of usedLabels(readFileSync(file, 'utf8'))) {
      if (!used.has(label)) used.set(label, relative(ROOT, file))
    }
  }

  it('has a row for every label the source translates', () => {
    const missing = [...used].filter(([text]) => !(text in LABELS))
    expect(
      missing.map(([text, file]) => `${text}  (${file})`),
      'add these to LABELS in src/i18n/labels.ts, or the label renders in English'
    ).toEqual([])
  })

  it('translates every row it holds, in both languages', () => {
    for (const [text, key] of Object.entries(LABELS)) {
      expect(key, text).toMatch(/^[a-z]+\.[A-Za-z0-9.]+$/)
    }
  })

  it('reads its rows from the dictionary, not from a per-language branch', () => {
    // Three languages were once impossible because the lookup asked "is it fa".
    // The table maps to a key; the dictionary answers for any locale.
    const source = readFileSync(join(__dirname, 'labels.ts'), 'utf8')
    expect(source).not.toMatch(/locale === 'fa'/)
  })
})
