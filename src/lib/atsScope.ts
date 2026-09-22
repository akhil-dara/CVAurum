/**
 * The document the analysis is allowed to see.
 *
 * Everything in the ATS panel - the score, the per-system simulation, the
 * keyword match against a job description, the writing coach and the "what an
 * ATS sees" text view - is a claim about the résumé the author is looking at.
 * It was not. The analysis read `doc.content` straight through, while the page
 * draws only the sections `resolveOrder` puts in the main column, the sidebar
 * and the footer strip. A section the author hid kept feeding the score, the
 * matcher and the coach: measured on a library example, hiding Skills and
 * Projects moved the exported text from 3052 to 2051 characters and moved the
 * score, the word count, the JD match rate and the coach's bullet count by
 * exactly nothing (100, 360 words, 38%, 12 bullets, before and after).
 *
 * So the fix is not a new rule, it is a narrower input. `resolveOrder` is
 * already the one pure function that decides what renders - the artboard calls
 * it to draw the page and `resumeToAtsText` calls it to serialize the export -
 * and this module reuses that same decision to build the content the analysis
 * runs on. Nothing here re-implements the rule; it only applies it.
 *
 * The header is deliberately exempt. A name, a title, the contact line and the
 * profile links are drawn by every template outside the section list, so they
 * are not `resolveOrder`'s to keep or drop. The one piece of `basics` that IS
 * a body section is the summary, and it goes when `summary` goes.
 */
import type { ResumeContent, ResumeDocument } from '@/types/document'
import { resolveOrder } from '@/lib/sections'

/**
 * The section keys the page actually draws, in no particular order.
 *
 * This is the PRINT decision, not the canvas one: `resolveOrder` is called
 * without `includeEmpty`, so a section the author added but never filled is
 * absent here exactly as it is absent from the PDF. The canvas keeps drawing
 * its "Add item" row - that is an editing affordance, not content - and an
 * empty section has nothing to contribute to a score in any case.
 */
export function visibleSectionKeys(doc: ResumeDocument): Set<string> {
  const { main, aside, footer } = resolveOrder(doc)
  return new Set([...main, ...aside, ...footer])
}

/** Which content array each body section key owns. `summary` and the custom
 *  sections are the two that do not map to a plain array, and are handled on
 *  their own below. */
const SECTION_FIELD: Record<string, keyof ResumeContent> = {
  work: 'work',
  education: 'education',
  projects: 'projects',
  skills: 'skills',
  languages: 'languages',
  certificates: 'certificates',
  awards: 'awards',
  publications: 'publications',
  volunteer: 'volunteer',
  interests: 'interests',
  references: 'references',
}

/**
 * The same document with every section the page does not draw emptied out.
 *
 * Returns a shallow copy - metadata, template, job description and id are the
 * original's, because the analysis still needs them to talk about the layout,
 * the template's ATS-safety and the pasted job description. Only `content`
 * narrows.
 *
 * Idempotent: running it on its own output is a no-op, because a section with
 * no content left is one `resolveOrder` already declines to place.
 */
export function visibleDocument(doc: ResumeDocument): ResumeDocument {
  const visible = visibleSectionKeys(doc)
  const c = doc.content
  const content: ResumeContent = { ...c }

  for (const [key, field] of Object.entries(SECTION_FIELD)) {
    if (!visible.has(key)) (content[field] as unknown[]) = []
  }

  // The summary is a body section that lives inside `basics`, so it is dropped
  // on its own - and only it. The name, title, contact details and profile
  // links sit in the header, which no section list governs.
  if (!visible.has('summary') && c.basics.summary) {
    content.basics = { ...c.basics, summary: '' }
  }

  content.custom = c.custom.filter((sec) => visible.has(`custom-${sec.id}`))

  return { ...doc, content }
}
