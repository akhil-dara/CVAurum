import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createDocument } from '@/data/defaults'
import { getTemplate } from '@/templates/registry'

// The sanitizer wraps a DOM purifier that needs a window, and this suite runs
// under the plain node environment. Nothing rendered here is rich text, so
// handing the string back is what the real sanitizer would do with it.
vi.mock('@/lib/sanitize', () => ({ sanitizeHtml: (html: string) => html }))

import { SectionBody } from './sections'

/**
 * Skills as rings: a skill with a level becomes a ring meter. The ring is two
 * sibling svgs with one fill each (the painter reads exactly one fill per
 * svg), the level is a decorative number a parser never sees, and the label
 * stays real text beneath it. Skills without a level keep their chips, after
 * the rings, so nothing the author typed goes missing.
 */
describe('skills as rings', () => {
  it('rings: a rated group is two single-fill svgs, a decorative number and a real label', () => {
    const doc = createDocument({ sample: true })
    doc.content.skills = [
      { id: 's1', name: 'TypeScript', level: '', keywords: [], rating: 4.6 },
      { id: 's2', name: 'Tools', level: '', keywords: ['Docker'] },
    ]
    doc.metadata.layout.sectionSettings = { skills: { skillsStyle: 'rings' } }
    const html = renderToStaticMarkup(<SectionBody sectionKey="skills" doc={doc} config={getTemplate('aurum')} />)
    expect(html.match(/class="rm-ring"/g)?.length).toBe(1)
    expect(html).toContain('rm-ring-track')
    expect(html).toContain('rm-ring-arc')
    expect(html).toMatch(/aria-hidden="true" class="rm-deco rm-ring-value" data-deco="1">92</)
    expect(html).toContain('>TypeScript<')
    expect(html).toContain('Docker')
  })

  it('rings come first, then the chips, and a rated group keeps its keywords', () => {
    const doc = createDocument({ sample: true })
    doc.content.skills = [
      { id: 's1', name: 'Tools', level: '', keywords: ['Docker'] },
      { id: 's2', name: 'Frontend', level: '', keywords: ['React'], rating: 4 },
      { id: 's3', name: 'Go', level: '', keywords: [], rating: 2.5 },
    ]
    doc.metadata.layout.sectionSettings = { skills: { skillsStyle: 'rings' } }
    const html = renderToStaticMarkup(<SectionBody sectionKey="skills" doc={doc} config={getTemplate('aurum')} />)
    expect(html.match(/class="rm-ring"/g)?.length).toBe(2)
    expect(html.indexOf('rm-rings')).toBeLessThan(html.indexOf('Docker'))
    expect(html).toMatch(/rm-ring-value" data-deco="1">80</)
    expect(html).toMatch(/rm-ring-value" data-deco="1">50</)
    // The ringed category still lists what is in it, and the ring is its
    // meter - no dots beside the chips.
    expect(html).toContain('React')
    expect(html).not.toContain('rm-level')
    // A skill that is only a name and a level prints its name once, in the ring.
    expect(html.match(/>Go</g)?.length).toBe(1)
  })

  it('a level of zero draws the track but no arc', () => {
    const doc = createDocument({ sample: true })
    doc.content.skills = [{ id: 's1', name: 'Rust', level: '', keywords: [], rating: 0 }]
    doc.metadata.layout.sectionSettings = { skills: { skillsStyle: 'rings' } }
    const html = renderToStaticMarkup(<SectionBody sectionKey="skills" doc={doc} config={getTemplate('aurum')} />)
    expect(html).toContain('rm-ring-track')
    expect(html).not.toContain('rm-ring-arc')
    expect(html).toMatch(/rm-ring-value" data-deco="1">0</)
  })
})
