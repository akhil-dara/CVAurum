/**
 * PDF/A-2B conformance pieces (2026-08-19). The ICC profile itself is a real
 * 3KB file from the ICC registry served at /color/sRGB2014.icc; these tests
 * use a synthetic header-shaped profile so they stay pure and offline, plus
 * the real one where structure matters (probe-pdfa.cjs covers the real
 * export end to end).
 */
import { describe, it, expect } from 'vitest'
import { PDFDocument, PDFName } from 'pdf-lib'
import { applyPdfAConformance, fileIdHex, isIccProfile, OUTPUT_CONDITION, PDFA_PART, PDFA_CONFORMANCE } from './pdfa'
import { applyPdfMetadata, buildDocInfo, buildXmpPacket } from './metadata'
import type { ResumeDocument } from '@/types/document'

/** Minimal bytes that satisfy the ICC header shape isIccProfile checks. */
function fakeIcc(size = 200): Uint8Array {
  const b = new Uint8Array(size)
  b[0] = (size >>> 24) & 0xff
  b[1] = (size >>> 16) & 0xff
  b[2] = (size >>> 8) & 0xff
  b[3] = size & 0xff
  for (let i = 0; i < 4; i++) b[36 + i] = 'acsp'.charCodeAt(i)
  return b
}

const doc = () =>
  ({
    title: 'My Resume',
    content: { basics: { name: 'Jordan Rivera', label: 'Senior Marketing Manager' }, skills: [] },
    metadata: { page: {} },
  }) as unknown as ResumeDocument

describe('isIccProfile', () => {
  it('accepts a profile whose declared length matches and carries acsp', () => {
    expect(isIccProfile(fakeIcc())).toBe(true)
  })

  it('rejects truncated, mis-declared, or non-ICC bytes', () => {
    expect(isIccProfile(new Uint8Array(10))).toBe(false)
    const wrongLen = fakeIcc()
    wrongLen[3] = 0x99
    expect(isIccProfile(wrongLen)).toBe(false)
    const noSig = fakeIcc()
    noSig[36] = 0
    expect(isIccProfile(noSig)).toBe(false)
  })

  it('accepts the real profile we ship, and reads as ICC v2 display class', async () => {
    const fs = await import('node:fs')
    const bytes = new Uint8Array(fs.readFileSync('public/color/sRGB2014.icc'))
    expect(isIccProfile(bytes)).toBe(true)
    const at = (a: number, z: number) => Buffer.from(bytes.subarray(a, z)).toString('latin1')
    expect(at(12, 16)).toBe('mntr')
    expect(at(16, 20)).toBe('RGB ')
    expect(bytes[8]).toBe(2)
  })
})

describe('fileIdHex', () => {
  it('is 32 hex chars and stable for the same seed', () => {
    expect(fileIdHex('a')).toMatch(/^[0-9A-F]{32}$/)
    expect(fileIdHex('a')).toBe(fileIdHex('a'))
  })

  it('differs for different documents', () => {
    expect(fileIdHex('Jordan Rivera')).not.toBe(fileIdHex('Ada Lovelace'))
  })
})

describe('applyPdfAConformance', () => {
  const build = async (icc: Uint8Array | null) => {
    const pdf = await PDFDocument.create()
    pdf.addPage()
    const applied = applyPdfAConformance(pdf, icc, 'seed')
    const bytes = await pdf.save()
    return { applied, pdf, reloaded: await PDFDocument.load(bytes, { updateMetadata: false }), bytes }
  }

  it('embeds an OutputIntent naming sRGB with the profile attached', async () => {
    const { applied, reloaded } = await build(fakeIcc())
    expect(applied).toBe(true)
    const intents = reloaded.catalog.lookup(PDFName.of('OutputIntents'))
    const s = String(intents)
    expect(s).toContain('/Type /OutputIntent')
    expect(s).toContain('/S /GTS_PDFA1')
    expect(s).toContain(OUTPUT_CONDITION)
    expect(s).toContain('/DestOutputProfile')
  })

  it('gives every page a transparency group with an explicit blend space', async () => {
    const { reloaded } = await build(fakeIcc())
    const group = String(reloaded.getPage(0).node.get(PDFName.of('Group')))
    expect(group).toContain('/S /Transparency')
    expect(group).toContain('/CS /DeviceRGB')
  })

  it('writes a trailer file identifier', async () => {
    const { bytes } = await build(fakeIcc())
    expect(Buffer.from(bytes).toString('latin1')).toMatch(/\/ID \[ <[0-9A-F]{32}> <[0-9A-F]{32}> \]/)
  })

  it('degrades to a valid non-PDF/A file when the profile is missing or broken', async () => {
    for (const bad of [null, new Uint8Array(10)]) {
      const { applied, reloaded } = await build(bad)
      expect(applied).toBe(false)
      expect(reloaded.catalog.get(PDFName.of('OutputIntents'))).toBeUndefined()
      expect(reloaded.getPageCount()).toBe(1) // still a readable document
    }
  })
})

describe('XMP pdfaid declaration', () => {
  it('declares the part and conformance level only when asked', () => {
    const info = buildDocInfo(doc(), new Date('2026-08-19T00:00:00Z'))
    const plain = buildXmpPacket(info)
    expect(plain).not.toContain('pdfaid')

    const conforming = buildXmpPacket(info, { part: PDFA_PART, conformance: PDFA_CONFORMANCE })
    expect(conforming).toContain('xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/"')
    expect(conforming).toContain('<pdfaid:part>2</pdfaid:part>')
    expect(conforming).toContain('<pdfaid:conformance>B</pdfaid:conformance>')
  })

  it('keeps the packet well-formed with the declaration present', async () => {
    const pdf = await PDFDocument.create()
    pdf.addPage()
    applyPdfMetadata(pdf, buildDocInfo(doc(), new Date('2026-08-19T00:00:00Z')), {
      part: PDFA_PART,
      conformance: PDFA_CONFORMANCE,
    })
    const buf = Buffer.from(await pdf.save())
    const start = buf.indexOf('<x:xmpmeta')
    const end = buf.indexOf('</x:xmpmeta>')
    const packet = buf.subarray(start, end).toString('utf8')
    expect((packet.match(/<rdf:Description/g) ?? []).length).toBe(1)
    expect(packet).toContain('<pdfaid:part>2</pdfaid:part>')
  })
})
