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
import { buildDrawList, extractPageBlocks } from './walk'
import { paginate, PaginationImpossibleError, type Pagination, type PaginationInput } from './paginate'
import { parsePx } from './style'
import { loadPdfFontIndex, PdfFontCache } from './fonts'
import { paintPages } from './paint'
import type { DecoBox } from './types'

// Task 15 gate-instrumentation hook: a harness sets `window.__cvaCaptureRenderBoxes
// = true` BEFORE calling `renderResumePdf`, and reads `window.__cvaLastDecoBoxes`
// after it resolves. See paint.ts's `paintOps` doc comment for what gets
// captured and why. Declared here (not globally) since this is the only
// module that touches these — everything else in src/lib/pdf stays free of
// `window` globals and environment assumptions, so it's directly unit-testable.
declare global {
  interface Window {
    __cvaCaptureRenderBoxes?: boolean
    __cvaLastDecoBoxes?: DecoBox[]
  }
}

/**
 * What `renderResumePdf` should assign to `window.__cvaLastDecoBoxes` after
 * THIS render, given whether it was capturing. Extracted as a pure function
 * (task 15 fix round) so the no-stale-data invariant — a non-capturing render
 * must clear whatever a PRIOR capturing render left behind, not just skip
 * writing — is directly testable without mounting a full render (no DOM,
 * no React, no font loading needed to exercise this one branch of logic).
 * Always `undefined` when not capturing, regardless of `decoBoxes` (which is
 * always `undefined` in that case anyway, from the `capturing ? [] :
 * undefined` allocation at the call site) — never echoes a stale array back.
 */
export function resolveDecoBoxesGlobal(capturing: boolean, decoBoxes: DecoBox[] | undefined): DecoBox[] | undefined {
  return capturing ? decoBoxes : undefined
}

/** Thrown when the résumé genuinely cannot be exported natively: either
 * auto-fit is ON and the sheet is still taller than one page after it ran
 * (unchanged from before the native-multipage-pdf plan — auto-fit ON never
 * paginates, spec section 3), or auto-fit is OFF and `paginate()` found no
 * legal page-break candidate anywhere (`PaginationImpossibleError`, wrapped
 * by `paginateOrThrow` below). Either way the caller falls back to the
 * browser print export so the user always gets a correct PDF. */
export class PdfMultiPageUnsupportedError extends Error {}

/**
 * Vertical padding (CSS px) read off a plain `{paddingTop, paddingBottom}`
 * pair — a `Pick<CSSStyleDeclaration, ...>` shape (not a real
 * `CSSStyleDeclaration`) purely so this is directly unit-testable without a
 * DOM, same precedent as walk.ts's own `FlexHostStyle`. The real renderer
 * passes `getComputedStyle(el)`, which structurally satisfies this shape.
 */
export function verticalPaddingPx(cs: Pick<CSSStyleDeclaration, 'paddingTop' | 'paddingBottom'>): {
  topPx: number
  bottomPx: number
} {
  return { topPx: parsePx(cs.paddingTop), bottomPx: parsePx(cs.paddingBottom) }
}

/**
 * `paginate()`'s own `usablePageHeightPx` input (native-multipage-pdf plan,
 * spec section 3): the full A4 page height minus the artboard's own top+
 * bottom padding, applied UNIFORMLY to every output page — including page 1,
 * even though page 1's own leading padding is already baked into its natural
 * layout (see paint.ts's `assignOpsToPages` doc comment for the full
 * page-geometry rationale: this is a deliberate, slightly conservative
 * choice, not an oversight).
 */
export function computeUsablePageHeightPx(pageHeightPx: number, padding: { topPx: number; bottomPx: number }): number {
  return pageHeightPx - padding.topPx - padding.bottomPx
}

/**
 * Runs `paginate()`, translating its ONLY throw (`PaginationImpossibleError`
 * — genuinely no legal break candidate exists anywhere) into the same
 * `PdfMultiPageUnsupportedError` the caller already throws for a document
 * that doesn't fit one page under auto-fit — keeping export.ts's print-
 * dialog fallback the single safety net for BOTH cases. Pure aside from that
 * translation (`paginate()` itself is DOM-free), so directly unit-testable
 * without mounting anything.
 */
