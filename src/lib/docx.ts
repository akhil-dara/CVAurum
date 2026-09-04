/**
 * DOCX export — "what you see is what you get". The Word document mirrors the
 * on-screen template as closely as Word allows: two-column layouts become a
 * borderless table with a shaded sidebar cell, the accent color / fonts / photo
 * all follow the template, section headings keep their bottom rule, and skill /
 * language ratings render as unicode meters. Single-column templates still
 * produce a clean one-column doc. Everything runs in the browser via Packer.
 *
 * Caveats Word imposes: true circular photo crop isn't possible (square/rounded),
 * the page background color only shows when "print background colors" is on (the
 * sidebar cell shading prints reliably regardless), and chips render as inline
 * text rather than rounded pills.
 */
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TabStopType,
  TextRun,
  type IParagraphOptions,
  type ParagraphChild,
} from 'docx'
import type { ResumeDocument } from '@/types/document'
import type { Metadata, Typography } from '@/types/metadata'
import { resolveOrder, sectionLabel } from '@/lib/sections'
import { sanitizeHtml } from '@/lib/sanitize'
import { entryMetaOf, entryOrderOf, keepEntriesOn, LOCATION_DATE_SEPARATOR } from '@/templates/_shared/sectionClasses'
import {
  currentYearMonth,
  downloadBlob,
  formatDate,
  formatDateRange,
  htmlToText,
  resumeFilename,
  safeHref,
  sectionDateOptions,
} from '@/lib/utils'
import { prettyUrl, cleanEmail, linkWords } from '@/templates/_shared/atoms'
import { headingCase, STOCK_SCALE, type HeadingCase } from '@/lib/typeStyle'

/* ----------------------------------------------------------------- helpers */

const TWIP = {
  a4: { w: 11906, h: 16838 },
  letter: { w: 12240, h: 15840 },
}
const TWIPS_PER_MM = 1440 / 25.4
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/** Run sizes in half-points, one per role a line can play. */
export interface DocxSizes {
  name: number
  headline: number
  section: number
  title: number
  body: number
  sub: number
  contact: number
  date: number
}

/** What the page's own settings become in Word's units. */
export interface DocxMetrics {
  /** page margin in twips (page.margin is millimetres) */
  margin: number
  /** paragraph line spacing, in 240ths of a single line */
  line: number
  sizes: DocxSizes
  /** the run printed between two inline contacts */
  separator: string
  /** how far a bullet paragraph is set in, in twips (typography.bulletIndent is em) */
  bulletIndent: number
  /** space after a bullet paragraph, in twips (typography.bulletGap is em) */
  bulletGap: number
  /** space after a section heading, in twips (typography.headingGap multiplies the 80 the export always left) */
  headingGap: number
  /** the rule under a section heading, in eighths of a point (a pixel is six; unset keeps the six it always drew) */
  headingRule: number
}

// Word's single spacing already spans the font's own line box - about 1.22em
// for the usual body faces - while the canvas line-height is a bare multiple
// of the type size. Dividing that out keeps the Word leading where the page
// has it: the export's long-standing 252 is exactly 240 * 1.28 / 1.22.
const WORD_LINE_EM = 1.22

// The 80 twips this export always left under a section heading, and the
// border unit of the format: eighths of a point, so a CSS pixel (0.75pt)
// is six of them.
const HEADING_AFTER = 80
const RULE_PER_PX = 6

// The glyph the canvas draws between inline contacts (Artboard.tsx useVars),
// padded the way the page spaces it. 'none' is spacing alone, never a bullet.
const CONTACT_SEPARATOR: Record<string, string> = {
  none: '    ',
  dot: '   ·   ',
  pipe: '   |   ',
  slash: '   /   ',
  dash: '   –   ',
}

// Half-point sizes from the base size, with the ratios the canvas applies: the
// name at fs * (1.55 + headingScale * 0.62), section titles, the headline and
// the contacts at their own scales (1.06, 1.15 and 0.95 stock), entry titles
// at 1.05, sub-lines at 0.95, dates at 0.92 (Artboard.tsx useVars and
// artboard.css).
type ScaleTypography = Pick<Typography, 'headingScale' | 'sectionTitleScale' | 'headlineScale' | 'contactScale'>
function sizesFor(fontSizePt: number, t: ScaleTypography): DocxSizes {
  const hp = (ratio: number) => Math.round(fontSizePt * ratio * 2)
  return {
    name: hp(1.55 + clamp(t.headingScale, 1, 2.6) * 0.62),
    headline: hp(t.headlineScale),
    section: hp(t.sectionTitleScale),
    title: hp(1.05),
    body: hp(1),
    sub: hp(0.95),
    contact: hp(t.contactScale),
    date: hp(0.92),
  }
}

/**
 * The document's page margin, base size, line height and contact separator in
 * Word's units. The export used to hard-code 0.75in margins, a 10pt scale,
 * 1.05 leading and a bullet between contacts, so a resume set 20mm wide at
 * 11pt with pipes between its details came out of Word looking like a
 * different document.
 *
 * `fitScale` is the live one-page fit. It scales type only, clamped to the
 * same floor the on-screen fit uses (never unreadable), so the .docx lands on
 * the same page count as the PDF - otherwise a resume the PDF squeezes onto
 * one page spills onto a second Word page.
 */
