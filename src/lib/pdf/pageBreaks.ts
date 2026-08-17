/**
 * Resolves user-pinned page breaks (`metadata.page.breaks`, 2026-08-17 spec)
 * to forced cut positions in a live document tree. BOTH consumers use this
 * on their own print-geometry root — render.tsx on its off-screen export
 * sheet, ResumePreview on the print-measure portal — so the export and the
 * preview derive identical forced cuts from identical geometry (the same
 * WYSIWYG-parity argument paginate() itself rests on).
 *
 * A pin names a section (`data-section`, the anchor contract pageChromeMap
 * established) or one entry inside it (`data-item-id`, the content item's
 * own stable id — stamped by sections.tsx on every entry wrapper). The
 * forced cut lives in the GAP immediately above the target: the midpoint
 * between the previous rendered sibling's bottom and the target's top.
 * Unresolvable pins (target deleted/hidden/zero-height) contribute nothing —
 * paginate() additionally drops any forced cut that lands illegally, so a
 * stale pin can never corrupt an export.
 */
import type { PageBreakPin } from '@/types/metadata'

function previousRenderedSibling(el: Element): Element | null {
  let sib = el.previousElementSibling
  while (sib && (sib as HTMLElement).getBoundingClientRect().height <= 0) sib = sib.previousElementSibling
  return sib
}

export function resolveForcedCutsPx(root: HTMLElement, pins: PageBreakPin[]): number[] {
  if (!pins.length) return []
  const rootTop = root.getBoundingClientRect().top
  const out = new Set<number>()
  for (const pin of pins) {
    const section = root.querySelector<HTMLElement>(`.rm-section[data-section="${CSS.escape(pin.section)}"]`)
    if (!section) continue
    let target: HTMLElement | null = section
    if (pin.itemId) {
      target = section.querySelector<HTMLElement>(`[data-item-id="${CSS.escape(pin.itemId)}"]`)
      if (!target) continue
    }
    const rect = target.getBoundingClientRect()
    if (rect.height <= 0) continue
    const prev = previousRenderedSibling(target)
    const prevBottom = prev ? prev.getBoundingClientRect().bottom : rect.top
    const gapTop = Math.min(prevBottom, rect.top)
    const y = (gapTop + rect.top) / 2 - rootTop
    if (y > 0) out.add(y)
  }
  return [...out].sort((a, b) => a - b)
}
