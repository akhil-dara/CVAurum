import type { Metadata } from '@/types/metadata'
import type { ResumeContent } from '@/types/document'
import { getTemplate } from '@/templates/registry'
import { ARABIC_FAMILY, usesArabicScript } from '@/data/fonts'

/**
 * Every family a document's page is drawn in: its body, heading and name
 * faces, any face its template's own stylesheet names outright (a meta line
 * set in a mono face, TemplateConfig.fonts), and the Arabic face when the
 * content contains Arabic-script letters. The export waits for all of them
 * before it measures, and the offline warmer fetches all of them - a face
 * missing from either list is laid out in a fallback's metrics on one side of
 * the export and drawn in its own on the other.
 *
 * The Arabic face is here because a resume can be set in Latin faces and still
 * carry Persian words (a Persian name). Those letters come from Vazirmatn
 * whatever the body face is, so the measurement has to know that before it
 * runs.
 */
export function documentFaces(
  metadata: Pick<Metadata, 'typography' | 'template'>,
  content?: ResumeContent
): string[] {
  const t = metadata.typography
  const faces = [t.fontFamily, t.headingFamily, t.nameFamily, ...(getTemplate(metadata.template).fonts ?? [])]
  if (content && usesArabicScript(JSON.stringify(content))) faces.push(ARABIC_FAMILY)
  return [...new Set(faces.filter(Boolean))]
}
