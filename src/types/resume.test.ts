import { describe, expect, it } from 'vitest'
import { WorkSchema, EducationSchema, VolunteerSchema } from './resume'

describe('WorkSchema logos (multi-entry-icons, issue #8)', () => {
  it('parses an old document that only has `logo` unchanged, defaulting logos to []', () => {
    const parsed = WorkSchema.parse({ name: 'Acme', logo: 'data:image/png;base64,AAA' })
    expect(parsed.logo).toBe('data:image/png;base64,AAA')
    expect(parsed.logos).toEqual([])
  })

  it('parses a document with no logo fields at all', () => {
    const parsed = WorkSchema.parse({ name: 'Acme' })
    expect(parsed.logo).toBeUndefined()
    expect(parsed.logos).toEqual([])
  })

  it('round-trips a `logos` array through parse (JSON round-trip)', () => {
    const input = { name: 'Acme', logos: ['data:image/png;base64,AAA', 'data:image/png;base64,BBB'] }
    const parsed = WorkSchema.parse(JSON.parse(JSON.stringify(input)))
    expect(parsed.logos).toEqual(input.logos)
  })

  it('round-trips BOTH logo and logos together, neither clobbering the other', () => {
    const input = { name: 'Acme', logo: 'legacy', logos: ['a', 'b'] }
    const parsed = WorkSchema.parse(JSON.parse(JSON.stringify(input)))
    expect(parsed.logo).toBe('legacy')
    expect(parsed.logos).toEqual(['a', 'b'])
  })
})

describe('EducationSchema logos', () => {
  it('an old education entry with only `logo` parses unchanged', () => {
    const parsed = EducationSchema.parse({ institution: 'State U', logo: 'data:image/png;base64,AAA' })
    expect(parsed.logo).toBe('data:image/png;base64,AAA')
    expect(parsed.logos).toEqual([])
  })

  it('round-trips a joint-degree `logos` array', () => {
    const input = { institution: 'State U', logos: ['a', 'b'] }
    const parsed = EducationSchema.parse(JSON.parse(JSON.stringify(input)))
    expect(parsed.logos).toEqual(['a', 'b'])
  })
})

describe('VolunteerSchema logos', () => {
  it('an old volunteer entry with only `logo` parses unchanged', () => {
    const parsed = VolunteerSchema.parse({ organization: 'Red Cross', logo: 'data:image/png;base64,AAA' })
    expect(parsed.logo).toBe('data:image/png;base64,AAA')
    expect(parsed.logos).toEqual([])
  })

  it('round-trips a `logos` array', () => {
    const input = { organization: 'Red Cross', logos: ['a'] }
    const parsed = VolunteerSchema.parse(JSON.parse(JSON.stringify(input)))
    expect(parsed.logos).toEqual(['a'])
  })
})
