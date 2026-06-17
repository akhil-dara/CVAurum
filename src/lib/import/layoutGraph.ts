/**
 * Layout-graph extraction (v1 of the local PDF import engine).
 *
 * We treat the PDF as geometry, not a linear text stream: pdf.js gives every
 * glyph run an (x, y), width, height and font, and we reconstruct
 *   items → words/lines (shared baseline) → blocks (vertical-gap clusters)
 * keeping each node's position, font size and weight. Everything runs in the
 * browser; pdf.js is lazy-loaded (separate chunk) and hardened with
 * isEvalSupported:false. Reading order is top→bottom, left→right; multi-column
 * reading-order (XY-cut) and OCR fallback are layered on in v2.
 */
import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

export interface Item {
  str: string
  x: number // left, in PDF points
  top: number // distance from page top (so smaller = higher) — easier to reason about
  width: number
  height: number // glyph/font height in points
  bold: boolean
  page: number
}

export interface Line {
  text: string
  items: Item[]
  x: number // leftmost
  right: number // rightmost edge
  top: number
  height: number // dominant font size on the line
  bold: boolean // majority of the line is bold
  upper: boolean // text is effectively all-caps
  page: number
}

export interface LayoutGraph {
  lines: Line[]
  /** median body font size — the typographic baseline for heading detection */
  bodySize: number
  /** median gap between consecutive lines — the baseline for block splitting */
  lineGap: number
  pageCount: number
  /** total printable characters extracted — an extractability signal (0 ⇒ needs OCR, a v2 path) */
  charCount: number
}

const BOLD_RE = /bold|black|heavy|semibold|w[5-9]00/i

/** Read every text run from the PDF with its geometry. */
async function readItems(data: ArrayBuffer): Promise<{ items: Item[]; pageCount: number }> {
  const doc = await pdfjsLib.getDocument({
    data,
    isEvalSupported: false, // hardening (CVE-2018-5158)
    disableFontFace: true, // we only need metrics/text, never to render the font
    useSystemFonts: false,
  }).promise

  const items: Item[] = []
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const viewport = page.getViewport({ scale: 1 })
    const tc = await page.getTextContent()
    const styles = tc.styles as Record<string, { fontFamily?: string }>
    for (const raw of tc.items as Array<Record<string, unknown>>) {
      const str = String(raw.str ?? '')
      if (!str) continue
      const t = raw.transform as number[]
      const x = t[4]
      const yBottom = t[5]
      const height = Math.abs((raw.height as number) || Math.hypot(t[2], t[3]) || 0)
      const fam = styles[String(raw.fontName)]?.fontFamily ?? ''
      items.push({
        str,
        x,
        top: viewport.height - yBottom, // top-down
        width: Math.abs((raw.width as number) || 0),
        height,
        bold: BOLD_RE.test(fam) || BOLD_RE.test(String(raw.fontName)),
        page: p,
      })
    }
    page.cleanup()
  }
  doc.destroy()
  return { items, pageCount: doc.numPages }
}

const median = (xs: number[]): number => {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

const isUpper = (s: string): boolean => {
  const letters = s.replace(/[^A-Za-z]/g, '')
  return letters.length >= 2 && letters === letters.toUpperCase()
}

/** Group items into lines (shared baseline) and merge runs with proper spacing. */
function buildLines(items: Item[]): Line[] {
  // Sort into reading order: page, then top (y), then x.
  items.sort((a, b) => a.page - b.page || a.top - b.top || a.x - b.x)

  const lines: Line[] = []
  let cur: Item[] = []
  const flush = () => {
    if (!cur.length) return
    const ordered = [...cur].sort((a, b) => a.x - b.x)
    // average character width on this line → decides whether a gap is a space
    const totalChars = ordered.reduce((n, it) => n + it.str.length, 0) || 1
    const avgCharW = ordered.reduce((w, it) => w + it.width, 0) / totalChars || 4
    let text = ''
    let prevRight = -Infinity
    for (const it of ordered) {
      if (prevRight !== -Infinity) {
        const gap = it.x - prevRight
        if (gap > avgCharW * 0.5 && !/\s$/.test(text)) text += ' '
      }
      text += it.str
      prevRight = it.x + it.width
    }
    text = text.replace(/\s+/g, ' ').trim()
    if (text) {
      const heights = ordered.map((i) => i.height).filter(Boolean)
      const boldChars = ordered.filter((i) => i.bold).reduce((n, i) => n + i.str.length, 0)
      lines.push({
        text,
        items: ordered,
        x: ordered[0].x,
        right: Math.max(...ordered.map((i) => i.x + i.width)),
        top: Math.min(...ordered.map((i) => i.top)),
        height: median(heights) || ordered[0].height,
        bold: boldChars >= totalChars * 0.6,
        upper: isUpper(text),
        page: ordered[0].page,
      })
    }
    cur = []
  }

  let lastTop = -Infinity
  let lastPage = -1
  let lastH = 0
  for (const it of items) {
    const sameLine = it.page === lastPage && Math.abs(it.top - lastTop) <= Math.max(3, (lastH || it.height) * 0.5)
    if (!sameLine && cur.length) flush()
    cur.push(it)
    // track the line's baseline using the tallest run so super/subscripts don't split it
    if (it.page !== lastPage || it.top < lastTop || cur.length === 1) {
      lastTop = it.top
      lastH = it.height
      lastPage = it.page
    }
  }
  flush()
  lines.sort((a, b) => a.page - b.page || a.top - b.top || a.x - b.x)
  return lines
}

/** Build the full layout graph from a PDF file. */
export async function buildLayoutGraph(file: File | ArrayBuffer): Promise<LayoutGraph> {
  const data = file instanceof ArrayBuffer ? file : await file.arrayBuffer()
  // pdf.js detaches the buffer; clone so callers can reuse the file.
  const { items, pageCount } = await readItems(data.slice(0))
  const lines = buildLines(items)
  const bodyLines = lines.filter((l) => l.text.length > 12) // body text, not headings/labels
  const bodySize = median((bodyLines.length ? bodyLines : lines).map((l) => l.height)) || 10
  const gaps: number[] = []
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].page === lines[i - 1].page) {
      const g = lines[i].top - lines[i - 1].top
      if (g > 0 && g < bodySize * 4) gaps.push(g)
    }
  }
  return {
    lines,
    bodySize,
    lineGap: median(gaps) || bodySize * 1.2,
    pageCount,
    charCount: lines.reduce((n, l) => n + l.text.length, 0),
  }
}
