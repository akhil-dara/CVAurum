import { describe, expect, it } from 'vitest'
import { LIBRARY } from './index'
import { sampleDoc, sampleStyle } from './doc'
import { SHOWCASE_PRESETS, showcaseFor } from './showcase'

/**
 * The library shows the style options, not only the designs: 98 of 108
 * samples printed their design untouched, so contact pills, the labelled
 * strip, rail headings, dates in the company line, link tags and numbered
 * sections appeared in none of them (2026-10-24).
 */
describe('the style options the sample library shows', () => {
  const picks = LIBRARY.map((s) => ({ s, p: showcaseFor(s.slug, sampleDoc({ ...s, tweaks: undefined }).metadata) }))

  it('uses every option on several samples', () => {
    for (const preset of SHOWCASE_PRESETS) {
      const n = picks.filter((x) => x.p?.id === preset.id).length
      expect(n, preset.id).toBeGreaterThanOrEqual(5)
    }
  })

  it('keeps a real share of samples in their design as it ships', () => {
    const plain = picks.filter((x) => !x.p).length
    expect(plain / LIBRARY.length).toBeGreaterThan(0.12)
  })

  it('picks the same option for a sample every time', () => {
    const s = LIBRARY[7]
    const m = sampleDoc({ ...s, tweaks: undefined }).metadata
    expect(showcaseFor(s.slug, m)?.id).toBe(showcaseFor(s.slug, structuredClone(m))?.id)
  })

  it('never puts headings on a rail on a two-column design, nor overrides a choice a design makes itself', () => {
    for (const { s, p } of picks) {
      const m = sampleDoc({ ...s, tweaks: undefined }).metadata
      if (p?.id === 'rail') expect(m.layout.columns, s.slug).toBe(1)
      if (p?.id === 'pills' || p?.id === 'strip') expect(m.layout.contactStyle, s.slug).toBe('inline')
    }
  })

  it('reaches the document a reader starts from the sample, and names itself on the sample', () => {
    const withPreset = LIBRARY.find((s) => sampleStyle(s).length > 0)!
    const doc = sampleDoc(withPreset)
    const p = showcaseFor(withPreset.slug, sampleDoc({ ...withPreset, tweaks: undefined }).metadata)!
    const probe = sampleDoc({ ...withPreset, tweaks: undefined }).metadata
    p.apply(probe)
    expect(JSON.stringify(doc.metadata.layout)).toBe(JSON.stringify(probe.layout))
    // and the option really changed something: a wrap that never ran would
    // leave the two equal to the bare design as well
    expect(JSON.stringify(sampleDoc({ ...withPreset, tweaks: undefined }).metadata.layout)).not.toBe(JSON.stringify(doc.metadata.layout))
    expect(sampleStyle(withPreset)).toEqual(p.labels)
  })
})
