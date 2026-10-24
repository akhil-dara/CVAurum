import { describe, expect, it } from 'vitest'
import { linkHtml, linkMarkdown, linkParts } from './inlineLinks'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

describe('links written inside guide prose', () => {
  const text = 'Try [Harvard](/templates/harvard) or the [ATS resume checker](/ats-resume-checker) & compare.'

  it('splits prose into words and internal links', () => {
    expect(linkParts(text)).toEqual([
      'Try ',
      { label: 'Harvard', href: '/templates/harvard' },
      ' or the ',
      { label: 'ATS resume checker', href: '/ats-resume-checker' },
      ' & compare.',
    ])
  })

  it('writes escaped HTML anchors for a reader without scripts', () => {
    expect(linkHtml(text, esc)).toBe('Try <a href="/templates/harvard">Harvard</a> or the <a href="/ats-resume-checker">ATS resume checker</a> &amp; compare.')
  })

  it('writes absolute Markdown links for the twin', () => {
    expect(linkMarkdown(text, 'https://cvaurum.com')).toBe(
      'Try [Harvard](https://cvaurum.com/templates/harvard) or the [ATS resume checker](https://cvaurum.com/ats-resume-checker) & compare.'
    )
  })

  it('leaves anything but a site path as plain text', () => {
    expect(linkParts('See [this](https://elsewhere.example) now')).toEqual(['See [this](https://elsewhere.example) now'])
    expect(linkHtml('a <b> [x](javascript:alert(1))', esc)).toBe('a &lt;b&gt; [x](javascript:alert(1))')
  })
})

describe('the one address outside the site a guide may link to', () => {
  it('links the project’s own repository, absolute in Markdown, with rel=noopener in HTML', () => {
    const t = 'Report it on the [source repository](https://github.com/akhil-dara/cvaurum).'
    expect(linkParts(t)[1]).toEqual({ label: 'source repository', href: 'https://github.com/akhil-dara/cvaurum' })
    expect(linkHtml(t, esc)).toContain('<a href="https://github.com/akhil-dara/cvaurum" rel="noopener">source repository</a>')
    expect(linkMarkdown(t, 'https://cvaurum.com')).toContain('(https://github.com/akhil-dara/cvaurum)')
  })
  it('refuses any other external address, other GitHub accounts included', () => {
    expect(linkParts('[x](https://github.com/someone-else/repo)')).toEqual(['[x](https://github.com/someone-else/repo)'])
    expect(linkParts('[x](https://example.com/a)')).toEqual(['[x](https://example.com/a)'])
  })
})
