/**
 * Paints a `DrawOp[]` (produced by `./walk`) into a real pdf-lib page: vector
 * rects/lines, embedded-original-bytes images, and embedded-font text runs.
 *
 * No rasterisation anywhere — text stays true vector via embedded fonts, and
 * images embed their source bytes unmodified (never re-encoded/resized), only
 * *drawn* at the box size. That's what keeps the exported PDF's text layer
 * clean, which is the whole reason this renderer exists (see GitHub issue #4).
 */
import {
  rgb,
  setCharacterSpacing,
  type PDFImage,
  type PDFPage,
} from 'pdf-lib'
import type { Path as FontkitPath } from '@pdf-lib/fontkit'
import { pxToPt, flipY } from './units'
import type { DrawOp, TextRun } from './types'
import type { PdfFontCache } from './fonts'

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47]
const JPEG_MAGIC = [0xff, 0xd8, 0xff]

function hasMagic(bytes: Uint8Array, magic: number[]): boolean {
  return magic.every((b, i) => bytes[i] === b)
}

/** Rounded-rect SVG path in PDF user space, drawn from the TOP-left corner
 *  (drawSvgPath's y axis points down from the given origin). A radius that's
 *  at least half the shorter side collapses to a stadium/circle, which is how
 *  chips, the GPA pill, and proficiency dots (all `border-radius: 9999px` in
 *  CSS) fall out of the same code — no separate "is this a circle" branch. */
function roundedRectPath(w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, h / 2)
  return `M ${rr} 0 H ${w - rr} A ${rr} ${rr} 0 0 1 ${w} ${rr} V ${h - rr} ` +
         `A ${rr} ${rr} 0 0 1 ${w - rr} ${h} H ${rr} ` +
         `A ${rr} ${rr} 0 0 1 0 ${h - rr} V ${rr} A ${rr} ${rr} 0 0 1 ${rr} 0 Z`
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
 * Draws a DECORATIVE text run (SVG logo monogram marks, CSS
 * `::before`/`::after`/`::marker` separator and bullet glyphs — see
 * `TextRun.isDecorative` in types.ts) as vector glyph outlines instead of a
 * real PDF text-showing operator, so the mark stays pixel-identical without
 * ever entering the extractable text layer an ATS reads (task-10b brief,
 * defect B — a logo's monogram letter was showing up mid-sentence in real
 * résumé content, e.g. "EXPERIENCE V Senior Software Engineer").
 *
 * fontkit (already registered on the document for real-text font embedding)
 * exposes each glyph's outline (`glyph.path`) in FONT units with a y-UP axis
 * (baseline at y=0, ascenders positive — verified empirically against a real
 * embedded .ttf, not assumed). `page.drawSvgPath` expects an SVG-style y-DOWN
 * local space that it flips back to PDF's y-up itself via a `scale(1, -1)`
 * around the given (x, y) anchor (verified by reading pdf-lib's
 * `operations.js`), so `glyphPathToDrawPath` only needs to negate y (and
 * scale) — never flip x — before handing coordinates to drawSvgPath.
 */
async function paintGlyphOutlines(page: PDFPage, run: TextRun, fonts: PdfFontCache, pageHeightPt: number): Promise<void> {
  const font = await fonts.embedGlyphOutlines(run.family, run.weight)
  const glyphRun = font.layout(run.text)
  const scale = pxToPt(run.sizePx) / font.unitsPerEm
  const color = rgb(run.color.r, run.color.g, run.color.b)
  const baseX = pxToPt(run.xPx)
  const baseY = flipY(pxToPt(run.baselinePx), pageHeightPt)
  const letterSpacingPt = pxToPt(run.letterSpacingPx)

  let cursor = 0
  for (let i = 0; i < glyphRun.glyphs.length; i++) {
    const glyph = glyphRun.glyphs[i]
    const pos = glyphRun.positions[i]
    const d = glyphPathToDrawPath(glyph.path, scale)
    if (d) {
      page.drawSvgPath(d, {
        x: baseX + cursor + pos.xOffset * scale,
        y: baseY + pos.yOffset * scale,
        color,
        opacity: run.color.a,
      })
    }
    cursor += pos.xAdvance * scale + letterSpacingPt
  }
}

