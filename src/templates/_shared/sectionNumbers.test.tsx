import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createDocument } from '@/data/defaults'
import { resolveOrder } from '@/lib/sections'

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
})
