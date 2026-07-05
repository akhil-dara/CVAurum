import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { ResumeDocument } from '@/types/document'
import { PAGE_DIMENSIONS } from '@/types/metadata'
import { PreviewThumb } from './PreviewThumb'

/** Can this device hover at all? (touch screens get taps, not flyouts) */
const canHover = () =>
  typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches

/**
 * Wraps a template card; after a short dwell on desktop it floats a LARGE
 * render of the same document beside the card so the design can actually be
 * judged — thumbnails are too small to read.
 */
export function HoverZoom({
  doc,
  label,
  children,
  width = 380,
}: {
  doc: ResumeDocument
  label?: string
  children: ReactNode
  width?: number
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const timer = useRef<number>()
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  const { w: pageW, h: pageH } = PAGE_DIMENSIONS[doc.metadata.page.format]
  const previewH = (width * pageH) / pageW + (label ? 30 : 0)

  const show = () => {
    if (!canHover() || !wrapRef.current) return
    const r = wrapRef.current.getBoundingClientRect()
    const fitsRight = r.right + 12 + width < window.innerWidth
    const left = fitsRight ? r.right + 12 : Math.max(8, r.left - width - 12)
    const top = Math.min(Math.max(8, r.top - 40), Math.max(8, window.innerHeight - previewH - 8))
    setPos({ top, left })
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
            <div style={{ height: (width * pageH) / pageW }} className="overflow-hidden">
              <PreviewThumb doc={doc} width={width} />
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
