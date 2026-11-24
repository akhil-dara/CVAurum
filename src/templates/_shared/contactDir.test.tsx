import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createDocument } from '@/data/defaults'

// Same stand-ins as header.test.tsx: the purifier and the compound guard need a
// DOM, and nothing asserted here is rich text.
vi.mock('@/lib/sanitize', () => ({ sanitizeHtml: (html: string) => html }))
vi.mock('@/lib/pdf/hyphens', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/pdf/hyphens')>()),
  noBreakCompoundsHtml: (html: string) => html,
}))

import { TemplateRenderer } from '@/templates/TemplateRenderer'
import type { ResumeDocument } from '@/types/document'

/**
 * The contact line of a right-to-left page (owner report, 2026-11-23): every
 * contact ITEM used to carry dir="auto", so an email or a phone turned its
 * item left to right - icon on the left - while a Persian city kept its icon
 * on the right. The icons swapped sides item by item and two of them ended up
 * touching. The item now follows the page; only the value inside it resolves
 * its own direction, so a phone keeps its digits in order and the icon stays
 * on the reading side.
 */

function persianDoc(rtl: boolean): ResumeDocument {
  const doc = createDocument({ sample: true })
  doc.content.basics.email = 'alireza@example.com'
  doc.content.basics.phone = '+98 912 000 0000'
  doc.content.basics.url = 'https://alireza.dev'
  doc.content.basics.location = { ...doc.content.basics.location, city: 'تهران', region: '' }
  doc.metadata.layout.rtl = rtl
  doc.metadata.layout.icons = true
  return doc
}

const render = (doc: ResumeDocument, edit: boolean) =>
  edit
    ? renderToStaticMarkup(<TemplateRenderer doc={doc} mode="preview" edit={() => {}} editMeta={() => {}} />)
    : renderToStaticMarkup(<TemplateRenderer doc={doc} mode="print" />)

/** The opening tag of every contact item. */
const itemTags = (html: string) => html.match(/<span class="rm-contact[ "][^>]*>/g) ?? []

/** Every contacts block, whole. A contacts block holds no nested div. */
const blocks = (html: string) => html.match(/<div class="rm-contacts[\s\S]*?<\/div>/g) ?? []

const CONTACT_STYLES: Array<[string, (d: ResumeDocument) => void]> = [
  ['inline', () => {}],
  ['inline with separators', (d) => void (d.metadata.layout.contactSeparator = 'dot')],
  ['strip', (d) => void (d.metadata.layout.contactStyle = 'strip')],
  ['pills', (d) => void (d.metadata.layout.contactStyle = 'pills')],
  ['stacked', (d) => void (d.metadata.layout.contactStyle = 'stacked')],
  ['beside the name', (d) => void (d.metadata.layout.contactPlacement = 'beside')],
  ['sidebar', (d) => {
    d.metadata.layout.columns = 2
    d.metadata.layout.contactPlacement = 'sidebar'
  }],
]

describe('contact line direction', () => {
  for (const edit of [false, true]) {
    const mode = edit ? 'canvas' : 'print'
    for (const [style, set] of CONTACT_STYLES) {
      it(`${mode}, ${style}: in RTL the item follows the page and the value carries dir="auto"`, () => {
        const doc = persianDoc(true)
        set(doc)
        const html = render(doc, edit)
        const items = itemTags(html)
        expect(items.length).toBeGreaterThan(0)
        for (const tag of items) expect(tag).not.toMatch(/\sdir=/)
        // Each item's value element (the link, the plain span, or the
        // editable field) resolves its own direction.
        for (const block of blocks(html)) {
          const values = block.match(/<(?:a|span)\b[^>]*\sdir="auto"[^>]*>/g) ?? []
          expect(values.length).toBe(itemTags(block).length)
        }
      })

      it(`${mode}, ${style}: an LTR page carries no dir and no extra wrapper in its contacts`, () => {
        const doc = persianDoc(false)
        set(doc)
        const html = render(doc, edit)
        expect(blocks(html).length).toBeGreaterThan(0)
        for (const block of blocks(html)) {
          expect(block).not.toMatch(/\sdir=/)
          expect(block).not.toContain('<bdi')
        }
      })
    }
  }
})
