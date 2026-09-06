import { describe, it, expect, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// atoms.tsx pulls in the sanitizer for RichText, and the sanitizer wraps a
// DOM purifier that needs a window; this suite runs under plain node.
vi.mock('@/lib/sanitize', () => ({ sanitizeHtml: (html: string) => html }))

import { Deco } from './atoms'

/**
 * Text a reader sees but a parser must not: year numerals, stats, ring
 * numbers, running section numbers. The markup is the whole contract - the
 * painter keys on aria-hidden to draw outlines with no text layer, and the
 * Word and ATS builders never see the element because they read the
 * document, not the page.
 */
describe('Deco', () => {
  it('renders an aria-hidden rm-deco span', () => {
    const html = renderToStaticMarkup(createElement(Deco, { children: '2021' }))
    expect(html).toBe('<span aria-hidden="true" class="rm-deco" data-deco="1">2021</span>')
  })

  it('keeps the class the caller adds after rm-deco', () => {
    const html = renderToStaticMarkup(createElement(Deco, { className: 'rm-year', children: '2021' }))
    expect(html).toContain('class="rm-deco rm-year"')
    expect(html).toContain('aria-hidden="true"')
  })

  it('can be a div for a block of decoration', () => {
    const html = renderToStaticMarkup(createElement(Deco, { as: 'div', children: '01' }))
    expect(html.startsWith('<div aria-hidden="true"')).toBe(true)
    expect(html.endsWith('>01</div>')).toBe(true)
  })
})
