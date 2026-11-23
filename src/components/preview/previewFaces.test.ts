import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * The canvas measures and fits the page once its faces have loaded. Asked
 * with the metadata alone, documentFaces never names the Arabic face, so a
 * Persian page was measured before Vazirmatn loaded - in a fallback's metrics
 * - while the export (render.tsx) and the offline warmer pass the document.
 */
describe('the preview waits for the faces the page draws', () => {
  const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'ResumePreview.tsx'), 'utf8')

  it('never asks documentFaces with the metadata alone', () => {
    expect(source).not.toMatch(/documentFaces\(\{\s*metadata:/)
  })

  it('passes the documents it measures', () => {
    expect(source).toMatch(/documentFaces\(doc\)/)
    expect(source).toMatch(/documentFaces\(measureDoc\)/)
  })
})
