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
  /**
   * The PHYSICAL page height (CSS px). A page break is never placed further
   * than this past a page's top, because content beyond the paper's edge is
   * painted off the sheet and lost. Defaults to Infinity, which preserves the
   * pre-2026-08-23 behaviour for callers that do not supply it.
   */
  maxPageHeightPx?: number
  /** Budget (CSS px) for every page AFTER the first — spec 3: the full A4
   *  page height minus the artboard's own top+bottom padding, since pages
   *  2+ spend that top padding as a real yOffset reservation (paint.ts's
   *  `assignOpsToPages`). */
  usablePageHeightPx: number
  /**
   * Budget (CSS px) for PAGE 1 ONLY, when it differs from
   * `usablePageHeightPx`. Page 1's own leading top padding is already baked
   * into the DOM at its natural position (paint.ts's per-page offset is
   * always exactly 0 for page 1 — see its own doc comment) and is never
   * "spent" again the way pages 2+ spend theirs as a yOffset, so page 1 can
   * legally hold `usablePageHeightPx` PLUS that top padding before needing a
   * break: the caller's own budget is `pageHeightPx - bottomPaddingPx`, no
   * top-padding subtraction. Defaults to `usablePageHeightPx` when omitted —
   * every existing single-budget caller (and every pre-existing test) is
   * unaffected. Fix round (native-multipage-pdf plan, task 3): omitting this
   * previously under-budgeted page 1 by the full top padding on every
   * multi-page export, picking a premature first cut and stranding legal,
   * same-tier candidates the corrected (larger) page-1 window would have
   * reached instead — proven live against a real two-column dark template.
   */
  firstPageUsablePageHeightPx?: number
  searchWindowRatio?: number // default 0.18
  /**
   * User-pinned page breaks ("Start on new page", 2026-08-17 plan task 1),
   * ascending y in the same continuous content space as `blocks`. Every
   * LEGAL forced cut becomes a mandatory page boundary — even when the
   * content would otherwise fit one page (pinning something to page 2 of a
   * one-page doc is the feature's core use). A forced cut that falls inside
   * ink, immediately after a keepWithNext block, or outside `(0,
   * contentHeightPx)` is DROPPED with a dev-warn — a stale or impossible
   * pin degrades to normal pagination, never a throw. Spans still taller
   * than a page after forcing are auto-paginated normally.
   */
  forcedCutsPx?: number[]
}

