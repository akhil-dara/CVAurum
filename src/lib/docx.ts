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
import type { Metadata } from '@/types/metadata'
import { resolveOrder, sectionLabel } from '@/lib/sections'
import { sanitizeHtml } from '@/lib/sanitize'
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
}

// Word's single spacing already spans the font's own line box - about 1.22em
// for the usual body faces - while the canvas line-height is a bare multiple
// of the type size. Dividing that out keeps the Word leading where the page
// has it: the export's long-standing 252 is exactly 240 * 1.28 / 1.22.
const WORD_LINE_EM = 1.22

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
// name at fs * (1.55 + headingScale * 0.62), section titles at 1.06, entry
// titles at 1.05, sub-lines and contacts at 0.95, dates at 0.92 (Artboard.tsx
// useVars and artboard.css).
function sizesFor(fontSizePt: number, headingScale: number): DocxSizes {
  const hp = (ratio: number) => Math.round(fontSizePt * ratio * 2)
  return {
    name: hp(1.55 + clamp(headingScale, 1, 2.6) * 0.62),
    headline: hp(1.15),
    section: hp(1.06),
    title: hp(1.05),
    body: hp(1),
    sub: hp(0.95),
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
    sizes: sizesFor(t.fontSize * scale, t.headingScale),
    separator: CONTACT_SEPARATOR[metadata.layout.contactSeparator ?? 'none'] ?? CONTACT_SEPARATOR.none,
    bulletIndent: Math.round(t.bulletIndent * em),
    bulletGap: Math.round(t.bulletGap * em),
  }
}

// Per-export font sizes (half-points). Reassigned at the top of every export
// from the document's own base size and one-page fit. Safe as module state:
// exports run one at a time and build synchronously.
let SIZE: DocxSizes = sizesFor(9.6, 1.5)
// Per-export bullet geometry (twips), reassigned the same way.
let BULLET = { indent: 202, gap: 38 }

const has = (s?: string) => !!s && htmlToText(s).length > 0

/** Color context for one column (main vs shaded sidebar). */
interface Ctx {
  accent: string // headings + rules
  body: string // item text
  muted: string // sub-lines, dates
  headFont: string
  upper: boolean
  prof: string // proficiency meter style
  bullet: string // bullet marker style
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
      const inner = inlineRuns(el, color, bold, italics, size)
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

const heading = (label: string, C: Ctx) =>
  new Paragraph({
    spacing: { before: 200, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.accent, space: 3 } },
    children: [
      new TextRun({
        text: C.upper ? label.toUpperCase() : label,
        bold: true,
        color: C.accent,
        size: SIZE.section,
        font: C.headFont,
      }),
    ],
  })
