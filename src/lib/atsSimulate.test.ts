/**
 * The simulator reads the order the ATS text reads, footer strip last: a
 * section moved to the strip is still a section a parser meets, so its
 * heading still counts.
 */
import { describe, it, expect } from 'vitest'
import { simulateAts } from './atsSimulate'
import { createDocument } from '@/data/defaults'

const titles = (doc: ReturnType<typeof createDocument>) =>
  simulateAts(doc).find((r) => r.id === 'workday')?.findings.map((f) => f.title) ?? []

describe('simulateAts still sees a section moved to the footer strip', () => {
  const stock = () => {
    const doc = createDocument({ sample: true })
    doc.content.custom = []
    return doc
  }

  it('raises no heading finding while every heading is standard', () => {
    expect(titles(stock())).not.toContain('Non-standard section headings')
  })

  it('flags a renamed standard heading that sits in the footer', () => {
    const doc = stock()
    doc.metadata.layout.headings = { skills: 'Toolbox' }
    doc.metadata.layout.footer = ['skills']
    doc.metadata.layout.main = doc.metadata.layout.main.filter((k) => k !== 'skills')
    expect(titles(doc)).toContain('Non-standard section headings')
  })
})
