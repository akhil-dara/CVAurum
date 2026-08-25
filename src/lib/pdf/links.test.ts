import { describe, it, expect } from 'vitest'
import { linkTarget } from './links'

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
