/**
 * The Word export honours the document's own page margin, base type size,
 * line height and contact separator. It used to hard-code 0.75in margins, a
 * fixed 10pt scale and a bullet between contacts, so a resume set 20mm wide at
 * 11pt with pipes between its details came out of Word looking like a
 * different document. The metrics are pure functions, asserted exactly; the
 * packed XML is then opened to prove the numbers land in the section and run
 * properties Word reads.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Packer } from 'docx'
import JSZip from 'jszip'
import { buildDocx, docxMetrics } from './docx'
import { defaultMetadata } from '@/data/defaults'
import type { ResumeDocument } from '@/types/document'
import type { Metadata } from '@/types/metadata'
import type { MetadataOverrides } from '@/data/defaults'

// The sanitizer wraps a DOM purifier that needs a window, and this suite runs
// under vitest's plain 'node' environment (see vitest.config.ts). The bullet
// text asserted below is plain, so handing it back unchanged is exactly what
// the real sanitizer does with it.
vi.mock('@/lib/sanitize', () => ({ sanitizeHtml: (html: string) => html }))

const docWith = (overrides: MetadataOverrides = {}): ResumeDocument =>
  ({
    id: 'res-1',
    title: 'T',
    createdAt: 0,
    updatedAt: 0,
    jobDescription: '',
    content: {
      basics: {
        name: 'Jordan Rivera',
        label: 'Product Designer',
        email: 'jordan@example.com',
        phone: '+1 555 0100',
        location: { city: 'Lisbon' },
        profiles: [],
      },
      work: [{ id: 'w1', name: 'Acme', position: 'Designer', startDate: '2021-03', endDate: '' }],
      volunteer: [],
      education: [],
      awards: [],
      certificates: [],
      publications: [],
      skills: [],
      languages: [],
      interests: [],
      references: [],
      projects: [],
      custom: [],
    },
    metadata: defaultMetadata({ ...overrides, layout: { main: ['work'], ...(overrides.layout ?? {}) } }),
  }) as unknown as ResumeDocument

/** The two parts of the package the assertions read. */
async function unpack(doc: ResumeDocument, fitScale = 1) {
  const buf = await Packer.toBuffer(buildDocx(doc, fitScale))
  const zip = await JSZip.loadAsync(buf)
  const body = await zip.file('word/document.xml')!.async('string')
  const styles = await zip.file('word/styles.xml')!.async('string')
  return { body, styles }
}

