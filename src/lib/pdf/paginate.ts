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
  // Nothing legal in the window at any tier: scan DOWNWARD, but keep the
  // SAME tier preference the primary scan uses — a farther section gap must
  // still beat a nearer entry/line gap once past the ideal boundary. Tier
  // preference is the feature, not just a within-window heuristic, so within
  // each tier take the NEAREST (smallest y) candidate past the ideal, and
  // only move to the next tier if this one has nothing past the ideal at
  // all.
  for (const tier of TIER_PREFERENCE) {
    let nearest: number | undefined
    for (const c of candidates) {
      if (c.tier !== tier || c.y <= idealY) continue
      if (nearest === undefined || c.y < nearest) nearest = c.y
    }
    if (nearest !== undefined) return nearest
  }
  throw new PaginationImpossibleError('No legal page-break candidate exists for this document')
}

export function paginate(input: PaginationInput): Pagination {
  const {
    blocks,
    contentHeightPx,
    usablePageHeightPx,
    firstPageUsablePageHeightPx = usablePageHeightPx,
    searchWindowRatio = DEFAULT_SEARCH_WINDOW_RATIO,
  } = input

  if (contentHeightPx <= firstPageUsablePageHeightPx) return { cutsPx: [], pageCount: 1 }

  const sorted = [...blocks].sort((a, b) => a.topPx - b.topPx)
  const candidates = buildCandidates(sorted).filter((c) => !fallsInsideInk(c.y, sorted))

  const cutsPx: number[] = []
  let pageTop = 0
  let pageIndex = 0
  // Page 1 (pageIndex 0) uses its own (larger, when given) budget; every
  // page after it uses the uniform `usablePageHeightPx` — see
  // `firstPageUsablePageHeightPx`'s own doc comment for why these are
  // legitimately different numbers, not the same value applied twice.
  while (true) {
    const budget = pageIndex === 0 ? firstPageUsablePageHeightPx : usablePageHeightPx
    if (contentHeightPx - pageTop <= budget) break
    const idealY = pageTop + budget
    const windowLow = idealY - searchWindowRatio * budget
    const cutY = chooseCut(candidates, pageTop, idealY, windowLow)
    cutsPx.push(cutY)
    pageTop = cutY
    pageIndex++
  }

  return { cutsPx, pageCount: cutsPx.length + 1 }
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
    for (let ci = 0; ci < spansByColumn.length; ci++) {
      const range = colRanges[ci]
      if (mid < range.top || mid > range.bottom) continue // out of this column's own range: no opinion
      const span = spanAt(spansByColumn[ci], mid)
      if (!span) continue
      if (span.ink) {
        ink = true
        if (span.keepWithNext) keepWithNext = true
      } else if (span.tier) {
        gapTiers.push(span.tier)
      }
    }
    elementary.push({ topPx: a, bottomPx: b, ink, tier: ink ? undefined : combineTiers(gapTiers), keepWithNext })
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
  for (const e of elementary) {
    const last = runs[runs.length - 1]
    const sameRun = last && last.bottomPx === e.topPx && last.ink === e.ink && (e.ink || last.tier === e.tier)
    if (sameRun) {
      last!.bottomPx = e.bottomPx
      // Last-contributing-span-per-column (fix round HIGH fix): OVERWRITE,
      // never OR — only the micro-interval immediately touching the run's
      // trailing edge decides the run's final keepWithNext.
      if (e.ink) last!.keepWithNext = e.keepWithNext
      continue
    }
    runs.push({ ...e })
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
