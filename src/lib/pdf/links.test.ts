import { describe, it, expect } from 'vitest'
import { asciiUrl, linkTarget, mergeRuns } from './links'

describe('linkTarget', () => {
  it('keeps an absolute URL as it is', () => {
    expect(linkTarget('https://github.com/someone/proj')).toBe('https://github.com/someone/proj')
  })

  it('adds a scheme to a bare domain, which is how people type them', () => {
    expect(linkTarget('github.com/someone')).toBe('https://github.com/someone')
    expect(linkTarget('www.example.co.uk')).toBe('https://www.example.co.uk')
  })

  it('turns a bare email into a mailto: link', () => {
    expect(linkTarget('someone@example.com')).toBe('mailto:someone@example.com')
  })

  it('leaves mailto: and tel: alone', () => {
    expect(linkTarget('mailto:a@b.com')).toBe('mailto:a@b.com')
    expect(linkTarget('tel:+919391022393')).toBe('tel:+919391022393')
  })

  it('makes a phone number dialable', () => {
    expect(linkTarget('+91 93910 22393')).toBe('tel:+919391022393')
  })

  it('refuses script and data URLs - a resume is opened by strangers', () => {
    expect(linkTarget('javascript:alert(1)')).toBeNull()
    expect(linkTarget('  JAVASCRIPT:alert(1)')).toBeNull()
    expect(linkTarget('data:text/html;base64,PHNjcmlwdD4=')).toBeNull()
    expect(linkTarget('vbscript:msgbox')).toBeNull()
  })

  it('has nothing to point at for empty or junk input', () => {
    expect(linkTarget('')).toBeNull()
    expect(linkTarget('   ')).toBeNull()
    expect(linkTarget(undefined)).toBeNull()
    expect(linkTarget('Hyderabad, Telangana')).toBeNull()
  })
})

describe('mergeRuns', () => {
  const box = (left: number, top: number, width: number, height: number) => ({ left, top, width, height })

  it('joins the word rects of one line into the line box, so the gaps between words are clickable', () => {
    // What "Pulse - Open-source observability" actually came back as.
    const got = mergeRuns([box(70, 100, 40, 13), box(116, 100, 76, 13), box(198, 100, 88, 13)])
    expect(got).toHaveLength(1)
    expect(got[0]).toEqual(box(70, 100, 216, 13))
  })

  it('keeps a wrapped link as one region per line, never one box over both', () => {
    const got = mergeRuns([box(70, 100, 300, 13), box(70, 117, 180, 13)])
    expect(got).toHaveLength(2)
    expect(got[0].height).toBe(13)
    expect(got[1].height).toBe(13)
  })

  it('leaves a raised or inline-icon rect on its own rather than swallowing it', () => {
    // A superscript sits above the line and overlaps it only slightly.
    const got = mergeRuns([box(70, 100, 40, 13), box(112, 88, 6, 7)])
    expect(got).toHaveLength(2)
  })

  it('orders by line then by position, whatever order the rects arrive in', () => {
    const got = mergeRuns([box(70, 117, 180, 13), box(198, 100, 88, 13), box(70, 100, 40, 13)])
    expect(got).toHaveLength(2)
    expect(got[0].top).toBe(100)
    expect(got[0].width).toBe(216)
    expect(got[1].top).toBe(117)
  })

  it('returns nothing for nothing', () => {
    expect(mergeRuns([])).toEqual([])
  })
})

describe('asciiUrl: what a PDF link can hold', () => {
  it('leaves an ASCII address exactly as it is', () => {
    expect(asciiUrl('https://example.com/verify?id=12345&x=y#top')).toBe('https://example.com/verify?id=12345&x=y#top')
    expect(asciiUrl('mailto:a.b@example.com')).toBe('mailto:a.b@example.com')
  })
  it('writes an internationalised host in punycode and a non-Latin path percent-encoded', () => {
    expect(asciiUrl('https://пример.рф/резюме')).toBe('https://xn--e1afmkfd.xn--p1ai/%D1%80%D0%B5%D0%B7%D1%8E%D0%BC%D0%B5')
    expect(asciiUrl('https://github.com/daniil/демо')).toBe('https://github.com/daniil/%D0%B4%D0%B5%D0%BC%D0%BE')
  })
  it('never leaves a space in the address', () => {
    expect(asciiUrl('tel:+359 88 123')).toBe('tel:+359%2088%20123')
    expect(asciiUrl('https://example.com/a b')).toBe('https://example.com/a%20b')
  })
})

describe('linkTarget with non-Latin addresses', () => {
  it('turns a bare internationalised domain into a link, encoded for the PDF', () => {
    expect(linkTarget('пример.рф')).toBe('https://xn--e1afmkfd.xn--p1ai/')
    expect(linkTarget('пример.рф/резюме')).toBe('https://xn--e1afmkfd.xn--p1ai/%D1%80%D0%B5%D0%B7%D1%8E%D0%BC%D0%B5')
  })
  it('encodes a typed scheme URL and a non-Latin email the same way', () => {
    expect(linkTarget('https://github.com/daniil/демо')).toBe('https://github.com/daniil/%D0%B4%D0%B5%D0%BC%D0%BE')
    expect(linkTarget('иван@пример.рф')).toBe('mailto:%D0%B8%D0%B2%D0%B0%D0%BD@%D0%BF%D1%80%D0%B8%D0%BC%D0%B5%D1%80.%D1%80%D1%84')
  })
})