export interface Pagination {
  /** cut positions in continuous CSS px, ascending; empty = single page */
  cutsPx: number[]
  pageCount: number
  /** which branch chose each cut - diagnosis only, never behaviour */
  cutReasons?: CutReason[]
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

/** The lowest cut this page can take WITHOUT splitting ink: the top of the
 *  block crossing the paper's edge. Returns undefined when that block starts
 *  so high that the page would be mostly blank - the caller then has better
 *  options than a near-empty page.
 *
 *  Never lands immediately after a block that must stay with the next one:
 *  this path picks a y directly rather than from `candidates`, which is where
 *  the widow rule is enforced, so it is the one place that veto can be
 *  missed. It steps up ONCE past such a block, and only while the page stays
 *  past the same floor - stepping repeatedly produced tiny pages that
 *  stranded other headings instead. */
function snapAbovePaperEdge(sorted: PageBlock[], pageTop: number, maxPageHeightPx: number): number | undefined {
  const maxY = pageTop + maxPageHeightPx
  const floor = pageTop + maxPageHeightPx * 0.6
  const straddling = sorted.find(
    (blk) => (blk.kind === 'line' || blk.kind === 'atomic') && blk.topPx < maxY && blk.bottomPx > maxY
  )
  if (!straddling || straddling.topPx <= floor) return undefined
  let y = straddling.topPx
  let prev: PageBlock | undefined
  for (const blk of sorted) {
    if (blk.bottomPx > y + 0.5) continue
    if (!prev || blk.bottomPx > prev.bottomPx) prev = blk
  }
  if (prev?.keepWithNext) {
    // Stepping up past the heading is only worth it while the page stays
    // full enough; when it is not, DECLINE the snap rather than end the page
    // on a heading whose content starts the next one. The caller's earlier
    // -cut branch then picks a legal candidate, which honours the veto by
    // construction.
    if (prev.topPx <= floor) return undefined
    y = prev.topPx
  }
  return y
}

/** Picks the single cut for one page, given everything already consumed
 *  (`pageTop`) and the ideal boundary for this page. */
/** Which branch of chooseCut produced a cut. Diagnosis only - a stranded
 *  heading looks identical whichever branch placed it, and the fix differs. */
export type CutReason = 'window' | 'downward' | 'earlier' | 'clamp' | 'snap'
const cutReasons: CutReason[] = []

function chooseCut(
  candidates: Candidate[],
  pageTop: number,
  idealY: number,
  windowLow: number,
  maxPageHeightPx: number,
  sorted: PageBlock[]
): number {
  for (const tier of TIER_PREFERENCE) {
    let best: number | undefined
    for (const c of candidates) {
      if (c.tier !== tier) continue
      if (c.y <= pageTop || c.y > idealY || c.y < windowLow) continue
      if (best === undefined || c.y > best) best = c.y // prefer the LOWEST (closest to ideal) in this tier
    }
    if (best !== undefined) {
      cutReasons.push('window')
      return best
    }
  }
  // Nothing legal inside the window: scan DOWNWARD, but never past the
  // PHYSICAL page. A cut beyond the paper does not merely look wrong —
  // everything between the page's bottom edge and that cut is painted off
  // the sheet and is GONE from the exported document. Measured on a real
  // two-column resume (where a cut needs both columns clear at the same y,
  // so legal positions are scarce) the nearest candidate below the boundary
  // sat at 2242px on a 1122px page, and 27 of the candidate's 70 skills
  // silently vanished from the PDF.
  //
  // `usablePageHeightPx` deliberately excludes the artboard's padding, so a
  // modest overshoot past the ideal is still on the paper — that slack is
  // what the existing downward fallback relies on, and it is preserved.
  // `maxPageHeightPx` is where the paper actually ends.
  const maxY = pageTop + maxPageHeightPx
  for (const tier of TIER_PREFERENCE) {
    let nearest: number | undefined
    for (const c of candidates) {
      if (c.tier !== tier || c.y <= idealY || c.y > maxY) continue
      if (nearest === undefined || c.y < nearest) nearest = c.y
    }
    if (nearest !== undefined) {
      cutReasons.push('downward')
      return nearest
    }
  }

  // Nothing legal on the paper at all. Before giving up page height, snap to
  // the TOP of whatever block crosses the paper's edge: that is as far down
  // as this page can go without splitting ink, so it keeps the page full.
  //
  // This used to be tried only AFTER the earlier-cut branch below, and the
  // earlier branch takes the latest legal cut ANYWHERE above - which on a
  // real resume meant a first page whose text reached 22% down the sheet,
  // with the rest blank (2026-08-23 user report). Trying the snap first
  // fills the page; the earlier cut remains the fallback when the straddling
  // block starts too high for the snap's own floor.
  if (Number.isFinite(maxPageHeightPx)) {
    const snapped = snapAbovePaperEdge(sorted, pageTop, maxPageHeightPx)
    if (snapped !== undefined) {
      cutReasons.push('snap')
      return snapped
    }
  }

  // Still nothing: take the latest legal cut EARLIER on this page. Ending a
  // page early costs whitespace; ending it late costs content.
  {
    let best: number | undefined
    let bestTier: Tier | undefined
    for (const c of candidates) {
      if (c.y <= pageTop || c.y >= windowLow) continue // the window above is already covered
      const better =
        best === undefined ||
        c.y > best ||
        (c.y === best && TIER_PREFERENCE.indexOf(c.tier) < TIER_PREFERENCE.indexOf(bestTier as Tier))
      if (better) {
        best = c.y
        bestTier = c.tier
      }
    }
    if (best !== undefined) {
      cutReasons.push('earlier')
      return best
    }
  }

  // Nothing anywhere on this page — a single unbreakable block taller than
  // the paper, which a deep sidebar reaches easily (a cut needs EVERY column
  // clear at the same y, and a long chip list offers none). Cutting after the
  // block was the old behaviour, on the reasoning that overflow is
  // unavoidable. It is not merely unavoidable, it is destructive: measured
  // with skills forced into a 0.38 sidebar, page one was asked to hold
  // 3195px of a 1122px page and 53 of 88 strings were painted off the sheet
  // and lost from the file. Splitting a block at the paper's edge can look
  // wrong; it can never delete the user's words, so it wins.
  if (Number.isFinite(maxPageHeightPx)) {
    // Snap UP to the top of whatever block straddles the paper's edge. A cut
    // exactly at the edge leaves that block's ink crossing the boundary, and
    // a line whose baseline lands past the edge is painted off-sheet and lost
    // all the same — which is how one bullet's tail still went missing after
    // the edge clamp alone. Cutting above it keeps the block whole on the
    // next page. A block that starts at or above pageTop is taller than the
    // paper by itself, and splitting it is genuinely unavoidable.
    const straddling = sorted.find(
      (blk) => (blk.kind === 'line' || blk.kind === 'atomic') && blk.topPx < maxY && blk.bottomPx > maxY
    )
    // ...but only when the sacrifice is small. Snapping up unconditionally
    // ends the page wherever the straddling block happens to start, which on
    // a tall block cost a whole extra page (4 -> 5) and fragmented the
    // sidebar so badly the importer recovered 4 of 70 keywords. Below this
    // floor the block is long enough that splitting it is the better trade.
    const snapped = snapAbovePaperEdge(sorted, pageTop, maxPageHeightPx)
    if (snapped !== undefined) {
      cutReasons.push('snap')
      return snapped
    }
    cutReasons.push('clamp')
    return maxY
  }
  throw new PaginationImpossibleError('No legal page-break candidate exists for this document')
}

/** A forced cut is legal exactly where a natural candidate could live: not
 *  through ink, and not in the gap a keepWithNext block guards. */
function isLegalForcedCut(y: number, sorted: PageBlock[], contentHeightPx: number): boolean {
  if (y <= 0 || y >= contentHeightPx) return false
  if (fallsInsideInk(y, sorted)) return false
  // the nearest block wholly above y guards the gap y sits in
  let preceding: PageBlock | undefined
  for (const b of sorted) {
    if (b.bottomPx <= y) preceding = b
    else break
  }
  if (preceding?.keepWithNext) return false
  return true
}

export function paginate(input: PaginationInput): Pagination {
  cutReasons.length = 0
  const {
    blocks,
    contentHeightPx,
    usablePageHeightPx,
    firstPageUsablePageHeightPx = usablePageHeightPx,
    searchWindowRatio = DEFAULT_SEARCH_WINDOW_RATIO,
    forcedCutsPx = [],
    maxPageHeightPx = Number.POSITIVE_INFINITY,
  } = input

  const sorted = [...blocks].sort((a, b) => a.topPx - b.topPx)

  const forced = [...new Set(forcedCutsPx)]
    .sort((a, b) => a - b)
    .filter((y) => {
      const ok = isLegalForcedCut(y, sorted, contentHeightPx)
      if (!ok && import.meta.env.DEV) console.warn(`[pdf] dropping illegal forced page break at y=${y}`)
      return ok
    })

  if (forced.length === 0 && contentHeightPx <= firstPageUsablePageHeightPx) return { cutsPx: [], pageCount: 1 }

  const candidates = buildCandidates(sorted).filter((c) => !fallsInsideInk(c.y, sorted))

  const cutsPx: number[] = []
  let pageTop = 0
  let pageIndex = 0
  // Page 1 (pageIndex 0) uses its own (larger, when given) budget; every
  // page after it uses the uniform `usablePageHeightPx` — see
  // `firstPageUsablePageHeightPx`'s own doc comment for why these are
  // legitimately different numbers, not the same value applied twice.
  // Forced cuts cap each fill region: content up to the next pin must fit
  // in whole pages; the pin itself is always a boundary.
  while (true) {
    const budget = pageIndex === 0 ? firstPageUsablePageHeightPx : usablePageHeightPx
    const nextForced = forced.find((f) => f > pageTop)
    const regionEnd = nextForced ?? contentHeightPx
    if (regionEnd - pageTop <= budget) {
      if (nextForced === undefined) break // tail fits — done
      cutsPx.push(nextForced)
      pageTop = nextForced
      pageIndex++
      continue
    }
    const idealY = pageTop + budget
    const windowLow = idealY - searchWindowRatio * budget
    const cutY = chooseCut(candidates, pageTop, idealY, windowLow, maxPageHeightPx, sorted)
    // The downward fallback may land at or past the pin — the pin wins
    // (it is a mandatory boundary; the auto cut would duplicate or cross it).
    if (nextForced !== undefined && cutY >= nextForced) {
      cutsPx.push(nextForced)
      pageTop = nextForced
      pageIndex++
      continue
    }
    cutsPx.push(cutY)
    pageTop = cutY
    pageIndex++
  }

  return { cutsPx, pageCount: cutsPx.length + 1, cutReasons: cutReasons.slice() }
}

/* --------------------------------------------------------- combineColumns */

/**
 * One column's `PageBlock[]` normalized into a fully-tiled span list
 * covering `[first block's topPx, last block's bottomPx]` with NO
 * unaccounted holes: explicit `'section-gap'`/`'entry-gap'` blocks keep
 * their own tier as a real span, and the natural (unmarked) space between
 * two directly-adjacent `'line'`/`'atomic'` blocks — the same implicit gap
 * `buildCandidates` above already treats as a legal lowest-tier candidate
 * within a single column — is materialized as its own `tier: 'line'` span.
 * `combineColumns` needs this dense form (rather than the sparse
 * `PageBlock[]`, whose implicit gaps have no block of their own) because
 * cross-column intersection has to test EVERY y, not just the y-ranges some
 * column happened to mark with an explicit gap block.
 */
interface ColumnSpan {
  topPx: number
  bottomPx: number
  ink: boolean
  /** set when `!ink` */
  tier?: Tier
  /** set when `ink` — mirrors the source block's own `keepWithNext` */
  keepWithNext?: boolean
}

function columnSpans(blocks: PageBlock[]): ColumnSpan[] {
  const sorted = [...blocks].sort((a, b) => a.topPx - b.topPx)
  const spans: ColumnSpan[] = []
  for (const b of sorted) {
    if (b.kind === 'section-gap' || b.kind === 'entry-gap') {
      spans.push({ topPx: b.topPx, bottomPx: b.bottomPx, ink: false, tier: b.kind })
      continue
    }
    const prev = spans[spans.length - 1]
    if (prev?.ink && b.topPx > prev.bottomPx) {
      // No gap-marker block between two adjacent ink blocks — the same
      // "line" tier buildCandidates derives implicitly for a single column.
      spans.push({ topPx: prev.bottomPx, bottomPx: b.topPx, ink: false, tier: 'line' })
    }
    spans.push({ topPx: b.topPx, bottomPx: b.bottomPx, ink: true, keepWithNext: b.keepWithNext === true })
  }
  return spans
}

/** The span covering `y` (half-open `[topPx, bottomPx)`), or the column's
 *  very last span when `y` lands exactly on its final `bottomPx` (closed at
 *  the end so the column's own last boundary point resolves to something).
 *  Plain linear scan — one résumé's worth of blocks per column, no need for
 *  anything cleverer. */
function spanAt(spans: ColumnSpan[], y: number): ColumnSpan | null {
  for (const s of spans) {
    if (y >= s.topPx && y < s.bottomPx) return s
  }
  const last = spans[spans.length - 1]
  return last && y === last.bottomPx ? last : null
}

const TIER_RANK: Record<Tier, number> = { 'section-gap': 0, 'entry-gap': 1, line: 2 }
const RANK_TIER: Tier[] = ['section-gap', 'entry-gap', 'line']

/**
 * Conservative combine of the distinct gap tiers several columns each
 * independently report for the SAME y-range (task-2b brief, worked
 * example): columns that all AGREE use that tier outright. Columns that
 * DISAGREE are trusted only ONE tier below the strongest one present — "a
 * section gap in main that overlaps mere line-gap territory in the aside is
 * an entry-tier candidate at best": section(0) vs line(2) disagree, so the
 * result is one below section, i.e. entry(1), not the full downgrade to
 * line(2). (Fix round: this used to also cap the result at the weakest tier
 * present via `Math.min(best + 1, worst)` — with exactly 3 integer ranks,
 * `worst > best` in the disagreement branch by construction, so `worst >=
 * best + 1` always holds and the cap could never actually fire; removed as
 * dead code rather than left advertising a safeguard that cannot trigger.)
 * An empty list (no in-range column has an opinion at this y — see
 * `combineColumns`'s "out of range" handling) means nothing constrains this
 * range at all: the freest tier, `'section-gap'`.
 */
function combineTiers(tiers: Tier[]): Tier {
  if (tiers.length === 0) return 'section-gap'
  const ranks = tiers.map((t) => TIER_RANK[t])
  const best = Math.min(...ranks)
  const worst = Math.max(...ranks)
  return best === worst ? RANK_TIER[best] : RANK_TIER[best + 1]
}

/**
 * Merges per-column tiled `PageBlock[]` sequences (main + aside, for a
 * two-column template) into ONE legal tiled sequence for `paginate` — task
 * 2b of the native-multipage-pdf plan: "both columns cut at the same y"
 * (spec section 1) only holds where EVERY column is clear of ink at that y.
 * A cut through main's whitespace that lands mid-sentence in the aside
 * sidebar (or vice versa) is not a legal break, no matter how good main's
 * own gap looks in isolation — this is the algorithm that constraint was
 * missing (see the plan task's own heading).
 *
 * Pure interval arithmetic in three passes:
 * 1. `columnSpans` normalizes each column's sparse `PageBlock[]` into a
 *    fully-tiled span list (see its own doc comment).
 * 2. Every span boundary from every column becomes a breakpoint; walking
 *    consecutive breakpoints gives elementary intervals over which EVERY
 *    column's own state (ink, or gapped at some tier) is constant. A column
 *    whose own content doesn't reach this y at all (before its first block,
 *    or after its last — e.g. a short aside sidebar next to a tall main
 *    column) has NO opinion here: it never contributes ink, and never
 *    constrains the tier (`combineTiers`'s empty-list case).
 * 3. An elementary interval is combined-INK if ANY column is ink there
 *    (real content sits there on the page somewhere — no shared cut is ever
 *    legal through it, regardless of what the other column is doing).
 *    Otherwise every in-range column is gapped, and `combineTiers` picks the
 *    combined tier. Adjacent elementary intervals with the identical
 *    outcome (both ink, or both gap at the identical tier) collapse into
 *    one output `PageBlock`, same as any other tiled `PageBlock[]`.
 *
 * `keepWithNext` propagates using LAST-CONTRIBUTING-SPAN-PER-COLUMN
 * semantics (fix round — matches `buildCandidates`'s own single-column
 * rule exactly, generalized across columns): a combined ink run's
 * `keepWithNext` is decided ONLY by whichever column-local span is
 * immediately adjacent to the run's own trailing edge (the boundary
 * touching the next gap) in EACH column still active there — never by
 * ORing every block the run ever absorbed on its way there. A heading
 * earlier in the SAME merged run, whose own column has since moved on to
 * ordinary content before the run ends, no longer vetoes the gap that
 * follows — exactly as a single-column heading's `keepWithNext` only ever
 * governs the ONE gap immediately after it, never a later, unrelated one.
 * Concretely: the elementary-interval scan below computes, at every
 * micro-interval, the OR of `keepWithNext` across columns ink there; the
 * merge step OVERWRITES (not ORs) a run's `keepWithNext` with each new
 * micro-interval's value as the run extends, so only the FINAL
 * (trailing-edge) micro-interval's answer survives.
 *
 * A combined GAP interval whose tier is `'line'` is never materialized as
 * its own `PageBlock` (fix round — CRITICAL): `PageBlock.kind` has no
 * distinct value for "explicit line-tier gap" — `'line'` as a `kind`
 * ALWAYS means ink to `buildCandidates` above, so emitting `{kind:'line',
 * ...}` for a gap would make `paginate` treat real, cuttable whitespace as
 * solid ink a cut must never cross (the exact opposite of correct). Instead
 * this mirrors the single-column convention exactly: the elementary
 * interval is simply skipped, leaving the ink run before it and the ink run
 * after it as two SEPARATE, directly-adjacent output blocks with a real
 * numeric gap between them — precisely the shape `buildCandidates` already
 * knows how to read as an implicit lowest-tier candidate. (The merge
 * accumulator tracks `ink: boolean` explicitly rather than ever comparing
 * `kind`/`tier` strings against each other — the previous version's `!e.ink
 * && last.kind === e.tier` check collided exactly here, since an ink run's
 * `kind` is the string `'line'` and a line-tier GAP's `tier` is also the
 * string `'line'`, so a line-tier gap immediately after a `'line'` ink run
 * satisfied that check and silently got absorbed into it — proven live by a
 * mutual `[50,150]` line-tier clearing between two all-`'line'` columns
 * collapsing to one `[0,200]` ink block and throwing
 * `PaginationImpossibleError` where a legal cut existed.)
 *
 * The `'line'` vs `'atomic'` distinction is NOT preserved on the merged
 * INK output — `paginate`'s own candidate builder treats them identically
 * (both are just "ink" a cut may never pass through), so every merged ink
 * run is emitted as `'line'` regardless of which column(s) contributed
 * atomic ink. Single-column input round-trips losslessly EXCEPT for this
 * one relabeling; callers that need true byte-stability for a single column
 * (the plan's `extractPageBlocks`) skip calling this function entirely
 * rather than relying on it being a no-op transform.
 */
export function combineColumns(columns: PageBlock[][]): PageBlock[] {
  const spansByColumn = columns.map(columnSpans).filter((spans) => spans.length > 0)
  if (spansByColumn.length === 0) return []

  const colRanges = spansByColumn.map((spans) => ({ top: spans[0].topPx, bottom: spans[spans.length - 1].bottomPx }))
  const globalTop = Math.min(...colRanges.map((r) => r.top))
  const globalBottom = Math.max(...colRanges.map((r) => r.bottom))

  const breakpointSet = new Set<number>([globalTop, globalBottom])
  for (const spans of spansByColumn) {
    for (const s of spans) {
      if (s.topPx >= globalTop && s.topPx <= globalBottom) breakpointSet.add(s.topPx)
      if (s.bottomPx >= globalTop && s.bottomPx <= globalBottom) breakpointSet.add(s.bottomPx)
    }
  }
  const breakpoints = [...breakpointSet].sort((a, b) => a - b)

  interface Elementary {
    topPx: number
    bottomPx: number
    ink: boolean
    tier?: Tier
    keepWithNext: boolean
    /** Per column: true/false when that column has INK here, undefined when
     *  it has none and therefore no opinion to contribute. */
    keepByCol: (boolean | undefined)[]
  }
  const elementary: Elementary[] = []
  for (let i = 0; i < breakpoints.length - 1; i++) {
    const a = breakpoints[i]
    const b = breakpoints[i + 1]
    if (b <= a) continue
    const mid = (a + b) / 2 // strictly interior — never ambiguous against any span's own boundary
    let ink = false
    let keepWithNext = false
    const gapTiers: Tier[] = []
    const keepByCol: (boolean | undefined)[] = spansByColumn.map(() => undefined)
    for (let ci = 0; ci < spansByColumn.length; ci++) {
      const range = colRanges[ci]
      if (mid < range.top || mid > range.bottom) continue // out of this column's own range: no opinion
      const span = spanAt(spansByColumn[ci], mid)
      if (!span) continue
      if (span.ink) {
        ink = true
        keepByCol[ci] = span.keepWithNext === true
        if (span.keepWithNext) keepWithNext = true
      } else if (span.tier) {
        gapTiers.push(span.tier)
      }
    }
    elementary.push({ topPx: a, bottomPx: b, ink, tier: ink ? undefined : combineTiers(gapTiers), keepWithNext, keepByCol })
  }

  // Runs track `ink` as an explicit boolean, never inferred from a `kind`/
  // `tier` string comparison (fix round CRITICAL fix — see the doc comment
  // above) — `PageBlock`s are only synthesized from a run at the very end,
  // once each run's full extent and final (last-contributor) keepWithNext
  // value are known.
  interface Run {
    topPx: number
    bottomPx: number
    ink: boolean
    tier?: Tier
    keepWithNext: boolean
  }
  const runs: Run[] = []
  let opinions: (boolean | undefined)[] = []
  for (const e of elementary) {
    const last = runs[runs.length - 1]
    const sameRun = last && last.bottomPx === e.topPx && last.ink === e.ink && (e.ink || last.tier === e.tier)
    if (sameRun) {
      last!.bottomPx = e.bottomPx
      // Last-contributing-span-per-column: a column that has INK here states
      // its answer and replaces its previous one; a column with NO ink here
      // has no answer to give and must leave its previous one standing.
      //
      // Overwriting the run's whole flag from this interval instead lost a
      // heading's veto the moment the OTHER column happened to still be
      // inking — measured, a skill group's name kept its keepWithNext in the
      // aside's own block list and arrived in the combined list without it,
      // so a page ended on the group name with its keywords overleaf.
      if (e.ink) {
        e.keepByCol.forEach((v, ci) => {
          if (v !== undefined) opinions[ci] = v
        })
        last!.keepWithNext = opinions.some((v) => v === true)
      }
      continue
    }
    opinions = [...e.keepByCol]
    runs.push({ ...e, keepWithNext: e.ink ? opinions.some((v) => v === true) : e.keepWithNext })
  }

  const blocks: PageBlock[] = []
  for (const r of runs) {
    if (r.ink) {
      blocks.push({
        kind: 'line',
        topPx: r.topPx,
        bottomPx: r.bottomPx,
        ...(r.keepWithNext ? { keepWithNext: true } : {}),
      })
    } else if (r.tier !== 'line') {
      blocks.push({ kind: r.tier!, topPx: r.topPx, bottomPx: r.bottomPx })
    }
    // r.tier === 'line' (implicit gap): intentionally emits nothing — see
    // the doc comment's CRITICAL fix explanation.
  }
  return blocks
}
