import type { LayoutGraph } from '@/lib/import/layoutGraph'
import type { ResumeContent } from '@/types/document'

/**
 * What a dropped PDF is like as a FILE: the part of an ATS check that the
 * words cannot answer.
 *
 * A résumé made in the editor is exported by this product, so its file is
 * known good and these questions are never asked of it. A PDF someone brings
 * from elsewhere is the opposite case: its words may be fine and its file
 * unreadable. Everything here is measured from the file itself while it is
 * imported (src/lib/import/layoutGraph.ts keeps the evidence before the
 * importer repairs it), and read by the file rules in src/lib/ats.ts.
 */
export interface FileFacts {
  fileName: string
  pageCount: number
  pageSizes: { w: number; h: number }[]
  /** Pages with no usable text layer: pictures of text, read here by OCR. */
  scannedPages: number[]
  textChars: number
  unmappedChars: number
  /** Letter-spaced lines, as a parser reads them and as they were meant. */
  tracked: { raw: string; text: string }[]
  twoColumn: boolean
  /** One row of the page read straight across both columns, which is what a
   *  parser that does not look for columns produces. */
  acrossExample?: { left: string; right: string }
  /** Where the email (or phone) line sits. */
  contact: 'top' | 'sidebar' | 'lower' | 'missing'
  /** A picture on page one the size and shape of a head-and-shoulders photo. */
  photo: boolean
  /** The median size of the running text, in points. */
  bodyPt: number
  /** The text in the order this reader recovered it, for the report to show. */
  text: string
}

const clip = (s: string, n = 70) => (s.length <= n ? s : `${s.slice(0, n).replace(/\s+\S*$/, '')}…`)

/** The first row on a two-column page where both columns carry a real line
 *  at the same height: the row a column-blind parser would merge. */
function acrossRow(graph: LayoutGraph): FileFacts['acrossExample'] {
  if (!graph.twoColumn) return undefined
  // Lines long enough to be content on both sides: a short label beside a
  // link line proves less than two sentences running into each other.
  const lines = graph.lines.filter((l) => l.col !== 0 && l.text.length >= 14 && /[a-z]{3,}.*\s.*[a-z]{3,}/i.test(l.text))
  for (const a of lines) {
    if (a.col !== 1) continue
    const b = lines.find((l) => l.col === 2 && l.page === a.page && Math.abs(l.top - a.top) < Math.max(2, a.height * 0.4))
    if (b) return { left: clip(a.text, 48), right: clip(b.text, 48) }
  }
  return undefined
}

function contactPlace(graph: LayoutGraph, content: ResumeContent): FileFacts['contact'] {
  const email = content.basics.email?.trim().toLowerCase()
  const digits = (content.basics.phone ?? '').replace(/\D/g, '')
  const line = graph.lines.find((l) => {
    const t = l.text.toLowerCase()
    if (email && t.replace(/\s+/g, '').includes(email)) return true
    return digits.length >= 7 && t.replace(/\D/g, '').includes(digits)
  })
  if (!line) return 'missing'
  if (graph.twoColumn && line.aside) return 'sidebar'
  const h = graph.file?.pageSizes[line.page - 1]?.h ?? 842
  return line.page === 1 && line.top < h * 0.3 ? 'top' : 'lower'
}

/** A head-and-shoulders picture: on page one, between half an inch and four
 *  inches on a side, no wider than it is tall by much. Entry logos are far
 *  smaller; a full-page scan is far bigger. */
function hasPhoto(graph: LayoutGraph): boolean {
  return (graph.file?.images ?? []).some(
    (im) => im.page === 1 && im.w >= 36 && im.h >= 36 && im.w <= 300 && im.h <= 300 && im.w / im.h >= 0.6 && im.w / im.h <= 1.35
  )
}

export function measureFile(graph: LayoutGraph, content: ResumeContent, fileName: string): FileFacts {
  const ev = graph.file
  // A letter-spaced line is worth reporting when the spacing splits words -
  // the repaired text must hold a word the raw text does not.
  const tracked = (ev?.tracked ?? []).filter((t) => t.raw !== t.text && /[A-Za-z]{3,}/.test(t.text)).map((t) => ({ raw: clip(t.raw, 60), text: t.text }))
  return {
    fileName,
    pageCount: graph.pageCount,
    pageSizes: ev?.pageSizes ?? [],
    scannedPages: graph.ocrPages,
    textChars: ev?.textChars ?? graph.charCount,
    unmappedChars: ev?.unmappedChars ?? 0,
    tracked,
    twoColumn: graph.twoColumn,
    acrossExample: acrossRow(graph),
    contact: contactPlace(graph, content),
    photo: hasPhoto(graph),
    bodyPt: Math.round(graph.bodySize * 10) / 10,
    text: graph.lines.map((l) => l.text).join('\n'),
  }
}
