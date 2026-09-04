import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { entryMetaOf, entryOrderOf, keepEntriesOn, paintStyle, sectionOverrideClasses } from './sectionClasses'
import { defaultMetadata } from '@/data/defaults'

/**
 * The per-section style overrides become scoped classes on the section
 * element, where the stylesheet's .rm-root-anchored rules beat any template's
 * own. A section that decided nothing gets no class at all.
 */
describe('sectionOverrideClasses', () => {
  it('a section with no settings adds nothing', () => {
    expect(sectionOverrideClasses(undefined)).toEqual([])
    expect(sectionOverrideClasses({})).toEqual([])
  })

  it('a centred heading is a class the alignment rules key on; left is one too', () => {
    expect(sectionOverrideClasses({ headingAlign: 'center' })).toEqual(['sec-align-center'])
    expect(sectionOverrideClasses({ headingAlign: 'left' })).toEqual(['sec-align-left'])
  })

  it('the existing overrides keep their classes, in the order the stylesheet expects', () => {
    expect(sectionOverrideClasses({ headingStyle: 'rule-after', skillsStyle: 'chips', chipSize: 's', entryLayout: 'cards', scoreStyle: 'pill', headingAlign: 'center' })).toEqual([
      'sec-ov-rule-after',
      'skl-ov-chips',
      'chip-s',
      'lay-ov-cards',
      'score-ov-pill',
      'sec-align-center',
    ])
  })
})

describe('keepEntriesOn', () => {
  // Whether a page break may fall inside an entry. The document decides
  // until the section says otherwise - in either direction.
  it('breaks pages as it always did when neither has decided', () => {
    expect(keepEntriesOn({ keepEntriesWhole: false }, undefined)).toBe(false)
    expect(keepEntriesOn(undefined, undefined)).toBe(false)
  })

  it('follows the document when the section has not decided', () => {
    expect(keepEntriesOn({ keepEntriesWhole: true }, {})).toBe(true)
  })

  it('lets one section opt in on a page that breaks freely, and out of one that does not', () => {
    expect(keepEntriesOn({ keepEntriesWhole: false }, { keepTogether: true })).toBe(true)
    expect(keepEntriesOn({ keepEntriesWhole: true }, { keepTogether: false })).toBe(false)
  })
})

describe('entryOrderOf', () => {
  // Which of an entry's two head fields leads and which is bold. Unset is
  // the page as it always was: the title (position, degree) leads and is
  // bold, the organisation (company, institution) sits under it.
  it('a section that decided nothing leads with the bold title', () => {
    expect(entryOrderOf(undefined)).toEqual({ lead: 'title', bold: 'title' })
    expect(entryOrderOf({})).toEqual({ lead: 'title', bold: 'title' })
    expect(entryOrderOf({ entryOrder: 'title-first', entryEmphasis: 'title' })).toEqual({ lead: 'title', bold: 'title' })
  })

  it('the two choices are independent', () => {
    expect(entryOrderOf({ entryOrder: 'org-first' })).toEqual({ lead: 'org', bold: 'title' })
    expect(entryOrderOf({ entryEmphasis: 'org' })).toEqual({ lead: 'title', bold: 'org' })
    expect(entryOrderOf({ entryOrder: 'org-first', entryEmphasis: 'org' })).toEqual({ lead: 'org', bold: 'org' })
  })
})

describe('entry emphasis reaches the section element as one class', () => {
  // The renderer puts the leading field in the head slot and the other in
  // the sub-line, so the stylesheet only needs to know whether the bold
  // line is the SUB-line: that is the case exactly when the lead and the
  // bold field differ. Both defaults, or both swapped, add nothing.
  it('the bold line is the sub-line when the lead and the bold field differ', () => {
    expect(sectionOverrideClasses({ entryEmphasis: 'org' })).toEqual(['sec-emph-sub'])
    expect(sectionOverrideClasses({ entryOrder: 'org-first' })).toEqual(['sec-emph-sub'])
  })

  it('no class when the lead line is the bold one, whichever field leads', () => {
    expect(sectionOverrideClasses({ entryOrder: 'title-first', entryEmphasis: 'title' })).toEqual([])
    expect(sectionOverrideClasses({ entryOrder: 'org-first', entryEmphasis: 'org' })).toEqual([])
  })

  it('sits after the alignment class', () => {
    expect(sectionOverrideClasses({ headingAlign: 'center', entryEmphasis: 'org' })).toEqual(['sec-align-center', 'sec-emph-sub'])
  })
})

