/**
 * Paints a `DrawOp[]` (produced by `./walk`) into a real pdf-lib page: vector
 * rects/lines, embedded-original-bytes images, and embedded-font text runs.
 *
 * No rasterisation anywhere — text stays true vector via embedded fonts, and
 * images embed their source bytes unmodified (never re-encoded/resized), only
 * *drawn* at the box size. That's what keeps the exported PDF's text layer
 * clean, which is the whole reason this renderer exists (see GitHub issue #4).
 */
import { rgb, setCharacterSpacing, type PDFImage, type PDFPage } from 'pdf-lib'
import { pxToPt, flipY } from './units'
import type { DrawOp } from './types'
import type { PdfFontCache } from './fonts'

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47]
const JPEG_MAGIC = [0xff, 0xd8, 0xff]

function hasMagic(bytes: Uint8Array, magic: number[]): boolean {
  return magic.every((b, i) => bytes[i] === b)
}

/** Fetches `src`, embeds its ORIGINAL bytes (no re-encode/resize), once per src. */
async function embedImage(page: PDFPage, src: string, cache: Map<string, Promise<PDFImage | null>>): Promise<PDFImage | null> {
  let pending = cache.get(src)
  if (!pending) {
    pending = (async () => {
      try {
        const res = await fetch(src)
        if (!res.ok) return null
        const bytes = new Uint8Array(await res.arrayBuffer())
        if (hasMagic(bytes, PNG_MAGIC)) return await page.doc.embedPng(bytes)
        if (hasMagic(bytes, JPEG_MAGIC)) return await page.doc.embedJpg(bytes)
        return null // neither PNG nor JPEG — skip
      } catch {
        return null // failed to load — skip
      }
    })()
    cache.set(src, pending)
  }
  return pending
}

/**
 * Paints every op onto `page`. Never throws for a single bad rect/line/image
 * op — but a text op's font resolution (`fonts.embed`) is NEVER swallowed:
 * any error there (missing font, or a genuine embed failure) propagates out
 * of `paintOps`. A resume that silently lost its text is not a "mostly
 * successful" export — it's a blank page masquerading as one, and the
 * caller's print-export fallback exists exactly to catch that case.
 */
export async function paintOps(page: PDFPage, ops: DrawOp[], fonts: PdfFontCache, pageHeightPt: number): Promise<void> {
  const images = new Map<string, Promise<PDFImage | null>>()

  for (const op of ops) {
    if (op.kind === 'text') {
      const { run } = op
      // Intentionally OUTSIDE the try/catch below: any failure to embed the
      // font must propagate, not be swallowed as a cosmetic per-op issue.
      const font = await fonts.embed(run.family, run.weight)
      const spacingPt = pxToPt(run.letterSpacingPx)
      try {
        if (spacingPt !== 0) page.pushOperators(setCharacterSpacing(spacingPt))
        page.drawText(run.text, {
          x: pxToPt(run.xPx),
          y: flipY(pxToPt(run.baselinePx), pageHeightPt),
          size: pxToPt(run.sizePx),
          font,
          color: rgb(run.color.r, run.color.g, run.color.b),
          opacity: run.color.a,
        })
      } finally {
        // Always restore Tc to 0, even if drawText threw — otherwise a
        // stale non-zero character spacing would mis-set every run after it.
        if (spacingPt !== 0) page.pushOperators(setCharacterSpacing(0))
      }
      continue
    }

    try {
      switch (op.kind) {
        case 'rect': {
          if (!op.fill || op.fill.a <= 0) break
          page.drawRectangle({
            x: pxToPt(op.xPx),
            y: flipY(pxToPt(op.yPx + op.hPx), pageHeightPt),
            width: pxToPt(op.wPx),
            height: pxToPt(op.hPx),
            color: rgb(op.fill.r, op.fill.g, op.fill.b),
            opacity: op.fill.a,
          })
          break
        }
        case 'line': {
          page.drawLine({
            start: { x: pxToPt(op.x1Px), y: flipY(pxToPt(op.y1Px), pageHeightPt) },
            end: { x: pxToPt(op.x2Px), y: flipY(pxToPt(op.y2Px), pageHeightPt) },
            thickness: pxToPt(op.widthPx),
            color: rgb(op.color.r, op.color.g, op.color.b),
            opacity: op.color.a,
            dashArray: op.dashed ? [pxToPt(2), pxToPt(2)] : undefined,
          })
          break
        }
        case 'image': {
          const img = await embedImage(page, op.src, images)
          if (!img) break
          page.drawImage(img, {
            x: pxToPt(op.xPx),
            y: flipY(pxToPt(op.yPx + op.hPx), pageHeightPt),
            width: pxToPt(op.wPx),
            height: pxToPt(op.hPx),
          })
          break
        }
        case 'svg':
          // Not emitted by the walker yet — nothing to paint.
          break
      }
    } catch {
      // Single bad rect/line/image op is swallowed: it must not sink the
      // whole export the way a lost font would.
    }
  }
}
