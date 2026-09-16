import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createDocument } from '@/data/defaults'

// Same two stand-ins the footer suite uses: the sanitizer and the hyphenator
// each reach for a DOM, and this suite runs under the plain node environment.
vi.mock('@/lib/sanitize', () => ({ sanitizeHtml: (html: string) => html }))
vi.mock('@/lib/pdf/hyphens', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/pdf/hyphens')>()),
  noBreakCompoundsHtml: (html: string) => html,
}))

import { TemplateRenderer } from '@/templates/TemplateRenderer'

const PIC = 'data:image/png;base64,iVBORw0KGgo='
const noop = () => {}

const withPhoto = () => {
  const doc = createDocument({ sample: true })
  doc.content.basics.image = PIC
  doc.metadata.layout.showPhoto = true
  doc.metadata.layout.monogram = false
  return doc
}
const withMonogram = () => {
  const doc = createDocument({ sample: true })
  doc.content.basics.image = ''
  doc.metadata.layout.showPhoto = false
  doc.metadata.layout.monogram = true
  return doc
}
const editing = (doc: ReturnType<typeof withPhoto>) =>
  renderToStaticMarkup(<TemplateRenderer doc={doc} mode="preview" edit={noop} editMeta={noop} />)
const printed = (doc: ReturnType<typeof withPhoto>) => renderToStaticMarkup(<TemplateRenderer doc={doc} mode="print" />)

/**
 * Changing the picture from the canvas. The chip is edit-only chrome, so the
 * thing worth guarding in a static render is that it exists where a person is
 * editing, says the right words for what it will do, is a real labelled
 * button rather than a decorated image — and is nowhere near the export.
 */
describe('the canvas photo affordance', () => {
  it('offers Change beside the photo while editing', () => {
    const html = editing(withPhoto())
    expect(html).toContain('rm-visual-swap')
    expect(html).toContain('aria-label="Change photo"')
    expect(html).toContain('>Change</button>')
  })

  it('offers Add photo where a monogram stands in for one', () => {
    const html = editing(withMonogram())
    expect(html).toContain('rm-visual-swap')
    expect(html).toContain('aria-label="Add photo"')
    expect(html).toContain('>Add photo</button>')
    expect(html).not.toContain('aria-label="Change photo"')
  })

  it('is a real button with a label, not a clickable picture on its own', () => {
    // An <img> with a click handler is reachable by no key at all; the label
    // is what a screen reader and the tab order have to go on.
    const html = editing(withPhoto())
    const at = html.indexOf('rm-visual-swap')
    const tagStart = html.lastIndexOf('<', at)
    expect(html.slice(tagStart, tagStart + 8)).toBe('<button ')
    expect(html.slice(tagStart, at + 400)).toContain('type="button"')
  })

  it('carries its own file input, so the canvas needs no panel to pick a file', () => {
    const html = editing(withPhoto())
    expect(html).toContain('data-photo-input')
    expect(html).toContain('type="file"')
  })

  it('keeps every edit-only control out of the printed tree', () => {
    const html = printed(withPhoto())
    expect(html).toContain('class="rm-photo')
    expect(html).not.toContain('rm-visual-swap')
    expect(html).not.toContain('rm-visual-hide')
    expect(html).not.toContain('rm-visual-wrap')
    expect(html).not.toContain('type="file"')
    expect(html).not.toContain('<button')
  })

  it('leaves the monogram alone in the printed tree too', () => {
    const html = printed(withMonogram())
    expect(html).toContain('rm-monogram')
    expect(html).not.toContain('rm-visual-swap')
    expect(html).not.toContain('type="file"')
  })

  it('still renders exactly one photo image while editing', () => {
    const html = editing(withPhoto())
    expect(html.split('class="rm-photo').length - 1).toBe(1)
  })

  it('never renders a photo the page would have to fetch', () => {
    // The zero-external-requests promise: a crafted import carrying an http
    // src must not reach the canvas, chip or no chip.
    const doc = withPhoto()
    doc.content.basics.image = 'https://example.com/face.jpg'
    const html = editing(doc)
    expect(html).not.toContain('example.com/face.jpg')
    expect(html).not.toContain('rm-visual-swap')
  })
})

/*
 * The header's Style popover carries the third door (Change photo… / Remove
 * photo), but it only exists once the popover is OPEN and it is portaled to
 * the body — neither of which a static render reaches. That row is measured
 * in the browser instead (_local/canvas-photo/probe-mono-gear.cjs).
 */
