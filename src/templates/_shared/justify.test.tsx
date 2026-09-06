import { describe, it, expect, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { createDocument } from '@/data/defaults'

// The sanitizer wraps a DOM purifier that needs a window, and this suite runs
// under the plain node environment. Nothing asserted here is rich text, so
// handing the string back is what the real sanitizer would do with it.
vi.mock('@/lib/sanitize', () => ({ sanitizeHtml: (html: string) => html }))
// The rich-text atom keeps hyphenated compounds whole through a DOM template
// element; the markup passes through untouched here.
vi.mock('@/lib/pdf/hyphens', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/pdf/hyphens')>()),
  noBreakCompoundsHtml: (html: string) => html,
}))

import { TemplateRenderer } from '@/templates/TemplateRenderer'

/**
 * Justified prose (typography.align).
 *
 * The alignment travels as ONE artboard variable, like every other visual
 * parameter, so the single print-mode tree carries it: that tree is what the
 * one-page fitter measures (ResumePreview renders it into a hidden portal and
 * reads its scrollHeight at each trial scale) and what the PDF painter walks.
 * So the fit is MEASURED justified rather than measured ragged and rendered
 * justified - which would have made every fitted scale wrong by the width
 * justification saves. That is what these assertions pin.
 */
const printHtml = (align?: 'left' | 'justify') => {
  const doc = createDocument({ sample: true })
  if (align) doc.metadata.typography.align = align
  return renderToStaticMarkup(<TemplateRenderer doc={doc} mode="print" />)
}

describe('the alignment reaches the tree the fitter measures', () => {
  it('the print DOM carries the justification, so its height is a justified height', () => {
    expect(printHtml('justify')).toContain('--rm-align:justify')
  })

  it('a document that never chose measures ragged right, exactly as it always did', () => {
    expect(printHtml()).toContain('--rm-align:left')
    expect(printHtml()).not.toContain('--rm-align:justify')
  })

  // The last-line balancing that keeps a justified block from ending on a
  // single short word re-optimises where every line breaks, which moves the
  // height the fitter reads. It rides the same choice, so a document that
  // never asked for justification wraps exactly where it always wrapped.
  it('the last-line balancing rides the same choice, and only that choice', () => {
    expect(printHtml('justify')).toContain('--rm-wrap:pretty')
    expect(printHtml()).toContain('--rm-wrap:wrap')
    expect(printHtml()).not.toContain('--rm-wrap:pretty')
  })
})

/**
 * WHERE the justification is allowed to land. Justifying a narrow measure
 * opens rivers of white space between the words, which reads worse than a
 * ragged edge - so the rule is scoped to PROSE in the MAIN column and reaches
 * no heading, name, date, chip or skills list, and nothing in the sidebar.
 */
describe('the justification is scoped to main-column prose', () => {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const css = fs.readFileSync(path.join(here, '../../styles/artboard.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const rules: { selector: string; body: string }[] = []
  const re = /([^{}]+)\{([^{}]*)\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(css))) rules.push({ selector: m[1].trim().replace(/\s+/g, ' '), body: m[2] })
  const alignRules = rules.filter((r) => r.body.includes('--rm-align'))

  it('some rule reads the variable at all', () => {
    expect(alignRules.length).toBeGreaterThan(0)
  })

  it('every selector that reads it sits inside the main column', () => {
    for (const r of alignRules)
      for (const sel of r.selector.split(',')) expect(sel.trim(), r.selector).toContain('.rm-col-main')
  })

  it('the prose holders are covered: an entry summary, the bullets and rich text', () => {
    const sels = alignRules.flatMap((r) => r.selector.split(',').map((s) => s.trim()))
    for (const prose of ['.rm-item-summary', '.rm-bullets li', '.rm-rich'])
      expect(sels.some((s) => s.endsWith(prose))).toBe(true)
  })

  it('no heading, name, date, chip or skills list is ever justified', () => {
    const banned = ['rm-section-title', 'rm-name', 'rm-item-date', 'rm-chip', 'rm-skill', 'rm-col-aside', 'rm-contacts']
    for (const r of alignRules) for (const b of banned) expect(r.selector, b).not.toContain(b)
  })
})
