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
 * `[data-tour=canvas] .rm-root` itself; ResumePreview only renders this
 * overlay when NOT in that exact-preview mode (see its own comment), so the
 * two never interact.
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

export function PageChromeOverlay({
  separatorYs,
  badgeTops,
  pageCount,
  variant = 'band',
}: {
  /** Edit-space y for every separator ResumePreview.tsx could confidently
   *  place — may have FEWER entries than `pageCount - 1` when some cuts
   *  were suppressed (see this file's own top comment). */
  separatorYs: number[]
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
      {variant === 'band' &&
        separatorYs.map((cutY, i) => (
          <div
            key={`sep-${i}`}
            className="pointer-events-none absolute inset-x-0"
            style={{ top: cutY - 9, height: 18 }}
            data-page-chrome="separator"
            data-cut-y={cutY}
            aria-hidden
          >
            <div className="absolute inset-0" style={{ backgroundColor: 'hsl(var(--canvas))' }} />
            <div
              className="absolute inset-x-0 top-0 h-2"
              style={{ boxShadow: 'inset 0 5px 5px -4px rgb(0 0 0 / 0.32)' }}
            />
            <div className="absolute inset-x-0 bottom-0 border-t border-border" />
          </div>
        ))}
      {variant === 'hairline' &&
        separatorYs.map((cutY, i) => (
          <div
            key={`sep-${i}`}
            className="pointer-events-none absolute inset-x-0"
            style={{ top: cutY - 1.5, height: 3 }}
            data-page-chrome="separator"
            data-cut-y={cutY}
            aria-hidden
          >
            <div className="absolute inset-x-0 top-0 h-px" style={{ boxShadow: '0 1px 3px rgb(0 0 0 / 0.35)' }} />
            <div className="absolute inset-x-0 top-[1px] border-t border-dashed border-border" />
          </div>
        ))}

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