export function paginateOrThrow(input: PaginationInput): Pagination {
  try {
    return paginate(input)
  } catch (e) {
    if (e instanceof PaginationImpossibleError) {
      throw new PdfMultiPageUnsupportedError('resume cannot be paginated: no legal page-break candidate exists')
    }
    throw e
  }
}

/** `.rm-col-main` (always rendered — see Artboard.tsx) is where the
 *  artboard's own page padding actually lives (`--rm-pad`, artboard.css) —
 *  NOT on `.rm-root` itself, which carries no padding of its own (its
 *  background spans its full box edge-to-edge, matching the page-chrome ops
 *  paint.ts repeats full-bleed on every page). Falls back to `root` itself
 *  if the column wrapper is ever missing, rather than throwing. */
function findMainColumnPaddingPx(root: HTMLElement): { topPx: number; bottomPx: number } {
  const mainCol = root.querySelector<HTMLElement>('.rm-col-main') ?? root
  return verticalPaddingPx(getComputedStyle(mainCol))
}

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
    const finish = () => {
      if (!done) {
        done = true
        resolve()
      }
    }
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

    await ensureFontsReady([
      doc.metadata.typography.fontFamily,
      doc.metadata.typography.headingFamily,
      doc.metadata.typography.nameFamily,
    ])
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
    const overflow = container.scrollHeight > pageHpx + padPx

    const sheet = container.firstElementChild as HTMLElement
    // Always computed (cheap: one getComputedStyle on `.rm-col-main`) — only
    // ever CONSUMED when pagination actually runs (assignOpsToPages' single-
    // page shortcut ignores it entirely), so this has zero effect on the
    // single-page byte-identical path below.
    const padding = findMainColumnPaddingPx(sheet)

    let cutsPx: number[] = []
    let pageCount = 1

    if (overflow) {
      if (doc.metadata.page.autoFit) {
        // Auto-fit already tried (fitOnePageScale, above) and still doesn't
        // fit one page — unchanged from before this task: pagination only
        // ever activates for auto-fit OFF (native-multipage-pdf plan, spec
        // section 3).
        throw new PdfMultiPageUnsupportedError('resume does not fit on one page')
      }
      const blocks = extractPageBlocks(sheet)
      const contentHeightPx = sheet.getBoundingClientRect().height
      const result = paginateOrThrow({
        blocks,
        contentHeightPx,
        usablePageHeightPx: computeUsablePageHeightPx(pageHpx, padding),
      })
      cutsPx = result.cutsPx
      pageCount = result.pageCount
    }

    const pdfDoc = await PDFDocument.create()
    pdfDoc.registerFontkit(fontkit)
    const pages = Array.from({ length: pageCount }, () => pdfDoc.addPage([pxToPt(pageWpx), pxToPt(pageHpx)]))

    const ops = buildDrawList(sheet)
    const fonts = new PdfFontCache(pdfDoc, await loadPdfFontIndex())
    // Dev-only gate-instrumentation hook (task 15) — see the `declare global`
    // block above. Single if-check: zero cost for every real (non-harness)
    // caller, which never sets the flag.
    const capturing = import.meta.env.DEV && window.__cvaCaptureRenderBoxes === true
    const decoBoxes: DecoBox[] | undefined = capturing ? [] : undefined
    await paintPages(pages, ops, fonts, pxToPt(pageHpx), pageHpx, cutsPx, padding.topPx, decoBoxes)
    // ALWAYS assign (never a conditional `if (capturing)`) so a non-capturing
    // render clears any boxes a PRIOR capturing render left behind — task-15
    // fix round: `if (capturing) window.__cvaLastDecoBoxes = decoBoxes` only
    // ever wrote when capturing was on, so render N's boxes stayed visible
    // through render N+1 once the harness turned the flag back off. Still
    // entirely inside the DEV guard, so the production path never touches
    // `window` here at all.
    if (import.meta.env.DEV) window.__cvaLastDecoBoxes = resolveDecoBoxesGlobal(capturing, decoBoxes)

    return await pdfDoc.save()
  } finally {
    root.unmount()
    container.remove()
  }
}
