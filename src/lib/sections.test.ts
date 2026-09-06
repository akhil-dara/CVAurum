/**
 * The order resolver places the footer strip last and keeps every section
 * key unique across the main flow, the sidebar and the strip, so the canvas,
 * the ATS text and the Word file all read one order with the footer at the
 * end.
 */
import { describe, it, expect } from 'vitest'
import { resolveOrder } from './sections'
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
