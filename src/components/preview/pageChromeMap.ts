/**
 * Structural (not pixel) mapping from print-mode paginate() cuts onto the
 * corresponding y in the editable canvas — native-multipage-pdf plan, task 5
 * fix round. See ResumePreview.tsx's own top comment for WHY this exists:
 * the editable canvas and the print-mode DOM are NOT the same height for
 * identical content (the editable canvas renders real, on-screen inline-
 * editing affordances — delete buttons, "+ Add" rows, per-chip edit controls
 * — that the print-mode DOM never has, confirmed empirically to run 1.5-1.7x
 * taller for ordinary content), so a print-space y cannot be reused directly
 * as an edit-space y.
 *
 * The fix: identify WHICH element (by stable structural identity — section
 * `data-section` key + entry index within that section, never raw position
 * or pixel y) a cut falls between, using ONLY the print-mode blocks array
 * (the SAME data that decided the cut), then look up the EDIT-mode DOM's
 * copy of those same two elements and take the midpoint of THEIR (edit-
 * space) gap.
 *
 * SCOPE: precise for single-column documents (no `.rm-col-aside`). Two-
 * column layouts fall back to a coarser proportional scale in
 * ResumePreview.tsx (see its own comment) — `extractPageBlocks` interleaves
 * main/aside columns via `combineColumns` (paginate.ts) into one merged gap
 * sequence, and a combined gap does not correspond to a single section's own
 * boundary the way a single-column gap always does, so counting section-gap/
 * entry-gap blocks the way `locateStructural` below does would not reliably
 * name one real section.
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
 * Maps ONE print-space cut to an edit-space y. Returns `null` when the
 * structural correspondence can't be established confidently (should not
 * happen for a consistent single-render snapshot of the same doc, but this
 * is live, user-typed content — callers fall back to a coarser estimate
 * rather than trusting a wrong position).
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
