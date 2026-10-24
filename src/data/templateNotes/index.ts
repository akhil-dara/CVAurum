import { NOTES_A } from './a'
import { NOTES_B } from './b'
import { NOTES_C } from './c'

/**
 * What a design is for, written for the design's own page: who it suits, how
 * its page is built, and how it reads to a résumé parser.
 *
 * Every design page carried the same paragraphs and the same link list, so
 * the 75 pages were about 91% the same text (2026-10-24 audit); this is the
 * part of each page that is its own. Three files only so three writers could
 * work at once; this map is the one way in. templateNotes.test.ts holds the
 * rules: every design has notes, none repeats another, none names a product.
 */
export interface TemplateNote {
  /** Who and what the design is for: roles, seniority, the reader it suits. */
  suits: string
  /** How the page is built: columns, header, headings, type, where colour sits. */
  layout: string
  /** How it reads to a résumé parser, and anything to know when choosing it. */
  ats: string
}

export const TEMPLATE_NOTES: Record<string, TemplateNote> = { ...NOTES_A, ...NOTES_B, ...NOTES_C }
