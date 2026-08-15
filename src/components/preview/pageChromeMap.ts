/**
 * Structural (not pixel) mapping from print-mode paginate() cuts onto the
 * corresponding y in the editable canvas — native-multipage-pdf plan, task 5
 * fix round(s). See ResumePreview.tsx's own top comment for WHY this exists:
 * the editable canvas and the print-mode DOM are NOT the same height for
 * identical content (the editable canvas renders real, on-screen inline-
 * editing affordances — delete buttons, "+ Add" rows, per-chip edit controls
 * — that the print-mode DOM never has, confirmed empirically to run 1.5-1.7x
 * taller for ordinary content), so a print-space y cannot be reused directly
 * as an edit-space y.
 *
 * The fix: identify WHICH element (by stable structural identity — section
 * `data-section` key + entry index within that section, never raw position
 * or pixel y) a cut falls between, using ONLY a print-mode blocks array
 * (the SAME data that decided the cut), then look up the EDIT-mode DOM's
 * copy of those same two elements and take the midpoint of THEIR (edit-
 * space) gap.
 *
 * SINGLE-COLUMN callers pass `extractPageBlocks(printRoot)`'s own output
 * (the combined — and, for single-column docs, ONLY — list) with anchors
 * collected from the whole root.
 *
 * TWO-COLUMN callers (fix round 2 — native-multipage-pdf plan, task 5):
 * `extractPageBlocks`'s COMBINED list interleaves main/aside columns via
 * `combineColumns` (paginate.ts) into one merged gap sequence, where a
 * combined gap can straddle two DIFFERENT columns' content — counting its
 * section-gap/entry-gap blocks the way `locateStructural` below does would
 * not reliably name one real section. Pass `extractMainColumnBlocks
 * (printRoot)` (walk.ts) instead — the MAIN column's own, pre-merge block
 * list, in the SAME coordinate space the combined cuts are (both measured
 * from `printRoot`'s own top) — with anchors collected from just the main
 * column element on both sides. The aside is deliberately never consulted:
 * separators are full-width lines, and main is the one column every
 * template always renders. When the main column has already ended before a
 * cut (the cut was really driven by a longer aside), or a cut otherwise
 * can't be attributed to one main-column gap, `mapCutToEditSpace` returns
 * `null` — callers suppress that ONE separator rather than draw an
 * estimated line that risks landing inside text (a missing line beats a
 * wrong line), while the page-count badges (computed independently, from
 * the combined result) are unaffected.
 */
import type { PageBlock } from '@/lib/pdf/paginate'

export interface SectionAnchors {
  key: string
  section: Element
  entries: Element[]
}

interface StructuralLocation {
  sectionIndex: number
  /** -1 = still within the section's own title, before its first entry. */
  entryIndex: number
}

/** `.rm-section` elements in document order, each with its own entry
 *  elements (`.rm-item`/`.rm-skill-group`/`.rm-mini` — the SAME vocabulary
 *  walk.ts's `ENTRY_CLASSES` uses) in document order. Sections without a
 *  `data-section` key (should not happen — `Section()` in Artboard.tsx
 *  always sets it) are skipped rather than breaking the whole mapping. */
export function collectSectionAnchors(root: HTMLElement): SectionAnchors[] {
  const out: SectionAnchors[] = []
  for (const section of Array.from(root.querySelectorAll<HTMLElement>('.rm-section'))) {
    const key = section.getAttribute('data-section')
    if (!key) continue
    out.push({
      key,
      section,
      entries: Array.from(section.querySelectorAll<HTMLElement>('.rm-item, .rm-skill-group, .rm-mini')),
    })
  }
  return out
}

/** `collectSectionAnchors`, keyed by `data-section` — the editable canvas
 *  can render extra, fully-EMPTY sections the print-mode DOM never does
 *  (`resolveOrder`'s `includeEmpty`, edit-mode only), which would desync a
 *  positional (Nth section) lookup between the two trees; matching by the
 *  section's own semantic key sidesteps that entirely. Entries themselves
 *  are never filtered per-mode (every `content.<section>.map(...)` in
 *  sections.tsx renders unconditionally on the mode), so a per-section
 *  entry array's positional index IS safe to reuse across both trees once
 *  the section itself is correctly matched. */