export function docxMetrics(metadata: Metadata, fitScale = 1): DocxMetrics {
  const scale = clamp(fitScale || 1, 0.66, 1.15)
  const t = metadata.typography
  // An em on the page is the scaled base size, so the bullet geometry
  // follows the fit the way the type does. 20 twips to the point.
  const em = t.fontSize * scale * 20
  return {
    margin: Math.round(metadata.page.margin * TWIPS_PER_MM),
    line: Math.round((240 * t.lineHeight) / WORD_LINE_EM),
    sizes: sizesFor(t.fontSize * scale, t),
    separator: CONTACT_SEPARATOR[metadata.layout.contactSeparator ?? 'none'] ?? CONTACT_SEPARATOR.none,
    bulletIndent: Math.round(t.bulletIndent * em),
    bulletGap: Math.round(t.bulletGap * em),
    headingGap: Math.round(HEADING_AFTER * t.headingGap),
    headingRule: (t.headingRuleWidth ?? 1) * RULE_PER_PX,
  }
}

// Per-export font sizes (half-points). Reassigned at the top of every export
// from the document's own base size and one-page fit. Safe as module state:
// exports run one at a time and build synchronously.
let SIZE: DocxSizes = sizesFor(9.6, {
  headingScale: 1.5,
  sectionTitleScale: STOCK_SCALE.sectionTitle,
  headlineScale: STOCK_SCALE.headline,
  contactScale: STOCK_SCALE.contact,
})
// Per-export bullet geometry (twips), reassigned the same way.
let BULLET = { indent: 202, gap: 38 }
// Per-export heading rhythm - the space after a heading (twips) and the
// width of its rule (eighths of a point) - reassigned the same way.
let HEADING = { after: HEADING_AFTER, rule: RULE_PER_PX }
// Whether the section being built puts the date ahead of the title
// (sectionSettings.dateAlign). Reassigned at the top of every section, like
// the sizes above: every entry builder feeds the one titleDate, so the
// alternative is an eighth positional argument on all of them.
let DATE_LEFT = false
// The column a left-placed date hands the title, in twips, measured from the
// widest date the section prints and reassigned with DATE_LEFT. A fixed
// column was an inch wide whatever the date said: a long month name or a
// bigger base size ran past the single tab stop, Word fell back to its own
// default grid, and the titles of one section landed at different offsets
// down the page.
const DATE_COL_MIN = 1500
const DATE_COL_MAX = 4320
// The air between the date and the title it hands the line to.
const DATE_COL_GAP = 140
let DATE_COL = DATE_COL_MIN

/**
 * How wide a column the longest of these strings needs, in twips. Word does
 * its own measuring and this export cannot ask it, so estimate the way type
 * behaves: a proportional face averages about half its point size per
 * character. The date prints at SIZE.date half-points, so a string of n
 * characters wants n * (SIZE.date / 2) * 0.5 * 20 twips - that is n * SIZE.date
 * * 5 - plus the gap. Floored so a short date still clears the title and
 * capped so a long one cannot eat the page.
 */
function dateColumnFor(strings: Array<string | undefined>): number {
  const longest = strings.reduce((n, s) => Math.max(n, (s || '').length), 0)
  const need = Math.round(longest * SIZE.date * 5) + DATE_COL_GAP
  return Math.min(DATE_COL_MAX, Math.max(DATE_COL_MIN, need))
}

const has = (s?: string) => !!s && htmlToText(s).length > 0

/** Color context for one column (main vs shaded sidebar). */
interface Ctx {
  accent: string // headings + rules
  body: string // item text
  muted: string // sub-lines, dates
  headFont: string
  /** how section titles are cased; unset prints them as typed */
  headingCase: HeadingCase | undefined
  /** the name and the section titles in bold (the export's stock weight) */
  nameBold: boolean
  headingBold: boolean
  prof: string // proficiency meter style
  bullet: string // bullet marker style
  /** The five element colours: each the author's own, or the colour this
   *  export always printed that element in (elementColors.ts). */
  name: string
  headline: string
  heading: string // section titles and their rule
  contact: string
  link: string
  /** A linked contact stays on the contact line's colour when one is set,
   *  as it does on the page; otherwise the accent, never the link colour. */
  contactLink: string
}

function toHex(c: string | undefined, fallback: string): string {
  if (!c) return fallback
  let s = c.trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(s))
    s = s
      .split('')
      .map((x) => x + x)
      .join('')
  return /^[0-9a-fA-F]{6}$/.test(s) ? s.toUpperCase() : fallback
}

/** Mix a hex color toward another (0..1) — used to dim sidebar muted text. */
/** Whether this export writes live hyperlinks. Set per export, like SIZE.
 *  The PDF has always honoured the author's clickable switch - annotations
 *  are skipped, ink unchanged - and the Word file ignored it, so choosing
 *  "not clickable" produced a dead-text PDF and a fully live .docx. */
let LINKS_LIVE = true
/** The author's link colour for links inside rich text, set per export like
 *  LINKS_LIVE; unset, an inline link keeps the colour of the text around it,
 *  as this export always printed it. */
let LINK_COLOR: string | undefined

