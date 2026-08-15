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
 */

/** One horizontal cut plus a running page counter, in continuous CSS px
 *  (document space, same coordinate system `.rm-root`'s own children lay out
 *  in) — everything needed to draw the separators and badges. */
export function PageChromeOverlay({ cutsPx, pageCount }: { cutsPx: number[]; pageCount: number }) {
  if (pageCount <= 1 || cutsPx.length === 0) return null

  const pageTops = [0, ...cutsPx]

  return (
    <>
      {/* Separators: a subtle "gap between two sheets of paper" band at each
          cut y — the underside of the page above casts a soft inset shadow
          down into the gap, and the gap itself shows the canvas's own
          background color (the same dotted gray the sheet floats on),
          reading as genuinely separate pages rather than a ruled line. */}
      {cutsPx.map((cutY, i) => (
        <div
          key={`sep-${i}`}
          className="pointer-events-none absolute inset-x-0"
          style={{ top: cutY - 9, height: 18 }}
          data-page-chrome="separator"
          data-cut-y={cutY}
          aria-hidden
        >
          <div className="absolute inset-0" style={{ backgroundColor: 'hsl(var(--canvas))' }} />
          <div className="absolute inset-x-0 top-0 h-2" style={{ boxShadow: 'inset 0 5px 5px -4px rgb(0 0 0 / 0.32)' }} />
          <div className="absolute inset-x-0 bottom-0 border-t border-border" />
        </div>
      ))}

      {/* "Page k / N" chip, top-right of every page region (incl. page 1). */}
      {pageTops.map((top, i) => (
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
