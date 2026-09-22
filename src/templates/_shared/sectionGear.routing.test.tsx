import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { createDocument } from '@/data/defaults'
import { sectionLabel } from '@/lib/sections'
import type { ResumeDocument } from '@/types/document'

// The sanitizer wraps a DOM purifier that needs a window, and this suite runs
// under the plain node environment. Nothing asserted here is rich text, so
// handing the string back is what the real sanitizer would do with it.
vi.mock('@/lib/sanitize', () => ({ sanitizeHtml: (html: string) => html }))
vi.mock('@/lib/pdf/hyphens', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/pdf/hyphens')>()),
  noBreakCompoundsHtml: (html: string) => html,
}))

import { TemplateRenderer } from '@/templates/TemplateRenderer'

/**
 * WHICH SECTION does a Style control belong to?
 *
 * An outside review reported that clicking a section's Style control opened
 * the FOLLOWING section's sheet, four times running. Driving the real canvas
 * says otherwise: across three designs and twenty-eight controls, every sheet
 * named the clicked section and every change landed on the clicked section's
 * key (_local/gate-gear-routing.cjs keeps that measurement repeatable). The
 * routing cannot slip, because the control is rendered inside its own section
 * and carries that section's stable key - never its position in an array.
 *
 * What COULD slip is the identity a person reads off the page, and two things
 * that fed the report are fixed here and held by these tests:
 *
 *  - the control now says which section it edits, in its tooltip and its
 *    accessible name. It used to say "Section style and settings" - the same
 *    twelve words on all twelve controls of a full page, for a sighted reader
 *    and a screen reader alike - while the pill itself floats in the page
 *    margin, in a side column two pixels above its own heading and twenty
 *    below the section before it.
 *  - the sheet opens ANCHORED to the control (SectionGear's openPopover), so
 *    it can no longer appear level with a section it does not edit.
 *
 * The identity is asserted through a reorder, a hidden section between two
 * visible ones, and a section dropped from the layout entirely: three ways an
 * index-based control would start naming its neighbour.
 */

const GEAR_SRC = readFileSync(join(__dirname, 'SectionGear.tsx'), 'utf8')

/** Every rendered section, with the accessible name of the Style control it
 *  contains. Sections are siblings in the markup, so a section's own slice
 *  runs from its opening tag to the next one. */
function gearsBySection(html: string): Array<{ key: string; name: string | null }> {
  const starts = [...html.matchAll(/<section[^>]*\sdata-section="([^"]+)"/g)]
  return starts.map((m, i) => {
    const from = m.index!
    const to = i + 1 < starts.length ? starts[i + 1].index! : html.length
    const slice = html.slice(from, to)
    const gear = slice.match(/<button[^>]*class="rm-section-gear"[^>]*>/)
    const name = gear ? (gear[0].match(/aria-label="([^"]*)"/)?.[1] ?? null) : null
    return { key: m[1], name }
  })
}

const canvas = (doc: ResumeDocument) =>
  renderToStaticMarkup(<TemplateRenderer doc={doc} mode="preview" editMeta={() => {}} />)

/** Every control names its OWN section, and there is exactly one per section. */
function expectEveryControlNamesItsOwnSection(doc: ResumeDocument) {
  const found = gearsBySection(canvas(doc))
  expect(found.length).toBeGreaterThan(2)
  for (const { key, name } of found) {
    expect(name, `no Style control inside section ${key}`).not.toBeNull()
    expect(name).toBe(`${sectionLabel(key, doc)} style and settings`)
  }
  // No two controls answer to the same name either, or "which one did I
  // click" is unanswerable again by a different route.
  const names = found.map((f) => f.name)
  expect(new Set(names).size).toBe(names.length)
}

describe('a section Style control', () => {
  it('names the section it edits, not "this section"', () => {
    const doc = createDocument({ sample: true })
    expectEveryControlNamesItsOwnSection(doc)
    const html = canvas(doc)
    expect(html).not.toContain('aria-label="Section style and settings"')
    expect(html).toContain(`aria-label="${sectionLabel('skills', doc)} style and settings"`)
  })

  it('follows its section through a reorder', () => {
    const doc = createDocument({ sample: true })
    doc.metadata.layout.main = [...doc.metadata.layout.main].reverse()
    doc.metadata.layout.aside = [...doc.metadata.layout.aside].reverse()
    expectEveryControlNamesItsOwnSection(doc)
  })

  it('does not shift onto the neighbour when a section between two others is hidden', () => {
    const doc = createDocument({ sample: true })
    const main = doc.metadata.layout.main
    expect(main.length).toBeGreaterThan(2)
    const gone = main[1]
    doc.metadata.layout.hidden = [...doc.metadata.layout.hidden, gone]
    const found = gearsBySection(canvas(doc))
    expect(found.map((f) => f.key)).not.toContain(gone)
    expectEveryControlNamesItsOwnSection(doc)
  })

  it('does not shift onto the neighbour when a section is deleted', () => {
    // Emptying the content is what deleting a section does to the page: a key
    // merely struck from `layout.main` is put back at the end of the main flow
    // by the order resolver, so it is not a deletion at all.
    const doc = createDocument({ sample: true })
    doc.content.projects = []
    const found = gearsBySection(canvas(doc))
    expect(found.map((f) => f.key)).not.toContain('projects')
    expectEveryControlNamesItsOwnSection(doc)
  })

  it('also names its section when the side panel borrows it', () => {
    // SectionsOrganizer renders the same control with variant="panel"; the
    // name travels with the component, so the panel cannot drift from the
    // canvas.
    expect(GEAR_SRC).toContain('aria-label={`${sectionLabel(sectionKey, doc)} style and settings`}')
  })
})

describe('what the Style sheet writes to', () => {
  it('is addressed by the section KEY everywhere, never by a position', () => {
    // Every write in the file goes through `sectionSettings[sectionKey]`. An
    // index-addressed write is the only way the reported symptom could be
    // real, so its absence is asserted rather than assumed.
    const writes = [...GEAR_SRC.matchAll(/sectionSettings\[([^\]]+)\]/g)].map((m) => m[1].trim())
    expect(writes.length).toBeGreaterThan(2)
    for (const w of writes) expect(w).toBe('sectionKey')
    expect(GEAR_SRC).not.toMatch(/sectionSettings\[\s*(i|idx|index|\d)/)
  })

  it('hides, pins and moves the same key the control was rendered under', () => {
    for (const call of [
      'hasPagePin(doc.metadata.page.breaks, sectionKey)',
      'togglePagePin(m.page.breaks, sectionKey)',
      'moveSectionTo(m.layout, sectionKey, to, m.layout[to].length)',
      'moveSection(m.layout, sectionKey, dir)',
      'm.layout.hidden.filter((k) => k !== sectionKey)',
    ])
      expect(GEAR_SRC).toContain(call)
  })
})

describe('where the Style sheet opens', () => {
  it('anchors to the control by one of its own edges', () => {
    // The old rule clamped the sheet's top to `vh - maxH - 8`, which put it
    // hundreds of pixels above any control in the lower two thirds of the
    // viewport - level with a section it does not edit. Measured at -490px
    // and -600px before the change, 0px (top-anchored) or the sheet's own
    // height (bottom-anchored) after it.
    expect(GEAR_SRC).not.toContain('Math.min(r.top - 4, vh - maxH - 8)')
    expect(GEAR_SRC).toContain('const anchorBottom = Math.min(r.bottom, vh - room)')
    expect(GEAR_SRC).toContain('top = Math.max(room, anchorBottom - maxH)')
  })
})
