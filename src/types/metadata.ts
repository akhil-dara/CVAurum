/**
 * CVAurum metadata: everything visual & structural that is NOT resume content.
 * Stored under `meta.cvaurum` in an exported JSON Resume document.
 */
import { z } from 'zod'

/** Canonical section keys. Standard JSON Resume sections + CVAurum customs. */
export const STANDARD_SECTIONS = [
  'profiles',
  'summary',
  'work',
  'education',
  'projects',
  'skills',
  'languages',
  'certificates',
  'awards',
  'publications',
  'volunteer',
  'interests',
  'references',
] as const

export type SectionKey = (typeof STANDARD_SECTIONS)[number] | string // custom-* ids allowed

export const PageFormatSchema = z.enum(['A4', 'Letter'])
export type PageFormat = z.infer<typeof PageFormatSchema>

/** One user-pinned page break ("Start on new page", 2026-08-17 spec): the
 *  break lands immediately BEFORE the named section, or before one entry of
 *  it when `itemId` (the content item's own stable `id`) is present. Pins
 *  whose target no longer exists resolve to nothing and are ignored. */
export const PageBreakPinSchema = z.object({
  section: z.string(),
  itemId: z.string().optional(),
})
export type PageBreakPin = z.infer<typeof PageBreakPinSchema>

export const PageSchema = z.object({
  format: PageFormatSchema.default('A4'),
  /** millimetres */
  margin: z.number().min(0).max(40).default(13),
  /** auto-shrink type/spacing to fit a single page when it's close */
  autoFit: z.boolean().default(true),
  /** user-pinned page breaks — only meaningful with autoFit off */
  breaks: z.array(PageBreakPinSchema).default([]),
})

export const ThemeSchema = z.object({
  /** primary brand/accent color used for headings, rules, links */
  primary: z.string().default('#2563eb'),
  /** main body text color */
  text: z.string().default('#1a1a1a'),
  /** muted/secondary text (dates, locations) */
  muted: z.string().default('#5b6472'),
  /** page background */
  background: z.string().default('#ffffff'),
  /** sidebar background (two-column templates) */
  sidebar: z.string().default('#0f172a'),
  /** text color on the sidebar */
  sidebarText: z.string().default('#e2e8f0'),
  /** One colour each for the elements the theme colours used to decide
   *  together. Unset, each is derived exactly as before: the name from the
   *  body text, the headline and the section titles from the accent, the
   *  contact line from the muted colour, links from the text around them.
   *  A template's own derivation (a muted headline, a gold name) stands until
   *  a colour is set here; every stylesheet rule reads the colour through the
   *  same fallback chain (elementColors.ts). */
  name: z.string().optional(),
  headline: z.string().optional(),
  headings: z.string().optional(),
  contacts: z.string().optional(),
  links: z.string().optional(),
})

export const TypographySchema = z.object({
  /** body font family name (must exist in the font registry) */
  fontFamily: z.string().default('Inter'),
  /** heading font family (defaults to body when empty) */
  headingFamily: z.string().default(''),
  /** decorative font for the name header (optional) */
  nameFamily: z.string().default(''),
  /** base body font size in pt */
  fontSize: z.number().min(7).max(16).default(9.6),
  /** unitless line-height multiplier */
  lineHeight: z.number().min(1).max(2.2).default(1.28),
  /** letter spacing in em */
  letterSpacing: z.number().min(-0.05).max(0.2).default(0),
  /** heading size scale relative to body */
  headingScale: z.number().min(1).max(2.4).default(1.5),
  /** section title size as a multiple of the body size (1.06 is what the page always drew) */
  sectionTitleScale: z.number().min(0.8).max(1.6).default(1.06),
  /** headline size as a multiple of the body size */
  headlineScale: z.number().min(0.7).max(1.8).default(1.15),
  /** contact line size as a multiple of the body size */
  contactScale: z.number().min(0.7).max(1.3).default(0.95),
  /** uppercase section headings */
  uppercaseHeadings: z.boolean().default(true),
  /** How section titles are cased. Unset, the uppercase flag decides: on is
   *  'upper'; off decides nothing and the template's own case stands. */
  headingCase: z.enum(['upper', 'smallcaps', 'none']).optional(),
  /** weight of the name; unset keeps the template's own */
  nameWeight: z.enum(['bold', 'regular', 'light']).optional(),
  /** weight of section titles; unset keeps the template's own */
  headingWeight: z.enum(['bold', 'regular']).optional(),
  /** air between a section title and its body, as a multiple of the gap the template draws (1 is what the page always drew) */
  headingGap: z.number().min(0.5).max(2).default(1),
  /** width of the rule under a section title, in px; unset keeps the template's own */
  headingRuleWidth: z.union([z.literal(1), z.literal(2)]).optional(),
  /** bullet marker style for highlight lists */
  bulletStyle: z.enum(['disc', 'circle', 'square', 'dash', 'arrow', 'check', 'diamond', 'none']).default('disc'),
  /** how far a highlight list is set in from the text edge, in em of the base size */
  bulletIndent: z.number().min(0.5).max(2.5).default(1.05),
  /** vertical space between two bullets, in em of the base size */
  bulletGap: z.number().min(0).max(1).default(0.2),
  /** how skill/language proficiency ratings render (dots/bars/stars meter, plain text, or hidden) */
  proficiency: z.enum(['dots', 'bars', 'stars', 'text', 'none']).default('dots'),
})

