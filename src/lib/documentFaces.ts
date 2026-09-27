import type { Metadata } from '@/types/metadata'
import { getTemplate } from '@/templates/registry'

/**
 * Every family a document's page is drawn in: its body, heading and name
 * faces, and any face its template's own stylesheet names outright (a meta
 * line set in a mono face, TemplateConfig.fonts). The export waits for all of
 * them before it measures, and the offline warmer fetches all of them - a
 * face missing from either list is laid out in a fallback's metrics on one
 * side of the export and drawn in its own on the other.
 */
export function documentFaces(metadata: Pick<Metadata, 'typography' | 'template'>): string[] {
  const t = metadata.typography
  const faces = [t.fontFamily, t.headingFamily, t.nameFamily, ...(getTemplate(metadata.template).fonts ?? [])]
  return [...new Set(faces.filter(Boolean))]
}
