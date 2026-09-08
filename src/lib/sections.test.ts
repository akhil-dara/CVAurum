/**
 * The order resolver places the footer strip last and keeps every section
 * key unique across the main flow, the sidebar and the strip, so the canvas,
 * the ATS text and the Word file all read one order with the footer at the
 * end.
 */
import { describe, it, expect } from 'vitest'
import { hasDatedEntry, metaColumnOn, resolveOrder } from './sections'
import { MetadataSchema } from '@/types/metadata'
import { createDocument } from '@/data/defaults'
import type { ResumeDocument } from '@/types/document'

const docWith = (layout: Record<string, unknown>): ResumeDocument => {
  const doc = createDocument({ sample: true })
  doc.metadata = MetadataSchema.parse({ ...doc.metadata, layout: { ...doc.metadata.layout, ...layout } })
  return doc
}

describe('resolveOrder places the footer strip last', () => {
  it('returns the footer keys as their own list, in the order the strip lists them', () => {
    const { footer } = resolveOrder(docWith({ footer: ['languages', 'skills'] }))
    expect(footer).toEqual(['languages', 'skills'])
  })

  it('an unset footer reads as empty and leaves the body order alone', () => {
    const { main, footer } = resolveOrder(createDocument({ sample: true }))
    expect(footer).toEqual([])
    expect(main).toContain('skills')
  })

  it('a key in the footer leaves the main flow and the sidebar', () => {
    const doc = docWith({ columns: 2, main: ['summary', 'work', 'skills'], aside: ['skills', 'languages'], footer: ['skills'] })
    const { main, aside, footer } = resolveOrder(doc)
    expect(main).not.toContain('skills')
    expect(aside).not.toContain('skills')
    expect(aside).toContain('languages')
    expect(footer).toEqual(['skills'])
  })

  it('never appends a footer key back to the body as an unplaced section', () => {
    const { main, footer } = resolveOrder(docWith({ main: ['summary', 'work'], footer: ['skills'] }))
    expect(main).not.toContain('skills')
    expect(footer).toEqual(['skills'])
  })

  it('drops a hidden or empty footer section the way the body does', () => {
    const doc = docWith({ footer: ['skills', 'languages'], hidden: ['languages'] })
    doc.content.skills = []
    expect(resolveOrder(doc).footer).toEqual([])
    expect(resolveOrder(doc, { includeEmpty: true }).footer).toEqual(['skills'])
  })
})

describe('the date column is on only while it has something to show', () => {
  const dated = () => createDocument({ sample: true })
  const undated = () => {
    const doc = createDocument({ sample: true })
    for (const list of [doc.content.work, doc.content.education, doc.content.projects, doc.content.volunteer]) {
      for (const e of list) { e.startDate = ''; e.endDate = '' }
    }
    for (const a of doc.content.awards) a.date = ''
    for (const c of doc.content.certificates) c.date = ''
    for (const p of doc.content.publications) p.releaseDate = ''
    for (const sec of doc.content.custom) for (const i of sec.items) i.date = ''
    return doc
  }
  const asking = (doc: ResumeDocument, column: 'gutter' | 'margin') => {
    doc.metadata.layout.metaColumn = column
    return doc
  }

  it('a dated document keeps the rail and the margin it asked for', () => {
    expect(metaColumnOn(asking(dated(), 'gutter').metadata, dated().content)).toBe('gutter')
    expect(metaColumnOn(asking(dated(), 'margin').metadata, dated().content)).toBe('margin')
  })

  it('with no dates anywhere neither column is drawn', () => {
    const doc = undated()
    expect(hasDatedEntry(doc.content)).toBe(false)
    expect(metaColumnOn(asking(doc, 'gutter').metadata, doc.content)).toBe('none')
    expect(metaColumnOn(asking(doc, 'margin').metadata, doc.content)).toBe('none')
  })

  it('an expected finish alone fills the margin but not the year rail', () => {
    // a student: undated projects, a course with a finish but no start
    const doc = undated()
    doc.content.education[0].endDate = '2027-05'
    expect(hasDatedEntry(doc.content, 'start')).toBe(false)
    expect(hasDatedEntry(doc.content, 'any')).toBe(true)
    expect(metaColumnOn(asking(doc, 'gutter').metadata, doc.content)).toBe('none')
    expect(metaColumnOn(asking(doc, 'margin').metadata, doc.content)).toBe('margin')
  })

  it('never asks for a column the document did not', () => {
    expect(metaColumnOn(asking(dated(), 'gutter').metadata, dated().content)).not.toBe('none')
    const doc = dated()
    doc.metadata.layout.metaColumn = 'none'
    expect(metaColumnOn(doc.metadata, doc.content)).toBe('none')
  })
})
