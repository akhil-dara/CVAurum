import { describe, expect, it } from 'vitest'
import { parseSimpleList } from './parse'
import type { Line } from './layoutGraph'

// Minimal Line factory — only the fields parseSimpleList reads (text, bold)
// carry meaning here; the geometry fields are inert placeholders.
const line = (text: string, bold: boolean, height = 12): Line => ({
  text,
  items: [],
  x: 0,
  right: 100,
  top: 0,
  height,
  bold,
  upper: false,
  page: 1,
  col: 0,
})

describe('parseSimpleList certificates — name/issuer pairing (2026-08-16)', () => {
  // Our own exports (and most designed resumes) render a cert as a BOLD
  // name line followed by a muted issuer line. The importer used to turn
  // both into separate certificates ("AWS Certified..." + "Amazon Web
  // Services" imported as TWO certs — found by the multi-page round-trip
  // probe, reproduced on single-page).
  it('pairs a non-bold line after a bold name as its issuer', () => {
    const out = parseSimpleList(
      [line('AWS Certified Solutions Architect', true), line('Amazon Web Services', false)],
      'certificates'
    ) as { name: string; issuer: string }[]
    expect(out).toHaveLength(1)
    expect(out[0].name).toBe('AWS Certified Solutions Architect')
    expect(out[0].issuer).toBe('Amazon Web Services')
  })

  it('keeps bold-only lines as separate certificates (designed list of many)', () => {
    const out = parseSimpleList(
      [line('Cert A', true), line('Issuer A', false), line('Cert B', true), line('Issuer B', false)],
      'certificates'
    ) as { name: string; issuer: string }[]
    expect(out.map((c) => c.name)).toEqual(['Cert A', 'Cert B'])
    expect(out.map((c) => c.issuer)).toEqual(['Issuer A', 'Issuer B'])
  })

  it('keeps the flat one-per-line behavior when the section has NO bold structure', () => {
    // Real-world plain lists (one cert per line, no styling survived
    // extraction) must not get pairwise-merged.
    const out = parseSimpleList(
      [line('CCNA', false), line('CompTIA Security+', false), line('CKA', false)],
      'certificates'
    ) as { name: string }[]
    expect(out.map((c) => c.name)).toEqual(['CCNA', 'CompTIA Security+', 'CKA'])
  })

  it('a second consecutive non-bold line becomes its own cert, not a second issuer', () => {
    const out = parseSimpleList(
      [line('Cert A', true), line('Issuer A', false), line('Orphan line', false)],
      'certificates'
    ) as { name: string; issuer: string }[]
    expect(out.map((c) => c.name)).toEqual(['Cert A', 'Orphan line'])
    expect(out[0].issuer).toBe('Issuer A')
  })

  it('an all-bold list stays one cert per line', () => {
    const out = parseSimpleList([line('Cert A', true), line('Cert B', true)], 'certificates') as { name: string }[]
    expect(out.map((c) => c.name)).toEqual(['Cert A', 'Cert B'])
  })

  // Native exports carry NO weight in embedded font names (the font
  // pipeline normalizes them so static instances round-trip), so the
  // extractor's bold flag is always false on our own PDFs. The signal that
  // DOES survive is line height: the name renders larger than the muted
  // issuer line (measured 9.6 vs 8.8 on classic).
  it('pairs a SMALLER non-bold line after a larger name line as its issuer (native exports)', () => {
    const out = parseSimpleList(
      [line('AWS Certified Solutions Architect 2022', false, 9.6), line('Amazon Web Services', false, 8.8)],
      'certificates'
    ) as { name: string; issuer: string }[]
    expect(out).toHaveLength(1)
    expect(out[0].issuer).toBe('Amazon Web Services')
  })

  it('keeps a flat same-height non-bold list one cert per line', () => {
    const out = parseSimpleList(
      [line('CCNA', false, 9.6), line('CompTIA Security+', false, 9.6), line('CKA', false, 9.6)],
      'certificates'
    ) as { name: string }[]
    expect(out.map((c) => c.name)).toEqual(['CCNA', 'CompTIA Security+', 'CKA'])
  })

  it('ignores sub-half-px height jitter in a flat list', () => {
    const out = parseSimpleList(
      [line('Cert A', false, 9.6), line('Cert B', false, 9.35), line('Cert C', false, 9.55)],
      'certificates'
    ) as { name: string }[]
    expect(out.map((c) => c.name)).toEqual(['Cert A', 'Cert B', 'Cert C'])
  })
})
