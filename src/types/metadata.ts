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

export const PageSchema = z.object({
  format: PageFormatSchema.default('A4'),
  /** millimetres */
  margin: z.number().min(0).max(40).default(13),
  /** auto-shrink type/spacing to fit a single page when it's close */
  autoFit: z.boolean().default(true),
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
  /** uppercase section headings */
  uppercaseHeadings: z.boolean().default(true),
  /** bullet marker style for highlight lists */
  bulletStyle: z.enum(['disc', 'circle', 'square', 'dash', 'arrow', 'check', 'diamond', 'none']).default('disc'),
  /** how skill/language proficiency ratings render (dots/bars/stars meter, plain text, or hidden) */
  proficiency: z.enum(['dots', 'bars', 'stars', 'text', 'none']).default('dots'),
})

export const LayoutSchema = z.object({
  /** 1 = single column, 2 = main + sidebar */
  columns: z.union([z.literal(1), z.literal(2)]).default(1),
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
  /** per-section field/visibility overrides, keyed by section key */
  sectionSettings: z
    .record(
      z.object({
        showBullets: z.boolean().optional(),
        showDates: z.boolean().optional(),
        showLocation: z.boolean().optional(),
        showSummary: z.boolean().optional(),
      }),
    )
    .default({}),
  /** vertical rhythm between sections in pt */
  sectionGap: z.number().min(4).max(40).default(9),
  /** vertical gap between items within a section in pt */
  itemGap: z.number().min(2).max(24).default(5),
  /** show small icons next to contact details / section headers */
  icons: z.boolean().default(true),
  /** show the photo (if provided) */
  showPhoto: z.boolean().default(false),
  /** photo shape */
  photoShape: z.enum(['circle', 'rounded', 'square']).default('circle'),
  /** photo size */
  photoSize: z.enum(['s', 'm', 'l']).default('m'),
})

export const MetadataSchema = z.object({
  template: z.string().default('modern'),
  page: PageSchema.default({}),
  theme: ThemeSchema.default({}),
  typography: TypographySchema.default({}),
  layout: LayoutSchema.default({}),
})

export type Page = z.infer<typeof PageSchema>
export type Theme = z.infer<typeof ThemeSchema>
export type Typography = z.infer<typeof TypographySchema>
export type Layout = z.infer<typeof LayoutSchema>
export type Metadata = z.infer<typeof MetadataSchema>

/** Page pixel dimensions at 96dpi (CSS px). 1mm = 96/25.4 px. */
export const MM_TO_PX = 96 / 25.4
export const PAGE_DIMENSIONS: Record<PageFormat, { w: number; h: number }> = {
  // 210 x 297 mm
  A4: { w: 210 * MM_TO_PX, h: 297 * MM_TO_PX },
  // 8.5 x 11 in
  Letter: { w: 8.5 * 96, h: 11 * 96 },
}