function inlineRuns(node: Node, color: string, bold = false, italics = false, size: number = SIZE.body): ParagraphChild[] {
  const runs: ParagraphChild[] = []
  node.childNodes.forEach((child) => {
    if (child.nodeType === 3) {
      const t = child.textContent ?? ''
      if (t) runs.push(new TextRun({ text: t, bold, italics, color, size }))
      return
    }
    if (child.nodeType !== 1) return
    const el = child as HTMLElement
    const tag = el.tagName.toLowerCase()
    if (tag === 'br') {
      runs.push(new TextRun({ text: '', break: 1 }))
      return
    }
    // An inline link made on the canvas is a real hyperlink here too - it
    // used to flatten to its words alone, so the Word copy lost the address.
    if (tag === 'a') {
      const href = LINKS_LIVE ? safeHref(el.getAttribute('href') || '') : undefined
      const inner = inlineRuns(el, LINK_COLOR ?? color, bold, italics, size)
      if (href && inner.length) {
        runs.push(new ExternalHyperlink({ children: inner, link: href }))
        return
      }
    }
    runs.push(...inlineRuns(el, color, bold || tag === 'strong' || tag === 'b', italics || tag === 'em' || tag === 'i', size))
  })
  return runs
}
function richToRuns(html: string, color: string, size: number = SIZE.body): ParagraphChild[] {
  const tmp = document.createElement('div')
  tmp.innerHTML = sanitizeHtml(html)
  const runs = inlineRuns(tmp, color, false, false, size)
  return runs.length ? runs : [new TextRun({ text: htmlToText(html), color, size })]
}
function richToBlocks(html: string, color: string): ParagraphChild[][] {
  const tmp = document.createElement('div')
  tmp.innerHTML = sanitizeHtml(html)
  const blockTags = new Set(['P', 'DIV', 'UL', 'OL', 'LI'])
  const tops = Array.from(tmp.children).filter((c) => blockTags.has(c.tagName))
  if (!tops.length) {
    const runs = inlineRuns(tmp, color)
    return runs.length ? [runs] : []
  }
  const blocks: ParagraphChild[][] = []
  const collect = (el: Element) => {
    if (el.tagName === 'UL' || el.tagName === 'OL') Array.from(el.children).forEach(collect)
    else {
      const runs = inlineRuns(el, color)
      if (runs.length) blocks.push(runs)
    }
  }
  tops.forEach(collect)
  return blocks
}

/** 0–5 rating → filled/empty unicode glyphs in the column colors. */
function meterRuns(rating: number, style: string, filled: string, empty: string): TextRun[] {
  const pair = style === 'stars' ? ['★', '☆'] : style === 'bars' ? ['▰', '▱'] : ['●', '○']
  const out: TextRun[] = []
  const r = Math.max(0, Math.min(5, Math.round(rating)))
  if (r > 0) out.push(new TextRun({ text: pair[0].repeat(r), color: filled, size: SIZE.body }))
  if (5 - r > 0) out.push(new TextRun({ text: pair[1].repeat(5 - r), color: empty, size: SIZE.body }))
  return out
}

/* ------------------------------------------------------- paragraph builders */

const heading = (label: string, C: Ctx, align?: 'left' | 'center') =>
  new Paragraph({
    // A centred section centres its heading, as the page does; the air under
    // it and the weight of its rule are the document's (HEADING).
    ...(align === 'center' ? { alignment: AlignmentType.CENTER } : {}),
    spacing: { before: 200, after: HEADING.after },
    // The rule under a title is drawn in the title's colour, as the page's
    // currentColor border is.
    border: { bottom: { style: BorderStyle.SINGLE, size: HEADING.rule, color: C.heading, space: 3 } },
    children: [
      // Case is decoration, never text: upper rewrites the run the way the
      // page's text-transform does, small caps is a run property Word draws
      // itself, and the words stay as typed for any reader of the file.
      new TextRun({
        text: C.headingCase === 'upper' ? label.toUpperCase() : label,
        ...(C.headingBold ? { bold: true } : {}),
        ...(C.headingCase === 'smallcaps' ? { smallCaps: true } : {}),
        color: C.heading,
        size: SIZE.section,
        font: C.headFont,
      }),
    ],
  })
// The lead line of an entry, bold unless the section stresses the line
// under it instead (entryEmphasis): then this one prints plain and the
// sub-line takes the bold, as the page swaps the two weights.
const titleDate = (
  title: string,
  date: string | undefined,
  C: Ctx,
  width: number,
  opts: IParagraphOptions = {},
  url?: string,
  bold = true
) => {
  const titleRun = new TextRun({ text: title, ...(bold ? { bold: true } : {}), color: C.body, size: SIZE.title })
  // A linked title is a hyperlink here for the same reason it is one in the
  // PDF: the page made its own title the link, so the Word copy does too.
  const href = url && LINKS_LIVE ? safeHref(url) : undefined
  const titleChild: ParagraphChild = href ? new ExternalHyperlink({ children: [titleRun], link: href }) : titleRun
  // The date takes the side the section gives it (dateAlign): the right edge
  // on a right tab, as this export always set it, or its own column ahead of
  // the title on a left one, which is where the page puts it.
  const dateFirst = DATE_LEFT && !!date
  const kids: ParagraphChild[] = dateFirst
    ? [new TextRun({ text: `${date}\t`, color: C.muted, size: SIZE.date }), titleChild]
    : [titleChild, ...(date ? [new TextRun({ text: `\t${date}`, color: C.muted, size: SIZE.date })] : [])]
  return new Paragraph({
    spacing: { before: 110, after: 8 },
    tabStops: date
      ? [dateFirst ? { type: TabStopType.LEFT, position: DATE_COL } : { type: TabStopType.RIGHT, position: width }]
      : undefined,
    // A hanging indent the width of the column, so a title that wraps keeps
    // its second line in the title column instead of falling back under the
    // date - which is what the page's flex row does with it.
    ...(dateFirst ? { indent: { left: DATE_COL, hanging: DATE_COL } } : {}),
    children: kids,
    ...opts,
  })
}
/**
 * A link, the way the page prints it: the author's own words, and a real
 * hyperlink behind them when there is an address.
 *
 * The Word file used to print URLs as coloured text that nothing could click,
 * and it ignored the display name entirely - a site named Portfolio came out
 * as myportfolio.com/work, and a project's further links and a credential's
 * Verify were not there at all.
 */
