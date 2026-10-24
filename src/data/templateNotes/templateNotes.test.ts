import { describe, expect, it } from 'vitest'
import { TEMPLATES } from '@/templates/registry'
import { TEMPLATE_NOTES } from './index'

describe('what each design page says about its own design', () => {
  it('covers every design, and nothing else', () => {
    expect(Object.keys(TEMPLATE_NOTES).sort()).toEqual(TEMPLATES.map((t) => t.id).sort())
  })

  it('says enough to be worth a page, and no more than a reader takes in', () => {
    const bad: string[] = []
    for (const [id, n] of Object.entries(TEMPLATE_NOTES)) {
      for (const [k, v] of Object.entries(n)) if (v.length < 90 || v.length > 520) bad.push(`${id}.${k}: ${v.length} chars`)
      const words = Object.values(n).join(' ').split(/\s+/).length
      if (words < 110 || words > 260) bad.push(`${id}: ${words} words`)
    }
    expect(bad).toEqual([])
  })

  it('never speaks in the first person, and never names another product', () => {
    const PRONOUN = /(^|[^A-Za-z])(my|mine|we|our|ours|I)([^A-Za-z]|$)/
    const PRODUCTS = /rendercv|jake'?s resume|deedy|overleaf|canva|novoresume|zety|rezi|resume\.io|kickresume|enhancv|flowcv|reactive resume/i
    const bad: string[] = []
    for (const [id, n] of Object.entries(TEMPLATE_NOTES))
      for (const v of Object.values(n)) {
        if (PRONOUN.test(v)) bad.push(`${id}: first person`)
        if (PRODUCTS.test(v)) bad.push(`${id}: names a product`)
      }
    expect(bad).toEqual([])
  })

  it('never repeats a passage from one design on another', () => {
    const seen = new Map<string, string>()
    const bad: string[] = []
    for (const [id, n] of Object.entries(TEMPLATE_NOTES))
      for (const v of Object.values(n)) {
        const k = v.toLowerCase().replace(/[^a-z]/g, '').slice(0, 70)
        if (seen.has(k)) bad.push(`${id} repeats ${seen.get(k)}`)
        seen.set(k, id)
      }
    expect(bad).toEqual([])
  })
})