describe('entryMetaOf', () => {
  // Where an entry's location and date sit. Unset is the page as it always
  // was: the location on the sub-line under the title, the date at the right
  // edge of the head row. The two are independent.
  it('a section that decided nothing keeps the location under the title and the date right', () => {
    expect(entryMetaOf(undefined)).toEqual({ locWithDate: false, dateLeft: false })
    expect(entryMetaOf({})).toEqual({ locWithDate: false, dateLeft: false })
    expect(entryMetaOf({ locationPlacement: 'subline', dateAlign: 'right' })).toEqual({
      locWithDate: false,
      dateLeft: false,
    })
  })

  it('either choice can be made without the other', () => {
    expect(entryMetaOf({ locationPlacement: 'with-date' })).toEqual({ locWithDate: true, dateLeft: false })
    expect(entryMetaOf({ dateAlign: 'left' })).toEqual({ locWithDate: false, dateLeft: true })
    expect(entryMetaOf({ locationPlacement: 'with-date', dateAlign: 'left' })).toEqual({
      locWithDate: true,
      dateLeft: true,
    })
  })
})

describe('the date side reaches the section element as one class', () => {
  // Which edge the date sits on is ink, so it travels as a class. Where the
  // location prints is a different element in a different slot, so it
  // travels in the markup and adds no class at all.
  it('either side is a class the stylesheet keys on', () => {
    expect(sectionOverrideClasses({ dateAlign: 'left' })).toEqual(['sec-date-left'])
    expect(sectionOverrideClasses({ dateAlign: 'right' })).toEqual(['sec-date-right'])
  })

  it('sits last, after the emphasis class', () => {
    expect(sectionOverrideClasses({ entryEmphasis: 'org', dateAlign: 'left' })).toEqual([
      'sec-emph-sub',
      'sec-date-left',
    ])
  })

  it('the location placement adds nothing', () => {
    expect(sectionOverrideClasses({ locationPlacement: 'with-date' })).toEqual([])
  })
})

