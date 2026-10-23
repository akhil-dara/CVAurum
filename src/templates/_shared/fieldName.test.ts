import { describe, expect, it } from 'vitest'
import { fieldName } from './fieldName'

describe('the name a canvas field is announced by', () => {
  it('says which entry and section a repeated field belongs to', () => {
    expect(fieldName({ placeholder: 'Company', section: 'Experience', entry: 'Senior Software Engineer' })).toBe(
      'Company, Senior Software Engineer, Experience'
    )
  })

  it('names the entry by its own words only once: the title field is not "Job title, <itself>"', () => {
    expect(fieldName({ placeholder: 'Job title', section: 'Experience' })).toBe('Job title, Experience')
  })

  it('leaves out a section that only repeats the field', () => {
    expect(fieldName({ placeholder: 'Summary', section: 'Summary' })).toBe('Summary')
  })

  it('keeps a long entry title short enough to hear', () => {
    const long = 'Led the migration of a forty-service monolith onto an event-driven platform'
    expect(fieldName({ placeholder: 'Company', section: 'Experience', entry: long })).toBe(
      'Company, Led the migration of a forty-service…, Experience'
    )
  })

  it('falls back to a plain word when a field has no placeholder', () => {
    expect(fieldName({})).toBe('Text')
  })

  it('squeezes the whitespace a heading carries from the page', () => {
    expect(fieldName({ placeholder: 'Degree', section: '  Education \n', entry: ' B.S.,\n Computer Science ' })).toBe(
      'Degree, B.S., Computer Science, Education'
    )
  })

  it('names the field, not the hint its placeholder gives', () => {
    expect(fieldName({ placeholder: 'Company — e.g. Acme Corp', section: 'Experience', entry: 'Engineer' })).toBe(
      'Company, Engineer, Experience'
    )
    expect(fieldName({ placeholder: 'Brief role overview — scope, team, mission (optional)' })).toBe('Brief role overview')
  })

  it('calls a field whose placeholder is only an example by what it is', () => {
    expect(fieldName({ placeholder: 'e.g. Cut deploy time 40% by automating the CI pipeline', fallback: 'Bullet' })).toBe('Bullet')
  })

  it('counts a field that repeats, so no two read the same', () => {
    expect(
      fieldName({ placeholder: 'e.g. Cut deploy time 40%', fallback: 'Bullet', position: { n: 2, of: 3 }, section: 'Experience', entry: 'Engineer' })
    ).toBe('Bullet 2 of 3, Engineer, Experience')
    expect(fieldName({ placeholder: 'Skill', section: 'Skills', position: { n: 1, of: 1 } })).toBe('Skill, Skills')
  })
})