const titleDate = (title: string, date: string | undefined, C: Ctx, width: number, opts: IParagraphOptions = {}, url?: string) => {
  const titleRun = new TextRun({ text: title, bold: true, color: C.body, size: SIZE.title })
  // A linked title is a hyperlink here for the same reason it is one in the
  // PDF: the page made its own title the link, so the Word copy does too.
  const href = url && LINKS_LIVE ? safeHref(url) : undefined
  const kids: ParagraphChild[] = [href ? new ExternalHyperlink({ children: [titleRun], link: href }) : titleRun]
  if (date) kids.push(new TextRun({ text: `\t${date}`, color: C.muted, size: SIZE.date }))
  return new Paragraph({
    spacing: { before: 110, after: 8 },
    tabStops: date ? [{ type: TabStopType.RIGHT, position: width }] : undefined,
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
const linkRun = (url: string | undefined, words: string, C: Ctx, size: number = SIZE.sub): ParagraphChild => {
  const run = new TextRun({ text: words, color: C.accent, size, underline: {} })
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

const sub = (s: string, C: Ctx) =>
  new Paragraph({
    spacing: { after: 16 },
    children: [new TextRun({ text: s, italics: true, color: C.muted, size: SIZE.sub })],
  })
const para = (runs: ParagraphChild[]) => new Paragraph({ spacing: { after: 36 }, children: runs })
const summaryParas = (html: string, C: Ctx) => richToBlocks(html, C.body).map(para)
// The page hangs an outside marker in the list's indent and sets the text at
// the indent; Word gets the same distance as a hanging indent. With no marker
// the text still sits at the indent, as it does on the page.
const bulletPara = (html: string, C: Ctx) =>
  C.bullet === 'none'
    ? new Paragraph({
        indent: { left: BULLET.indent },
        spacing: { after: BULLET.gap },
        children: richToRuns(html, C.body),
      })
    : new Paragraph({
        bullet: { level: 0 },
        indent: { left: BULLET.indent, hanging: BULLET.indent },
        spacing: { after: BULLET.gap },
        children: richToRuns(html, C.body),
      })
const bulletsOf = (items: string[], C: Ctx) =>
  items.filter((h) => htmlToText(h).length > 0).map((h) => bulletPara(h, C))

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
    // The section's own time-span switch; undefined prints the bare range.
    const dates = sectionDateOptions(doc.metadata.layout.sectionSettings?.[key], now)
    if (key === 'summary') {
      if (!has(b.summary)) continue
      out.push(heading(label, C), ...summaryParas(b.summary!, C))
    } else if (key === 'work') {
      out.push(heading(label, C))
      for (const w of content.work) {
        out.push(titleDate(w.position || w.name || 'Role', formatDateRange(w.startDate, w.endDate, dates), C, width, {}, w.url))
        const s = [w.name && w.position ? w.name : '', w.location].filter(Boolean).join('  ·  ')
        if (s) out.push(sub(s, C))
        if (has(w.summary)) out.push(...summaryParas(w.summary!, C))
        out.push(...bulletsOf(w.highlights ?? [], C))
      }
    } else if (key === 'education') {
      out.push(heading(label, C))
      for (const e of content.education) {
        out.push(titleDate(e.institution || 'Institution', formatDateRange(e.startDate, e.endDate, dates), C, width, {}, e.url))
        const line = [[e.studyType, e.area].filter(Boolean).join(', '), e.score].filter(Boolean).join('  ·  ')
        if (line) out.push(sub(line, C))
        if (e.courses?.length)
          out.push(
            new Paragraph({
              spacing: { after: 24 },
              children: [new TextRun({ text: e.courses.join('  ·  '), color: C.muted, size: SIZE.sub })],
            })
          )
        if (has(e.summary)) out.push(...summaryParas(e.summary!, C))
      }
    } else if (key === 'projects') {
      out.push(heading(label, C))
      for (const p of content.projects) {
        out.push(titleDate(p.name || 'Project', formatDateRange(p.startDate, p.endDate, dates), C, width, {}, p.url))
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
      out.push(heading(label, C))
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
      out.push(heading(label, C))
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
      out.push(heading(label, C))
      for (const c of content.certificates) {
        out.push(titleDate([c.name, c.issuer].filter(Boolean).join('  —  '), formatDate(c.date), C, width, {}, (c.urlLabel || '').trim() ? undefined : c.url))
        out.push(...verifyPara(c.url, c.urlLabel, C))
      }
    } else if (key === 'awards') {
      out.push(heading(label, C))
      for (const a of content.awards) {
        out.push(titleDate([a.title, a.awarder].filter(Boolean).join('  —  '), formatDate(a.date), C, width, {}, (a.urlLabel || '').trim() ? undefined : a.url))
        out.push(...verifyPara(a.url, a.urlLabel, C))
        if (has(a.summary)) out.push(...summaryParas(a.summary, C))
      }
    } else if (key === 'publications') {
      out.push(heading(label, C))
      for (const p of content.publications) {
        out.push(titleDate([p.name, p.publisher].filter(Boolean).join('  —  '), formatDate(p.releaseDate), C, width, {}, p.url))
        if (has(p.summary)) out.push(...summaryParas(p.summary, C))
      }
    } else if (key === 'volunteer') {
      out.push(heading(label, C))
      for (const v of content.volunteer) {
        out.push(titleDate(v.position || v.organization || 'Role', formatDateRange(v.startDate, v.endDate, dates), C, width, {}, v.url))
        if (v.position && v.organization) out.push(sub(v.organization, C))
        if (has(v.summary)) out.push(...summaryParas(v.summary, C))
        out.push(...bulletsOf(v.highlights ?? [], C))
      }
    } else if (key === 'interests') {
      out.push(heading(label, C))
      for (const it of content.interests) {
        const kids: ParagraphChild[] = [
          new TextRun({ text: it.name || '', bold: true, color: C.body, size: SIZE.body }),
        ]
        if (it.keywords?.length)
          kids.push(new TextRun({ text: `:  ${it.keywords.join(', ')}`, color: C.muted, size: SIZE.sub }))
        out.push(new Paragraph({ spacing: { after: 28 }, children: kids }))
      }
    } else if (key === 'references') {
      out.push(heading(label, C))
      for (const r of content.references) {
        if (r.name)
          out.push(
            new Paragraph({
              spacing: { after: 4 },
              children: [new TextRun({ text: r.name, bold: true, color: C.body, size: SIZE.body })],
            })
          )
        if (r.reference) out.push(sub(r.reference, C))
      }
    } else if (key.startsWith('custom-')) {
      const id = key.slice('custom-'.length)
      const section = content.custom.find((c) => c.id === id)
      if (!section || !section.items.length) continue
      out.push(heading(label, C))
      for (const it of section.items) {
        out.push(titleDate(it.name || '', formatDate(it.date), C, width, {}, it.url))
        const s = [it.subtitle, it.location].filter(Boolean).join('  ·  ')
        if (s) out.push(sub(s, C))
        if (has(it.summary)) out.push(...summaryParas(it.summary, C))
        out.push(...bulletsOf(it.highlights ?? [], C))
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
        new TextRun({ text: b.name || 'Your Name', bold: true, color: C.accent, size: SIZE.name, font: C.headFont }),
      ],
    }),
  ]
  if (b.label)
    out.push(
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun({ text: b.label, color: C.accent, size: SIZE.headline, font: C.headFont })],
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
          ...(i > 0 ? [new TextRun({ text: separator, color: C.muted, size: SIZE.sub })] : []),
          c.url && LINKS_LIVE && safeHref(c.url)
            ? linkRun(c.url, c.words, C)
            : new TextRun({ text: c.words, color: C.muted, size: SIZE.sub }),
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
  const primary = toHex(metadata.theme.primary, '2563EB')
  const text = toHex(metadata.theme.text, '1A1A1A')
  const muted = toHex(metadata.theme.muted, '5B6472')
  const background = toHex(metadata.theme.background, 'FFFFFF')
  const bodyFont = metadata.typography.fontFamily || 'Calibri'
  const headFont = metadata.typography.headingFamily || bodyFont
  const upper = metadata.typography.uppercaseHeadings
  const prof = metadata.typography.proficiency
  const bulletStyle = metadata.typography.bulletStyle

  const page = metadata.page.format === 'Letter' ? TWIP.letter : TWIP.a4
  const order = resolveOrder(doc)
  const contentW = page.w - metrics.margin * 2

  const mainCtx: Ctx = { accent: primary, body: text, muted, headFont, upper, prof, bullet: bulletStyle }

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
