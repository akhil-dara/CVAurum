/**
 * Document metadata (2026-08-19 user report: "pdf-lib should not come at all",
 * "100% proper exif"). The Info dictionary, the XMP packet, and the
 * accessibility keys are all built by pure functions so they can be asserted
 * exactly, without a browser or a real render.
 */
import { describe, it, expect } from 'vitest'
import { PDFDocument, PDFName } from 'pdf-lib'
import { applyPdfMetadata, buildDocInfo, buildXmpPacket, PDF_CREATOR, PDF_PRODUCER, xmlEscape } from './metadata'
import type { ResumeDocument } from '@/types/document'

const NOW = new Date('2026-08-19T14:30:00.000Z')

const doc = (over: Record<string, unknown> = {}): ResumeDocument =>
  ({
    title: 'My Resume',
    content: {
      basics: { name: 'Jordan Rivera', label: 'Senior Marketing Manager' },
      skills: [
        { id: '1', name: 'Growth', keywords: ['SEO', 'Paid Search'] },
        { id: '2', name: 'Analytics', keywords: ['SQL', 'SEO'] },
      ],
      ...(over.content as object),
    },
    metadata: { page: {} },
    ...over,
  }) as unknown as ResumeDocument

describe('buildDocInfo', () => {
  it('never names the PDF library — Creator and Producer are CVAurum', () => {
    const i = buildDocInfo(doc(), NOW)
    expect(i.creator).toBe(PDF_CREATOR)
    expect(i.producer).toBe(PDF_PRODUCER)
    expect(`${i.creator} ${i.producer}`.toLowerCase()).not.toContain('pdf-lib')
    expect(`${i.creator} ${i.producer}`.toLowerCase()).not.toContain('hopding')
  })

  it('titles the document with the person and their headline', () => {
    expect(buildDocInfo(doc(), NOW).title).toBe('Jordan Rivera — Senior Marketing Manager')
  })

  it('falls back to the name alone, then the doc title, then a generic title', () => {
    expect(buildDocInfo(doc({ content: { basics: { name: 'Ada Lovelace', label: '' } } }), NOW).title).toBe(
      'Ada Lovelace — Resume'
    )
    expect(buildDocInfo(doc({ content: { basics: { name: '', label: '' } } }), NOW).title).toBe('My Resume')
    expect(buildDocInfo(doc({ title: '', content: { basics: { name: '', label: '' } } }), NOW).title).toBe('Resume')
  })

  it('sets the author from the resume owner and omits it when unknown', () => {
    expect(buildDocInfo(doc(), NOW).author).toBe('Jordan Rivera')
    expect(buildDocInfo(doc({ content: { basics: { name: '', label: '' } } }), NOW).author).toBe('')
  })

  it('builds keywords from skill groups and their keywords, deduped', () => {
    const kw = buildDocInfo(doc(), NOW).keywords
    expect(kw).toEqual(['Growth', 'SEO', 'Paid Search', 'Analytics', 'SQL'])
  })

  it('caps keywords so the Info dict can never be stuffed', () => {
    const many = Array.from({ length: 60 }, (_, i) => ({ id: String(i), name: `S${i}`, keywords: [] }))
    expect(buildDocInfo(doc({ content: { basics: { name: 'A' }, skills: many } }), NOW).keywords.length).toBe(32)
  })

  it('stamps both dates with the render time', () => {
    const i = buildDocInfo(doc(), NOW)
    expect(i.created.toISOString()).toBe('2026-08-19T14:30:00.000Z')
    expect(i.modified.toISOString()).toBe('2026-08-19T14:30:00.000Z')
  })

  it('declares a document language for assistive technology', () => {
    expect(buildDocInfo(doc(), NOW).language).toBe('en-US')
  })

  it('takes the language from the document\'s date settings', () => {
    // A resume whose dates read in German is a German document; the plain
    // 'en' every document starts on keeps the en-US the export always declared.
    expect(buildDocInfo(doc({ metadata: { page: {}, dates: { language: 'de' } } }), NOW).language).toBe('de')
    expect(buildDocInfo(doc({ metadata: { page: {}, dates: { language: 'fr-CA' } } }), NOW).language).toBe('fr-CA')
    expect(buildDocInfo(doc({ metadata: { page: {}, dates: { language: 'en' } } }), NOW).language).toBe('en-US')
    expect(buildDocInfo(doc({ metadata: { page: {}, dates: { language: '  ' } } }), NOW).language).toBe('en-US')
  })
})

