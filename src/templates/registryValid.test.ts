import { describe, expect, it } from 'vitest'
import { MetadataSchema } from '@/types/metadata'
import { TEMPLATES } from './registry'

/**
 * Every template's defaults must be a VALID document.
 *
 * They are not parsed where they are written - a template is a plain object
 * literal - so a value outside a schema bound sits there silently until
 * someone picks that template, at which point applying it throws and the
 * template is simply broken. That happened: one template shipped a heading
 * scale below the schema's floor and only a browser gate caught it, because
 * nothing had ever fed the registry through the schema.
 */
describe('every template is a document the schema accepts', () => {
  for (const t of TEMPLATES) {
    it(`${t.id} parses`, () => {
      const parsed = MetadataSchema.safeParse(t.defaults)
      if (!parsed.success) {
        const where = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
        throw new Error(`${t.id} defaults are not valid metadata - ${where}`)
      }
    })
  }
})
