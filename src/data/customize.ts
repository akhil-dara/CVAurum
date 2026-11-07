import { TEMPLATE_COUNT } from '@/templates/registry'

/**
 * What can be changed on any design, said on every template page.
 *
 * Someone who lands on one template from a search sees one picture and
 * decides on it: the wrong colour, a photo they do not want or a second
 * column reads as "not for me" and they leave, though every one of those is
 * a switch in the editor. The page has to say so. One text for every copy of
 * a template page - the page a person reads (src/routes/TemplatePage.tsx),
 * the HTML written at build for a reader that runs no script and the
 * Markdown twin (src/lib/seoPages.ts) - so the three cannot disagree.
 *
 * Two lines, not a list: the same heading, intro and nine-item list on all
 * 75 pages made about half of each page's text the same as every other's
 * (SEO audit, 2026-11-07). `controls` names only controls that exist in the
 * Design panel or a section's Style sheet; add a word only when the control
 * does.
 */
export const CUSTOMIZE = {
  /** The promise said first, beside the button: a visitor who does not
   *  like this design is one click from any other. */
  switchLine: `Not quite right? Switch to any of ${TEMPLATE_COUNT} templates in one click, even after you have filled it in: your content stays, nothing is retyped.`,
  /** Everything else that changes, in one sentence. */
  controls:
    'Colours, fonts, the header and photo, section headings, dates, one or two columns, spacing, page size and Magic fit all change in the editor, with your words on the page.',
} as const
