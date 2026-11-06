/**
 * The side panel's twin of the canvas logo row (issue #8). With no logo it is
 * exactly today's single picker; the way to a second logo appears only once
 * there is a first, and stops at three.
 */
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LogoPicker, LogosPicker } from './LogoPicker'

const A = 'data:image/png;base64,AAAA'
const B = 'data:image/png;base64,BBBB'
const C = 'data:image/png;base64,CCCC'
const noop = () => {}
const html = (logos: string[]) => renderToStaticMarkup(<LogosPicker label="Institution logo" logos={logos} onLogos={noop} />)

describe('LogosPicker', () => {
  it('with no logo, is exactly today’s single picker', () => {
    expect(html([])).toBe(renderToStaticMarkup(<LogoPicker label="Institution logo" value={undefined} onChange={noop} />))
  })

  it('with one logo, offers another beside it', () => {
    const out = html([A])
    expect(out.match(/<img /g)?.length).toBe(1)
    expect(out).toContain('+ Add another')
    expect(out).toContain('Institution logo')
  })

  it('with three, stops offering more and names the field in the plural', () => {
    const out = html([A, B, C])
    expect(out.match(/<img /g)?.length).toBe(3)
    expect(out).not.toContain('+ Add another')
    expect(out).toContain('>Logos<')
  })

  it('puts one move control between neighbours, never two that swap the same pair', () => {
    const out = html([A, B, C])
    expect(out).toContain('aria-label="Move logo 2 left"')
    expect(out).toContain('aria-label="Move logo 3 left"')
    expect(out).not.toContain('aria-label="Move logo 1 left"')
    expect(out).not.toMatch(/aria-label="Move logo \d right"/)
  })
})
