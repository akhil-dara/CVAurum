/**
 * Public entry point for the direct (non-print-dialog) PDF export: mounts the
 * résumé off-screen using the exact same DOM/CSS the editor and print route
 * use, waits for it to settle (fonts, auto-fit), walks it into a draw list,
 * and paints that list into a real pdf-lib document with embedded vector
 * fonts and original-resolution images. See GitHub issue #4 — this replaces
 * the browser's print-to-PDF path, whose text layer Firefox corrupts.
 */
import { createRoot } from 'react-dom/client'
import { PDFDocument } from 'pdf-lib'
import * as fontkitNs from '@pdf-lib/fontkit'
import type { ResumeDocument } from '@/types/document'
import { PAGE_DIMENSIONS, MM_TO_PX } from '@/types/metadata'
import { ensureFontsReady } from '@/data/fonts'
import { fitOnePageScale } from '@/lib/fitOnePage'
import { TemplateRenderer } from '@/templates/TemplateRenderer'
import { pxToPt } from './units'
import { buildDrawList } from './walk'
import { loadPdfFontIndex, PdfFontCache } from './fonts'
import { paintOps } from './paint'

/** Thrown when the mounted sheet is still taller than one page after auto-fit.
 * Multi-page pagination is a separate task — the caller should fall back to
 * the browser print export so the user always gets a correct PDF. */
export class PdfMultiPageUnsupportedError extends Error {}

// @pdf-lib/fontkit is CJS: under Vite the real module ends up on `.default`,
// while under other bundlers/interop settings the namespace import IS the
// module. Accept either shape rather than assuming one — the wrong guess
// silently registers an object without `.create`, and every text op then
// fails with "fontkit.create is not a function" (swallowed by paintOps'
// per-op tolerance), producing a valid-looking but textless PDF.
const fontkit = ((fontkitNs as unknown as { default?: unknown }).default ?? fontkitNs) as Parameters<
  PDFDocument['registerFontkit']
>[0]

// Two animation frames — but NEVER hang. If the tab is backgrounded, rAF is
// throttled and would stall forever, so fall back to a timer. Same helper as
// PrintPage, so the exported PDF settles exactly like the print route does.
function raf2(): Promise<void> {
  return new Promise((resolve) => {
    let done = false
    const finish = () => { if (!done) { done = true; resolve() } }
    requestAnimationFrame(() => requestAnimationFrame(finish))
    setTimeout(finish, 400)
  })
}

export async function renderResumePdf(doc: ResumeDocument): Promise<Uint8Array> {
  const fmt = doc.metadata.page.format === 'Letter' ? 'Letter' : 'A4'
  const { w: pageWpx, h: pageHpx } = PAGE_DIMENSIONS[fmt]

  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-100000px'
  container.style.top = '0'
  container.style.width = `${pageWpx}px`
  container.style.background = '#fff'
  document.body.appendChild(container)

  const root = createRoot(container)

  try {
    root.render(<TemplateRenderer doc={doc} mode="print" fitScale={1} />)

    await ensureFontsReady([doc.metadata.typography.fontFamily, doc.metadata.typography.headingFamily, doc.metadata.typography.nameFamily])
    await raf2()

    if (doc.metadata.page.autoFit) {
      await fitOnePageScale(pageHpx, async (scale) => {
        root.render(<TemplateRenderer doc={doc} mode="print" fitScale={scale} />)
        await raf2()
        return container.scrollHeight
      })
      await raf2()
    }

    // Same tolerance PrintPage uses: trailing whitespace/rounding within the
    // bottom margin doesn't count as a real overflow.
    const padPx = doc.metadata.page.margin * MM_TO_PX
    if (container.scrollHeight > pageHpx + padPx) {
      throw new PdfMultiPageUnsupportedError('resume does not fit on one page')
    }

    const pdfDoc = await PDFDocument.create()
    pdfDoc.registerFontkit(fontkit)
    const page = pdfDoc.addPage([pxToPt(pageWpx), pxToPt(pageHpx)])

    const sheet = container.firstElementChild as HTMLElement
    const ops = buildDrawList(sheet)
    const fonts = new PdfFontCache(pdfDoc, await loadPdfFontIndex())
    await paintOps(page, ops, fonts, pxToPt(pageHpx))

    return await pdfDoc.save()
  } finally {
    root.unmount()
    container.remove()
  }
}
