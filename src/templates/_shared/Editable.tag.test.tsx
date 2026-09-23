import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

// The sanitizer wraps a DOM purifier that needs a window, and this suite runs
// under the plain node environment; nothing asserted here is rich text.
vi.mock('@/lib/sanitize', () => ({ sanitizeHtml: (html: string) => html }))
vi.mock('@/lib/pdf/hyphens', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/pdf/hyphens')>()),
  noBreakCompoundsHtml: (html: string) => html,
}))

import { Ed } from './Editable'
import { createDocument } from '@/data/defaults'
import { TemplateRenderer } from '@/templates/TemplateRenderer'

describe('a field outside the editor', () => {
  it('keeps the tag it asked for, so two block fields never run together', () => {
    const html = renderToStaticMarkup(<Ed value="Priya Menon" as="div" className="rm-mini-title" apply={() => {}} />)
    expect(html).toBe('<div class="rm-mini-title">Priya Menon</div>')
  })

  it("prints a reference's name and role as two lines on the page the PDF is drawn from", () => {
    const doc = createDocument({ sample: true })
    doc.content.references = [{ id: 'r1', name: 'Priya Menon', reference: 'Engineering Director, Northstar Systems' }]
    if (!doc.metadata.layout.main.includes('references')) doc.metadata.layout.main.push('references')
    const html = renderToStaticMarkup(<TemplateRenderer doc={doc} mode="print" />)
    expect(html).toContain('<div class="rm-mini-title">Priya Menon</div>')
    expect(html).toContain('<div class="rm-mini-sub">Engineering Director, Northstar Systems</div>')
  })
})
