import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createDocument } from '@/data/defaults'

// The sanitizer wraps a DOM purifier that needs a window, and this suite runs
// under the plain node environment. Nothing asserted here is rich text, so
// handing the string back is what the real sanitizer would do with it.
vi.mock('@/lib/sanitize', () => ({ sanitizeHtml: (html: string) => html }))
// The rich-text atom keeps hyphenated compounds whole through a DOM template
// element. The header holds no rich text, so the summary's markup passes
// through untouched here; everything else in the module stays real.
vi.mock('@/lib/pdf/hyphens', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/pdf/hyphens')>()),
  noBreakCompoundsHtml: (html: string) => html,
}))

import { TemplateRenderer } from '@/templates/TemplateRenderer'
import { ART_BANDS, ArtMini, HEADER_STYLES, HeaderMini } from '@/templates/_shared/headerStyles'

/**
 * The header compositions a Signature template composes from: a display
 * masthead, a colour block and a gradient band. Each is one branch of the
 * shared header, so the page is rendered to a string and the markup itself
 * is asserted - one name, one role, one contact line, the root class that
 * lets a template restyle the RESOLVED composition, and the stats band only
 * where the author asked for it.
 */
describe('header compositions', () => {
  it('display, block and band render name, role and contacts once, with stats only when asked', () => {
    for (const v of ['display', 'block', 'band'] as const) {
      const doc = createDocument({ sample: true })
      doc.metadata.layout.headerStyle = v
      doc.metadata.layout.stats = v === 'band'
      const html = renderToStaticMarkup(<TemplateRenderer doc={doc} mode="print" />)
      expect(html.match(/class="rm-name"/g)?.length).toBe(1)
      expect(html.match(/class="rm-headline"/g)?.length).toBe(1)
      expect(html.match(/class="rm-contacts/g)?.length).toBe(1)
      expect(html).toContain(`rm-header-${v}`)
      expect(html).toContain(`hdr-${v}`)
      expect(html.includes('rm-stats')).toBe(v === 'band')
    }
  })

  it('the stats band is decorative text, in the header when the composition has no slot for it', () => {
    const doc = createDocument({ sample: true })
    doc.metadata.layout.headerStyle = 'display'
    doc.metadata.layout.stats = true
    const html = renderToStaticMarkup(<TemplateRenderer doc={doc} mode="print" />)
    const header = html.match(/<header[\s\S]*?<\/header>/)?.[0] ?? ''
    expect(header).toContain('rm-stats')
    // Every figure and its label is marked for the painter and the parsers.
    const stats = html.match(/class="rm-deco rm-stat-(?:value|label)"/g)?.length ?? 0
    expect(stats).toBeGreaterThan(0)
    expect(html.match(/aria-hidden="true" class="rm-deco rm-stat-/g)?.length).toBe(stats)
  })

  it('the root class follows the composition the page actually draws', () => {
    // A template whose own header is a banner, restyled by the author to a
    // block: the root class names the block, so a template rule written for
    // `.hdr-block` reaches the author's choice too.
    const doc = createDocument({ sample: true, metadata: { template: 'polished' } })
    doc.metadata.layout.headerStyle = 'block'
    const html = renderToStaticMarkup(<TemplateRenderer doc={doc} mode="print" />)
    expect(html).toContain('hdr-block')
    expect(html).not.toContain('hdr-banner')
    const auto = createDocument({ sample: true, metadata: { template: 'polished' } })
    expect(renderToStaticMarkup(<TemplateRenderer doc={auto} mode="print" />)).toContain('hdr-banner')
  })
})

/**
 * The stepped composition (P1) and the art band (P10): three stacked bands
 * in graded shades of the accent, and an image any composition can carry
 * behind its words. The art is decoration - it is the header's first child,
 * so the painter (which paints in document order, having no z-index) lays
 * it under the words, and it is hidden from every reader and parser.
 */
describe('the stepped header and the art behind a header', () => {
  it('steps the name, the role and the contacts into three bands, each once', () => {
    const doc = createDocument({ sample: true })
    doc.metadata.layout.headerStyle = 'stepped'
    const html = renderToStaticMarkup(<TemplateRenderer doc={doc} mode="print" />)
    expect(html).toContain('rm-header-stepped')
    expect(html).toContain('hdr-stepped')
    expect(html.match(/class="rm-name"/g)?.length).toBe(1)
    expect(html.match(/class="rm-headline"/g)?.length).toBe(1)
    expect(html.match(/class="rm-contacts/g)?.length).toBe(1)
    // Each band is its own line of the page, in reading order: a name, the
    // role under it, the details under that. Nothing shares a line, so the
    // exported PDF reads back the way it was written.
    const name = html.indexOf('rm-step-name')
    const role = html.indexOf('rm-step-role')
    const contacts = html.indexOf('rm-step-contacts')
    expect(name).toBeGreaterThan(-1)
    expect(role).toBeGreaterThan(name)
    expect(contacts).toBeGreaterThan(role)
  })

  it('hangs the chosen band behind any composition, under the words and out of the text', () => {
    // banner is the header of four shipped templates and paints a full-bleed
    // ground of its own, so it is the composition an author is likeliest to
    // pick a band on.
    for (const v of ['standard', 'stepped', 'banner'] as const) {
      const doc = createDocument({ sample: true })
      doc.metadata.layout.headerStyle = v
      doc.metadata.theme.artBand = 'emerald'
      const html = renderToStaticMarkup(<TemplateRenderer doc={doc} mode="print" />)
      const header = html.match(/<header[\s\S]*?<\/header>/)?.[0] ?? ''
      expect(header, v).toContain('rm-header-art')
      expect(header, v).toContain('src="/art/bands/emerald.webp"')
      expect(header.indexOf('rm-art-band')).toBeLessThan(header.indexOf('rm-name'))
      expect(header, v).toContain('aria-hidden="true"')
    }
  })

  it('leaves a document that asked for no band without an image at all', () => {
    const doc = createDocument({ sample: true })
    const html = renderToStaticMarkup(<TemplateRenderer doc={doc} mode="print" />)
    expect(html).not.toContain('rm-art-band')
    expect(html).not.toContain('rm-header-art')
  })
})

/**
 * The picker draws a miniature of each composition beside its name, on the
 * canvas gear and in the Design panel alike (headerStyles.tsx). A
 * composition the list offers but the miniature does not know falls to a
 * dashed placeholder, which is what "Auto" means and what no named
 * composition should ever show.
 */
describe('header composition mocks', () => {
  it('every named composition draws its own miniature, never the placeholder', () => {
    const named = HEADER_STYLES.filter((h) => h.value)
    expect(named.map((h) => h.value)).toEqual(
      expect.arrayContaining([
        'standard',
        'centered',
        'split',
        'banner',
        'compact',
        'display',
        'block',
        'band',
        'stepped',
      ])
    )
    for (const h of named) {
      const html = renderToStaticMarkup(<HeaderMini kind={h.value} />)
      expect(html, h.value).not.toContain('border-dashed')
    }
    expect(renderToStaticMarkup(<HeaderMini kind="" />)).toContain('border-dashed')
  })

  it('every band shows itself in its swatch, and None is always offered', () => {
    expect(ART_BANDS.map((b) => b.value)).toEqual(['none', 'navy-gold', 'terracotta', 'cobalt', 'emerald'])
    for (const b of ART_BANDS.filter((x) => x.value !== 'none')) {
      expect(renderToStaticMarkup(<ArtMini kind={b.value} />), b.value).toContain(`/art/bands/${b.value}.webp`)
    }
    expect(renderToStaticMarkup(<ArtMini kind="none" />)).toContain('border-dashed')
  })
})

/**
 * Side headings (P4): a section can put its title in a column of its own,
 * beside the content rather than above it. The page names the placement so
 * the sheet can lay it out, and the markup order is unchanged - title, then
 * body - which is what the PDF's reading order and every parser follow.
 */
describe('side headings', () => {
  it('names the placement on the page and titles every section before its body', () => {
    const doc = createDocument({ sample: true })
    doc.metadata.layout.headingPlacement = 'side'
    const html = renderToStaticMarkup(<TemplateRenderer doc={doc} mode="print" />)
    expect(html).toContain('heads-side')
    // Sections never nest, so each chunk after a `<section ` opener is one
    // section's own markup.
    const sections = html.split('<section ').slice(1)
    expect(sections.length).toBeGreaterThan(2)
    for (const s of sections) {
      const title = s.indexOf('class="rm-section-title"')
      const body = s.indexOf('class="rm-section-body"')
      expect(title).toBeGreaterThan(-1)
      expect(body).toBeGreaterThan(title)
    }
  })

  it('leaves a page that never asked for them alone', () => {
    const doc = createDocument({ sample: true })
    const html = renderToStaticMarkup(<TemplateRenderer doc={doc} mode="print" />)
    expect(html).not.toContain('heads-side')
  })
})