describe('buildXmpPacket', () => {
  const packet = () => buildXmpPacket(buildDocInfo(doc(), NOW))

  it('is a well-formed, self-contained XMP packet', () => {
    const p = packet()
    expect(p.startsWith('<?xpacket begin=')).toBe(true)
    expect(p.trimEnd().endsWith('<?xpacket end="w"?>')).toBe(true)
    expect(p).toContain('<x:xmpmeta xmlns:x="adobe:ns:meta/"')
    expect(p).toContain('</x:xmpmeta>')
    expect((p.match(/<rdf:RDF/g) ?? []).length).toBe(1)
  })

  it('carries dc, xmp and pdf properties that match the Info dict', () => {
    const p = packet()
    expect(p).toContain('<rdf:li xml:lang="x-default">Jordan Rivera — Senior Marketing Manager</rdf:li>')
    expect(p).toContain('<rdf:li>Jordan Rivera</rdf:li>')
    expect(p).toContain(`<xmp:CreatorTool>${PDF_CREATOR}</xmp:CreatorTool>`)
    expect(p).toContain(`<pdf:Producer>${PDF_PRODUCER}</pdf:Producer>`)
    expect(p).toContain('<xmp:CreateDate>2026-08-19T14:30:00Z</xmp:CreateDate>')
    expect(p).toContain('<xmp:ModifyDate>2026-08-19T14:30:00Z</xmp:ModifyDate>')
    expect(p).toContain('<dc:format>application/pdf</dc:format>')
    expect(p).toContain('<dc:language>')
  })

  it('lists each keyword as its own dc:subject bag item', () => {
    const p = packet()
    expect(p).toContain('<dc:subject>')
    expect(p).toContain('<rdf:li>SEO</rdf:li>')
    expect(p).toContain('<rdf:li>Paid Search</rdf:li>')
  })

  it('escapes XML metacharacters so the packet can never be malformed', () => {
    expect(xmlEscape('Tom & "Jerry" <x>')).toBe('Tom &amp; &quot;Jerry&quot; &lt;x&gt;')
    const p = buildXmpPacket(buildDocInfo(doc({ content: { basics: { name: 'A & B <co>' } } }), NOW))
    expect(p).toContain('A &amp; B &lt;co&gt;')
    expect(p).not.toContain('A & B <co>')
  })

  it('omits an empty author entirely rather than emitting a blank tag', () => {
    const p = buildXmpPacket(buildDocInfo(doc({ content: { basics: { name: '', label: '' } } }), NOW))
    expect(p).not.toContain('<dc:creator>')
  })
})

