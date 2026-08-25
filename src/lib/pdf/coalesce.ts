import type { DrawOp, TextRun } from './types'

type TextOp = Extract<DrawOp, { kind: 'text' }>

/**
 * How far apart two runs may sit and still count as one continuous stretch of
 * text.
 *
 * Runs that came from adjacent DOM text nodes are flush - the next one starts
 * where the last ended - but rounding through client rects moves the seam by a
 * fraction of a pixel. Anything wider than that is a real gap: the space
 * between a title and its right-aligned date is hundreds of pixels, and that
 * gap is exactly what column detection keys on. Absorbing it would glue a
 * two-column row into one run.
 */
const SEAM_TOLERANCE_PX = 0.75

/** Same font, same colour, same everything that would make two runs paint
 *  differently - anything else must stay a separate run. */
function sameStyle(a: TextRun, b: TextRun): boolean {
  return (
    a.family === b.family &&
    a.weight === b.weight &&
    a.italic === b.italic &&
    a.sizePx === b.sizePx &&
    a.letterSpacingPx === b.letterSpacingPx &&
    a.smallCapsScale === b.smallCapsScale &&
    a.isDecorative === b.isDecorative &&
    // Decoration is RULED by the painter rather than drawn by the font, so two
    // runs differing only in underline or strike look identical to every other
    // test here. Merging them keeps the first run's flags and silently drops
    // the rest - which is exactly how an underline applied on the canvas
    // vanished from the export.
    !!a.underline === !!b.underline &&
    !!a.lineThrough === !!b.lineThrough &&
    a.color.r === b.color.r &&
    a.color.g === b.color.g &&
    a.color.b === b.color.b &&
    a.color.a === b.color.a
  )
}

function joinable(prev: TextOp, next: TextOp): boolean {
  if (prev.role !== next.role || prev.column !== next.column || prev.blockId !== next.blockId) return false
  const a = prev.run
  const b = next.run
  if (Math.abs(a.baselinePx - b.baselinePx) > 0.1) return false
  if (!sameStyle(a, b)) return false
  const seam = b.xPx - (a.xPx + a.widthPx)
  return seam >= -SEAM_TOLERANCE_PX && seam <= SEAM_TOLERANCE_PX
}

/**
 * Merges runs that are one continuous stretch of text back into a single run.
 *
 * Every span in the print DOM costs a text node, and every text node becomes
 * its own PDF text item. Keeping words whole across line breaks needs a lot of
 * them, so one skills line arrived as thirteen items - "Distributed Systems",
 * " ", "-", " ", "Machine Learning" and so on. Readers that rebuild lines from
 * item positions treat the seams between those items as gaps, and enough gaps
 * in a row read as a column boundary: it cost one template a phantom third
 * column and an entire work entry on import.
 *
 * Merging is by geometry, not by DOM: runs join only when the next one begins
 * exactly where the last ended, on the same baseline, in the same style and
 * the same logical block. A title and its right-aligned date are hundreds of
 * pixels apart and stay two runs, so real columns still read as columns.
 */
export function coalesceTextOps(ops: DrawOp[]): DrawOp[] {
  const out: DrawOp[] = []
  for (const op of ops) {
    const prev = out[out.length - 1]
    if (op.kind === 'text' && prev?.kind === 'text' && joinable(prev, op)) {
      const merged: TextOp = {
        ...prev,
        run: {
          ...prev.run,
          text: prev.run.text + op.run.text,
          // Span the pair end to end: a sub-pixel seam is absorbed into the
          // width, which is what the painter scales the glyphs to fit.
          widthPx: op.run.xPx + op.run.widthPx - prev.run.xPx,
        },
      }
      out[out.length - 1] = merged
      continue
    }
    out.push(op)
  }
  return out
}
