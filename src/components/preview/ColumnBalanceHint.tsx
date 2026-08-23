/**
 * Column-balance hint (2026-08-19, user observation: "space is getting
 * wasted").
 *
 * A two-column résumé slices a continuous layout into page bands — it never
 * reflows — so when the sidebar's content ends before the main column's, the
 * rest of that column stays empty. On a paginated résumé this is severe: the
 * sidebar finishes on page 1 and every later page carries an empty coloured
 * stripe down a THIRD of the paper. Measured on the stock templates the tail
 * runs from 2% (verdant) to 19% (creative) of a single-page document, and
 * approaches a full column per page once the résumé paginates.
 *
 * The layout engine cannot fix this by itself (reflowing content between
 * columns would break the "what you see is what prints" guarantee this whole
 * renderer is built on), but the USER can: moving one section across fills
 * the gap. So the editor points at the empty space and offers to do it — one
 * click, using the same `moveSectionTo` helper the panel and the section
 * arrows already share.
 *
 * Pure edit chrome: rendered as a sibling of the artboard inside the sheet,
 * never inside `.rm-root`, so the print DOM and every export are untouched.
 */
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Columns2, X } from 'lucide-react'
import { useResumeStore } from '@/store/useResumeStore'
import { moveSectionTo, sectionLabel } from '@/lib/sections'
import type { ResumeDocument } from '@/types/document'

/**
 * Sections that carry the résumé's narrative and must keep the wide column:
 * a work history or a project write-up squeezed into a third-width sidebar
 * wraps every line to three words and reads terribly, so they are never
 * suggested — even though the user can still move them by hand from the
 * section's own controls.
 */
const KEEP_IN_MAIN = new Set(['summary', 'work', 'projects', 'volunteer', 'publications'])

/** Below this the gap is just ordinary ragged-bottom slack, not waste. */
const MIN_TAIL_PX = 170
/** ...and it must also be a meaningful share of the document. */
const MIN_TAIL_FRACTION = 0.12

interface Gap {
  topPx: number
  leftPx: number
  widthPx: number
  heightPx: number
}

export function ColumnBalanceHint({
  rootRef,
  doc,
}: {
  rootRef: RefObject<HTMLDivElement | null>
  doc: ResumeDocument
}) {
  const [gap, setGap] = useState<Gap | null>(null)
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const raf = useRef<number | null>(null)

  const twoCol = doc.metadata.layout.columns === 2
  const movable = useMemo(
    () => doc.metadata.layout.main.filter((k) => !KEEP_IN_MAIN.has(k)),
    [doc.metadata.layout.main]
  )

  useEffect(() => {
    setDismissed(false)
    setOpen(false)
  }, [doc.metadata.layout.columns])

  useEffect(() => {
    if (!twoCol || dismissed) {
      setGap(null)
      return
    }
    const measure = () => {
      const root = rootRef.current?.querySelector<HTMLElement>('.rm-root')
      const aside = root?.querySelector<HTMLElement>('.rm-col-aside')
      if (!root || !aside) return setGap(null)
      const rootRect = root.getBoundingClientRect()
      // Layout px, so the sheet's zoom transform cannot skew the numbers
      // (the same normalisation the page-gap overlay uses).
      const scale = root.offsetWidth ? rootRect.width / root.offsetWidth : 1
      if (!(scale > 0)) return setGap(null)
      const kids = [...aside.children].filter((c) => c.getBoundingClientRect().height > 1)
      if (!kids.length) return setGap(null)
      const asideRect = aside.getBoundingClientRect()
      const contentBottom = Math.max(...kids.map((c) => c.getBoundingClientRect().bottom))
      const tailPx = (asideRect.bottom - contentBottom) / scale
      const docPx = rootRect.height / scale
      if (tailPx < MIN_TAIL_PX || tailPx / docPx < MIN_TAIL_FRACTION) return setGap(null)
      setGap({
        topPx: (contentBottom - rootRect.top) / scale,
        leftPx: (asideRect.left - rootRect.left) / scale,
        widthPx: asideRect.width / scale,
        heightPx: tailPx,
      })
    }
    // After layout settles — the artboard restyles on every doc change.
    if (raf.current) cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => requestAnimationFrame(measure))
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [doc, twoCol, dismissed, rootRef])

  if (!gap || !movable.length) return null

  const moveToSidebar = (key: string) => {
    useResumeStore.getState().updateMetadata((m) => {
      moveSectionTo(m.layout, key, 'aside', m.layout.aside.length)
    })
    setOpen(false)
  }

  return (
    <div
      className="no-print absolute z-[7] flex flex-col items-center justify-start"
      style={{ top: gap.topPx, left: gap.leftPx, width: gap.widthPx, height: gap.heightPx }}
      data-column-balance-hint
    >
      <div className="mt-3 flex w-full flex-col items-center px-2">
        <button
          type="button"
          className="flex max-w-full items-center gap-1.5 rounded-full border border-dashed border-current/40 bg-surface/85 px-2.5 py-1 text-[11px] font-medium text-foreground shadow-sm backdrop-blur transition hover:border-primary hover:text-primary"
          onClick={() => setOpen((v) => !v)}
          title="This column has empty space — move a section into it"
        >
          <Columns2 className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{Math.round(gap.heightPx)}px free — fill it?</span>
        </button>
        {open && (
          <div className="mt-1.5 w-full max-w-[190px] rounded-lg border border-border bg-surface p-1 text-left shadow-float">
            <div className="flex items-center justify-between px-1.5 py-1">
              <span className="text-[10.5px] uppercase tracking-wide text-muted-foreground">Move to sidebar</span>
              <button className="btn-icon h-5 w-5" onClick={() => setDismissed(true)} aria-label="Dismiss">
                <X className="h-3 w-3" />
              </button>
            </div>
            <div className="max-h-40 overflow-y-auto">
              {movable.map((key) => (
                <button
                  key={key}
                  type="button"
                  className="block w-full truncate rounded px-1.5 py-1 text-left text-[11.5px] hover:bg-muted/60"
                  onClick={() => moveToSidebar(key)}
                >
                  {sectionLabel(key, doc)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