const linkRun = (
  url: string | undefined,
  words: string,
  C: Ctx,
  size: number = SIZE.sub,
  color: string = C.link
): ParagraphChild => {
  const run = new TextRun({ text: words, color, size, underline: {} })
  // With links off the words keep their look and lose only the liveness -
  // the same deal the PDF gives them.
  const href = LINKS_LIVE ? safeHref(url) : undefined
  return href ? new ExternalHyperlink({ children: [run], link: href }) : run
}

/** The short Verify a credential line ends with, when it has one. */
const verifyPara = (url: string | undefined, urlLabel: string | undefined, C: Ctx): Paragraph[] => {
  const words = (urlLabel || '').trim()
  if (!words || !safeHref(url)) return []
  return [new Paragraph({ spacing: { after: 16 }, children: [linkRun(url, words, C)] })]
}

/**
 * What "keep entries whole" (page.keepEntriesWhole, or a section's own
 * keepTogether) can say in Word.
 *
 * Word holds paragraphs together one link at a time - keepNext binds a
 * paragraph to the one BELOW it, and there is no "hold this group" - so a
 * whole entry could only be held by flagging every paragraph in it, and the
 * flag on its last line would bind it to the NEXT entry and chain a section
 * into one unbreakable block. So the flag goes where the split shows: an
 * entry's head lines hold the body under them, and a page break can never
 * leave a title, or a title and its sub-line, alone at the foot of a page.
 * keepLines comes with it, so a head line that wraps is not split either.
 * The page's own engine holds the whole entry (walk.ts).
 */
const KEEP_HEAD: IParagraphOptions = { keepNext: true, keepLines: true }
const keepHead = (on: boolean): IParagraphOptions => (on ? KEEP_HEAD : {})

const sub = (s: string, C: Ctx, bold = false, keep = false) =>
  new Paragraph({
    spacing: { after: 16 },
    ...keepHead(keep),
    children: [new TextRun({ text: s, italics: true, ...(bold ? { bold: true } : {}), color: C.muted, size: SIZE.sub })],
  })
const para = (runs: ParagraphChild[]) => new Paragraph({ spacing: { after: 36 }, children: runs })
const summaryParas = (html: string, C: Ctx) => richToBlocks(html, C.body).map(para)
// The page hangs an outside marker in the list's indent and sets the text at
// the indent; Word gets the same distance as a hanging indent. With no marker
// the text still sits at the indent, as it does on the page.
// The bullet gap sits BETWEEN bullets, as it does on the page: the list's own
// air, not air after the list. Given to every bullet it also spaced the LAST
// one, so a list set with a roomy gap pushed the next entry down by that much
// again - a distance nothing on the canvas showed. The last bullet of a list
// takes the small trailing value a bullet always took instead.
const BULLET_TRAILING = 16
const bulletPara = (html: string, C: Ctx, last: boolean) => {
  const after = last ? BULLET_TRAILING : BULLET.gap
  return C.bullet === 'none'
    ? new Paragraph({
        indent: { left: BULLET.indent },
        spacing: { after },
        children: richToRuns(html, C.body),
      })
    : new Paragraph({
        bullet: { level: 0 },
        indent: { left: BULLET.indent, hanging: BULLET.indent },
        spacing: { after },
        children: richToRuns(html, C.body),
      })
}
const bulletsOf = (items: string[], C: Ctx) => {
  const shown = items.filter((h) => htmlToText(h).length > 0)
  return shown.map((h, i) => bulletPara(h, C, i === shown.length - 1))
}

/* ------------------------------------------------------------------ photo */

function decodePhoto(dataUrl?: string): { data: Uint8Array; type: 'jpg' | 'png' } | null {
  if (!dataUrl) return null
  const m = dataUrl.match(/^data:image\/([a-zA-Z]+);base64,([A-Za-z0-9+/=]+)$/)
  if (!m) return null
  const mime = m[1].toLowerCase()
  const type = mime === 'png' ? 'png' : mime === 'jpeg' || mime === 'jpg' ? 'jpg' : null
  if (!type) return null // skip svg/webp — not embeddable in OOXML
  try {
    const bin = atob(m[2])
    const data = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i)
    return { data, type }
  } catch {
    return null
  }
}
function photoParagraph(
  doc: ResumeDocument,
  sizePx: number,
  align: (typeof AlignmentType)[keyof typeof AlignmentType]
): Paragraph | null {
  if (!doc.metadata.layout.showPhoto) return null
  const decoded = decodePhoto(doc.content.basics.image)
  if (!decoded) return null
  return new Paragraph({
    alignment: align,
    spacing: { after: 120 },
    children: [
      new ImageRun({ data: decoded.data, type: decoded.type, transformation: { width: sizePx, height: sizePx } }),
    ],
  })
}

