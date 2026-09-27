/**
 * Paginated WYSIWYG preview overlay (native-multipage-pdf plan, task 5).
 *
 * Purely presentational: `ResumePreview.tsx` computes cut positions with the
 * SAME `paginate()` algorithm and budget functions the native PDF export
 * uses (see its own effect, which reads the live editable-canvas `.rm-root`
 * with the export's own budget functions) and hands them here as plain
 * numbers. This component only lays out the chrome — it never touches the
 * DOM the walker/gate read.
 *
 * CRITICAL: every element this renders must be a SIBLING of the artboard's
 * `.rm-root` node, never a descendant. `ResumePreview.tsx` mounts this next
 * to (not inside) the `innerRef` div that holds `<TemplateRenderer>`, inside
 * the same zoom-scaled "sheet" wrapper the old page-break guides used — so
 * cut positions (continuous CSS px measured from `.rm-root`'s own top, see
 * `PageBlock.topPx` in paginate.ts) line up as absolute `top` offsets with
 * zero extra transform math. The gate's exact-preview screenshot captures
 * `[data-tour=canvas] .rm-root` itself. Both modes use this overlay now
 * (2026-08-17 spec 2): exact preview draws hairline separators straight at
 * the portal's own cut positions, while edit mode opens REAL page gaps
 * (`data-page-start` + `--rm-page-gap`) and fills them with the band
 * variant -- see the `thin` flag on `separatorYs` entries.
 *
 * FIX ROUND 2 (task 5): separators and badges are now two INDEPENDENT
 * arrays, not one derived from the other. `pageChromeMap.ts`'s structural
 * mapping can fail for an individual cut (most commonly a two-column doc
 * where the true break was driven by the aside column) and, per that
 * finding's ruling, a separator ResumePreview.tsx could not confidently
 * place is SUPPRESSED entirely rather than drawn at a guessed position that
 * risks landing inside text — but the "Page k / N" badges stay fully
 * populated (one per page, always `pageCount` of them) since page count
 * itself is computed independently and is never in question; a badge's own
 * position is far more forgiving of an approximate y than a line drawn
 * through the page.
 */

import type { CSSProperties } from 'react'
import { pageFootText, type PageNumberStyle } from '@/lib/pageWords'

/** Height (CSS px) of the REAL gap the editor opens above each
 *  `data-page-start` element (artboard.css `--rm-page-gap` must match) —
 *  the 'band' separator fills exactly this created empty space, so it can
 *  never cover content (2026-08-17 spec 2). */
export const PAGE_GAP_PX = 28

/** The properties the canvas copies from the design's own page foot onto its
 *  copies: resolved values, since a copy stands outside `.rm-root` where the
 *  design's variables do not reach. */
const FOOT_PROPS = [
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'letter-spacing',
  'text-transform',
  'line-height',
  'color',
  'white-space',
  'display',
  'justify-content',
  'align-items',
  'column-gap',
  'padding-top',
  'border-top-width',
  'border-top-style',
  'border-top-color',
] as const

function pick(el: Element): CSSProperties {
  const cs = getComputedStyle(el)
  const out: Record<string, string> = {}
  for (const prop of FOOT_PROPS) out[prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] = cs.getPropertyValue(prop)
  return out as CSSProperties
}

/** One page's foot as the canvas draws it: where it sits and what its number
 *  says. */
export interface PageFootCopy {
  /** Page index, from 1. */
  page: number
  /** Edit-space top of the foot box. */
  top: number
}

/** The design's page foot, read once from the live canvas (where it is laid
 *  out but hidden, at the foot of the last page) so every copy matches it. */
export interface PageFootLook {
  leftPx: number
  widthPx: number
  heightPx: number
  /** From the foot box's bottom to the bottom of its page. */
  insetPx: number
  name: string
  numberStyle: PageNumberStyle
  box: CSSProperties
  nameStyle: CSSProperties
  pageStyle: CSSProperties
}

/** Reads the look of the design's foot from the edit canvas's `.rm-root`, or
 *  null when the document has none. `scale` is the canvas zoom, which the
 *  rects carry and the copies must not. */
export function readPageFoot(root: HTMLElement, scale: number): PageFootLook | null {
  const foot = root.querySelector<HTMLElement>('.rm-running .rm-pagefoot')
  const name = foot?.querySelector('.rm-pagefoot-name')
  const page = foot?.querySelector<HTMLElement>('.rm-pagefoot-page')
  if (!foot || !name || !page) return null
  const r = foot.getBoundingClientRect()
  const rootRect = root.getBoundingClientRect()
  // Measured from its own layer, which is one page tall on a single page and
  // the whole sheet on more: the same inset either way.
  const layer = foot.parentElement!.getBoundingClientRect()
  if (!r.width) return null
  return {
    leftPx: (r.left - rootRect.left) / scale,
    widthPx: r.width / scale,
    heightPx: r.height / scale,
    insetPx: (layer.bottom - r.bottom) / scale,
    name: name.textContent ?? '',
    numberStyle: (page.dataset.runPage as PageNumberStyle) || 'slash',
    box: pick(foot),
    nameStyle: pick(name),
    pageStyle: pick(page),
  }
}

