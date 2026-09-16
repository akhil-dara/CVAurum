import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createDocument } from '@/data/defaults'
import { resolveOrder } from '@/lib/sections'
import { sectionNumeral } from './sectionNumeral'

// The sanitizer wraps a DOM purifier that needs a window, and this suite runs
// under the plain node environment. Nothing asserted here is rich text, so
// handing the string back is what the real sanitizer would do with it.
vi.mock('@/lib/sanitize', () => ({ sanitizeHtml: (html: string) => html }))
vi.mock('@/lib/pdf/hyphens', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/pdf/hyphens')>()),
  noBreakCompoundsHtml: (html: string) => html,
}))

import { TemplateRenderer } from '@/templates/TemplateRenderer'

const NUMBER = /<span aria-hidden="true" class="rm-deco rm-section-number" data-deco="1">(\d\d)<\/span>/g
/** The same numeral, whatever shape it is set in. */
const ANY_NUMBER = /<span aria-hidden="true" class="rm-deco rm-section-number" data-deco="1">([^<]+)<\/span>/g

/**
 * Running section numbers: with `layout.sectionNumbers` on, every section in
 * the main flow opens its heading with a two-digit numeral, counted among
 * the sections the page shows, in the order it shows them. The numeral is
 * decorative text (the Deco atom), so the painter draws it as outlines with
 * no text layer and the Word file and the ATS text never carry it.
 */
describe('section numerals', () => {
  it('prefix each main section heading, counted in page order', () => {
    const doc = createDocument({ sample: true })
    doc.metadata.layout.sectionNumbers = true
    const html = renderToStaticMarkup(<TemplateRenderer doc={doc} mode="print" />)
    const numbers = [...html.matchAll(NUMBER)].map((m) => m[1])
    const main = resolveOrder(doc).main
    expect(numbers).toEqual(main.map((_, i) => String(i + 1).padStart(2, '0')))
    // The numeral sits inside the heading, ahead of the title's words.
    const at = html.indexOf('rm-section-number')
    const titleAt = html.indexOf('rm-section-title-text', at)
    expect(html.lastIndexOf('<h2 class="rm-section-title"', at)).toBeGreaterThan(-1)
    expect(titleAt).toBeGreaterThan(at)
  })

  it('never number a section in the footer strip, and count only the body', () => {
    const doc = createDocument({ sample: true })
    doc.metadata.layout.sectionNumbers = true
    doc.metadata.layout.footer = ['skills', 'languages']
    const html = renderToStaticMarkup(<TemplateRenderer doc={doc} mode="print" />)
    const footerAt = html.indexOf('class="rm-footer')
    expect(html.slice(footerAt)).not.toContain('rm-section-number')
    const numbers = [...html.matchAll(NUMBER)].map((m) => m[1])
    expect(numbers.length).toBe(resolveOrder(doc).main.length)
  })

  it('are absent by default', () => {
    const doc = createDocument({ sample: true })
    const html = renderToStaticMarkup(<TemplateRenderer doc={doc} mode="print" />)
    expect(html).not.toContain('rm-section-number')
  })

  // Numbering and the shape of the numeral are two questions. The page asks
  // the shared formatter for the second one, so the preview tree and the
  // export tree cannot answer it differently for one document.
  it('are set in the style the document asks for', () => {
    const shapes = {
      padded: (i: number) => String(i + 1).padStart(2, '0'),
      plain: (i: number) => String(i + 1),
      dot: (i: number) => `${i + 1}.`,
      roman: (i: number) => sectionNumeral(i, 'roman'),
    } as const
    for (const [style, shape] of Object.entries(shapes)) {
      const doc = createDocument({ sample: true })
      doc.metadata.layout.sectionNumbers = true
      doc.metadata.layout.sectionNumberStyle = style as keyof typeof shapes
      const html = renderToStaticMarkup(<TemplateRenderer doc={doc} mode="print" />)
      const numbers = [...html.matchAll(ANY_NUMBER)].map((m) => m[1])
      expect(numbers).toEqual(resolveOrder(doc).main.map((_, i) => shape(i)))
    }
  })

  it('stay decoration in every style, so a parser still reads the words alone', () => {
    const doc = createDocument({ sample: true })
    doc.metadata.layout.sectionNumbers = true
    doc.metadata.layout.sectionNumberStyle = 'roman'
    const html = renderToStaticMarkup(<TemplateRenderer doc={doc} mode="print" />)
    for (const m of html.matchAll(ANY_NUMBER)) {
      const tag = html.slice(html.lastIndexOf('<span', html.indexOf(m[0])), html.indexOf(m[0]) + m[0].length)
      expect(tag).toContain('aria-hidden="true"')
      expect(tag).toContain('data-deco="1"')
    }
  })
})