/** Every text run, in document order. */
const texts = (xml: string) => [...xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((m) => m[1])

/** The half-point size of the run that prints `text`. */
function runSize(xml: string, text: string): number | undefined {
  const runs = xml.split('<w:r>').slice(1)
  const run = runs.find((r) => r.includes(`>${text}</w:t>`))
  const m = run?.match(/<w:sz w:val="(\d+)"/)
  return m ? Number(m[1]) : undefined
}

const pgMar = (xml: string) => {
  const m = xml.match(/<w:pgMar\s([^>]*)\/>/)
  const side = (k: string) => Number(m?.[1].match(new RegExp(`w:${k}="(\\d+)"`))?.[1])
  return { top: side('top'), right: side('right'), bottom: side('bottom'), left: side('left') }
}
const docDefaultLine = (styles: string) => {
  const d = styles.match(/<w:docDefaults>([\s\S]*?)<\/w:docDefaults>/)?.[1] ?? ''
  return Number(d.match(/<w:spacing[^>]*w:line="(\d+)"/)?.[1])
}

describe('docxMetrics', () => {
  it('turns the page margin from millimetres into twips', () => {
    // 13mm is the schema default; 20mm is a common wide margin.
    expect(docxMetrics(defaultMetadata()).margin).toBe(737)
    expect(docxMetrics(defaultMetadata({ page: { margin: 20 } })).margin).toBe(1134)
    expect(docxMetrics(defaultMetadata({ page: { margin: 0 } })).margin).toBe(0)
  })

  it('derives every run size from the base size with the canvas ratios', () => {
    // The canvas sets the name at fs * (1.55 + headingScale * 0.62), the
    // section title at fs * sectionTitleScale (1.06 stock), the headline at
    // headlineScale (1.15), contacts at contactScale (0.95), entry titles at
    // 1.05, sub-lines at 0.95 and dates at 0.92 (Artboard.tsx useVars,
    // artboard.css). Half-points, so a 9.6pt body is 19 and the default name 48.
    const a = docxMetrics(defaultMetadata()).sizes
    expect(a).toEqual({ name: 48, headline: 22, section: 20, title: 20, body: 19, sub: 18, contact: 18, date: 18 })
    const b = docxMetrics(defaultMetadata({ typography: { fontSize: 11, headingScale: 2 } })).sizes
    expect(b).toEqual({ name: 61, headline: 25, section: 23, title: 23, body: 22, sub: 21, contact: 21, date: 20 })
  })

  it('sizes the section titles, the headline and the contacts by their own scales', () => {
    // 9.6pt * 1.3 * 2 = 24.96, * 1.4 * 2 = 26.88, * 0.8 * 2 = 15.36. Sub-lines
    // keep their own ratio: a smaller contact line is not a smaller org line.
    const s = docxMetrics(defaultMetadata({ typography: { sectionTitleScale: 1.3, headlineScale: 1.4, contactScale: 0.8 } })).sizes
    expect(s.section).toBe(25)
    expect(s.headline).toBe(27)
    expect(s.contact).toBe(15)
    expect(s.sub).toBe(18)
  })

  it('applies the one-page fit scale to the sizes and to nothing else', () => {
    const m = docxMetrics(defaultMetadata(), 0.8)
    expect(m.sizes.body).toBe(15)
    expect(m.sizes.name).toBe(38)
    expect(m.margin).toBe(737)
    expect(m.line).toBe(252)
  })

  it('clamps the fit scale to the floor and ceiling the on-screen fit uses', () => {
    expect(docxMetrics(defaultMetadata(), 0.2).sizes.body).toBe(docxMetrics(defaultMetadata(), 0.66).sizes.body)
    expect(docxMetrics(defaultMetadata(), 3).sizes.body).toBe(docxMetrics(defaultMetadata(), 1.15).sizes.body)
    expect(docxMetrics(defaultMetadata(), 0).sizes.body).toBe(19)
  })

  it('maps the line height onto Word line spacing, keeping the default where it was', () => {
    // Word's single spacing already spans the font's own line box (about
    // 1.22em for the usual body faces) while the canvas line-height is a
    // bare multiple of the type size, so the multiplier is divided out. The
    // export's long-standing 252 is exactly 240 * 1.28 / 1.22.
    expect(docxMetrics(defaultMetadata()).line).toBe(252)
    expect(docxMetrics(defaultMetadata({ typography: { lineHeight: 1.6 } })).line).toBe(315)
    expect(docxMetrics(defaultMetadata({ typography: { lineHeight: 1 } })).line).toBe(197)
  })

  it('prints the same glyph between contacts that the canvas draws', () => {
    const sep = (v: 'none' | 'dot' | 'pipe' | 'slash' | 'dash') =>
      docxMetrics(defaultMetadata({ layout: { contactSeparator: v } })).separator
    expect(sep('dot')).toBe('   ·   ')
    expect(sep('pipe')).toBe('   |   ')
    expect(sep('slash')).toBe('   /   ')
    expect(sep('dash')).toBe('   –   ')
    // 'none' is spacing only, never a bullet.
    expect(sep('none').trim()).toBe('')
    expect(sep('none').length).toBeGreaterThan(0)
  })
})

describe('buildDocx writes the metrics into the package', () => {
  it('default document: 13mm margins, 9.6pt scale, 1.28 leading, spaced contacts', async () => {
    const { body, styles } = await unpack(docWith())
    expect(pgMar(body)).toEqual({ top: 737, right: 737, bottom: 737, left: 737 })
    expect(docDefaultLine(styles)).toBe(252)
    expect(runSize(body, 'Jordan Rivera')).toBe(48)
    expect(runSize(body, 'Product Designer')).toBe(22)
    expect(runSize(body, 'EXPERIENCE')).toBe(20)
    expect(runSize(body, 'Designer')).toBe(20)
    expect(runSize(body, 'jordan@example.com')).toBe(18)
    const all = texts(body).join('')
    expect(all).not.toContain('•')
    expect(all).not.toContain('|')
    expect(texts(body)).toContain('    ')
  })

  it('a wide, large, airy document with pipes: 20mm, 11pt, 1.6 leading', async () => {
    const doc = docWith({
      page: { margin: 20, format: 'Letter' },
      typography: { fontSize: 11, lineHeight: 1.6, headingScale: 2 },
      layout: { contactSeparator: 'pipe' },
    })
    const { body, styles } = await unpack(doc)
    expect(pgMar(body)).toEqual({ top: 1134, right: 1134, bottom: 1134, left: 1134 })
    expect(docDefaultLine(styles)).toBe(315)
    expect(runSize(body, 'Jordan Rivera')).toBe(61)
    expect(runSize(body, 'Product Designer')).toBe(25)
    expect(runSize(body, 'EXPERIENCE')).toBe(23)
    expect(runSize(body, 'Designer')).toBe(23)
    expect(runSize(body, 'jordan@example.com')).toBe(21)
    expect(texts(body).filter((t) => t === '   |   ')).toHaveLength(2)
    expect(texts(body).join('')).not.toContain('•')
  })

  it('the fit scale shrinks the type without touching the margins', async () => {
    const { body } = await unpack(docWith(), 0.8)
    expect(pgMar(body).left).toBe(737)
    expect(runSize(body, 'Jordan Rivera')).toBe(38)
    expect(runSize(body, 'Designer')).toBe(16)
  })

  it('the right tab for dates sits at the text width the margin leaves', async () => {
    // A4 is 11906 twips wide; two 20mm margins leave 9638.
    const { body } = await unpack(docWith({ page: { margin: 20 } }))
    expect(body).toMatch(/<w:tab w:val="right" w:pos="9638"\/>/)
  })
})

/** The paragraph that prints `text`, with its properties. */
const paraOf = (xml: string, text: string) => xml.split('<w:p>').slice(1).find((p) => p.includes(`>${text}</w:t>`)) ?? ''
const indAttr = (p: string, k: 'left' | 'hanging') => {
  const m = p.match(/<w:ind\s([^>]*)\/>/)?.[1].match(new RegExp(`w:${k}="(\\d+)"`))
  return m ? Number(m[1]) : undefined
}
const spacingAfter = (p: string) => {
  const m = p.match(/<w:spacing[^>]*w:after="(\d+)"/)
  return m ? Number(m[1]) : undefined
}

describe('bullet indent and bullet spacing', () => {
  // The page sets a highlight list in by typography.bulletIndent (em of the
  // base size) and spaces its bullets by typography.bulletGap (em). Word
  // takes the same distances in twips at the same base size: 1.05em of
  // 9.6pt is 10.08pt = 202 twips; 0.2em is 1.92pt = 38 twips.
  //
  // A bullet's text is read through a DOM element and there is none here,
  // so a text-only element stands in (the stand-in pdf/export.test.ts uses).
  const originalDocument = globalThis.document
  beforeEach(() => {
    globalThis.document = {
      createElement: () => ({
        childNodes: [] as { nodeType: number; textContent: string }[],
        set innerHTML(html: string) {
          this.childNodes = [{ nodeType: 3, textContent: html }]
        },
        get textContent() {
          return this.childNodes.map((n) => n.textContent).join('')
        },
      }),
    } as unknown as Document
  })
  afterEach(() => {
    globalThis.document = originalDocument
  })

  it('docxMetrics turns the em values into twips at the base size', () => {
    const a = docxMetrics(defaultMetadata())
    expect(a.bulletIndent).toBe(202)
    expect(a.bulletGap).toBe(38)
    const b = docxMetrics(defaultMetadata({ typography: { fontSize: 11, bulletIndent: 1.5, bulletGap: 0.4 } }))
    expect(b.bulletIndent).toBe(330)
    expect(b.bulletGap).toBe(88)
  })

  it('the fit scale shrinks the indent with the type, as an em does on the page', () => {
    expect(docxMetrics(defaultMetadata(), 0.8).bulletIndent).toBe(161)
    expect(docxMetrics(defaultMetadata(), 0.8).bulletGap).toBe(31)
  })

  it('a bullet paragraph hangs its marker in the indent and takes the gap after', async () => {
    const doc = docWith({ typography: { fontSize: 11, bulletIndent: 1.5, bulletGap: 0.4 } })
    doc.content.work[0].highlights = ['Shipped the thing']
    const { body } = await unpack(doc)
    const p = paraOf(body, 'Shipped the thing')
    expect(p).toContain('<w:numPr>')
    expect(indAttr(p, 'left')).toBe(330)
    expect(indAttr(p, 'hanging')).toBe(330)
    expect(spacingAfter(p)).toBe(88)
  })

  it('with no marker the text still sits at the indent, nothing hangs', async () => {
    const doc = docWith({ typography: { bulletStyle: 'none' } })
    doc.content.work[0].highlights = ['Shipped the thing']
    const { body } = await unpack(doc)
    const p = paraOf(body, 'Shipped the thing')
    expect(p).not.toContain('<w:numPr>')
    expect(indAttr(p, 'left')).toBe(202)
    expect(indAttr(p, 'hanging')).toBeUndefined()
    expect(spacingAfter(p)).toBe(38)
  })
})

describe('the Word export prints the time span the page shows', () => {
  // The span rides on the same date string the page sets, so the right-tab
  // date reads "Mar 2021 - Feb 2023 (2 yrs)" in Word exactly as on the canvas.
  // The fixture's open-ended range is closed first so the words do not age.
  it('appends it to the right-tab date when the section asks', async () => {
    const doc = docWith({ layout: { sectionSettings: { work: { showDuration: true } } } })
    doc.content.work[0].endDate = '2023-02'
    const { body } = await unpack(doc)
    expect(texts(body).join('')).toContain('Mar 2021 — Feb 2023 (2 yrs)')
  })

  it('prints the bare range when it does not', async () => {
    const doc = docWith()
    doc.content.work[0].endDate = '2023-02'
    const all = texts((await unpack(doc)).body).join('')
    expect(all).toContain('Mar 2021 — Feb 2023')
    expect(all).not.toContain('(2 yrs)')
  })
})

describe('the Word export prints dates the way the document formats them', () => {
  // The month style, the separator, the present word and the language are
  // the document's, read by the same formatter the page uses, so the
  // right-tab date in Word is the date on the canvas character for character.
  it('follows the month style, the separator and the present word', async () => {
    const doc = docWith({ dates: { month: 'long', separator: 'to', present: 'Current' } })
    const all = texts((await unpack(doc)).body).join('')
    expect(all).toContain('March 2021 to Current')
    expect(all).not.toContain('Present')
  })

  it('names the month in the document\'s language, on single dates too', async () => {
    const doc = docWith({ dates: { month: 'long', language: 'de', separator: 'endash' } })
    doc.content.work[0].endDate = '2023-02'
    doc.content.certificates = [{ id: 'c1', name: 'Cloud Architect', issuer: 'Vendor', date: '2024-09' }] as never
    doc.metadata.layout.main = ['work', 'certificates']
    const all = texts((await unpack(doc)).body).join('')
    expect(all).toContain('März 2021 – Februar 2023')
    expect(all).toContain('September 2024')
  })

  it('reads as it always did when the document never chose', async () => {
    const doc = docWith()
    const all = texts((await unpack(doc)).body).join('')
    expect(all).toContain('Mar 2021 — Present')
  })
})

describe('the Word export colours each element the way the page does', () => {
  // The run that prints `text`, with its properties; and the paragraph.
  const runOf = (xml: string, text: string) => xml.split('<w:r>').slice(1).find((r) => r.includes(`>${text}</w:t>`)) ?? ''
  const runColor = (xml: string, text: string) => runOf(xml, text).match(/<w:color w:val="([0-9A-F]{6})"/)?.[1]
  const ruleColor = (xml: string, text: string) => paraOf(xml, text).match(/<w:bottom [^>]*w:color="([0-9A-F]{6})"/)?.[1]

  const linked = (overrides: MetadataOverrides = {}) => {
    const doc = docWith(overrides)
    doc.content.basics.url = 'https://jordan.example'
    return doc
  }

  it('the name, the headline, the section titles and their rule, the contacts and the links take their own colours', async () => {
    const { body } = await unpack(
      linked({ theme: { name: '#112233', headline: '#445566', headings: '#b45309', contacts: '#778899', links: '#0a0b0c' } })
    )
    expect(runColor(body, 'Jordan Rivera')).toBe('112233')
    expect(runColor(body, 'Product Designer')).toBe('445566')
    expect(runColor(body, 'EXPERIENCE')).toBe('B45309')
    expect(ruleColor(body, 'EXPERIENCE')).toBe('B45309')
    expect(runColor(body, 'Lisbon')).toBe('778899')
    // A linked contact stays on the contact line's colour, as on the page.
    expect(runColor(body, 'jordan.example')).toBe('778899')
  })

  it('a links colour alone never reaches a linked contact; the contacts keep theirs', async () => {
    // The page prints the whole contact line in one colour whatever the link
    // colour is (`.rm-contacts a { color: inherit }`), so a linked contact
    // here stays in the colour this export always printed it in - the accent
    // - and only a contact colour moves it.
    const { body } = await unpack(linked({ theme: { links: '#0a0b0c' } }))
    expect(runColor(body, 'jordan.example')).toBe('2563EB')
    expect(runColor(body, 'Lisbon')).toBe('5B6472')
  })

  it('unset, each falls back to the colour this export always printed it in', async () => {
    const { body } = await unpack(linked({ theme: { primary: '#0f766e' } }))
    expect(runColor(body, 'Jordan Rivera')).toBe('0F766E')
    expect(runColor(body, 'Product Designer')).toBe('0F766E')
    expect(runColor(body, 'EXPERIENCE')).toBe('0F766E')
    expect(ruleColor(body, 'EXPERIENCE')).toBe('0F766E')
    expect(runColor(body, 'Lisbon')).toBe('5B6472')
    expect(runColor(body, 'jordan.example')).toBe('0F766E')
  })
})

describe('the Word export sets headings, the headline and the contacts the way the page does', () => {
  // The run that prints `text`, with its properties.
  const runOf = (xml: string, text: string) => xml.split('<w:r>').slice(1).find((r) => r.includes(`>${text}</w:t>`)) ?? ''

  it('the section title size follows sectionTitleScale', async () => {
    const { body } = await unpack(docWith({ typography: { sectionTitleScale: 1.3 } }))
    expect(runSize(body, 'EXPERIENCE')).toBe(25)
  })

  it('the headline and the contacts follow their own scales', async () => {
    const { body } = await unpack(docWith({ typography: { headlineScale: 1.4, contactScale: 0.8 } }))
    expect(runSize(body, 'Product Designer')).toBe(27)
    expect(runSize(body, 'Lisbon')).toBe(15)
  })

  it('small caps: the label keeps its case and the run is marked small caps', async () => {
    // Decoration, never text: the words stay "Experience" for any reader of
    // the file, and Word draws the small caps itself.
    const { body } = await unpack(docWith({ typography: { headingCase: 'smallcaps', uppercaseHeadings: true } }))
    expect(runOf(body, 'Experience')).toContain('<w:smallCaps/>')
    expect(texts(body)).not.toContain('EXPERIENCE')
  })

  it('as typed: the label prints plain, whatever the legacy flag says', async () => {
    const { body } = await unpack(docWith({ typography: { headingCase: 'none', uppercaseHeadings: true } }))
    expect(runOf(body, 'Experience')).not.toContain('<w:smallCaps/>')
    expect(texts(body)).not.toContain('EXPERIENCE')
  })

  it('upper: the legacy flag alone still uppercases, and so does the explicit choice', async () => {
    const flag = await unpack(docWith({ typography: { uppercaseHeadings: true } }))
    expect(texts(flag.body)).toContain('EXPERIENCE')
    const chosen = await unpack(docWith({ typography: { headingCase: 'upper', uppercaseHeadings: false } }))
    expect(texts(chosen.body)).toContain('EXPERIENCE')
  })

  it('a regular heading and a light name drop the bold; the defaults keep it', async () => {
    const chosen = await unpack(docWith({ typography: { headingWeight: 'regular', nameWeight: 'light' } }))
    expect(runOf(chosen.body, 'EXPERIENCE')).not.toContain('<w:b/>')
    expect(runOf(chosen.body, 'Jordan Rivera')).not.toContain('<w:b/>')
    const stock = await unpack(docWith())
    expect(runOf(stock.body, 'EXPERIENCE')).toContain('<w:b/>')
    expect(runOf(stock.body, 'Jordan Rivera')).toContain('<w:b/>')
  })
})

describe('the Word export aligns and spaces headings the way the page does', () => {
  // A centred heading is a centred paragraph; the air under a heading is the
  // spacing after it, riding the same multiplier the page's margin rides; the
  // rule under it is the paragraph border, at the width the author chose
  // (Word measures borders in eighths of a point: a pixel is six of them).
  const heading = (xml: string) => paraOf(xml, 'EXPERIENCE')
  const spacingAfter = (p: string) => Number(p.match(/<w:spacing [^>]*w:after="(\d+)"/)?.[1])
  const ruleSize = (p: string) => Number(p.match(/<w:bottom [^>]*w:sz="(\d+)"/)?.[1])

  it('a centred section prints a centred heading; the default is not aligned', async () => {
    const centred = await unpack(docWith({ layout: { sectionSettings: { work: { headingAlign: 'center' } } } }))
    expect(heading(centred.body)).toContain('<w:jc w:val="center"/>')
    const stock = await unpack(docWith())
    expect(heading(stock.body)).not.toContain('<w:jc ')
  })

  it('the spacing after a heading follows headingGap, from the 80 twips it always was', async () => {
    expect(spacingAfter(heading((await unpack(docWith())).body))).toBe(80)
    expect(spacingAfter(heading((await unpack(docWith({ typography: { headingGap: 1.5 } }))).body))).toBe(120)
  })

  it('the rule takes the chosen width; unset keeps the width it always drew', async () => {
    expect(ruleSize(heading((await unpack(docWith())).body))).toBe(6)
    expect(ruleSize(heading((await unpack(docWith({ typography: { headingRuleWidth: 2 } }))).body))).toBe(12)
    expect(ruleSize(heading((await unpack(docWith({ typography: { headingRuleWidth: 1 } }))).body))).toBe(6)
  })
})

describe('the Word export leads and stresses each entry the way the section does', () => {
  // The lead line is the paragraph with the right-tab date; the other field
  // is the sub-line under it. Which of the two is bold follows the section's
  // emphasis - a FIELD, not a slot - so the title stays bold under a leading
  // company until the section stresses the company instead.
  const runOf = (xml: string, text: string) => xml.split('<w:r>').slice(1).find((r) => r.includes(`>${text}</w:t>`)) ?? ''
  // Only the lead line carries the right tab stop for its date.
  const dated = (xml: string, text: string) => paraOf(xml, text).includes('<w:tabs>')
  const withEntries = (sectionSettings: Metadata['layout']['sectionSettings'] = {}) => {
    const doc = docWith({ layout: { main: ['work', 'education', 'volunteer', 'custom-x1'], sectionSettings } })
    doc.content.work[0].endDate = '2023-02'
    doc.content.education = [
      { id: 'e1', institution: 'State University', studyType: 'BSc', area: 'Computer Science', startDate: '2015', endDate: '2019', courses: [] },
    ] as never
    doc.content.volunteer = [{ id: 'v1', organization: 'Food Bank', position: 'Driver', startDate: '2020', endDate: '2021', highlights: [] }] as never
    doc.content.custom = [{ id: 'x1', name: 'Talks', items: [{ id: 'i1', name: 'Keynote', subtitle: 'DevConf', date: '2022', highlights: [] }] }] as never
    return doc
  }

  it('by default the title leads, bold, and the organisation sits under it', async () => {
    const { body } = await unpack(withEntries())
    expect(dated(body, 'Designer')).toBe(true)
    expect(runOf(body, 'Designer')).toContain('<w:b/>')
    expect(runOf(body, 'Acme')).not.toContain('<w:b/>')
    expect(dated(body, 'BSc, Computer Science')).toBe(true)
    expect(runOf(body, 'BSc, Computer Science')).toContain('<w:b/>')
    expect(runOf(body, 'State University')).not.toContain('<w:b/>')
    expect(dated(body, 'Driver')).toBe(true)
    expect(dated(body, 'Keynote')).toBe(true)
  })

  it('organisation first puts the company on the date line and the position under it', async () => {
    const all = { entryOrder: 'org-first' } as const
    const { body } = await unpack(withEntries({ work: all, education: all, volunteer: all, 'custom-x1': all }))
    expect(dated(body, 'Acme')).toBe(true)
    expect(dated(body, 'Designer')).toBe(false)
    expect(dated(body, 'State University')).toBe(true)
    expect(dated(body, 'BSc, Computer Science')).toBe(false)
    expect(dated(body, 'Food Bank')).toBe(true)
    expect(dated(body, 'Driver')).toBe(false)
    expect(dated(body, 'DevConf')).toBe(true)
    expect(dated(body, 'Keynote')).toBe(false)
    // The bold stays on the title by default, now in the sub-line.
    expect(runOf(body, 'Acme')).not.toContain('<w:b/>')
    expect(runOf(body, 'Designer')).toContain('<w:b/>')
  })

  it('the bold follows the emphasis, not the slot', async () => {
    const under = await unpack(withEntries({ work: { entryEmphasis: 'org' } }))
    expect(dated(under.body, 'Designer')).toBe(true)
    expect(runOf(under.body, 'Designer')).not.toContain('<w:b/>')
    expect(runOf(under.body, 'Acme')).toContain('<w:b/>')
    const lead = await unpack(withEntries({ work: { entryOrder: 'org-first', entryEmphasis: 'org' } }))
    expect(dated(lead.body, 'Acme')).toBe(true)
    expect(runOf(lead.body, 'Acme')).toContain('<w:b/>')
    expect(runOf(lead.body, 'Designer')).not.toContain('<w:b/>')
  })
})
