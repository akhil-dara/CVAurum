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
import { resolveOrder, sectionLabel } from '@/lib/sections'
import { sanitizeHtml } from '@/lib/sanitize'
import { downloadBlob, formatDate, formatDateRange, htmlToText, resumeFilename } from '@/lib/utils'
import { prettyUrl, cleanEmail } from '@/templates/_shared/atoms'

/* ----------------------------------------------------------------- helpers */

const TWIP = {
  a4: { w: 11906, h: 16838 },
  letter: { w: 12240, h: 15840 },
  margin: 1080, // 0.75 inch
}
const BASE_SIZE = { name: 46, headline: 24, section: 21, title: 21, body: 20, sub: 18, date: 18 }
// Per-export font sizes (half-points). Reassigned at the top of every export so
// the .docx can shrink by the same one-page fit the live preview/PDF uses —
// otherwise a resume the PDF squeezes onto one page spills onto a 2nd Word page.
// Safe as module state: exports run one at a time and build synchronously.
let SIZE = BASE_SIZE

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
function inlineRuns(node: Node, color: string, bold = false, italics = false): TextRun[] {
  const runs: TextRun[] = []
  node.childNodes.forEach((child) => {
    if (child.nodeType === 3) {
      const t = child.textContent ?? ''
      if (t) runs.push(new TextRun({ text: t, bold, italics, color, size: SIZE.body }))
      return
    }
    if (child.nodeType !== 1) return
    const el = child as HTMLElement
    const tag = el.tagName.toLowerCase()
    if (tag === 'br') {
      runs.push(new TextRun({ text: '', break: 1 }))
      return
    }
    runs.push(...inlineRuns(el, color, bold || tag === 'strong' || tag === 'b', italics || tag === 'em' || tag === 'i'))
  })
  return runs
}
function richToRuns(html: string, color: string): TextRun[] {
  const tmp = document.createElement('div')
  tmp.innerHTML = sanitizeHtml(html)
  const runs = inlineRuns(tmp, color)
  return runs.length ? runs : [new TextRun({ text: htmlToText(html), color, size: SIZE.body })]
}
function richToBlocks(html: string, color: string): TextRun[][] {
  const tmp = document.createElement('div')
  tmp.innerHTML = sanitizeHtml(html)
  const blockTags = new Set(['P', 'DIV', 'UL', 'OL', 'LI'])
  const tops = Array.from(tmp.children).filter((c) => blockTags.has(c.tagName))
  if (!tops.length) {
    const runs = inlineRuns(tmp, color)
    return runs.length ? [runs] : []
  }
  const blocks: TextRun[][] = []
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
const titleDate = (title: string, date: string | undefined, C: Ctx, width: number, opts: IParagraphOptions = {}) => {
  const kids: ParagraphChild[] = [new TextRun({ text: title, bold: true, color: C.body, size: SIZE.title })]
  if (date) kids.push(new TextRun({ text: `\t${date}`, color: C.muted, size: SIZE.date }))
  return new Paragraph({
    spacing: { before: 110, after: 8 },
    tabStops: date ? [{ type: TabStopType.RIGHT, position: width }] : undefined,
    children: kids,
    ...opts,
  })
}
const sub = (s: string, C: Ctx) =>
  new Paragraph({
    spacing: { after: 16 },
    children: [new TextRun({ text: s, italics: true, color: C.muted, size: SIZE.sub })],
  })
const para = (runs: TextRun[]) => new Paragraph({ spacing: { after: 36 }, children: runs })
const summaryParas = (html: string, C: Ctx) => richToBlocks(html, C.body).map(para)
const bulletPara = (html: string, C: Ctx) =>
  C.bullet === 'none'
    ? new Paragraph({ indent: { left: 180 }, spacing: { after: 16 }, children: richToRuns(html, C.body) })
    : new Paragraph({ bullet: { level: 0 }, spacing: { after: 16 }, children: richToRuns(html, C.body) })
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

  for (const key of keys) {
    const label = sectionLabel(key, doc)
    if (key === 'summary') {
      if (!has(b.summary)) continue
      out.push(heading(label, C), ...summaryParas(b.summary!, C))
    } else if (key === 'work') {
      out.push(heading(label, C))
      for (const w of content.work) {
        out.push(titleDate(w.position || w.name || 'Role', formatDateRange(w.startDate, w.endDate), C, width))
        const s = [w.name && w.position ? w.name : '', w.location].filter(Boolean).join('  ·  ')
        if (s) out.push(sub(s, C))
        if (has(w.summary)) out.push(...summaryParas(w.summary!, C))
        out.push(...bulletsOf(w.highlights ?? [], C))
      }
    } else if (key === 'education') {
      out.push(heading(label, C))
      for (const e of content.education) {
        out.push(titleDate(e.institution || 'Institution', formatDateRange(e.startDate, e.endDate), C, width))
        const line = [[e.studyType, e.area].filter(Boolean).join(', '), e.score].filter(Boolean).join('  ·  ')
        if (line) out.push(sub(line, C))
        if (has(e.summary)) out.push(...summaryParas(e.summary!, C))
      }
    } else if (key === 'projects') {
      out.push(heading(label, C))
      for (const p of content.projects) {
        out.push(titleDate(p.name || 'Project', formatDateRange(p.startDate, p.endDate), C, width))
        if (p.url)
          out.push(
            new Paragraph({
              spacing: { after: 24 },
              children: [
                new TextRun({ text: prettyUrl(p.url, doc.metadata.links?.display), color: C.accent, size: SIZE.sub }),
              ],
            })
          )
        if (p.description) out.push(sub(p.description, C))
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
      for (const c of content.certificates)
        out.push(titleDate([c.name, c.issuer].filter(Boolean).join('  —  '), formatDate(c.date), C, width))
    } else if (key === 'awards') {
      out.push(heading(label, C))
      for (const a of content.awards) {
        out.push(titleDate([a.title, a.awarder].filter(Boolean).join('  —  '), formatDate(a.date), C, width))
        if (has(a.summary)) out.push(...summaryParas(a.summary, C))
      }
    } else if (key === 'publications') {
      out.push(heading(label, C))
      for (const p of content.publications) {
        out.push(titleDate([p.name, p.publisher].filter(Boolean).join('  —  '), formatDate(p.releaseDate), C, width))
        if (has(p.summary)) out.push(...summaryParas(p.summary, C))
      }
    } else if (key === 'volunteer') {
      out.push(heading(label, C))
      for (const v of content.volunteer) {
        out.push(titleDate(v.position || v.organization || 'Role', formatDateRange(v.startDate, v.endDate), C, width))
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
        out.push(titleDate(it.name || '', formatDate(it.date), C, width))
        const s = [it.subtitle, it.location].filter(Boolean).join('  ·  ')
        if (s) out.push(sub(s, C))
        if (has(it.summary)) out.push(...summaryParas(it.summary, C))
        out.push(...bulletsOf(it.highlights ?? [], C))
      }
    }
  }
  return out
}

function buildHeader(doc: ResumeDocument, C: Ctx): Paragraph[] {
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
  const contacts: string[] = []
  const email = cleanEmail(b.email)
  if (email) contacts.push(email)
  if (b.phone) contacts.push(b.phone)
  const loc = [b.location?.city, b.location?.region].filter(Boolean).join(', ')
  if (loc) contacts.push(loc)
  // The author's display choice applies wherever a URL is SHOWN, not just in
  // the PDF - a Word export that ignores it contradicts the document it came
  // from.
  const linkDisplay = doc.metadata.links?.display
  if (b.url) contacts.push(prettyUrl(b.url, linkDisplay))
  for (const p of b.profiles ?? []) {
    const handle = p.username || prettyUrl(p.url, linkDisplay)
    if (handle && p.network) contacts.push(`${p.network}: ${handle}`)
    else if (handle || p.network) contacts.push(handle || p.network)
  }
  if (contacts.length)
    out.push(
      new Paragraph({
        spacing: { after: 100 },
        children: [new TextRun({ text: contacts.join('   •   '), color: C.muted, size: SIZE.sub })],
      })
    )
  return out
}

/* --------------------------------------------------------- the export itself */

export async function exportDocumentDocx(doc: ResumeDocument, filename?: string, fitScale = 1) {
  const { metadata } = doc
  // Apply the live one-page fit so the Word doc lands on the same page count as
  // the PDF. Clamp to the same floor the on-screen fit uses (never unreadable).
  const scale = Math.min(1, Math.max(0.66, fitScale || 1))
  SIZE =
    scale === 1
      ? BASE_SIZE
      : (Object.fromEntries(Object.entries(BASE_SIZE).map(([k, v]) => [k, Math.round(v * scale)])) as typeof BASE_SIZE)
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
  const contentW = page.w - TWIP.margin * 2

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
    ...buildHeader(doc, mainCtx),
    ...buildSections([...order.main, ...order.aside], doc, mainCtx, contentW),
  ]

  const document = new Document({
    creator: 'CVAurum',
    title: doc.title,
    description: 'Resume exported from CVAurum',
    background: { color: background },
    styles: {
      default: {
        document: { run: { font: bodyFont, size: SIZE.body, color: text }, paragraph: { spacing: { line: 252 } } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: page.w, height: page.h },
            margin: { top: TWIP.margin, right: TWIP.margin, bottom: TWIP.margin, left: TWIP.margin },
          },
        },
        children: body,
      },
    ],
  })

  const blob = await Packer.toBlob(document)
  downloadBlob(blob, filename || resumeFilename(doc.content.basics.name, doc.title, 'docx'))
}
