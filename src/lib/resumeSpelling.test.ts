import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

/**
 * The owner's rule (2026-11-09, restated 2026-11-23): the word is written
 * "resume", with no accents, everywhere - pages, the app, structured data,
 * the machine-readable files and the README. People search "resume", and the
 * home page once spelled it two ways under one heading. This walks the
 * sources and fails on any accented spelling, so new copy cannot bring it
 * back. The two searchSpelling files are the only exception: they hold the
 * accented forms in order to remove them. (The accented letters are written
 * as escapes here so this file passes its own check.)
 */
const ROOT = path.resolve(__dirname, '../..')
const E = '[e\\u00e9\\u00c9E]'
const ACCENTED = new RegExp(`[rR](?:\\u00e9|\\u00c9)[sS][uU][mM]${E}|[rR]${E}[sS][uU][mM](?:\\u00e9|\\u00c9)`)
const SKIP = new Set(['src/lib/searchSpelling.ts', 'src/lib/searchSpelling.test.ts'])
const TEXT = /\.(ts|tsx|css|html|md|txt|cjs|mjs|js|json|py)$|_headers$|_redirects$/

function walk(dir: string, out: string[]): void {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'fonts' || e.name === 'fonts-pdf') continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (TEXT.test(e.name)) out.push(p)
  }
}

export function accentedSpellings(files: string[]): string[] {
  const hits: string[] = []
  for (const f of files) {
    const rel = path.relative(ROOT, f).replace(/\\/g, '/')
    if (SKIP.has(rel)) continue
    fs.readFileSync(f, 'utf8')
      .split('\n')
      .forEach((line, i) => {
        if (ACCENTED.test(line)) hits.push(`${rel}:${i + 1}`)
      })
  }
  return hits
}

describe('the word is spelled "resume"', () => {
  it('recognises the accented spellings it guards against', () => {
    expect(ACCENTED.test('a résumé here')).toBe(true)
    expect(ACCENTED.test('RÉSUMÉ')).toBe(true)
    expect(ACCENTED.test('resumé')).toBe(true)
    expect(ACCENTED.test('resume, resumes, Resume')).toBe(false)
  })

  it('has no accented spelling anywhere in the sources', () => {
    const files: string[] = []
    for (const top of ['src', 'scripts', 'public']) walk(path.join(ROOT, top), files)
    for (const f of ['index.html', 'README.md', 'vite.config.ts']) files.push(path.join(ROOT, f))
    expect(accentedSpellings(files)).toEqual([])
  })
})
