import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createDocument } from '@/data/defaults'

vi.mock('@/lib/sanitize', () => ({ sanitizeHtml: (html: string) => html }))
vi.mock('@/lib/pdf/hyphens', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/pdf/hyphens')>()),
  noBreakCompoundsHtml: (html: string) => html,
}))

import { RtlOffer } from './RtlOffer'
import { DesignPanel } from './panels/DesignPanel'
import type { ResumeDocument } from '@/types/document'

/**
 * Right to left, invisible until it matters. A resume with no Arabic-script
 * letters shows no offer and no switch; one written in Persian or Arabic is
 * offered the whole setup in one tap, and the switch appears where the rest
 * of the layout lives.
 */

// Parisa: its pe is one of the letters Persian adds to the Arabic alphabet.
const PERSIAN_NAME = 'پریسا نوری'
const ARABIC_NAME = 'علي حسن'

function doc(name: string, tweak?: (d: ResumeDocument) => void): ResumeDocument {
  const d = createDocument({ sample: false })
  d.content.basics.name = name
  tweak?.(d)
  return d
}

describe('the right-to-left offer', () => {
  // Nothing shows for a Latin resume: the live region is there, empty, so a
  // card that appears later is announced; it takes no space and holds no text.
  const empty = (html: string) => {
    expect(html).not.toContain('<button')
    expect(html.replace(/<[^>]+>/g, '')).toBe('')
  }
  it('renders nothing for a Latin resume', () => {
    empty(renderToStaticMarkup(<RtlOffer doc={doc('Priya Menon')} />))
    empty(renderToStaticMarkup(<RtlOffer doc={createDocument({ sample: true })} />))
  })

  it('is announced politely and never pushes the page: a zero-height floating host', () => {
    const html = renderToStaticMarkup(<RtlOffer doc={doc(PERSIAN_NAME)} />)
    const host = /<div[^>]*data-rtl-offer[^>]*>/.exec(html)?.[0] ?? ''
    expect(host).toMatch(/aria-live="polite"/)
    expect(host).toMatch(/role="status"/)
    expect(host).toMatch(/\bh-0\b/)
    expect(host).toMatch(/\bsticky\b/)
    expect(html).not.toContain('autofocus')
  })

  it('offers to mirror a resume with a Persian name, naming the language', () => {
    const html = renderToStaticMarkup(<RtlOffer doc={doc(PERSIAN_NAME)} />)
    expect(html).toContain('This resume is in Persian. Mirror the page right to left?')
    expect(html).toContain('>Mirror the page</button>')
    expect(html).toContain('>Not now</button>')
  })

  it('names nothing with an aria-label a screen reader ignores (a div with no role)', () => {
    const html = renderToStaticMarkup(<RtlOffer doc={doc(PERSIAN_NAME)} />)
    for (const tag of html.match(/<div[^>]*>/g) ?? []) {
      if (tag.includes('aria-label')) expect(tag).toMatch(/role="/)
    }
  })

  it('says Arabic for Arabic', () => {
    const html = renderToStaticMarkup(<RtlOffer doc={doc(ARABIC_NAME)} />)
    expect(html).toContain('This resume is in Arabic. Mirror the page right to left?')
  })

  it('renders nothing once declined, or once the page is mirrored', () => {
    empty(renderToStaticMarkup(<RtlOffer doc={doc(PERSIAN_NAME, (d) => (d.metadata.layout.rtlOfferDismissed = true))} />))
    empty(renderToStaticMarkup(<RtlOffer doc={doc(PERSIAN_NAME, (d) => (d.metadata.layout.rtl = true))} />))
  })
})

describe('the right-to-left switch in the Design panel', () => {
  it('is absent for a Latin resume', () => {
    const html = renderToStaticMarkup(<DesignPanel doc={createDocument({ sample: true })} />)
    expect(html).not.toMatch(/right-to-left/i)
    expect(html).not.toContain('Persian')
  })

  it('appears for a Persian resume, at the end of the Layout group', () => {
    const html = renderToStaticMarkup(<DesignPanel doc={doc(PERSIAN_NAME)} />)
    expect(html).toContain('Right-to-left (RTL)')
    const layout = html.slice(html.indexOf('id="group-layout"'), html.indexOf('id="group-page"'))
    const at = layout.indexOf('Right-to-left (RTL)')
    expect(at).toBeGreaterThan(layout.indexOf('Header layout'))
    // nothing else of the group's after it
    expect(layout.slice(at)).not.toContain('class="label"')
  })

  it('stays for a page already mirrored, so it can be turned off', () => {
    const html = renderToStaticMarkup(<DesignPanel doc={doc('Priya Menon', (d) => (d.metadata.layout.rtl = true))} />)
    expect(html).toContain('Right-to-left (RTL)')
  })
})
