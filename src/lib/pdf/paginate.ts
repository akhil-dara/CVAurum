/**
 * The pure break-point engine for native multi-page PDF export and the
 * paginated WYSIWYG preview (see
 * docs/superpowers/plans/2026-08-15-native-multipage-pdf.md and its design
 * doc, spec section 1). Both consumers feed this the SAME generic block
 * shape — the export from walker-derived op boxes, the preview from live
 * DOM rects — so their page breaks are guaranteed identical. No DOM, no
 * pdf-lib: this module only does arithmetic over plain numbers.
 */

/**
 * One block of the continuous, single-column document layout, in document
 * order (sorted by `topPx`).
 *
 * `'section-gap'` and `'entry-gap'` blocks represent the ACTUAL empty
 * (no-ink) region between two sections/entries — their own `topPx..bottomPx`
 * span IS the gap, and a candidate break lives at its midpoint. `'line'` and
 * `'atomic'` blocks represent real ink (a text line box, or an indivisible
 * unit — image/svg/chip row) that a cut must never pass through; a
 * candidate break at the LOWEST tier is the midpoint of the space between
 * two directly-adjacent line/atomic blocks (no gap-marker block between
 * them).
 */
export interface PageBlock {
  kind: 'section-gap' | 'entry-gap' | 'line' | 'atomic'
  /** top of the block in continuous CSS px (document space) */
  topPx: number
  bottomPx: number
  /** true when this block must keep the NEXT block on the same page (heading widow rule) */
  keepWithNext?: boolean
}

export interface PaginationInput {
  blocks: PageBlock[]
  contentHeightPx: number
  usablePageHeightPx: number
  searchWindowRatio?: number // default 0.18
}

export interface Pagination {
  /** cut positions in continuous CSS px, ascending; empty = single page */
  cutsPx: number[]
  pageCount: number
}

/** Thrown when no legal break candidate exists anywhere for a page's worth
 *  of content (a single block taller than a page with no internal gap).
 *  Callers (render.tsx) treat this as the same "can't paginate" signal the
 *  old always-thrown PdfMultiPageUnsupportedError used to be. */
export class PaginationImpossibleError extends Error {}

const DEFAULT_SEARCH_WINDOW_RATIO = 0.18

type Tier = 'section-gap' | 'entry-gap' | 'line'

/** Ordered strictly by preference — checked in this order, and a candidate
 *  from an earlier tier always wins over a later tier's, regardless of which
 *  is closer to the ideal boundary (spec 1: "prefer the LOWEST section-gap
 *  ... else lowest entry-gap ... else lowest line/atomic gap"). */
const TIER_PREFERENCE: Tier[] = ['section-gap', 'entry-gap', 'line']

interface Candidate {
  y: number
  tier: Tier
}

/** Builds every legal candidate break position from the sorted block list.
 *  A candidate that would violate the keepWithNext widow rule is dropped
 *  here so the scan below never has to special-case it. */
function buildCandidates(sorted: PageBlock[]): Candidate[] {
  const candidates: Candidate[] = []
  for (let i = 0; i < sorted.length; i++) {
    const block = sorted[i]
    if (block.kind === 'section-gap' || block.kind === 'entry-gap') {
      // The gap block IS the candidate: its own span is the empty region.
      const predecessor = sorted[i - 1]
      if (predecessor?.keepWithNext) continue // cut may not fall right after a heading
      candidates.push({ y: (block.topPx + block.bottomPx) / 2, tier: block.kind })
      continue
    }
    // 'line' | 'atomic': the candidate (if any) is the gap to the NEXT
    // block, but only when no gap-marker block sits between them — that
    // gap already produced its own (higher-tier) candidate above.
    const next = sorted[i + 1]
    if (!next) continue
    if (next.kind === 'section-gap' || next.kind === 'entry-gap') continue
    if (block.keepWithNext) continue // cut may not fall right after a heading
    candidates.push({ y: (block.bottomPx + next.topPx) / 2, tier: 'line' })
  }
  return candidates
}

/** Defensive guard for spec 1's "reject cuts through any block interior" —
 *  candidates are only ever built at gap midpoints by construction, so this
 *  should never actually trigger against well-formed input, but it keeps a
 *  malformed/overlapping block list from ever producing a cut through ink. */
function fallsInsideInk(y: number, sorted: PageBlock[]): boolean {
  return sorted.some((b) => (b.kind === 'line' || b.kind === 'atomic') && y > b.topPx && y < b.bottomPx)
}

/** Picks the single cut for one page, given everything already consumed
 *  (`pageTop`) and the ideal boundary for this page. */
function chooseCut(candidates: Candidate[], pageTop: number, idealY: number, windowLow: number): number {
  for (const tier of TIER_PREFERENCE) {
    let best: number | undefined
    for (const c of candidates) {
      if (c.tier !== tier) continue
      if (c.y <= pageTop || c.y > idealY || c.y < windowLow) continue
      if (best === undefined || c.y > best) best = c.y // prefer the LOWEST (closest to ideal) in this tier
    }
    if (best !== undefined) return best
  }
  // Nothing legal in the window at any tier: scan DOWNWARD for the nearest
  // legal candidate past the ideal boundary, tier-agnostic (past aesthetic
  // preference — any legal no-ink gap will do; see spec 1's rule 3, which
  // defines a "line boundary" as any full-width no-ink gap, a definition
  // section/entry gaps also satisfy).
  let fallback: number | undefined
  for (const c of candidates) {
    if (c.y <= idealY) continue
    if (fallback === undefined || c.y < fallback) fallback = c.y
  }
  if (fallback !== undefined) return fallback
  throw new PaginationImpossibleError('No legal page-break candidate exists for this document')
}

export function paginate(input: PaginationInput): Pagination {
  const { blocks, contentHeightPx, usablePageHeightPx, searchWindowRatio = DEFAULT_SEARCH_WINDOW_RATIO } = input

  if (contentHeightPx <= usablePageHeightPx) return { cutsPx: [], pageCount: 1 }

  const sorted = [...blocks].sort((a, b) => a.topPx - b.topPx)
  const candidates = buildCandidates(sorted).filter((c) => !fallsInsideInk(c.y, sorted))

  const cutsPx: number[] = []
  let pageTop = 0
  while (contentHeightPx - pageTop > usablePageHeightPx) {
    const idealY = pageTop + usablePageHeightPx
    const windowLow = idealY - searchWindowRatio * usablePageHeightPx
    const cutY = chooseCut(candidates, pageTop, idealY, windowLow)
    cutsPx.push(cutY)
    pageTop = cutY
  }

  return { cutsPx, pageCount: cutsPx.length + 1 }
}
