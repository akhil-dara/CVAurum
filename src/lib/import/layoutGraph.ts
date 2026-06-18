/**
 * Layout-graph extraction for the local PDF import engine.
 *
 * Treat the PDF as geometry, not a text stream: pdf.js gives every glyph run an
 * (x, y), width, height and font. We then:
 *   1. detect a column gutter per page (so two-column resumes don't interleave),
 *   2. assign each run to a column band,
 *   3. group runs → lines (shared baseline, within a column),
 *   4. order lines in human reading order (full-width header, then each column
 *      top→bottom), and expose body font size + line gap for downstream logic.
 *
 * Pages with no usable text layer (scanned, image-only, or subset fonts with no
 * ToUnicode map) are detected per-page and routed to an in-browser OCR fallback
 * (./ocr) whose word boxes re-enter this same pipeline. Everything runs locally;
 * pdf.js is lazy-loaded and hardened (isEvalSupported:false).
 */
import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

export interface Item {
  str: string
  x: number
  top: number
  width: number
  height: number
  bold: boolean
  page: number
  col: 0 | 1 | 2 // 0 = full-width/single, 1 = left column, 2 = right column
}

export interface Line {
  text: string
  items: Item[]
  x: number
  right: number
  top: number
  height: number
  bold: boolean
  upper: boolean
  page: number
  col: 0 | 1 | 2
}

export interface LayoutGraph {
  lines: Line[]
  bodySize: number
  lineGap: number
  pageCount: number
  charCount: number
  twoColumn: boolean
  /** 1-based page numbers that were recovered via OCR. */
  ocrPages: number[]
}

export interface BuildOptions {
  /** Run the OCR fallback on no-text/garbled pages (default true). */
  ocr?: boolean
  /** Progress for the (slow) OCR phase, so the UI can keep the user informed. */
  onOcrProgress?: (info: { page: number; pages: number; ratio: number }) => void
}

const BOLD_RE = /bold|black|heavy|semibold|w[5-9]00/i

/** A glyph pdf.js couldn't map to real Unicode (no ToUnicode): PUA / replacement / control. */
const isGibberishChar = (c: string): boolean => {
  const cp = c.codePointAt(0) ?? 0
  return (
    cp === 0xfffd || // replacement char
    (cp >= 0xe000 && cp <= 0xf8ff) || // Private Use Area
    (cp >= 0xf0000 && cp <= 0xffffd) || // Supplementary PUA-A
    (cp < 0x20 && cp !== 0x09 && cp !== 0x0a) // control (keep tab/newline)
  )
}
/** Count characters that represent real, readable text (drives the OCR router). */
const usableLen = (s: string): number => {
  let n = 0
  for (const c of s) if (!/\s/.test(c) && !isGibberishChar(c)) n++
  return n
}

interface PageText {
  num: number
  items: Item[]
  /** real readable chars on the page (excludes whitespace + unmapped glyphs) */
  usable: number
  /** total non-whitespace chars (to spot a high gibberish ratio) */
  total: number
}

async function readTextLayer(
  doc: pdfjsLib.PDFDocumentProxy,
): Promise<{ pages: PageText[]; pageWidth: Map<number, number> }> {
  const pages: PageText[] = []
  const pageWidth = new Map<number, number>()
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const viewport = page.getViewport({ scale: 1 })
    pageWidth.set(p, viewport.width)
    const tc = await page.getTextContent()
    const styles = tc.styles as Record<string, { fontFamily?: string }>
    const items: Item[] = []
    let usable = 0
    let total = 0
    for (const raw of tc.items as Array<Record<string, unknown>>) {
      const str = String(raw.str ?? '')
      if (!str.trim()) continue
      const t = raw.transform as number[]
      const fam = styles[String(raw.fontName)]?.fontFamily ?? ''
      usable += usableLen(str)
      total += str.replace(/\s/g, '').length
      items.push({
        str,
        x: t[4],
        top: viewport.height - t[5],
        width: Math.abs((raw.width as number) || 0),
        height: Math.abs((raw.height as number) || Math.hypot(t[2], t[3]) || 0),
        bold: BOLD_RE.test(fam) || BOLD_RE.test(String(raw.fontName)),
        page: p,
        col: 0,
      })
    }
    pages.push({ num: p, items, usable, total })
    page.cleanup()
  }
  return { pages, pageWidth }
}

