/**
 * Public entry point for the direct (non-print-dialog) PDF export: mounts the
 * résumé off-screen using the exact same DOM/CSS the editor and print route
 * use, waits for it to settle (fonts, auto-fit), walks it into a draw list,
 * and paints that list into a real pdf-lib document with embedded vector
 * fonts and original-resolution images. See GitHub issue #4 — this replaces
 * the browser's print-to-PDF path, whose text layer Firefox corrupts.
 */
import { createRoot } from 'react-dom/client'
import {
  paginateOrThrow,
  PdfMultiPageUnsupportedError,
  computeFirstPageUsablePageHeightPx,
  computeUsablePageHeightPx,
  exceedsOnePage,
  findMainColumnPaddingPx,
  setLastUnsupported,
} from './metrics'
export {
  paginateOrThrow,
  PdfMultiPageUnsupportedError,
  computeFirstPageUsablePageHeightPx,
  computeUsablePageHeightPx,
  exceedsOnePage,
  findMainColumnPaddingPx,
  lastUnsupportedCharacters,
  verticalPaddingPx,
} from './metrics'
import { PDFDocument } from 'pdf-lib'
import * as fontkitNs from '@pdf-lib/fontkit'
import type { ResumeDocument } from '@/types/document'
import { PAGE_DIMENSIONS, MM_TO_PX } from '@/types/metadata'
import { ensureFontsReady } from '@/data/fonts'
import { fitOnePageScale } from '@/lib/fitOnePage'
import { TemplateRenderer } from '@/templates/TemplateRenderer'
import { pxToPt } from './units'
import { buildDrawList, extractPageBlocks } from './walk'
import { keepHyphenatedWordsWhole } from './hyphens'
import { substituteUnsupportedChars } from './charFallback'
import { visualLines } from './text'
import type { PageBlock } from './paginate'
import { paginate, PaginationImpossibleError, type Pagination, type PaginationInput } from './paginate'
import { resolveForcedCutsPx } from './pageBreaks'
import { parsePx } from './style'
import { loadPdfFontIndex, PdfFontCache } from './fonts'
import { paintPages } from './paint'
import { createTagSink, writeStructTree } from './structure'
import { applyPdfMetadata, buildDocInfo } from './metadata'
import { applyPdfAConformance, loadSrgbProfile, setPdfVersion, stampPdfVersion, PDFA_CLAIM, PDFUA_CLAIM } from './pdfa'
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
    /** Cut positions (continuous CSS px) the LAST `renderResumePdf` call
     *  paginated at — `[]` for a single-page render. DEV-only, always
     *  assigned (same no-stale-data rule as `__cvaLastDecoBoxes`): the
     *  multi-page gate compares these op-side cuts against DOM-side cuts it
     *  computes itself via `extractPageBlocks` + `paginate` on the preview's
     *  measure portal — the WYSIWYG parity guarantee (spec section 7). */
    __cvaLastPaginationCuts?: number[]
    __cvaLastPaginationBlocks?: { kind: string; topPx: number; bottomPx: number; keepWithNext?: boolean }[]
    __cvaLastCutReasons?: string[]
    /** DEV: the scale auto-fit settled on for the last export. */
    __cvaLastFitScale?: number
    __cvaPreviewFitScale?: number
    __cvaFitBusy?: boolean
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

