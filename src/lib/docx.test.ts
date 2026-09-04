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
    // section title at fs * 1.06, entry titles at 1.05, sub-lines and
    // contacts at 0.95 and dates at 0.92 (Artboard.tsx useVars, artboard.css).
    // Half-points, so a 9.6pt body is 19 and the default name 48.
    const a = docxMetrics(defaultMetadata()).sizes
    expect(a).toEqual({ name: 48, headline: 22, section: 20, title: 20, body: 19, sub: 18, date: 18 })
    const b = docxMetrics(defaultMetadata({ typography: { fontSize: 11, headingScale: 2 } })).sizes
    expect(b).toEqual({ name: 61, headline: 25, section: 23, title: 23, body: 22, sub: 21, date: 20 })
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
