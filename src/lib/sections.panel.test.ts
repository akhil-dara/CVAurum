/**
 * Issue #12: the Content panel listed only the sections named in the layout,
 * while the page also shows every section that holds content (resolveOrder) -
 * a sample's languages, an import's skills, a sidebar section on a design
 * with one column. Those sections were on the page and nowhere in the panel,
 * so their editor - where a language's fluency is set - could not be reached.
 * The panel's list must be the page's list.
 */
import { describe, it, expect } from 'vitest'
import { adoptShownSections, moveSection, panelColumns, resolveOrder } from './sections'
import { LIBRARY } from '@/data/library'
import { sampleDoc } from '@/data/library/doc'
import { TEMPLATES } from '@/templates/registry'
import { applyTemplateToMetadata } from './templateApply'
import { createDocument } from '@/data/defaults'
import type { ResumeDocument } from '@/types/document'

const visible = (doc: ResumeDocument, keys: string[]) => keys.filter((k) => !doc.metadata.layout.hidden.includes(k))

describe('panelColumns', () => {
  it('lists a section the page shows only because it holds content', () => {
    const doc = createDocument({ sample: true })
    doc.metadata.layout.main = doc.metadata.layout.main.filter((k) => k !== 'languages')
    doc.metadata.layout.aside = doc.metadata.layout.aside.filter((k) => k !== 'languages')
    doc.content.languages = [{ id: 'l1', language: 'Spanish', fluency: 'Professional' }]
    expect(resolveOrder(doc, { includeEmpty: true }).main).toContain('languages')
    expect(panelColumns(doc).main).toContain('languages')
  })

  it('on a one-column design, lists what the sidebar held where the page shows it', () => {
    const doc = createDocument({ sample: true })
    doc.metadata.layout.columns = 1
    doc.metadata.layout.aside = ['skills']
    doc.metadata.layout.main = doc.metadata.layout.main.filter((k) => k !== 'skills')
    expect(panelColumns(doc)).toEqual({ ...resolveOrder(doc, { includeEmpty: true }), footer: doc.metadata.layout.footer })
  })

  it('matches the page for every sample in every design', () => {
    const misses: string[] = []
    for (const s of LIBRARY) {
      const base = sampleDoc(s)
      for (const t of TEMPLATES) {
        const doc: ResumeDocument = { ...base, metadata: applyTemplateToMetadata(base.metadata, t.defaults) }
        const page = resolveOrder(doc, { includeEmpty: true })
        const panel = panelColumns(doc)
        const a = JSON.stringify([visible(doc, panel.main), visible(doc, panel.aside)])
        const b = JSON.stringify([page.main, page.aside])
        if (a !== b) misses.push(`${s.slug} in ${t.id}: panel ${a} page ${b}`)
      }
    }
    expect(misses.slice(0, 5)).toEqual([])
  }, 60000)
})

describe('adoptShownSections', () => {
  it('writes the page order into the layout without changing what the page shows', () => {
    for (const s of LIBRARY.slice(0, 40)) {
      const base = sampleDoc(s)
      for (const t of TEMPLATES) {
        const doc: ResumeDocument = { ...base, metadata: applyTemplateToMetadata(base.metadata, t.defaults) }
        const before = JSON.stringify(resolveOrder(doc, { includeEmpty: true }))
        const after = structuredClone(doc)
        adoptShownSections(after.metadata.layout, after.content)
        expect(JSON.stringify(resolveOrder(after, { includeEmpty: true })), `${s.slug} in ${t.id}`).toBe(before)
      }
    }
  }, 60000)

  it('lets a section the page appended move up, on one column, where the sidebar list held it', () => {
    const doc = createDocument({ sample: true })
    doc.metadata.layout.columns = 1
    doc.metadata.layout.aside = ['languages']
    doc.metadata.layout.main = doc.metadata.layout.main.filter((k) => k !== 'languages')
    doc.content.languages = [{ id: 'l1', language: 'Spanish', fluency: 'Professional' }]
    const page = resolveOrder(doc, { includeEmpty: true }).main
    const at = page.indexOf('languages')
    adoptShownSections(doc.metadata.layout, doc.content)
    moveSection(doc.metadata.layout, 'languages', -1)
    expect(resolveOrder(doc, { includeEmpty: true }).main.indexOf('languages')).toBe(at - 1)
  })
})
