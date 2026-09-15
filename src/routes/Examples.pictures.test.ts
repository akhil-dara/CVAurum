import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { LIBRARY } from '@/data/library'
import { samplePageImage, samplePageImageHeight, sampleImageAlt } from '@/lib/seoLibrary'
import { PAGE_IMAGE_HEIGHT } from '@/data/pageImages'

/**
 * The shelf now shows files instead of rendering 108 résumés, so a file that
 * is not there is a card that never paints — and nothing in the app would say
 * so. Before, a missing picture only cost a crawler a broken <img> on a page
 * almost nobody visits; now it is the library itself.
 */
describe('the picture behind every example card', () => {
  const pub = path.resolve(__dirname, '../../public')

  it('is shipped for every sample in the library', () => {
    const missing = LIBRARY.map((s) => samplePageImage(s.slug)).filter((p) => !fs.existsSync(path.join(pub, p)))
    expect(missing).toEqual([])
  })

  it('has a declared height, so the grid reserves the right box', () => {
    const guessed = LIBRARY.filter((s) => PAGE_IMAGE_HEIGHT[`examples/${s.slug}`] === undefined)
    expect(guessed.map((s) => s.slug)).toEqual([])
    for (const s of LIBRARY) expect(samplePageImageHeight(s.slug)).toBeGreaterThan(1000)
  })

  it('is described by a sentence that names the job', () => {
    for (const s of LIBRARY) expect(sampleImageAlt(s.slug)).toContain(s.role)
  })
})