export const LayoutSchema = z.object({
  /** 1 = single column, 2 = main + sidebar */
  columns: z.union([z.literal(1), z.literal(2)]).default(1),
  /** header composition override (unset = the template's own header) */
  headerStyle: z.enum(['standard', 'centered', 'split', 'banner', 'compact']).optional(),
  /** which side the sidebar sits on (only used when columns === 2) */
  sidebar: z.enum(['left', 'right']).default('left'),
  /** sidebar width as a fraction of content width (0.28 - 0.42) */
  sidebarWidth: z.number().min(0.22).max(0.45).default(0.34),
  /** ordered list of section keys in the MAIN column */
  main: z.array(z.string()).default([]),
  /** ordered list of section keys in the SIDEBAR (columns === 2) */
  aside: z.array(z.string()).default([]),
  /** hidden section keys */
  hidden: z.array(z.string()).default([]),
  /** custom heading label overrides keyed by section key */
  headings: z.record(z.string()).default({}),
  /** per-section field/visibility + style overrides, keyed by section key */
  sectionSettings: z
    .record(
      z.object({
        showBullets: z.boolean().optional(),
        showDates: z.boolean().optional(),
        /** Append the length of each date range in parentheses ("2 yrs 3 mos").
         *  Opt-in. Real text the shared date formatter adds, so the page, the
         *  Word file and the ATS text all print the same words. */
        showDuration: z.boolean().optional(),
        showLocation: z.boolean().optional(),
        showSummary: z.boolean().optional(),
        showKeywords: z.boolean().optional(),
        /** per-section heading treatment (overrides the template's) */
        headingStyle: z
          .enum(['underline', 'rule-after', 'bar', 'boxed', 'lead-rule', 'badge', 'strike', 'plain'])
          .optional(),
        /** how the skills section displays its keywords (skills section only) */
        // 'stacked' puts the group name on its own line with the keyword
        // list beneath it, rather than running the list on after the name.
        skillsStyle: z.enum(['chips', 'tags', 'inline', 'grid', 'stacked']).optional(),
        /** how the section's entries are laid out (overrides the template's flow) */
        entryLayout: z.enum(['timeline', 'cards', 'grid', 'divided']).optional(),
        /** how the education score (GPA) is placed: inline (default), pushed right, or a pill */
        scoreStyle: z.enum(['inline', 'right', 'pill']).optional(),
        /** show a monogram badge (company/institution initial) beside each entry */
        showBadges: z.boolean().optional(),
        /** per-section bullet marker (overrides the global typography choice) */
        bulletStyle: z.enum(['disc', 'circle', 'square', 'dash', 'arrow', 'check', 'diamond', 'none']).optional(),
        /** per-section proficiency meter for skills/languages (overrides typography.proficiency) */
        meterStyle: z.enum(['dots', 'bars', 'stars', 'text', 'none']).optional(),
        /** entry logo / letter-badge size */
        badgeSize: z.enum(['s', 'm', 'l']).optional(),
        /** How much room a skill pill takes around its text. */
        chipSize: z.enum(['s', 'm', 'l']).optional(),
        /** entry logo / letter-badge shape */
        badgeShape: z.enum(['rounded', 'circle', 'square']).optional(),
        /** An address for the section's own HEADING. Every other line on the
         *  page could be linked; a heading could not, so a portfolio or a
         *  publication list had nowhere to point. */
        url: z.string().optional(),
        /** Where the section's heading sits across its column; unset keeps
         *  the template's own (three templates centre theirs). */
        headingAlign: z.enum(['left', 'center']).optional(),
        /** Which field leads an entry: the title (position, degree) or the
         *  organisation (company, institution; a custom entry's subtitle).
         *  Unset leads with the title, as the page always did. */
        entryOrder: z.enum(['title-first', 'org-first']).optional(),
        /** Which of the two is bold. Unset is the title, whichever leads. */
        entryEmphasis: z.enum(['title', 'org']).optional(),
      })
    )
    .default({}),
  /** vertical rhythm between sections in pt */
  sectionGap: z.number().min(4).max(40).default(9),
  /** vertical gap between items within a section in pt */
  itemGap: z.number().min(2).max(24).default(5),
  /** show small icons next to contact details / section headers */
  icons: z.boolean().default(true),
  /** How the contact line is arranged. A narrow sidebar reads far better with
   *  one contact per row than with a wrapping run of them. */
  contactStyle: z.enum(['inline', 'stacked']).default('inline'),
  /** What sits between contacts on an inline row. Templates used to hard-code
   *  this, so an author who wanted dots between their details - or nothing at
   *  all - had to change template to get them. */
  contactSeparator: z.enum(['none', 'dot', 'pipe', 'slash', 'dash']).default('none'),
  /**
   * How a section heading's icon is presented. The badge is one of the
   * loudest stylistic choices on the page, so it is worth a real control:
   * 'folio' is a paper-toned chip with a folded corner and a solid glyph,
   * the default for new documents; 'chip' is the tinted rounded square
   * templates drew before it; 'none' removes the badge while leaving
   * CONTACT icons alone (those are the separate `icons` switch). Values are
   * only ever ADDED here: an unknown value fails the whole metadata parse
   * and a stored document would come back on defaults.
   */
  sectionIconStyle: z.enum(['folio', 'chip', 'plain', 'filled', 'circle', 'outline', 'none']).default('folio'),
  /** How large the section-heading badge is, for every icon style. */
  sectionIconSize: z.enum(['s', 'm', 'l']).default('m'),
  /** show the photo (if provided) */
  showPhoto: z.boolean().default(false),
  /** show a monogram (initials in a colored badge) instead of a photo */
  monogram: z.boolean().default(false),
  /** photo / monogram shape */
  photoShape: z.enum(['circle', 'rounded', 'square', 'diamond']).default('circle'),
  /** photo size */
  photoSize: z.enum(['s', 'm', 'l']).default('m'),
  /** Where the photo sits across its column. Centred by default: a sidebar
   *  portrait pinned to the left edge with the heading tight underneath reads
   *  as a mistake rather than a choice (2026-08-25 report). */
  photoAlign: z.enum(['left', 'center', 'right']).default('center'),
})