describe('the left date column is drawn with the box model the export can paint', () => {
  // A date moved to the left of the head row must be a flex order change on
  // a laid-out box, never a transform or an absolute overlay: the export
  // paints each element where the browser lays it out and reads its computed
  // style, so those two would land on the canvas and nowhere else.
  const here = path.dirname(fileURLToPath(import.meta.url))
  const css = fs.readFileSync(path.join(here, '../../styles/artboard.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const rules: { selector: string; body: string }[] = []
  const re = /([^{}]+)\{([^{}]*)\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(css))) rules.push({ selector: m[1].trim().replace(/\s+/g, ' '), body: m[2] })
  const dateRules = rules.filter((r) => r.selector.includes('sec-date-left'))

  it('moves the date with order, and does not move it with a transform', () => {
    expect(dateRules.length).toBeGreaterThan(0)
    const all = dateRules.map((r) => r.body).join(';')
    expect(all).toMatch(/(?:^|;|\s)order\s*:/)
    expect(all).not.toMatch(/transform|position\s*:\s*absolute|gradient/)
  })

  it('beats the stock rule that pushes the date to the right edge', () => {
    // .rm-col-main .rm-item-head > .rm-item-date sets margin-left: auto;
    // the override has to unset it or the date stays pinned right.
    const date = dateRules.find((r) => r.selector.includes('.rm-item-date'))
    expect(date?.body).toMatch(/margin-left\s*:\s*0/)
  })
})

describe('the style painter keeps entry order to sections that have an organisation line', () => {
  // The painter copies every visual-style field onto its target. A section
  // whose entries have no organisation line (projects, awards, skills) has
  // nothing to swap, and its own gear never offers the rows, so a painted
  // entryOrder or entryEmphasis would strand it: nothing bold, no way back.
  // Those two fields stay on the sections whose gear shows the rows.
  const withStyle = (key: string, copied: Record<string, string>) => {
    const m = defaultMetadata()
    paintStyle(m, key, copied)
    return m.layout.sectionSettings[key]
  }

  it('a section without an organisation line stores neither field and gets no class', () => {
    for (const key of ['projects', 'certificates', 'awards', 'publications', 'skills']) {
      const ss = withStyle(key, { entryEmphasis: 'org', entryOrder: 'org-first', headingStyle: 'rule-after' })
      expect(ss).toEqual({ headingStyle: 'rule-after' })
      expect(sectionOverrideClasses(ss)).not.toContain('sec-emph-sub')
    }
  })

  it('work, education, volunteer and any custom section take both fields', () => {
    for (const key of ['work', 'education', 'volunteer', 'custom-1a2b']) {
      expect(withStyle(key, { entryEmphasis: 'org' })).toEqual({ entryEmphasis: 'org' })
      expect(withStyle(key, { entryOrder: 'org-first' })).toEqual({ entryOrder: 'org-first' })
    }
  })

  it('the location placement and the date side are style, so they are painted onto any section', () => {
    for (const key of ['work', 'education', 'projects', 'custom-1a2b']) {
      expect(withStyle(key, { locationPlacement: 'with-date', dateAlign: 'left' })).toEqual({
        locationPlacement: 'with-date',
        dateAlign: 'left',
      })
    }
  })

  it("an Auto style clears the target's own style fields but keeps its content toggles", () => {
    const m = defaultMetadata()
    m.layout.sectionSettings.work = { entryEmphasis: 'org', headingStyle: 'bar', showDates: false }
    paintStyle(m, 'work', {})
    expect(m.layout.sectionSettings.work).toEqual({ showDates: false })
  })
})

describe('a fixed-width marker under a section title follows a centred heading', () => {
  // A template that draws its partial rule as an absolutely positioned box
  // at the left edge (a short underline marker, not a flex item) is not
  // moved by text-align: the words go to the middle and the marker stays
  // pinned left. Each such marker needs a centred twin that shifts the box
  // to the middle by its own half width, as a plain left offset the export
  // already places from computed style (no transform, no gradient).
  const here = path.dirname(fileURLToPath(import.meta.url))
  const css = fs.readFileSync(path.join(here, '../templates.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

  type Rule = { selector: string; body: string }
  const rules: Rule[] = []
  const re = /([^{}]+)\{([^{}]*)\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(css))) rules.push({ selector: m[1].trim().replace(/\s+/g, ' '), body: m[2] })

  const markers = rules.filter(
    (r) =>
      /^\.tpl-[\w-]+ \.rm-section-title::(after|before)$/.test(r.selector) &&
      /position\s*:\s*absolute/.test(r.body) &&
      /(?:^|;|\s)width\s*:\s*[\d.]+em/.test(r.body) &&
      !/(?:^|;|\s)right\s*:/.test(r.body),
  )

  it('the audit sees the markers it guards', () => {
    expect(markers.map((r) => r.selector)).toContain('.tpl-aurum .rm-section-title::after')
  })

  for (const marker of markers) {
    const [, tpl, pseudo] = /^(\.tpl-[\w-]+) \.rm-section-title::(after|before)$/.exec(marker.selector)!
    const width = /(?:^|;|\s)width\s*:\s*([\d.]+)em/.exec(marker.body)![1]
    it(`${tpl}: the centred twin shifts the ${width}em marker left by half its width`, () => {
      const twin = rules.find((r) => r.selector === `${tpl} .rm-section.sec-align-center .rm-section-title::${pseudo}`)
      expect(twin, `no centred twin for ${marker.selector}`).toBeDefined()
      const left = /(?:^|;|\s)left\s*:\s*calc\(50% - ([\d.]+)em\)/.exec(twin!.body)
      expect(left, `twin must set left: calc(50% - <half width>em)`).not.toBeNull()
      expect(Number(left![1])).toBeCloseTo(Number(width) / 2, 5)
      expect(twin!.body).not.toMatch(/transform|gradient/)
    })
  }
})