/* -------------------------------------------------------- section builder */

function buildSections(keys: string[], doc: ResumeDocument, C: Ctx, width: number): Paragraph[] {
  const { content } = doc
  const out: Paragraph[] = []
  const b = doc.content.basics
  const meter = C.prof === 'dots' || C.prof === 'bars' || C.prof === 'stars'
  // Today, once for the whole file, so every open-ended range counts to the
  // same month the page counted to.
  const now = currentYearMonth()

  for (const key of keys) {
    const label = sectionLabel(key, doc)
    // How the document's dates read, plus the section's own time-span switch.
    const settings = doc.metadata.layout.sectionSettings?.[key]
    const dates = sectionDateOptions(settings, now, doc.metadata.dates)
    const align = settings?.headingAlign
    // Which field leads each entry and which is bold, as on the page: the
    // lead takes the date line, the other the sub-line under it. The lead
    // falls back to the other field so a half-filled entry still has a
    // title, and the sub-line never repeats it.
    const order = entryOrderOf(settings)
    const orgFirst = order.lead === 'org'
    const leadBold = order.lead === order.bold
    // Whether this section's entries must not be torn across a page break -
    // the document's switch until the section decides for itself, the same
    // answer the page reads (KEEP_HEAD says what Word can do with it).
    const keepEntries = keepEntriesOn(doc.metadata.page, settings)
    // Where the location prints and which side the date sits on. With the
    // two sharing the head row the location leads the tabbed string, exactly
    // as it leads the date slot on the page, and it leaves the sub-line.
    const meta = entryMetaOf(settings)
    DATE_LEFT = meta.dateLeft
    const placed = (loc: string | undefined, date: string) =>
      meta.locWithDate && loc ? [loc, date].filter(Boolean).join(LOCATION_DATE_SEPARATOR) : date
    /** The location, when the section leaves it on the sub-line. */
    const onSub = (loc: string | undefined) => (meta.locWithDate ? '' : loc || '')
    /** Every string this section hands the tab, gathered before the first
     *  paragraph is built so one column serves the whole section: a title
     *  lands at the same offset whether its own date reads "2022" or
     *  "September 2019 - December 2021". */
    const tabbedDates = (): string[] => {
      const range = (a?: string, b?: string) => formatDateRange(a, b, dates)
      switch (key) {
        case 'work':
          return content.work.map((w) => placed(w.location, range(w.startDate, w.endDate)))
        case 'education':
          return content.education.map((e) => placed(e.location, range(e.startDate, e.endDate)))
        case 'projects':
          return content.projects.map((p) => range(p.startDate, p.endDate))
        case 'volunteer':
          return content.volunteer.map((v) => range(v.startDate, v.endDate))
        case 'certificates':
          return content.certificates.map((c) => formatDate(c.date, dates))
        case 'awards':
          return content.awards.map((a) => formatDate(a.date, dates))
        case 'publications':
          return content.publications.map((p) => formatDate(p.releaseDate, dates))
        default:
          return (content.custom.find((c) => `custom-${c.id}` === key)?.items ?? []).map((it) =>
            placed(it.location, formatDate(it.date, dates))
          )
      }
    }
    DATE_COL = meta.dateLeft ? dateColumnFor(tabbedDates()) : DATE_COL_MIN
    if (key === 'summary') {
      if (!has(b.summary)) continue
      out.push(heading(label, C, align), ...summaryParas(b.summary!, C))
    } else if (key === 'work') {
      out.push(heading(label, C, align))
      for (const w of content.work) {
        const [lead, under] = orgFirst ? [w.name, w.position] : [w.position, w.name]
        const s = [lead && under ? under : '', onSub(w.location)].filter(Boolean).join('  ·  ')
        const body = [...(has(w.summary) ? summaryParas(w.summary!, C) : []), ...bulletsOf(w.highlights ?? [], C)]
        out.push(titleDate(lead || under || 'Role', placed(w.location, formatDateRange(w.startDate, w.endDate, dates)), C, width, keepHead(keepEntries && (!!s || body.length > 0)), w.url, leadBold))
        if (s) out.push(sub(s, C, !leadBold, keepEntries && body.length > 0))
        out.push(...body)
      }
    } else if (key === 'education') {
      out.push(heading(label, C, align))
      for (const e of content.education) {
        // The degree leads by default, as it does on the page (this export
        // used to lead with the institution whatever the page showed).
        const degree = [e.studyType, e.area].filter(Boolean).join(', ')
        const [lead, under] = orgFirst ? [e.institution, degree] : [degree, e.institution]
        // The location joins the sub-line here as it does on the page; this
        // export used to print it in neither slot.
        const line = [lead && under ? under : '', onSub(e.location), e.score].filter(Boolean).join('  ·  ')
        const body: Paragraph[] = []
        if (e.courses?.length)
          body.push(
            new Paragraph({
              spacing: { after: 24 },
              children: [new TextRun({ text: e.courses.join('  ·  '), color: C.muted, size: SIZE.sub })],
            })
          )
        if (has(e.summary)) body.push(...summaryParas(e.summary!, C))
        out.push(titleDate(lead || under || 'Institution', placed(e.location, formatDateRange(e.startDate, e.endDate, dates)), C, width, keepHead(keepEntries && (!!line || body.length > 0)), e.url, leadBold))
        if (line) out.push(sub(line, C, !leadBold, keepEntries && body.length > 0))
        out.push(...body)
      }
    } else if (key === 'projects') {
      out.push(heading(label, C, align))
      for (const p of content.projects) {
        // Anything at all under the title is body enough to hold it to.
        const hasBody =
          !!p.url ||
          has(p.description) ||
          (p.links ?? []).some((l) => (l.url || '').trim() || (l.label || '').trim()) ||
          (p.highlights ?? []).some((h) => htmlToText(h).length > 0) ||
          !!p.keywords?.length
        out.push(titleDate(p.name || 'Project', formatDateRange(p.startDate, p.endDate, dates), C, width, keepHead(keepEntries && hasBody), p.url))
        if (p.url)
          out.push(
            new Paragraph({
              spacing: { after: 24 },
              children: [linkRun(p.url, prettyUrl(p.url, doc.metadata.links?.display), C)],
            })
          )
        if (has(p.description))
          out.push(
            new Paragraph({ spacing: { after: 16 }, children: richToRuns(p.description, C.muted, SIZE.sub) })
          )
        {
          const named = (p.links ?? []).filter((l) => (l.url || '').trim() || (l.label || '').trim())
          if (named.length)
            out.push(
              new Paragraph({
                spacing: { after: 24 },
                children: named.flatMap((l, li) => [
                  ...(li > 0 ? [new TextRun({ text: '  ·  ', color: C.muted, size: SIZE.sub })] : []),
                  linkRun(l.url, linkWords(l.url, l.label, 'short') || prettyUrl(l.url), C),
                ]),
              })
            )
        }
        out.push(...bulletsOf(p.highlights ?? [], C))
        if (p.keywords?.length)
          out.push(
            new Paragraph({
              spacing: { after: 30 },
              children: [new TextRun({ text: p.keywords.join('  ·  '), color: C.muted, size: SIZE.sub })],
            })
          )
      }
    } else if (key === 'skills') {
      out.push(heading(label, C, align))
      for (const g of content.skills) {
        const hasKw = !!g.keywords?.length
        if (!hasKw && typeof g.rating === 'number' && meter) {
          out.push(
            new Paragraph({
              spacing: { after: 30 },
              children: [
                new TextRun({ text: `${g.name}\t`, bold: true, color: C.body, size: SIZE.body }),
                ...meterRuns(g.rating, C.prof, C.accent, C.muted),
              ],
              tabStops: [{ type: TabStopType.RIGHT, position: width }],
            })
          )
        } else {
          const kids: ParagraphChild[] = []
          if (g.name) kids.push(new TextRun({ text: `${g.name}:  `, bold: true, color: C.body, size: SIZE.body }))
          kids.push(new TextRun({ text: (g.keywords ?? []).join('   ·   '), color: C.body, size: SIZE.body }))
          out.push(new Paragraph({ spacing: { after: 36 }, children: kids }))
        }
      }
    } else if (key === 'languages') {
      out.push(heading(label, C, align))
      for (const l of content.languages) {
        if (typeof l.rating === 'number' && meter) {
          out.push(
            new Paragraph({
              spacing: { after: 28 },
              children: [
                new TextRun({ text: `${l.language}\t`, bold: true, color: C.body, size: SIZE.body }),
                ...meterRuns(l.rating, C.prof, C.accent, C.muted),
              ],
              tabStops: [{ type: TabStopType.RIGHT, position: width }],
            })
          )
        } else {
          const kids: ParagraphChild[] = [
            new TextRun({ text: l.language || '', bold: true, color: C.body, size: SIZE.body }),
          ]
          if (l.fluency && C.prof !== 'none')
            kids.push(new TextRun({ text: `  —  ${l.fluency}`, color: C.muted, size: SIZE.sub }))
          out.push(new Paragraph({ spacing: { after: 28 }, children: kids }))
        }
      }
    } else if (key === 'certificates') {
      out.push(heading(label, C, align))
      for (const c of content.certificates) {
        const verify = verifyPara(c.url, c.urlLabel, C)
        out.push(titleDate([c.name, c.issuer].filter(Boolean).join('  —  '), formatDate(c.date, dates), C, width, keepHead(keepEntries && verify.length > 0), (c.urlLabel || '').trim() ? undefined : c.url))
        out.push(...verify)
      }
    } else if (key === 'awards') {
      out.push(heading(label, C, align))
      for (const a of content.awards) {
        const body = [...verifyPara(a.url, a.urlLabel, C), ...(has(a.summary) ? summaryParas(a.summary, C) : [])]
        out.push(titleDate([a.title, a.awarder].filter(Boolean).join('  —  '), formatDate(a.date, dates), C, width, keepHead(keepEntries && body.length > 0), (a.urlLabel || '').trim() ? undefined : a.url))
        out.push(...body)
      }
    } else if (key === 'publications') {
      out.push(heading(label, C, align))
      for (const p of content.publications) {
        const body = has(p.summary) ? summaryParas(p.summary, C) : []
        out.push(titleDate([p.name, p.publisher].filter(Boolean).join('  —  '), formatDate(p.releaseDate, dates), C, width, keepHead(keepEntries && body.length > 0), p.url))
        out.push(...body)
      }
    } else if (key === 'volunteer') {
      out.push(heading(label, C, align))
      for (const v of content.volunteer) {
        const [lead, under] = orgFirst ? [v.organization, v.position] : [v.position, v.organization]
        const body = [...(has(v.summary) ? summaryParas(v.summary, C) : []), ...bulletsOf(v.highlights ?? [], C)]
        const subLine = lead && under ? under : ''
        out.push(titleDate(lead || under || 'Role', formatDateRange(v.startDate, v.endDate, dates), C, width, keepHead(keepEntries && (!!subLine || body.length > 0)), v.url, leadBold))
        if (subLine) out.push(sub(subLine, C, !leadBold, keepEntries && body.length > 0))
        out.push(...body)
      }
    } else if (key === 'interests') {
      out.push(heading(label, C, align))
      for (const it of content.interests) {
        const kids: ParagraphChild[] = [
          new TextRun({ text: it.name || '', bold: true, color: C.body, size: SIZE.body }),
        ]
        if (it.keywords?.length)
          kids.push(new TextRun({ text: `:  ${it.keywords.join(', ')}`, color: C.muted, size: SIZE.sub }))
        out.push(new Paragraph({ spacing: { after: 28 }, children: kids }))
      }
    } else if (key === 'references') {
      out.push(heading(label, C, align))
      for (const r of content.references) {
        if (r.name)
          out.push(
            new Paragraph({
              spacing: { after: 4 },
              ...keepHead(keepEntries && !!r.reference),
              children: [new TextRun({ text: r.name, bold: true, color: C.body, size: SIZE.body })],
            })
          )
        if (r.reference) out.push(sub(r.reference, C))
      }
    } else if (key.startsWith('custom-')) {
      const id = key.slice('custom-'.length)
      const section = content.custom.find((c) => c.id === id)
      if (!section || !section.items.length) continue
      out.push(heading(label, C, align))
      for (const it of section.items) {
        // The subtitle stands in for the organisation; neither falls back to
        // the other, as neither does on the page.
        const [lead, under] = orgFirst ? [it.subtitle, it.name] : [it.name, it.subtitle]
        const s = [under, onSub(it.location)].filter(Boolean).join('  ·  ')
        const body = [...(has(it.summary) ? summaryParas(it.summary, C) : []), ...bulletsOf(it.highlights ?? [], C)]
        out.push(titleDate(lead || '', placed(it.location, formatDate(it.date, dates)), C, width, keepHead(keepEntries && (!!s || body.length > 0)), it.url, leadBold))
        if (s) out.push(sub(s, C, !leadBold, keepEntries && body.length > 0))
        out.push(...body)
      }
    }
  }
  return out
}