const round3 = (n: number): number => Math.round(n * 1000) / 1000

/**
 * Replays a fontkit glyph `Path` (font units, y-up) via its own
 * `toFunction()` API into an SVG path data string in the y-down local space
 * `drawSvgPath` expects, scaled by `size / unitsPerEm`. Exported for testing
 * against a real embedded font — fontkit works on raw bytes with no DOM or
 * network needed, so this is verifiable in plain Node.
 */
export function glyphPathToDrawPath(path: FontkitPath, scale: number): string {
  const cmds: string[] = []
  const x = (v: number) => round3(v * scale)
  const y = (v: number) => round3(-v * scale)
  path.toFunction()({
    moveTo: (px: number, py: number) => cmds.push(`M ${x(px)} ${y(py)}`),
    lineTo: (px: number, py: number) => cmds.push(`L ${x(px)} ${y(py)}`),
    quadraticCurveTo: (cpx: number, cpy: number, px: number, py: number) =>
      cmds.push(`Q ${x(cpx)} ${y(cpy)} ${x(px)} ${y(py)}`),
    bezierCurveTo: (c1x: number, c1y: number, c2x: number, c2y: number, px: number, py: number) =>
      cmds.push(`C ${x(c1x)} ${y(c1y)} ${x(c2x)} ${y(c2y)} ${x(px)} ${y(py)}`),
    closePath: () => cmds.push('Z'),
  })
  return cmds.join(' ')
}

/**
 * Paints every op onto `page`. Never throws for a single bad rect/line/image
 * op — but a text op's font resolution (`fonts.embed`) is NEVER swallowed:
 * any error there (missing font, or a genuine embed failure) propagates out
 * of `paintOps`. A resume that silently lost its text is not a "mostly
 * successful" export — it's a blank page masquerading as one, and the
 * caller's print-export fallback exists exactly to catch that case.
 * DECORATIVE text (see `isDecorative`) is tolerant like every other cosmetic
 * op: losing a logo's monogram letter is not the same class of failure as
 * losing résumé content.
 */
export async function paintOps(page: PDFPage, ops: DrawOp[], fonts: PdfFontCache, pageHeightPt: number): Promise<void> {
  const images = new Map<string, Promise<PDFImage | null>>()

  for (const op of ops) {
    if (op.kind === 'text' && !op.run.isDecorative) {
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
        case 'text': {
          // Reached only for isDecorative runs (real content is handled,
          // and `continue`s past this switch, above).
          await paintGlyphOutlines(page, op.run, fonts, pageHeightPt)
          break
        }
        case 'rect': {
          if (!op.fill || op.fill.a <= 0) break
          const color = rgb(op.fill.r, op.fill.g, op.fill.b)
          if (op.radiusPx && op.radiusPx > 0.5) {
            // drawSvgPath's origin is the TOP-left with y increasing downward,
            // unlike drawRectangle's bottom-left-with-height origin — flip
            // against the box's TOP edge (yPx), not yPx + hPx.
            page.drawSvgPath(roundedRectPath(pxToPt(op.wPx), pxToPt(op.hPx), pxToPt(op.radiusPx)), {
              x: pxToPt(op.xPx),
              y: flipY(pxToPt(op.yPx), pageHeightPt),
              color,
              opacity: op.fill.a,
            })
          } else {
            page.drawRectangle({
              x: pxToPt(op.xPx),
              y: flipY(pxToPt(op.yPx + op.hPx), pageHeightPt),
              width: pxToPt(op.wPx),
              height: pxToPt(op.hPx),
              color,
              opacity: op.fill.a,
            })
          }
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
