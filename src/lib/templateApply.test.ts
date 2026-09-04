import { describe, expect, it } from 'vitest'
import { applyTemplateToMetadata } from './templateApply'
import { MetadataSchema } from '@/types/metadata'
import type { TemplateDefaults } from '@/types/template'

/** A template's defaults, shaped exactly like a registry entry's. */
const defaultsFor = (template: string, columns: 1 | 2): TemplateDefaults => {
  const m = MetadataSchema.parse({ template, layout: { columns, aside: columns === 2 ? ['skills'] : [] } })
  return { template, theme: m.theme, typography: m.typography, layout: m.layout }
}

describe('applyTemplateToMetadata keeps the link settings', () => {
  // The rebuild went through defaultMetadata(), whose overrides had no `links`
  // slot, so every template switch quietly put the link display, the
  // clickable switch, the underline and the link style back on defaults.
  it('carries display, clickable, underline and style across a switch', () => {
    const cur = MetadataSchema.parse({
      template: 'modern',
      links: { display: 'full', clickable: false, underline: true, style: 'plain' },
    })
    const next = applyTemplateToMetadata(cur, defaultsFor('sapphire', 2))
    expect(next.template).toBe('sapphire')
    expect(next.links).toEqual({ display: 'full', clickable: false, underline: true, style: 'plain' })
  })

  it('a document on defaults stays on defaults', () => {
    const cur = MetadataSchema.parse({})
    const next = applyTemplateToMetadata(cur, defaultsFor('aurum', 1))
    expect(next.links).toEqual(cur.links)
  })
})

describe('applyTemplateToMetadata keeps the bullet geometry', () => {
  // The indent and the gap are the author's, like the marker style: a
  // template switch adopts the new fonts and sizes but must not put a
  // hand-set bullet indent back on the default.
  it('carries bulletIndent and bulletGap across a switch', () => {
    const cur = MetadataSchema.parse({ template: 'modern', typography: { bulletIndent: 1.6, bulletGap: 0.45 } })
    const next = applyTemplateToMetadata(cur, defaultsFor('sapphire', 2))
    expect(next.typography.bulletIndent).toBe(1.6)
    expect(next.typography.bulletGap).toBe(0.45)
  })
})
