import { describe, expect, it } from 'vitest'
import { createDocument } from './defaults'
import { MetadataSchema } from '@/types/metadata'

/**
 * Magic fit's starting state (2026-09-26). A résumé someone starts from
 * nothing, or brings in from a file, prints at the size they set: text never
 * shrinks by itself, content flows onto the next page. One started from a
 * picture (an example, a template's sample) is the page that picture showed,
 * which is fitted - 69 of the 108 examples reach one page only that way.
 */
describe('where Magic fit starts', () => {
  it('is off for a blank résumé, with a 9pt floor waiting for when it is turned on', () => {
    const d = createDocument()
    expect(d.metadata.page.autoFit).toBe(false)
    expect(d.metadata.page.fit.minBody).toBe(9)
  })

  it('is off for content brought in from a file', () => {
    const d = createDocument({ sample: true, fitted: false, content: createDocument({ sample: true }).content })
    expect(d.metadata.page.autoFit).toBe(false)
    expect(d.metadata.page.fit.minBody).toBe(9)
  })

  it('is the fitted page for a résumé started from a picture', () => {
    const d = createDocument({ sample: true })
    expect(d.metadata.page.autoFit).toBe(true)
    expect(d.metadata.page.fit.minBody).toBeNull()
  })

  it('leaves a saved résumé exactly as it was stored', () => {
    const saved = createDocument({ sample: true }).metadata
    const reread = MetadataSchema.parse(JSON.parse(JSON.stringify(saved)))
    expect(reread.page.autoFit).toBe(true)
    expect(reread.page.fit.minBody).toBeNull()
  })
})
