import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createDocument } from '@/data/defaults'

vi.mock('@/lib/sanitize', () => ({ sanitizeHtml: (html: string) => html }))
vi.mock('@/lib/pdf/hyphens', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/pdf/hyphens')>()),
  noBreakCompoundsHtml: (html: string) => html,
}))

import { TemplateRenderer } from '@/templates/TemplateRenderer'

/**
 * Several logos on one entry (issue #8) render as one row in the entry-mark
 * gutter, the same markup the PDF is painted from. A one-logo entry renders
 * exactly as it always has, and a section only widens its gutter when some
 * entry in it has more than one logo.
 */
const A = 'data:image/png;base64,AAAA'
const B = 'data:image/png;base64,BBBB'
const C = 'data:image/png;base64,CCCC'

const sectionHtml = (html: string, key: string) => {
  const at = html.indexOf(`data-section="${key}"`)
  const open = html.lastIndexOf('<section', at)
  return html.slice(open, html.indexOf('</section>', at))
}

function render(mutate: (d: ReturnType<typeof createDocument>) => void) {
  const doc = createDocument({ sample: true })
  for (const list of [doc.content.work, doc.content.education]) for (const it of list) delete it.logo
  mutate(doc)
  return renderToStaticMarkup(<TemplateRenderer doc={doc} mode="print" />)
}

describe('several logos on one entry', () => {
  it('draws three logos as one row, in order', () => {
    const html = render((d) => {
      d.content.education[0].logo = A
      d.content.education[0].logoExtras = [B, C]
    })
    const edu = sectionHtml(html, 'education')
    const row = edu.match(/<span class="rm-item-logos" data-logos="3">([\s\S]*?)<\/span>/)
    expect(row).not.toBeNull()
    expect([...row![1].matchAll(/src="([^"]+)"/g)].map((m) => m[1])).toEqual([A, B, C])
  })

  it('widens the gutter only for a section where some entry has more than one logo', () => {
    const html = render((d) => {
      d.content.work[0].logo = A
      d.content.work[0].logoExtras = [B]
      d.content.work[1].logo = C
      d.content.education[0].logo = A
    })
    expect(sectionHtml(html, 'work')).toMatch(/--rm-mark-count:\s*2/)
    expect(sectionHtml(html, 'education')).not.toMatch(/--rm-mark-count/)
  })

  it('leaves a one-logo entry exactly as it was: no row, no new markup', () => {
    const html = render((d) => {
      d.content.education[0].logo = A
    })
    const edu = sectionHtml(html, 'education')
    expect(edu).not.toContain('rm-item-logos')
    expect(edu).toContain(`<img class="rm-item-logo" src="${A}"`)
  })

  it('prints the one logo an entry shows even when it is stored as an extra', () => {
    // {logo: '', logoExtras: [B]} - an older tab removing the first logo
    // leaves this. The canvas shows B; the page it prints must too.
    const html = render((d) => {
      d.content.education[0].logo = ''
      d.content.education[0].logoExtras = [B]
    })
    const edu = sectionHtml(html, 'education')
    expect(edu).toContain(`<img class="rm-item-logo" src="${B}"`)
  })

  it('gives an entry with no mark no gutter', () => {
    const html = render(() => {})
    const firstWork = sectionHtml(html, 'work').match(/<article class="([^"]+)"/)
    expect(firstWork![1]).not.toContain('rm-has-mark')
  })

  it('shows no letter badge once an entry has logos', () => {
    const html = render((d) => {
      d.metadata.layout.sectionSettings = { ...(d.metadata.layout.sectionSettings ?? {}), work: { showBadges: true } }
      d.content.work[0].logo = A
      d.content.work[0].logoExtras = [B]
    })
    const first = sectionHtml(html, 'work').split('<article')[1]
    expect(first).not.toContain('rm-item-badge')
  })
})