/**
 * A page needs OCR when its text layer is effectively unreadable:
 *  - almost no real text (scanned / image-only page), or
 *  - plenty of glyphs but most are unmapped gibberish (subset font, no ToUnicode).
 */
function pageNeedsOcr(pt: PageText): boolean {
  if (pt.usable < 40) return true
  if (pt.total >= 60 && pt.usable / pt.total < 0.6) return true
  return false
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

/**
 * Undo CSS letter-spacing / tracking that surfaces as single spaces between
 * glyphs — premium templates (incl. CVAurum's own export) track headings, so
 * "SUMMARY" arrives as "S U M M A RY" and would otherwise defeat heading
 * detection. Only fires when a line is dominated by single-character tokens, so
 * ordinary prose is untouched. A genuine word break in tracked text appears as
 * 2+ spaces ("W O R K  E X P E R I E N C E") and is preserved.
 */
function collapseTracking(text: string): string {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length < 4) return text
  const singleAlpha = words.filter((w) => w.length === 1 && /[A-Za-z]/.test(w)).length
  if (singleAlpha / words.length < 0.6) return text
  // Split on word breaks (2+ spaces), strip intra-letter spaces from each run,
  // rejoin with one space: "W O R K  E X P" -> "WORK EXP", "S U M M A RY" -> "SUMMARY".
  return text
    .split(/ {2,}/)
    .map((run) => run.replace(/ /g, ''))
    .join(' ')
}

/**
 * Find a clean vertical gutter that splits a page's items into two columns.
 * A good gutter has (almost) no item straddling it and substantial text on both
 * sides. Returns the x position, or null for single-column pages.
 */
function detectGutter(items: Item[], width: number): number | null {
  if (items.length < 20 || width <= 0) return null
  let best: number | null = null
  let bestStraddle = Infinity
  for (let frac = 0.3; frac <= 0.62; frac += 0.02) {
    const c = width * frac
    let straddle = 0,
      left = 0,
      right = 0
    for (const it of items) {
      if (it.x < c - 2 && it.x + it.width > c + 2) straddle++
      else if (it.x + it.width <= c) left++
      else right++
    }
    if (left < items.length * 0.2 || right < items.length * 0.2) continue // both sides must be populated
    if (straddle <= items.length * 0.03 && straddle < bestStraddle) {
      bestStraddle = straddle
      best = c
    }
  }
  return best
}

/** Tag each item with its column (per page). Returns whether any page is 2-col. */
function assignColumns(items: Item[], pageWidth: Map<number, number>): boolean {
  let any = false
  const byPage = new Map<number, Item[]>()
  for (const it of items) (byPage.get(it.page) ?? byPage.set(it.page, []).get(it.page)!).push(it)
  for (const [page, pageItems] of byPage) {
    const gutter = detectGutter(pageItems, pageWidth.get(page) ?? 0)
    if (gutter == null) continue
    // A full-width band sits above the columns (header) — keep it col 0 so it
    // isn't split. Everything below the first two-column row is columnar.
    any = true
    for (const it of pageItems) {
      const center = it.x + it.width / 2
      const straddles = it.x < gutter - 2 && it.x + it.width > gutter + 2
      it.col = straddles ? 0 : center < gutter ? 1 : 2
    }
  }
  return any
}

