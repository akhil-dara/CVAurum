import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createDocument } from '@/data/defaults'
import { resolveOrder } from '@/lib/sections'

// The sanitizer wraps a DOM purifier that needs a window, and this suite runs
// under the plain node environment. Nothing asserted here is rich text, so
// handing the string back is what the real sanitizer would do with it.
vi.mock('@/lib/sanitize', () => ({ sanitizeHtml: (html: string) => html }))
// The rich-text atom keeps hyphenated compounds whole through a DOM template
// element. The strip holds no rich text, so the summary's markup passes
// through untouched here; everything else in the module stays real.
vi.mock('@/lib/pdf/hyphens', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/pdf/hyphens')>()),
  noBreakCompoundsHtml: (html: string) => html,
}))

import { TemplateRenderer } from '@/templates/TemplateRenderer'

/**
 * The footer strip: the sections the author moved to `layout.footer` leave
 * the main flow and render in a full-width band after the columns, in the
 * compact row form - one line per skill group (label, then the list) and
 * one line for the languages. The page is rendered to a string and the
 * markup itself is asserted, the same way the order resolver, the ATS text
 * and the Word file are asserted to read the strip last.
 */
describe('the footer strip', () => {
  it('renders footer sections in a strip after the body, one line per group', () => {
    const doc = createDocument({ sample: true })
    doc.metadata.layout.footer = ['skills', 'languages']
    const html = renderToStaticMarkup(<TemplateRenderer doc={doc} mode="print" />)
    const footerAt = html.indexOf('class="rm-footer')
    expect(footerAt).toBeGreaterThan(html.indexOf('class="rm-col-main"'))
    expect(html.slice(footerAt)).toContain('rm-footer-row')
    expect(html.slice(0, footerAt)).not.toContain('data-section="skills"')
    expect(html.slice(0, footerAt)).not.toContain('data-section="languages"')
    // The order resolver agrees: the strip's keys are its own, read last.
    expect(resolveOrder(doc).footer).toEqual(['skills', 'languages'])
    expect(resolveOrder(doc).main).not.toContain('skills')
  })

  it('a skill group is one row, its name as the label and its keywords as the list', () => {
    const doc = createDocument({ sample: true })
    doc.metadata.layout.footer = ['skills']
    doc.content.skills = [
      { id: 's1', name: 'Frontend', level: '', keywords: ['React', 'Vite'] },
      { id: 's2', name: 'Data', level: '', keywords: ['SQL'] },
    ]
    const html = renderToStaticMarkup(<TemplateRenderer doc={doc} mode="print" />)
    const strip = html.slice(html.indexOf('class="rm-footer'))
    expect(strip.match(/rm-footer-row/g)?.length).toBe(2)
    expect(strip).toMatch(/rm-footer-label[^>]*>Frontend</)
    expect(strip).toContain('rm-footer-list')
    expect(strip).toContain('React')
    expect(strip).toContain('Vite')
    // The strip is compact: no chips, no meters, whatever the section's own
    // skills style says.
    doc.metadata.layout.sectionSettings = { skills: { skillsStyle: 'chips' } }
    const chipped = renderToStaticMarkup(<TemplateRenderer doc={doc} mode="print" />)
    expect(chipped.slice(chipped.indexOf('class="rm-footer'))).not.toContain('rm-chips')
  })

  it('the languages are one row, each language with its fluency', () => {
    const doc = createDocument({ sample: true })
    doc.metadata.layout.footer = ['languages']
    doc.content.languages = [
      { id: 'l1', language: 'English', fluency: 'Native' },
      { id: 'l2', language: 'Spanish', fluency: 'Professional' },
    ]
    const html = renderToStaticMarkup(<TemplateRenderer doc={doc} mode="print" />)
    const strip = html.slice(html.indexOf('class="rm-footer'))
    expect(strip.match(/rm-footer-row/g)?.length).toBe(1)
    expect(strip).toContain('English')
    expect(strip).toContain('Native')
    expect(strip).toContain('Spanish')
    expect(strip).not.toContain('rm-level')
  })

  it('the root says it has a strip, the strip holds together, and its colours are the theme footer', () => {
    const doc = createDocument({ sample: true })
    doc.metadata.layout.footer = ['skills']
    doc.metadata.theme.footer = '#0f766e'
    const html = renderToStaticMarkup(<TemplateRenderer doc={doc} mode="print" />)
    expect(html).toMatch(/class="rm-root[^"]*rm-has-footer/)
    expect(html).toMatch(/class="rm-footer[^"]*rm-keep-whole/)
    expect(html).toContain('--rm-footer-bg:#0f766e')
    expect(html).toContain('--rm-on-footer:#ffffff')
    // Without a footer there is no strip, no root class and no footer colour.
    const plain = createDocument({ sample: true })
    const plainHtml = renderToStaticMarkup(<TemplateRenderer doc={plain} mode="print" />)
    expect(plainHtml).not.toContain('rm-footer')
    expect(plainHtml).not.toContain('rm-has-footer')
  })

  it('an empty footer section shows on the canvas while editing but never prints', () => {
    const doc = createDocument({ sample: true })
    doc.metadata.layout.footer = ['languages']
    doc.content.languages = []
    const printed = renderToStaticMarkup(<TemplateRenderer doc={doc} mode="print" />)
    expect(printed).not.toContain('rm-footer')
    const edit = () => {}
    const editing = renderToStaticMarkup(<TemplateRenderer doc={doc} mode="preview" edit={edit} editMeta={edit} />)
    expect(editing).toContain('class="rm-footer')
    expect(editing).toContain('data-section="languages"')
  })
})
