import { describe, expect, it } from 'vitest'
import { hyphenTokenRanges, MAX_UNBREAKABLE_TOKEN } from './hyphens'

const picked = (s: string) => hyphenTokenRanges(s).map(([a, b]) => s.slice(a, b))

describe('hyphenTokenRanges — words that must not break at their hyphen (2026-08-24)', () => {
  // CSS treats an existing hyphen as a break opportunity, so "SLA-compliant"
  // wraps as "SLA-" + "compliant" and an ATS searching the phrase finds
  // nothing. No CSS property prevents it — hyphens:none, word-break:keep-all,
  // line-break:strict and text-wrap:pretty all still split — so the tokens
  // have to be marked individually.
  it('picks a hyphenated word', () => {
    expect(picked('First-Time Resolution')).toEqual(['First-Time'])
    expect(picked('prompt SLA-compliant containment')).toEqual(['SLA-compliant'])
  })

  it('keeps surrounding punctuation with the token', () => {
    // "(PL-300)" must stay whole, brackets included — that is how a reader
    // and an ATS both see the credential.
    expect(picked('Associate (PL-300)')).toEqual(['(PL-300)'])
  })

  it('ignores a floating dash, which is a range not a word', () => {
    expect(picked('Jun 2023 — Present')).toEqual([])
    expect(picked('2018 - 2021')).toEqual([])
  })

  it('ignores a token with no hyphen', () => {
    expect(picked('Stakeholder Management')).toEqual([])
  })

  it('leaves an over-long token breakable, or it would overflow its column', () => {
    const long = 'a'.repeat(MAX_UNBREAKABLE_TOKEN) + '-' + 'b'.repeat(10)
    expect(picked(long)).toEqual([])
  })

  it('picks every hyphenated token on a line', () => {
    expect(picked('Root-Cause Analysis and first-time resolution')).toEqual(['Root-Cause', 'first-time'])
  })

  it('handles a trailing hyphen with no word after it', () => {
    // "end-" alone is not a compound; nothing to protect.
    expect(picked('the end- of it')).toEqual([])
  })
})