function buildHeader(doc: ResumeDocument, C: Ctx, separator: string): Paragraph[] {
  const b = doc.content.basics
  const out: Paragraph[] = [
    new Paragraph({
      spacing: { after: 20 },
      children: [
        new TextRun({
          text: b.name || 'Your Name',
          ...(C.nameBold ? { bold: true } : {}),
          color: C.name,
          size: SIZE.name,
          font: C.headFont,
        }),
      ],
    }),
  ]
  if (b.label)
    out.push(
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun({ text: b.label, color: C.headline, size: SIZE.headline, font: C.headFont })],
      })
    )
  // Each contact carries its own destination, so the reader can click the word
  // Linkedin in Word the way they can in the PDF. They used to be flattened
  // into one string, which meant one plain run and nothing to click.
  const contacts: Array<{ words: string; url?: string }> = []
  const email = cleanEmail(b.email)
  if (email) contacts.push({ words: email, url: `mailto:${email}` })
  if (b.phone) contacts.push({ words: b.phone, url: `tel:${b.phone.replace(/[^\d+]/g, '')}` })
  const loc = [b.location?.city, b.location?.region].filter(Boolean).join(', ')
  if (loc) contacts.push({ words: loc })
  // The author's display choice applies wherever a URL is SHOWN, not just in
  // the PDF - a Word export that ignores it contradicts the document it came
  // from.
  const linkDisplay = doc.metadata.links?.display
  if (b.url) contacts.push({ words: linkWords(b.url, b.urlLabel, linkDisplay), url: b.url })
  for (const p of b.profiles ?? []) {
    const handle = linkWords(p.url, p.label, linkDisplay) || p.username
    if (handle && p.network) contacts.push({ words: `${p.network}: ${handle}`, url: p.url })
    else if (handle || p.network) contacts.push({ words: handle || p.network, url: p.url })
  }
  const shown = contacts.filter((c) => c.words)
  // What sits between two contacts is the author's choice, printed with the
  // glyph the page draws. A bullet used to be hard-coded here whatever the
  // canvas showed.
  if (shown.length)
    out.push(
      new Paragraph({
        spacing: { after: 100 },
        children: shown.flatMap((c, i) => [
          ...(i > 0 ? [new TextRun({ text: separator, color: C.contact, size: SIZE.contact })] : []),
          c.url && LINKS_LIVE && safeHref(c.url)
            ? linkRun(c.url, c.words, C, SIZE.contact, C.contactLink)
            : new TextRun({ text: c.words, color: C.contact, size: SIZE.contact }),
        ]),
      })
    )
  return out
}