/** Thrown when the résumé genuinely cannot be exported natively: paginate()
 * found no legal page-break candidate anywhere (`PaginationImpossibleError`,
 * wrapped by `paginateOrThrow` below). Auto-fit overflow no longer throws
 * (spec 1b, 2026-08-17): a doc auto-fit cannot shrink onto one page
 * re-renders at natural scale and paginates natively instead. The caller
 * still falls back to the browser print export on this error so the user
 * always gets a correct PDF. */


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

    // Render once more now the webfonts have resolved. The Artboard's layout
    // effect is what fits headings and keywords, and it fires before the fonts
    // land - so on its first pass it measures FALLBACK metrics and a heading
    // that fits in the fallback face still breaks in the real one. Re-rendering
    // re-runs it against the real thing, and leaves it the single place that
    // decides: applying the same passes again by hand from here re-measured a
    // layout the effect had already settled and moved it a fraction of a pixel,
    // which was enough to make the DOM's page cuts disagree with the ops'.
    root.render(<TemplateRenderer doc={doc} mode="print" fitScale={1} />)
    await raf2()

    /* Text passes BEFORE the fit search, so the search measures the exact
     * DOM the painter will walk. They used to run only after it - the fit
     * then measured breakable hyphens while the paint kept them whole, and
     * a compound word at a line boundary re-wrapped AFTER the scale was
     * chosen (caught at grow scales: a summary gained a line the fit never
     * saw). Both passes are idempotent; fit re-renders only change fitScale,
     * which React reconciles without touching the mutated text nodes. */
    {
      const sheetEarly = container.firstElementChild as HTMLElement | null
      if (sheetEarly) {
        substituteUnsupportedChars(sheetEarly)
        keepHyphenatedWordsWhole(sheetEarly)
      }
    }

    if (doc.metadata.page.autoFit) {
      const marginPx = doc.metadata.page.margin * MM_TO_PX
      await fitOnePageScale(
        pageHpx,
        async (scale) => {
          root.render(<TemplateRenderer doc={doc} mode="print" fitScale={scale} />)
          await raf2()
          return container.scrollHeight
        },
        pageHpx - marginPx * 2,
        async () => {
          // TRUE page count at whatever scale was just rendered — the same
          // blocks, budgets and paginator the export itself uses below, so
          // the scale search can never be fooled by a height estimate.
          const el = container.firstElementChild as HTMLElement | null
          if (!el) return Number.POSITIVE_INFINITY
          try {
            const pad = findMainColumnPaddingPx(el)
            return paginate({
              blocks: extractPageBlocks(el, computeUsablePageHeightPx(pageHpx, pad)),
              contentHeightPx: el.getBoundingClientRect().height,
              usablePageHeightPx: computeUsablePageHeightPx(pageHpx, pad),
              firstPageUsablePageHeightPx: computeFirstPageUsablePageHeightPx(pageHpx, pad),
              maxPageHeightPx: pageHpx,
            }).pageCount
          } catch {
            return Number.POSITIVE_INFINITY // no legal break here — never prefer this scale
          }
        }
      ).then((scale) => {
        // DEV instrumentation, same discipline as __cvaLastPaginationCuts:
        // harnesses need to see WHICH scale auto-fit settled on, not just the
        // page count it produced.
        if (import.meta.env.DEV) window.__cvaLastFitScale = scale
        return scale
      })
      await raf2()
      // The scale fitOnePageScale chose is KEPT, even when one page proved
      // impossible. It used to re-render at natural size here, on the
      // reasoning that unshrunken multi-page output beat shrunken
      // print-dialog output — but the print fallback is long gone, and
      // throwing the shrink away created a cliff: measured on a real resume,
      // two extra work entries still fitted one page and a third produced
      // THREE, last page 28% full (2026-08-23 user report). fitOnePageScale
      // now falls back to the fewest pages the legibility floor allows, so
      // that same document lands on two. Keeping the scale also makes the
      // export agree with the preview, which never re-rendered at natural
      // size — for auto-fit documents that overflow, the two used to
      // disagree on the page count outright.
    }

    // Same tolerance PrintPage uses: trailing whitespace/rounding within the
    // bottom margin doesn't count as a real overflow. Shared with
    // ResumePreview.tsx's own pagination-overlay gate via `exceedsOnePage`
    // (task-6b final-fix, finding F1) so the two can never silently diverge.
    const overflow = exceedsOnePage(container.scrollHeight, pageHpx, doc.metadata.page.margin)

    const sheet = container.firstElementChild as HTMLElement
    // Before anything measures the layout: keep hyphenated words whole, so a
    // line can never break inside "SLA-compliant" or "(PL-300)" and tear a
    // keyword across two lines of the exported text (hyphens.ts). Changes no
    // characters - only where the line wraps.
    // Keywords and heading widths are handled a level up, by the Artboard that
    // both this tree and the preview render (keywordFit.ts). Re-run them here:
    // the Artboard's layout effect fires before ensureFontsReady resolves, so
    // it measures against FALLBACK metrics, and a heading that fits in the
    // fallback face can still be too wide in the real one - which is how
    // "CERTIFICATIONS" kept arriving broken as "CERTIFICATIO" + "NS" even with
    // the fit pass in place. Both passes are idempotent.
    // Before anything measures or paints: swap characters the embedded fonts
    // cannot draw for equivalents they can. A non-breaking hyphen - what a
    // paste from Word carries - was being dropped outright, so a certificate
    // named "... (PL-300)" reached the text layer as "(PL300)".
    substituteUnsupportedChars(sheet)
    keepHyphenatedWordsWhole(sheet)
    // Always computed (cheap: one getComputedStyle on `.rm-col-main`) — only
    // ever CONSUMED when pagination actually runs (assignOpsToPages' single-
    // page shortcut ignores it entirely), so this has zero effect on the
    // single-page byte-identical path below.
    const padding = findMainColumnPaddingPx(sheet)

    let cutsPx: number[] = []
    let lastBlocks: PageBlock[] = []
    let lastReasons: string[] = []
    let pageCount = 1

    if (overflow) {
      // Auto-fit-ON docs reach here only when fitOnePageScale could not keep
      // the one-page promise (the block above already re-rendered them at
      // natural scale) — they paginate natively exactly like auto-fit OFF
      // (spec 1b, user request 2026-08-17: no more silent print fallback for
      // ordinary overflow). Pins stay auto-fit-OFF-only.
      const blocks = extractPageBlocks(sheet, computeUsablePageHeightPx(pageHpx, padding))
      const contentHeightPx = sheet.getBoundingClientRect().height
      const result = paginateOrThrow({
        blocks,
        contentHeightPx,
        usablePageHeightPx: computeUsablePageHeightPx(pageHpx, padding),
        firstPageUsablePageHeightPx: computeFirstPageUsablePageHeightPx(pageHpx, padding),
        maxPageHeightPx: pageHpx,
        forcedCutsPx: doc.metadata.page.autoFit ? [] : resolveForcedCutsPx(sheet, doc.metadata.page.breaks),
      })
      cutsPx = result.cutsPx
      lastBlocks = blocks
      lastReasons = result.cutReasons ?? []
      pageCount = result.pageCount
      if (import.meta.env.DEV) {
        // Ground truth for the line-level 1:1 check: what the print DOM
        // actually draws, before it is torn down and only the canvas remains.
        ;(window as unknown as { __cvaLastVisualLines?: unknown }).__cvaLastVisualLines = visualLines(sheet)
        ;(window as unknown as { __cvaLastPaginationInput?: unknown }).__cvaLastPaginationInput = {
          contentHeightPx,
          usablePageHeightPx: computeUsablePageHeightPx(pageHpx, padding),
          firstPageUsablePageHeightPx: computeFirstPageUsablePageHeightPx(pageHpx, padding),
          maxPageHeightPx: pageHpx,
        }
      }
    } else if (!doc.metadata.page.autoFit && doc.metadata.page.breaks.length) {
      // Pins can force pagination even when the content fits one page
      // ("move this to page 2" on a one-page doc — the feature's core use).
      const blocks = extractPageBlocks(sheet, computeUsablePageHeightPx(pageHpx, padding))
      const contentHeightPx = sheet.getBoundingClientRect().height
      const forcedCutsPx = resolveForcedCutsPx(sheet, doc.metadata.page.breaks)
      if (forcedCutsPx.length) {
        const result = paginateOrThrow({
          blocks,
          contentHeightPx,
          usablePageHeightPx: computeUsablePageHeightPx(pageHpx, padding),
          firstPageUsablePageHeightPx: computeFirstPageUsablePageHeightPx(pageHpx, padding),
          maxPageHeightPx: pageHpx,
          forcedCutsPx,
        })
        cutsPx = result.cutsPx
        lastBlocks = blocks
        lastReasons = result.cutReasons ?? []
        pageCount = result.pageCount
      }
    }

    const pdfDoc = await PDFDocument.create()
    pdfDoc.registerFontkit(fontkit)
    // Document properties (Info dict + XMP + /Lang + DisplayDocTitle) and
    // PDF/A-2B conformance. The colour profile is fetched from our own origin
    // and may legitimately be unavailable (offline first paint, asset not
    // deployed): the export then simply is not PDF/A, which the XMP must not
    // claim either — hence one `pdfaConforming` flag driving both.
    setPdfVersion(pdfDoc)
    const docInfo = buildDocInfo(doc)
    const icc = await loadSrgbProfile()
    const pages = Array.from({ length: pageCount }, () => pdfDoc.addPage([pxToPt(pageWpx), pxToPt(pageHpx)]))

    const pdfaConforming = applyPdfAConformance(pdfDoc, icc, `${docInfo.title}|${docInfo.created.toISOString()}`)

    const ops = buildDrawList(sheet, { clickableLinks: doc.metadata.links?.clickable !== false })

    const fonts = new PdfFontCache(pdfDoc, await loadPdfFontIndex())
    // Characters no embedded font can draw are DROPPED, not shown as boxes, so
    // an export can succeed while silently losing whole sentences. Collect
    // them so the export surface can say so instead of handing over a resume
    // with the author's own name missing.
    setLastUnsupported([])
    {
      const byFont = new Map<string, { family: string; weight: number; text: string }>()
      for (const op of ops) {
        if (op.kind !== 'text' || op.run.isDecorative || !op.run.text) continue
        const key = `${op.run.family}|${op.run.weight}`
        const entry = byFont.get(key)
        if (entry) entry.text += op.run.text
        else byFont.set(key, { family: op.run.family, weight: op.run.weight, text: op.run.text })
      }
      const found = new Set<string>()
      for (const { family, weight, text } of byFont.values()) {
        for (const ch of await fonts.missingGlyphs(family, weight, text)) found.add(ch)
      }
      setLastUnsupported([...found])
    }
    // Dev-only gate-instrumentation hook (task 15) — see the `declare global`
    // block above. Single if-check: zero cost for every real (non-harness)
    // caller, which never sets the flag.
    const capturing = import.meta.env.DEV && window.__cvaCaptureRenderBoxes === true
    const decoBoxes: DecoBox[] | undefined = capturing ? [] : undefined
    // Tagged PDF: the sink marks every op as it is painted and records the
    // structure; the tree is written afterwards, once the marks (and their
    // pages) are known.
    const tagSink = createTagSink()
    await paintPages(pages, ops, fonts, pxToPt(pageHpx), pageHpx, cutsPx, padding.topPx, decoBoxes, tagSink)
    // The accessibility claim is made ONLY if the tree was actually written,
    // never on an empty or missing structure (see writeStructTree).
    const tagged = writeStructTree(pdfDoc, tagSink.marks)
    // Metadata last: its conformance claims describe what the file ended up
    // being, not what we hoped it would be.
    applyPdfMetadata(
      pdfDoc,
      docInfo,
      pdfaConforming ? { ...PDFA_CLAIM, ua: tagged ? PDFUA_CLAIM : undefined } : undefined
    )
    // ALWAYS assign (never a conditional `if (capturing)`) so a non-capturing
    // render clears any boxes a PRIOR capturing render left behind — task-15
    // fix round: `if (capturing) window.__cvaLastDecoBoxes = decoBoxes` only
    // ever wrote when capturing was on, so render N's boxes stayed visible
    // through render N+1 once the harness turned the flag back off. Still
    // entirely inside the DEV guard, so the production path never touches
    // `window` here at all.
    if (import.meta.env.DEV) window.__cvaLastDecoBoxes = resolveDecoBoxesGlobal(capturing, decoBoxes)
    // Unconditional in DEV (no capture flag): the cuts are already computed
    // either way, and always-assigning keeps the same staleness guarantee as
    // the deco boxes above — a single-page render publishes [] over whatever
    // a prior multi-page render left behind.
    if (import.meta.env.DEV) {
      window.__cvaLastPaginationCuts = cutsPx.slice()
      // Same DEV-only discipline: harnesses need the BLOCKS to tell a missing
      // keepWithNext flag apart from one the chooser ignored.
      window.__cvaLastPaginationBlocks = lastBlocks.map((blk) => ({ ...blk }))
      window.__cvaLastCutReasons = lastReasons.slice()
    }

    return stampPdfVersion(await pdfDoc.save())
  } finally {
    root.unmount()
    container.remove()
  }
}