function buildLines(items: Item[]): Line[] {
  // Reading order: page, then column (full-width header first, then L, then R),
  // then top, then x.
  items.sort((a, b) => a.page - b.page || a.col - b.col || a.top - b.top || a.x - b.x)

  const lines: Line[] = []
  let cur: Item[] = []
  const flush = () => {
    if (!cur.length) return
    const ordered = [...cur].sort((a, b) => a.x - b.x)
    const totalChars = ordered.reduce((n, it) => n + it.str.length, 0) || 1
    const avgCharW = ordered.reduce((w, it) => w + it.width, 0) / totalChars || 4
    let text = ''
    let prevRight = -Infinity
    for (const it of ordered) {
      if (prevRight !== -Infinity) {
        const gap = it.x - prevRight
        // pdf.js often emits a word-space as a small gap between two items rather
        // than a space glyph; ~0.3·charWidth reliably separates real word spaces
        // (≈0.4–0.6) from intra-word kerning (≈0–0.15). Never insert one before
        // closing punctuation, or where a space already exists.
        const startsPunct = /^[\s,.;:!?)\]}%/]/.test(it.str)
        const hasSpace = /\s$/.test(text) || /^\s/.test(it.str)
        if (gap > avgCharW * 0.3 && !hasSpace && !startsPunct) text += ' '
      }
      text += it.str
      prevRight = it.x + it.width
    }
    // Collapse letter-spacing BEFORE squashing whitespace (a real word break in
    // tracked text shows up as 2+ spaces, which collapseTracking preserves).
    text = collapseTracking(text.trim()).replace(/\s+/g, ' ').trim()
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
        col: ordered[0].col,
      })
    }
    cur = []
  }

  let lastTop = -Infinity
  let lastKey = ''
  let lastH = 0
  for (const it of items) {
    const key = `${it.page}:${it.col}`
    const sameLine = key === lastKey && Math.abs(it.top - lastTop) <= Math.max(3, (lastH || it.height) * 0.5)
    if (!sameLine && cur.length) flush()
    cur.push(it)
    if (key !== lastKey || it.top < lastTop || cur.length === 1) {
      lastTop = it.top
      lastH = it.height
      lastKey = key
    }
  }
  flush()
  lines.sort((a, b) => a.page - b.page || a.col - b.col || a.top - b.top || a.x - b.x)
  return lines
}

function assemble(items: Item[], pageWidth: Map<number, number>, pageCount: number, ocrPages: number[]): LayoutGraph {
  const twoColumn = assignColumns(items, pageWidth)
  const lines = buildLines(items)
  const bodyLines = lines.filter((l) => l.text.length > 12)
  const bodySize = median((bodyLines.length ? bodyLines : lines).map((l) => l.height)) || 10
  const gaps: number[] = []
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].page === lines[i - 1].page && lines[i].col === lines[i - 1].col) {
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
    twoColumn,
    ocrPages,
  }
}

export async function buildLayoutGraph(file: File | ArrayBuffer, opts: BuildOptions = {}): Promise<LayoutGraph> {
  const data = file instanceof ArrayBuffer ? file : await file.arrayBuffer()
  const doc = await pdfjsLib.getDocument({
    data: data.slice(0),
    isEvalSupported: false,
    disableFontFace: true,
    useSystemFonts: false,
  }).promise

  // Capture page count up front — reading it after destroy() is undefined behaviour.
  const pageCount = doc.numPages

  try {
    const { pages, pageWidth } = await readTextLayer(doc)
    const items: Item[] = pages.flatMap((p) => p.items)

    // Route unreadable pages through OCR (lazy-loaded; only touched if needed).
    const ocrPages: number[] = []
    if (opts.ocr !== false) {
      const needy = pages.filter(pageNeedsOcr)
      if (needy.length) {
        const { ocrPage, disposeOcr } = await import('./ocr')
        try {
          for (let i = 0; i < needy.length; i++) {
            const pt = needy[i]
            const page = await doc.getPage(pt.num)
            const got = await ocrPage(page, pt.num, (ratio) =>
              opts.onOcrProgress?.({ page: i + 1, pages: needy.length, ratio }),
            )
            page.cleanup()
            if (got.length) {
              // OCR fully replaces this page's (unreadable) native items.
              for (let j = items.length - 1; j >= 0; j--) if (items[j].page === pt.num) items.splice(j, 1)
              items.push(...got)
              ocrPages.push(pt.num)
            }
          }
        } finally {
          await disposeOcr()
        }
      }
    }

    return assemble(items, pageWidth, pageCount, ocrPages)
  } finally {
    doc.destroy()
  }
}
