import { startTransition, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { ResumeDocument } from '@/types/document'
import { PAGE_DIMENSIONS } from '@/types/metadata'
import { PAGE_IMAGE_WIDTH } from '@/data/pageImages'
import { PreviewThumb } from './PreviewThumb'

/** Can this device hover at all? (touch screens get taps, not flyouts) */
const canHover = () =>
  typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches

/**
 * Wraps a card; after a short dwell on desktop it floats a LARGER view of the
 * same page beside it, because a grid thumbnail is too small to judge a design.
 *
 * Two ways to say what to float, and which one a caller can use is decided by
 * what the card is showing:
 *
 *  - `doc` renders the résumé live. The editor's own template gallery needs
 *    this: it previews the document being edited, which no file on disk
 *    knows about. It costs a 200-350ms mount per hover, which is why the pop
 *    is a transition — as an urgent update it froze the pointer for that long.
 *  - `src` + `height` float the page PICTURE the card is already showing. The
 *    public walls use this: the file is in the browser's cache by the time
 *    anyone dwells on the card, so the flyout costs a decode — which is only
 *    true while it is the SAME file, so the walls pass their 520px grid twin
 *    here too and `srcWidth` says so. A flyout is 380 CSS px wide; fetching
 *    the 1200px picture for it would put a 100 KB download on a hover.
 */
type HoverZoomProps = { label?: string; children: ReactNode; width?: number } & (
  | { doc: ResumeDocument; src?: never; height?: never; srcWidth?: never }
  | { src: string; height: number; srcWidth?: number; doc?: never }
)

export function HoverZoom({
  doc,
  src,
  height,
  srcWidth = PAGE_IMAGE_WIDTH,
  label,
  children,
  width = 380,
}: HoverZoomProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const timer = useRef<number>()
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  // A picture carries its own shape; a document's comes from its page format.
  const ratio = doc
    ? PAGE_DIMENSIONS[doc.metadata.page.format].h / PAGE_DIMENSIONS[doc.metadata.page.format].w
    : (height as number) / srcWidth
  const pageH = width * ratio
  const previewH = pageH + (label ? 30 : 0)

  const show = () => {
    if (!canHover() || !wrapRef.current) return
    const r = wrapRef.current.getBoundingClientRect()
    const fitsRight = r.right + 12 + width < window.innerWidth
    const left = fitsRight ? r.right + 12 : Math.max(8, r.left - width - 12)
    const top = Math.min(Math.max(8, r.top - 40), Math.max(8, window.innerHeight - previewH - 8))
    // See the note above: only the live path is expensive, and only it needs
    // React to yield to the pointer before the pop lands.
    if (doc) startTransition(() => setPos({ top, left }))
    else setPos({ top, left })
  }
  const onEnter = () => {
    timer.current = window.setTimeout(show, 220)
  }
  const hide = () => {
    window.clearTimeout(timer.current)
    setPos(null)
  }
  useEffect(() => () => window.clearTimeout(timer.current), [])

  // Chrome fires no mouseleave when content scrolls under a still cursor — the
  // flyout would linger at stale coordinates. Any scroll dismisses it.
  useEffect(() => {
    if (!pos) return
    const onScroll = () => setPos(null)
    window.addEventListener('scroll', onScroll, { capture: true, passive: true })
    return () => window.removeEventListener('scroll', onScroll, { capture: true })
  }, [pos])

  return (
    <div ref={wrapRef} onMouseEnter={onEnter} onMouseLeave={hide} onMouseDown={hide}>
      {children}
      {pos &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[70] overflow-hidden rounded-xl border border-border bg-white shadow-float zoom-pop"
            style={{ top: pos.top, left: pos.left, width }}
            aria-hidden
          >
            <div style={{ height: pageH }} className="overflow-hidden">
              {doc ? (
                <PreviewThumb doc={doc} width={width} />
              ) : (
                <img src={src} width={srcWidth} height={height} alt="" decoding="async" style={{ width, height: pageH }} />
              )}
            </div>
            {label && (
              <div className="border-t border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground">{label}</div>
            )}
          </div>,
          document.body,
        )}
    </div>
  )
}
