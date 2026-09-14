import { describe, expect, it } from 'vitest'
import { createDocument } from '@/data/defaults'
import type { ResumeDocument } from '@/types/document'
import { basicsDone } from './ContentPanel'

/**
 * Personal details opens on a résumé that still needs it and folds on one that
 * does not — fifteen fields stood between the panel's top and the section list
 * most people open it for, which on a phone was more than a screen of
 * scrolling before that list appeared at all.
 *
 * The rule is one line and exactly the kind that gets inverted by a later
 * edit, so it is held here rather than trusted.
 */
const withBasics = (over: Partial<ResumeDocument['content']['basics']>): ResumeDocument => {
  const d = createDocument({})
  d.content.basics = { ...d.content.basics, name: '', email: '', phone: '', ...over }
  return d
}

describe('when the top of the résumé counts as answered', () => {
  it('is not answered on a blank résumé', () => {
    expect(basicsDone(createDocument({}))).toBe(false)
  })

  it('needs a name and one way to be reached', () => {
    expect(basicsDone(withBasics({ name: 'Alex Morgan' }))).toBe(false)
    expect(basicsDone(withBasics({ email: 'alex@example.com' }))).toBe(false)
    expect(basicsDone(withBasics({ name: 'Alex Morgan', email: 'alex@example.com' }))).toBe(true)
  })

  it('takes a phone as that one way, since a résumé may carry either', () => {
    expect(basicsDone(withBasics({ name: 'Alex Morgan', phone: '(555) 0142' }))).toBe(true)
  })

  it('does not count whitespace as an answer', () => {
    expect(basicsDone(withBasics({ name: '   ', email: 'alex@example.com' }))).toBe(false)
    expect(basicsDone(withBasics({ name: 'Alex Morgan', email: '  ' }))).toBe(false)
  })

  it('counts the example résumé as answered, since it is', () => {
    expect(basicsDone(createDocument({ sample: true }))).toBe(true)
  })
})
