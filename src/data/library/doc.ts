import { createDocument } from '@/data/defaults'
import { applyTemplateToMetadata } from '@/lib/templateApply'
import { getTemplate } from '@/templates/registry'
import type { ResumeDocument } from '@/types/document'
import type { LibrarySample } from './types'

/**
 * The document a sample IS: its content in its own design, with whatever
 * polish it asks for on top.
 *
 * One place builds it, so the thumbnail on the card, the full preview on the
 * sample's own page and the résumé a reader actually starts are the same
 * document — a card that previewed something other than what "Use this
 * example" produced would be the one bug this page cannot afford.
 */
export function sampleDoc(s: LibrarySample): ResumeDocument {
  const doc = createDocument({ sample: true, content: s.content, title: `${s.role} résumé` })
  doc.metadata = applyTemplateToMetadata(doc.metadata, getTemplate(s.template).defaults)
  s.tweaks?.(doc.metadata)
  return doc
}