export function collectSectionAnchorsByKey(root: HTMLElement): Map<string, SectionAnchors> {
  const map = new Map<string, SectionAnchors>()
  for (const a of collectSectionAnchors(root)) map.set(a.key, a)
  return map
}

/** Walks `blocks` up to (and including) index `idx`, counting section-gap/
 *  entry-gap blocks crossed. Mirrors walk.ts's own construction exactly
 *  (`extractBlocksFromScope` / `extractSectionBlocks`): a `section-gap`
 *  always precedes the NEXT section's own blocks, and an `entry-gap` always
 *  precedes each entry — INCLUDING entry 0 (there is always an entry-gap
 *  between a section's title and its first entry, since the title block is
 *  always present). */
function locateStructural(blocks: PageBlock[], idx: number): StructuralLocation {
  let sectionIndex = 0
  let entryIndex = -1
  for (let i = 0; i <= idx; i++) {
    if (blocks[i].kind === 'section-gap') {
      sectionIndex++
      entryIndex = -1
    } else if (blocks[i].kind === 'entry-gap') {
      entryIndex++
    }
  }
  return { sectionIndex, entryIndex }
}

function isGapBlock(b: PageBlock): boolean {
  return b.kind === 'section-gap' || b.kind === 'entry-gap'
}

/** The two REAL content blocks (never a gap-kind block itself) straddling
 *  `cutY` — paginate.ts's own cut contract (a gap-block's own midpoint, or
 *  the midpoint between two directly-adjacent line/atomic blocks) guarantees
 *  scanning for the first block starting after the cut, then backing up past
 *  any gap-kind block, lands on real content on both sides. */
function straddlingContentIndices(blocks: PageBlock[], cutY: number): { beforeIdx: number; afterIdx: number } | null {
  const EPS = 0.05
  let afterIdx = blocks.findIndex((b) => b.topPx > cutY + EPS)
  if (afterIdx === -1) afterIdx = blocks.length
  while (afterIdx < blocks.length && isGapBlock(blocks[afterIdx])) afterIdx++
  let beforeIdx = afterIdx - 1
  while (beforeIdx >= 0 && isGapBlock(blocks[beforeIdx])) beforeIdx--
  if (beforeIdx < 0 || afterIdx >= blocks.length) return null
  return { beforeIdx, afterIdx }
}

function rootRelativeRect(root: HTMLElement, el: Element): { topPx: number; bottomPx: number } {
  const rootTop = root.getBoundingClientRect().top
  const r = el.getBoundingClientRect()
  return { topPx: r.top - rootTop, bottomPx: r.bottom - rootTop }
}

/** Guards the assumption `locateStructural` relies on — "there is always an
 *  entry-gap between a section's title and its first entry" — which only
 *  holds when the section's title block genuinely exists and renders at
 *  real height (`extractSectionBlocks` in walk.ts only pushes that
 *  leading entry-gap when its own title lookup found one). `Section()` in
 *  Artboard.tsx always renders a `.rm-section-title`, so this should not
 *  fire in practice, but this reads LIVE, user-typed-content DOM — never
 *  assume. Fix round 2 (native-multipage-pdf plan, task 5, minor finding):
 *  a missing/zero-height title means `locateStructural`'s entry-index count
 *  for that section cannot be trusted, so callers treat it as a lookup
 *  failure (suppress the separator) rather than trust a possibly off-by-one
 *  position. */
function hasHealthyTitle(section: Element): boolean {
  const title = section.querySelector('.rm-section-title')
  return !!title && (title as HTMLElement).getBoundingClientRect().height > 0
}

/** The DOM element representing `loc` within `anchors` (same tree the
 *  `blocks` array `loc` was computed from) — the section itself when
 *  `entryIndex < 0` (still within the title), else that entry. */
