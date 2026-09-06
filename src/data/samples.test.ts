/**
 * The student persona - the one sample still IN school. The picker offered a
 * recent graduate, a marketer, an engineer and a designer: everybody had
 * finished. A student had no example to start from, and the entry they would
 * have typed (a degree finishing in 2027) printed as though it were already
 * in hand.
 */
import { describe, it, expect } from 'vitest'
import { SAMPLES, type SamplePersona } from './samples'
import { createDocument } from './defaults'
import { applyTemplateToMetadata } from '@/lib/templateApply'
import { getTemplate } from '@/templates/registry'
import { resumeToAtsText } from '@/lib/atsText'
import { ResumeContentSchema } from '@/types/document'

const student = SAMPLES.find((s) => s.id === 'student') as SamplePersona

/** The document the picker builds for a persona, exactly as the chooser does. */
const build = (p: SamplePersona) => {
  const doc = createDocument({ sample: true, content: p.content, title: p.name })
  doc.metadata = applyTemplateToMetadata(doc.metadata, getTemplate(p.template).defaults)
  p.tweaks?.(doc.metadata)
  return doc
}

describe('the student persona', () => {
  it('is offered beside the others, with the same shape of blurb', () => {
    expect(student).toBeDefined()
    expect(student.name).toBeTruthy()
    expect(student.role).toBeTruthy()
    expect(student.blurb.length).toBeGreaterThan(20)
    expect(getTemplate(student.template).id).toBe(student.template)
  })

  it('is a document the schema accepts, field for field', () => {
    expect(() => ResumeContentSchema.parse(student.content)).not.toThrow()
  })

  it('is still studying: an expected finish, school marks, and no work history', () => {
    const [degree, school] = student.content.education
    expect(degree.status).toBe('pursuing')
    expect(degree.endDate).toBe('2027-05')
    // The Class XII entry a fresher is asked for, marked the way a board marks.
    expect(school.level).toBe('intermediate')
    expect(school.score).toMatch(/%/)
    expect(student.content.work).toHaveLength(0)
    expect(student.content.projects).toHaveLength(2)
    expect(student.content.projects.every((p) => (p.keywords ?? []).length > 0)).toBe(true)
    expect(student.content.skills.length).toBeGreaterThan(0)
    expect(student.content.languages.length).toBeGreaterThan(0)
  })

  it('leads with education, above the projects', () => {
    const main = build(student).metadata.layout.main
    expect(main[0]).toBe('education')
    expect(main.indexOf('education')).toBeLessThan(main.indexOf('projects'))
  })

  it('states the graduation as expected wherever the document is read', () => {
    expect(resumeToAtsText(build(student))).toContain('Expected May 2027')
  })
})
