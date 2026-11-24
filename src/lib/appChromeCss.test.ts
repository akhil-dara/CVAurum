import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * The interface is always left to right, so its stylesheet needs no logical
 * value with a real support gap. `float: inline-start` is ignored before
 * Chromium 118 (and so the editor's placeholder stopped floating there);
 * margin-/padding-/inset-inline are fine everywhere the app runs (Chromium 87,
 * Safari 14.1) and may stay.
 */
describe('the app stylesheet', () => {
  const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../index.css'), 'utf8')

  it('floats and clears by physical side, never by inline-start/end', () => {
    expect(css).not.toMatch(/\b(float|clear)\s*:\s*inline-(start|end)/)
  })
})
