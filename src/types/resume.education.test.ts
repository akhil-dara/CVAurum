/**
 * Two optional education fields, both additive: `status` says whether the
 * course has finished, `level` says what kind of schooling it is so the
 * EDITOR can call the fields what a school calls them. Neither renames nor
 * removes anything, because an unknown value fails the whole document parse -
 * a resume written before either existed has to keep opening.
 */
import { describe, it, expect } from 'vitest'
import { EducationSchema } from './resume'
import { ResumeContentSchema } from './document'

/** An education entry exactly as it was stored before these fields existed. */
const OLD_ENTRY = {
  id: 'e1',
  institution: 'University of Washington',
  area: 'Computer Science',
  studyType: 'B.S.',
  location: 'Seattle, WA',
  startDate: '2019-09',
  endDate: '2023-05',
  score: '3.9 GPA',
  url: '',
  summary: '',
  courses: ['Databases'],
}

describe('education status', () => {
  it('round-trips both answers', () => {
    expect(EducationSchema.parse({ ...OLD_ENTRY, status: 'pursuing' }).status).toBe('pursuing')
    expect(EducationSchema.parse({ ...OLD_ENTRY, status: 'completed' }).status).toBe('completed')
  })

  it('stays absent when nothing was said', () => {
    expect(EducationSchema.parse(OLD_ENTRY).status).toBeUndefined()
  })
})

describe('education level', () => {
  it('round-trips every kind of schooling the editor offers', () => {
    for (const level of ['degree', 'diploma', 'intermediate', 'secondary', 'certificate']) {
      expect(EducationSchema.parse({ ...OLD_ENTRY, level }).level).toBe(level)
    }
  })

  it('stays absent when nothing was said', () => {
    expect(EducationSchema.parse(OLD_ENTRY).level).toBeUndefined()
  })

  it('changes none of the stored fields - it only names them in the editor', () => {
    const plain = EducationSchema.parse(OLD_ENTRY)
    const { level, ...schooled } = EducationSchema.parse({ ...OLD_ENTRY, level: 'intermediate' })
    expect(level).toBe('intermediate')
    expect(schooled).toEqual(plain)
  })
})

describe('a document written before either field existed', () => {
  it('parses whole, with every education field it always had', () => {
    const parsed = ResumeContentSchema.parse({ education: [OLD_ENTRY] })
    expect(parsed.education[0]).toEqual({ ...OLD_ENTRY })
    expect(parsed.education[0].status).toBeUndefined()
    expect(parsed.education[0].level).toBeUndefined()
  })
})