/**
 * How URLs are DISPLAYED. The target is always the full, normalised address -
 * display and destination are separate concerns, and conflating them is why
 * an author could not choose to show a full URL even when they wanted to.
 *
 *   pretty  github.com/someone          (scheme and trailing slash dropped)
 *   full    https://github.com/someone  (exactly as entered)
 *   short   someone                     (host dropped too, for a tidy line)
 */
export const LinkDisplaySchema = z.enum(['pretty', 'full', 'short'])
export type LinkDisplay = z.infer<typeof LinkDisplaySchema>

export const LinksSchema = z.object({
  display: LinkDisplaySchema.default('pretty'),
  /** Underline links so a reader can SEE which text is clickable. */
  underline: z.boolean().default(false),
  /** Whether links are LIVE in the exported PDF. Some readers want the
   *  address printed but not clickable - for a paper submission, or where a
   *  live link in a PDF is unwelcome - so this is the author's call. */
  clickable: z.boolean().default(true),
  /** How a NAMED link (a project's Portfolio, a credential's Verify) is
   *  drawn: 'tag' sets the word in a small paper-toned tag with an accent
   *  bar, 'plain' prints the bare word. Contact and header links are never
   *  tagged. Purely visual - the text every exporter reads is the same. */
  style: z.enum(['plain', 'tag']).default('tag'),
})

/**
 * How every date on the page reads. One block for the whole document, read
 * by the shared date formatter, so the canvas, the Word file and the ATS
 * text spell a date the same way. Each default is what the page always
 * printed - a short English month, a spaced em dash, the word Present - so
 * a document saved before the block existed reads exactly as it did.
 */
export const DatesSchema = z.object({
  /** how the month is spelled: Jan 2021, January 2021, 01/2021, or the year alone */
  month: z.enum(['short', 'long', 'numeric', 'none']).default('short'),
  /** what sits between the two ends of a range */
  separator: z.enum(['endash', 'emdash', 'to', 'hyphen']).default('emdash'),
  /** the word an open-ended range ends with */
  present: z.string().default('Present'),
  /** BCP-47 tag for month names and time-span words; the PDF declares it as its language too */
  language: z.string().default('en'),
})

export const MetadataSchema = z.object({
  template: z.string().default('modern'),
  page: PageSchema.default({}),
  theme: ThemeSchema.default({}),
  typography: TypographySchema.default({}),
  layout: LayoutSchema.default({}),
  links: LinksSchema.default({}),
  dates: DatesSchema.default({}),
})

export type Page = z.infer<typeof PageSchema>
export type Theme = z.infer<typeof ThemeSchema>
export type Typography = z.infer<typeof TypographySchema>
export type Layout = z.infer<typeof LayoutSchema>
export type Links = z.infer<typeof LinksSchema>
export type Dates = z.infer<typeof DatesSchema>
export type Metadata = z.infer<typeof MetadataSchema>

/** Page pixel dimensions at 96dpi (CSS px). 1mm = 96/25.4 px. */
export const MM_TO_PX = 96 / 25.4
export const PAGE_DIMENSIONS: Record<PageFormat, { w: number; h: number }> = {
  // 210 x 297 mm
  A4: { w: 210 * MM_TO_PX, h: 297 * MM_TO_PX },
  // 8.5 x 11 in
  Letter: { w: 8.5 * 96, h: 11 * 96 },
}
