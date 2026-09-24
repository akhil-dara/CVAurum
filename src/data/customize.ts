import { TEMPLATE_COUNT } from '@/templates/registry'

/**
 * What can be changed on any design, said on every template page.
 *
 * Someone who lands on one template from a search sees one picture and
 * decides on it: the wrong colour, a photo they do not want or a second
 * column reads as "not for me" and they leave, though every one of those is
 * a switch in the editor. The page has to say so. One list for every copy of
 * a template page - the page a person reads (src/routes/TemplatePage.tsx),
 * the HTML written at build for a reader that runs no script and the
 * Markdown twin (src/lib/seoPages.ts) - so the three cannot disagree. Each
 * line names a control that exists in the Design panel or a section's Style
 * sheet; add a line only when the control does.
 */
export const CUSTOMIZE = {
  /** The promise said first, beside the button: a visitor who does not
   *  like this design is one click from any other. */
  switchLine: `Not quite right? Switch to any of ${TEMPLATE_COUNT} templates in one click, even after you have filled it in: your content stays, nothing is retyped. Colours, fonts, photo, columns and section styles change just as easily.`,
  heading: 'Everything on this design can be changed',
  intro:
    'The picture is a starting point, not a fixed layout. Open the design and change any of this in the editor, with your own words on the page as you do; nothing needs retyping.',
  items: [
    'Colours: the accent, heading, text, background and sidebar colours',
    'Fonts: heading, body and name typefaces, sizes, line height and letter spacing',
    'Header: photo or monogram on or off, the contact line’s style and whether it sits under, beside or above the name, or in the sidebar',
    'Section headings: rule, band, side heading and more, for every section at once or one at a time, with an optional icon',
    'Dates: at the right edge, before the entry, beside the title or in the company line',
    'Language levels, skill badges and link style',
    'One or two columns, the sidebar width, section order and which sections appear',
    'Spacing, margins and page size (A4 or US Letter), and Magic fit to keep it to one, two or three pages',
    `Switch to any of the other ${TEMPLATE_COUNT - 1} designs at any time; your content comes with you`,
  ],
} as const