describe('applyPdfMetadata (real pdf-lib document)', () => {
  const build = async (over: Record<string, unknown> = {}) => {
    const pdf = await PDFDocument.create()
    applyPdfMetadata(pdf, buildDocInfo(doc(over), NOW))
    pdf.addPage()
    const bytes = await pdf.save()
    const reloaded = await PDFDocument.load(bytes, { updateMetadata: false })
    return { bytes, pdf: reloaded, raw: Buffer.from(bytes).toString('latin1') }
  }

  it('never leaves the PDF library named anywhere in the file', async () => {
    const { raw } = await build()
    expect(raw).not.toMatch(/pdf-lib/i)
    expect(raw).not.toMatch(/Hopding/i)
  })

  it('round-trips every Info field, em-dash and accents included', async () => {
    const { pdf } = await build({ content: { basics: { name: 'Zoë Ström', label: 'Réalisatrice' } } })
    expect(pdf.getTitle()).toBe('Zoë Ström — Réalisatrice')
    expect(pdf.getAuthor()).toBe('Zoë Ström')
    expect(pdf.getSubject()).toBe('Resume — Réalisatrice')
    expect(pdf.getCreator()).toBe(PDF_CREATOR)
    expect(pdf.getProducer()).toBe(PDF_PRODUCER)
    expect(pdf.getCreationDate()?.toISOString()).toBe(NOW.toISOString())
    expect(pdf.getModificationDate()?.toISOString()).toBe(NOW.toISOString())
  })

  it('encodes the XMP packet as UTF-8, not one byte per char code', async () => {
    const { bytes } = await build({ content: { basics: { name: 'Zoë Ström', label: 'Réalisatrice' } } })
    const buf = Buffer.from(bytes)
    const start = buf.indexOf('<x:xmpmeta')
    const end = buf.indexOf('</x:xmpmeta>')
    expect(start).toBeGreaterThan(-1)
    const packet = buf.subarray(start, end).toString('utf8')
    // The em-dash and the accents survive a real UTF-8 decode...
    expect(packet).toContain('Zoë Ström — Réalisatrice')
    // ...and the truncated Latin-1 form (U+2014 -> 0x14) is nowhere in it.
    expect(buf.subarray(start, end).includes(0x14)).toBe(false)
  })

  it('declares the document language and shows the title in the window bar', async () => {
    const { pdf } = await build()
    expect(String(pdf.catalog.get(PDFName.of('Lang')))).toBe('(en-US)')
    expect(String(pdf.catalog.lookup(PDFName.of('ViewerPreferences')))).toContain('/DisplayDocTitle true')
  })

  it('writes the language the document chose into /Lang', async () => {
    const { pdf } = await build({ metadata: { page: {}, dates: { language: 'de' } } })
    expect(String(pdf.catalog.get(PDFName.of('Lang')))).toBe('(de)')
  })

  it('attaches the XMP as a proper /Metadata stream on the catalog', async () => {
    const { pdf } = await build()
    const meta = pdf.catalog.lookup(PDFName.of('Metadata'))
    expect(String(meta)).toContain('/Type /Metadata')
    expect(String(meta)).toContain('/Subtype /XML')
    // PDF/A requires this stream to stay uncompressed; keep it that way.
    expect(String(meta)).not.toContain('/Filter')
  })
})

describe('applyPdfMetadata under a PDF/A-4 claim', () => {
  const build = async () => {
    const pdf = await PDFDocument.create()
    applyPdfMetadata(pdf, buildDocInfo(doc(), NOW), { part: '4', rev: '2020' })
    pdf.addPage()
    const bytes = await pdf.save()
    return { bytes, reloaded: await PDFDocument.load(bytes, { updateMetadata: false }) }
  }

  it('omits the legacy Info dictionary entirely (ISO 19005-4 clause 6.1.3)', async () => {
    const { reloaded } = await build()
    expect(reloaded.context.trailerInfo.Info).toBeUndefined()
    expect(reloaded.getTitle()).toBeUndefined()
    expect(reloaded.getProducer()).toBeUndefined()
  })

  it('still carries every value in the XMP packet, which replaces Info in PDF 2.0', async () => {
    const { bytes } = await build()
    const buf = Buffer.from(bytes)
    const packet = buf.subarray(buf.indexOf('<x:xmpmeta'), buf.indexOf('</x:xmpmeta>')).toString('utf8')
    expect(packet).toContain('Jordan Rivera — Senior Marketing Manager')
    expect(packet).toContain('<rdf:li>Jordan Rivera</rdf:li>')
    expect(packet).toContain(`<pdf:Producer>${PDF_PRODUCER}</pdf:Producer>`)
    expect(packet).toContain('<pdfaid:part>4</pdfaid:part>')
  })

  it('keeps the language and the title-in-window-bar preference', async () => {
    const { reloaded } = await build()
    expect(String(reloaded.catalog.get(PDFName.of('Lang')))).toBe('(en-US)')
    expect(String(reloaded.catalog.lookup(PDFName.of('ViewerPreferences')))).toContain('/DisplayDocTitle true')
  })

  it('never names the PDF library, with or without the Info dictionary', async () => {
    const { bytes } = await build()
    expect(Buffer.from(bytes).toString('latin1')).not.toMatch(/pdf-lib|Hopding/i)
  })
})
