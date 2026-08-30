/**
 * Pagination arithmetic and the unsupported-characters store - everything the
 * EDITOR needs from the export pipeline, with no pdf-lib in sight.
 *
 * These lived in render.tsx, whose top-level `import { PDFDocument }` pulled
 * pdf-lib + fontkit (~1.2MB minified) into the editor route chunk just so the
 * live preview could budget page heights. Splitting the arithmetic out lets
 * the exporter itself load on the first export click instead.
 */
import { MM_TO_PX } from '@/types/metadata'
import { paginate, PaginationImpossibleError, type Pagination, type PaginationInput } from './paginate'
import { parsePx } from './style'

/** Thrown when a document cannot be paginated for native multi-page export -
 *  export.ts catches it and falls back to the print dialog. Lives here (not
 *  in render.tsx) so throwing and catching it never loads pdf-lib. */
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
 * bottom padding — the budget for every page AFTER the first. Pages 2+
 * genuinely spend that top padding as a real yOffset reservation
 * (paint.ts's `assignOpsToPages`), so it must come out of their budget.
 * Page 1 does NOT spend it the same way — see `computeFirstPageUsablePageHeightPx`
 * below, which is the correct budget for page 1 specifically (fix round: this
 * function used to be applied uniformly to page 1 too, which under-budgeted
 * it by the full top padding on every multi-page export — proven live).
 */
export function computeUsablePageHeightPx(pageHeightPx: number, padding: { topPx: number; bottomPx: number }): number {
  return pageHeightPx - padding.topPx - padding.bottomPx
}

/**
 * The budget (CSS px) for PAGE 1 specifically — `paginate()`'s
 * `firstPageUsablePageHeightPx` input. Page 1's own leading top padding is
 * already baked into the DOM at its natural (offset-0) position — it is
 * blank space ABOVE the first line of content, not a reservation paint.ts's
 * `assignOpsToPages` has to carve out of page 1's budget the way it does for
 * every later page's yOffset — so page 1 can legally hold
 * `computeUsablePageHeightPx`'s worth of content PLUS that top padding
 * before it needs a break: only the bottom padding is subtracted here.
 *
 * Fix round (native-multipage-pdf plan, task 3): before this existed, page 1
 * was budgeted identically to pages 2+ (`computeUsablePageHeightPx`, minus
 * BOTH paddings) — under-budgeting it by the full top padding on every
 * multi-page export and picking a premature first cut, proven live against a
 * real two-column dark template (`portrait`): the true page-1 budget had
 * room for one more complete work entry, with a same-tier entry-gap
 * candidate the old, too-small window never even considered.
 */
export function computeFirstPageUsablePageHeightPx(pageHeightPx: number, padding: { bottomPx: number }): number {
  return pageHeightPx - padding.bottomPx
}

/**
 * True when `contentHeightPx` genuinely overflows a single page — the SAME
 * gate `renderResumePdf` uses below to decide whether to paginate AT ALL,
 * before ever calling `paginateOrThrow`. Trailing whitespace/rounding within
 * one full margin's worth of vertical space does not count as real overflow
 * (same tolerance PrintPage's print-CSS route relies on for a `@page`
 * break), so a document landing exactly at, or a hair under, one page tall
 * never spuriously triggers a second page. `marginMm` is `doc.metadata.page.
 * margin` verbatim; this is the only place that converts it to px and adds
 * it as tolerance ON TOP OF `pageHeightPx` — never subtracted the way a
 * BUDGET (see `computeFirstPageUsablePageHeightPx` above) is.
 *
 * Task-6b final-fix (finding F1): ResumePreview.tsx's pagination-overlay
 * effect used to gate on `contentHeightPx <= firstPageUsablePageHeightPx`
 * (a BUDGET, `pageHeightPx - bottomPad`) instead of this — independently
 * re-deriving a "does this need a second page" check that came out
 * ~2 full margins STRICTER than this function (a budget subtracts the
 * margin; this tolerance adds it), so a document landing in the ~2-margin
 * gap between the two thresholds drew page-break chrome in the editor
 * while the export correctly produced a single page. Exporting this ONE
 * function (rather than leaving both call sites to re-derive `pageHeightPx
 * +/- marginMm * MM_TO_PX` independently) is what keeps that divergence
 * from silently reopening — both call sites below and in
 * ResumePreview.tsx now call this, not their own copy of the arithmetic.
 */
export function exceedsOnePage(contentHeightPx: number, pageHeightPx: number, marginMm: number): boolean {
  return contentHeightPx > pageHeightPx + marginMm * MM_TO_PX
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
 *  if the column wrapper is ever missing, rather than throwing. Exported
 *  (native-multipage-pdf plan, task 5) so the editor preview's paginated
 *  overlay reads the SAME padding this module does when it budgets pages for
 *  export — no second implementation of "how do I find the padding" to drift
 *  out of sync. */
export function findMainColumnPaddingPx(root: HTMLElement): { topPx: number; bottomPx: number } {
  const mainCol = root.querySelector<HTMLElement>('.rm-col-main') ?? root
  return verticalPaddingPx(getComputedStyle(mainCol))
}

/**
 * Characters the last export could not draw, and therefore dropped. Read by
 * the export surface after `renderResumePdf` resolves; written only by the
 * renderer.
 */
let lastUnsupported: string[] = []

/** The characters the most recent export silently dropped, if any. */
export function lastUnsupportedCharacters(): string[] {
  return lastUnsupported
}

/** Renderer-side setter - not for consumers. */
export function setLastUnsupported(chars: string[]): void {
  lastUnsupported = chars
}