function locationElement(anchors: SectionAnchors[], loc: StructuralLocation): Element | null {
  const s = anchors[loc.sectionIndex]
  if (!s) return null
  if (loc.entryIndex < 0) return s.section
  return s.entries[loc.entryIndex] ?? null
}

/** `printAnchors[loc.sectionIndex]`'s edit-mode counterpart, found by
 *  `data-section` key, then `loc.entryIndex` within it. */
function locationElementAcross(
  printAnchors: SectionAnchors[],
  editAnchorsByKey: Map<string, SectionAnchors>,
  loc: StructuralLocation,
): Element | null {
  const printSection = printAnchors[loc.sectionIndex]
  if (!printSection) return null
  const editSection = editAnchorsByKey.get(printSection.key)
  if (!editSection) return null
  if (loc.entryIndex < 0) return editSection.section
  return editSection.entries[loc.entryIndex] ?? null
}

/**
 * Maps ONE print-space cut to an edit-space y. `printBlocks`/`printAnchors`
 * are whatever ONE column's own block list + anchors the caller is
 * attributing this cut against (the combined list for single-column docs;
 * `extractMainColumnBlocks`'s main-only list for two-column docs — see this
 * module's own top comment). Returns `null` when the structural
 * correspondence can't be established confidently — the cut doesn't fall
 * within this block list's own span at all (e.g. a two-column cut driven
 * entirely by a longer aside), or the healthy-title guard above trips.
 * Per the fix-round-2 ruling, callers SUPPRESS the separator on `null`
 * rather than draw an estimated line that risks landing inside text — a
 * missing line beats a wrong line.
 */
export function mapCutToEditSpace(
  printBlocks: PageBlock[],
  cutY: number,
  printRoot: HTMLElement,
  printAnchors: SectionAnchors[],
  editRoot: HTMLElement,
  editAnchorsByKey: Map<string, SectionAnchors>,
): number | null {
  const straddle = straddlingContentIndices(printBlocks, cutY)
  if (!straddle) return null
  const before = locateStructural(printBlocks, straddle.beforeIdx)
  const after = locateStructural(printBlocks, straddle.afterIdx)

  const beforeSection = printAnchors[before.sectionIndex]?.section
  const afterSection = printAnchors[after.sectionIndex]?.section
  if (!beforeSection || !afterSection || !hasHealthyTitle(beforeSection) || !hasHealthyTitle(afterSection)) {
    return null
  }

  // Same entry on both sides: a rare line-gap cut mid-entry (the oversized-
  // entry / tight-window fallback, spec 1 rule 3). Interpolate
  // proportionally within that ONE entry's own edit-space rect, by the
  // fraction-of-entry-height the cut sits at in print space — the
  // reasonable estimate without assuming edit/print line-wrap parity
  // (confirmed they CAN diverge — see ResumePreview.tsx's top comment).
  if (before.sectionIndex === after.sectionIndex && before.entryIndex === after.entryIndex) {
    const printEl = locationElement(printAnchors, before)
    const editEl = locationElementAcross(printAnchors, editAnchorsByKey, before)
    if (!printEl || !editEl) return null
    const printRect = rootRelativeRect(printRoot, printEl)
    const editRect = rootRelativeRect(editRoot, editEl)
    const printSpan = printRect.bottomPx - printRect.topPx
    if (printSpan <= 0.01) return editRect.topPx
    const fraction = Math.min(1, Math.max(0, (cutY - printRect.topPx) / printSpan))
    return editRect.topPx + fraction * (editRect.bottomPx - editRect.topPx)
  }

  const editBeforeEl = locationElementAcross(printAnchors, editAnchorsByKey, before)
  const editAfterEl = locationElementAcross(printAnchors, editAnchorsByKey, after)
  if (!editBeforeEl || !editAfterEl) return null
  const editBeforeRect = rootRelativeRect(editRoot, editBeforeEl)
  const editAfterRect = rootRelativeRect(editRoot, editAfterEl)
  return (editBeforeRect.bottomPx + editAfterRect.topPx) / 2
}