/* --------------------------------------------------------- the export itself */

/** The Word document itself, before packing - built from the document's own
 *  metrics (docxMetrics) so a test can open it and read them back. */
export function buildDocx(doc: ResumeDocument, fitScale = 1): Document {
  const { metadata } = doc
  LINKS_LIVE = metadata.links?.clickable !== false
  const metrics = docxMetrics(metadata, fitScale)
  SIZE = metrics.sizes
  BULLET = { indent: metrics.bulletIndent, gap: metrics.bulletGap }
  HEADING = { after: metrics.headingGap, rule: metrics.headingRule }
  // Sections set this as they are built; the header is built first and has
  // no entries, so it starts from the side the page always used.
  DATE_LEFT = false
  const primary = toHex(metadata.theme.primary, '2563EB')
  const text = toHex(metadata.theme.text, '1A1A1A')
  const muted = toHex(metadata.theme.muted, '5B6472')
  const background = toHex(metadata.theme.background, 'FFFFFF')
  // Each element's own colour, falling back to the colour this export always
  // printed it in: the name, the headline, the section titles and the links
  // in the accent, the contacts in the muted colour. A linked contact is a
  // contact first, as on the page (`.rm-contacts a { color: inherit }`): it
  // takes the contact colour when one is set and is never moved by the link
  // colour, so with links set and contacts unset it stays in the accent.
  const { theme } = metadata
  const link = toHex(theme.links, primary)
  const elementColors = {
    name: toHex(theme.name, primary),
    headline: toHex(theme.headline, primary),
    heading: toHex(theme.headings, primary),
    contact: toHex(theme.contacts, muted),
    link,
    contactLink: toHex(theme.contacts, primary),
  }
  // Rich-text links keep the surrounding colour unless the author chose one.
  LINK_COLOR = theme.links ? link : undefined
  const bodyFont = metadata.typography.fontFamily || 'Calibri'
  const headFont = metadata.typography.headingFamily || bodyFont
  const t = metadata.typography
  const prof = t.proficiency
  const bulletStyle = t.bulletStyle
  // The same answer the canvas draws from (typeStyle.ts). A weight the
  // author never chose keeps the bold this export always printed.
  const nameBold = (t.nameWeight ?? 'bold') === 'bold'
  const headingBold = (t.headingWeight ?? 'bold') === 'bold'

  const page = metadata.page.format === 'Letter' ? TWIP.letter : TWIP.a4
  const order = resolveOrder(doc)
  const contentW = page.w - metrics.margin * 2

  const mainCtx: Ctx = {
    accent: primary,
    body: text,
    muted,
    headFont,
    headingCase: headingCase(t),
    nameBold,
    headingBold,
    prof,
    bullet: bulletStyle,
    ...elementColors,
  }

  // ALWAYS a single column, whatever the template's on-screen layout
  // (2026-08-23). The Word export used to mirror a two-column template with a
  // Word TABLE, which broke the two things this format exists for:
  //
  //  - Reading order. A left-sidebar template put the sidebar cell first, so
  //    the file opened with "SKILLS | Languages: | TypeScript ..." and an ATS
  //    read a keyword list before the candidate's name. Measured on the real
  //    export, same defect the PDF text layer had (readingOrder.ts).
  //  - Parseability. Table layout is the classic ATS failure: parsers walk
  //    cells in their own order, or drop them. Our own per-ATS simulator warns
  //    users about exactly this in their resume design.
  //
  // The PDF carries the design; the .docx is the safe, linear copy the README
  // promises ("a clean, single-column, ATS-friendly Word document"). Sidebar
  // sections keep their content and simply follow the main column, rendered in
  // the MAIN colour context — sidebar text colours are chosen to sit on a dark
  // band and would be unreadable on white paper.
  const photo = photoParagraph(doc, 120, AlignmentType.LEFT)
  const body: (Paragraph | Table)[] = [
    ...(photo ? [photo] : []),
    ...buildHeader(doc, mainCtx, metrics.separator),
    ...buildSections([...order.main, ...order.aside], doc, mainCtx, contentW),
  ]

  const { margin, line } = metrics
  return new Document({
    creator: 'CVAurum',
    title: doc.title,
    description: 'Resume exported from CVAurum',
    background: { color: background },
    styles: {
      default: {
        document: { run: { font: bodyFont, size: SIZE.body, color: text }, paragraph: { spacing: { line } } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: page.w, height: page.h },
            margin: { top: margin, right: margin, bottom: margin, left: margin },
          },
        },
        children: body,
      },
    ],
  })
}

export async function exportDocumentDocx(doc: ResumeDocument, filename?: string, fitScale = 1) {
  const blob = await Packer.toBlob(buildDocx(doc, fitScale))
  downloadBlob(blob, filename || resumeFilename(doc.content.basics.name, doc.title, 'docx'))
}
