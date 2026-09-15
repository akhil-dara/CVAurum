import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { TEMPLATES } from '@/templates/registry'
import { templatePageImage, templatePageImageHeight, imageAlt } from '@/lib/seoPages'
import { pageImage, pageImageAlt, pageImageHeight } from './Templates'

/**
 * The gallery says a design's picture in its own words rather than calling
 * lib/seoPages, because seoPages reaches lib/seoLibrary, which imports the
 * 108-résumé library — a 476 KB chunk this route does not load today
 * (measured in dist, 2026-09-15). A duplicate that nothing checks drifts, and
 * the drift would be invisible: the wall and the design's own page would
 * describe the same file differently, and only a screen-reader user would ever
 * find out. So it is checked, for every design in the registry.
 */
describe('the gallery’s picture of a design', () => {
  it('names the same file, shape and sentence as the design’s own page', () => {
    for (const tpl of TEMPLATES) {
      expect(pageImage(tpl)).toBe(templatePageImage(tpl.id))
      expect(pageImageHeight(tpl)).toBe(templatePageImageHeight(tpl.id))
      expect(pageImageAlt(tpl)).toBe(imageAlt(tpl))
    }
  })

  it('points at a file that is actually shipped', () => {
    const pub = path.resolve(__dirname, '../../public')
    const missing = TEMPLATES.map((t) => pageImage(t)).filter((p) => !fs.existsSync(path.join(pub, p)))
    expect(missing).toEqual([])
  })
})