export function PageChromeOverlay({
  separatorYs,
  badgeTops,
  pageCount,
  variant = 'band',
  footLook,
  feet = [],
}: {
  /** The design's page foot and where each page's copy goes (edit canvas
   *  only): the canvas draws one continuous sheet, so the foot the exporter
   *  prints on every page is drawn here, in the paper each page gap keeps
   *  for it (artboard.css --rm-foot-band). */
  footLook?: PageFootLook | null
  feet?: PageFootCopy[]
  /** Edit-space separator positions ResumePreview.tsx could confidently
   *  place — may have FEWER entries than `pageCount - 1` when some cuts
   *  were suppressed (see this file's own top comment). `y` is the CENTER
   *  of the created page gap; `thin` marks a mid-entry/low-confidence cut
   *  drawn as a hairline (no real gap exists to fill there). */
  separatorYs: { y: number; thin?: boolean }[]
  /** Edit-space y for the top of every page region, length always
   *  `pageCount` — index 0 is always `0`; later entries fall back to a
   *  coarser (but always present) estimate when the precise mapping for
   *  that boundary failed. */
  badgeTops: number[]
  pageCount: number
  /** 'band' = the editor's paper-gap look. 'hairline' = a ~3px line for the
   *  EXACT preview (2026-08-17 spec section 2): that canvas is continuous
   *  print geometry, so a tall band would COVER real content near tight
   *  cuts (user report — chips/bullets hidden behind the 18px band); the
   *  hairline marks the boundary without hiding anything. */
  variant?: 'band' | 'hairline'
}) {
  if (pageCount <= 1) return null

  return (
    <>
      {/* Separators: a subtle "gap between two sheets of paper" band at each
          cut y — the underside of the page above casts a soft inset shadow
          down into the gap, and the gap itself shows the canvas's own
          background color (the same dotted gray the sheet floats on),
          reading as genuinely separate pages rather than a ruled line. */}
      {separatorYs.map((sep, i) =>
        variant === 'band' && !sep.thin ? (
          // Fills the REAL page gap the editor opened (PAGE_GAP_PX margin on
          // the data-page-start element) — pure empty space, nothing to cover.
          <div
            key={`sep-${i}`}
            className="pointer-events-none absolute inset-x-0"
            // Inset 1px top / 2px bottom inside the created gap: fractional
            // zoom scaling rounds rects by up to ~1px, and the band must
            // NEVER touch real content even after rounding.
            style={{ top: sep.y - PAGE_GAP_PX / 2 + 1, height: PAGE_GAP_PX - 3 }}
            data-page-chrome="separator"
            data-cut-y={sep.y}
            aria-hidden
          >
            <div className="absolute inset-0" style={{ backgroundColor: 'hsl(var(--canvas))' }} />
            <div
              className="absolute inset-x-0 top-0 h-2"
              style={{ boxShadow: 'inset 0 5px 5px -4px rgb(0 0 0 / 0.32)' }}
            />
            <div className="absolute inset-x-0 bottom-0 border-t border-border" />
          </div>
        ) : (
          <div
            key={`sep-${i}`}
            className="pointer-events-none absolute inset-x-0"
            style={{ top: sep.y - 1.5, height: 3 }}
            data-page-chrome="separator"
            data-cut-y={sep.y}
            aria-hidden
          >
            <div className="absolute inset-x-0 top-0 h-px" style={{ boxShadow: '0 1px 3px rgb(0 0 0 / 0.35)' }} />
            <div className="absolute inset-x-0 top-[1px] border-t border-dashed border-border" />
          </div>
        )
      )}

      {footLook
        ? feet.map((f) => (
            <div
              key={`foot-${f.page}`}
              className="pointer-events-none absolute"
              style={{
                ...footLook.box,
                left: footLook.leftPx,
                width: footLook.widthPx,
                height: footLook.heightPx,
                top: f.top,
                boxSizing: 'border-box',
              }}
              data-page-chrome="foot"
              data-page-index={f.page}
              aria-hidden
            >
              <span style={footLook.nameStyle}>{footLook.name}</span>
              <span style={footLook.pageStyle}>{pageFootText(f.page, pageCount, footLook.numberStyle)}</span>
            </div>
          ))
        : null}

      {/* "Page k / N" chip, top-right of every page region (incl. page 1) --
          always pageCount of these regardless of how many separators drew. */}
      {badgeTops.map((top, i) => (
        <div
          key={`badge-${i}`}
          className="pointer-events-none absolute right-2.5 rounded-full border border-border bg-surface/90 px-2 py-0.5 text-[10px] font-medium text-muted-foreground shadow-soft backdrop-blur-sm"
          style={{ top: top + 10 }}
          data-page-chrome="badge"
          data-page-index={i + 1}
          data-page-count={pageCount}
          aria-hidden
        >
          Page {i + 1} / {pageCount}
        </div>
      ))}
    </>
  )
}
