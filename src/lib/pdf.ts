import { resumeFileBase } from '@/lib/utils'
import type { ResumeDocument } from '@/types/document'

export function pdfBaseName(doc: ResumeDocument): string {
  return resumeFileBase(doc.content.basics.name, doc.title)
}
