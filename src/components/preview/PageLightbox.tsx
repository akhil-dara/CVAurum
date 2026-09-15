/**
 * See it big.
 *
 * A grid card is 260px wide; a résumé is not readable at 260px. Until now the
 * only way to judge one was to leave the page — /examples/<slug> or
 * /templates/<id> — or, on a desk only, to hover and wait for a flyout barely
 * larger than the card. A phone had neither: hover does not exist there, and
 * the card's own actions are behind a hover reveal.
 *
 * So the picture opens. The same 1200px page image the card already fetched,
 * shown at whatever the window allows, with the two things a reader wants from
 * it next — start from this one, or read about it — inside the dialog rather
 * than behind it.
 *
 * One-handed on a phone: every control is in the bar at the BOTTOM, in the
 * thumb's arc. The close in the top corner is for a desk, where the pointer
 * has no arc, and is display:none below `sm` — which also keeps it out of the
 * focus trap's tab ring rather than leaving an invisible stop in it. A
 * horizontal swipe walks the collection, because a phone reader will try it
 * before they find the arrows.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Wand2, X } from 'lucide-react'
import { PAGE_IMAGE_WIDTH } from '@/data/pageImages'
import { cn } from '@/lib/utils'

export interface LightboxItem {
  /** The page picture — the 1200px file, not a thumbnail of it. */
  src: string
  height: number
  alt: string
  /** The job, or the design's name. */
  title: string
  /** Career stage, region, the design it is set in — whatever names this one. */
  caption: string
  aboutHref: string
  aboutLabel: string
  useLabel: string
  onUse: () => void
}

/**
 * Where a step lands. The collection wraps, so "next" from the last card is
 * the first — a wall of 108 has no natural end for someone walking it, and a
 * dead arrow at either end reads as a broken control.
 */
export function stepIndex(index: number, delta: number, length: number): number {
  if (length < 1) return 0
  return (((index + delta) % length) + length) % length
}

/**
 * Did that gesture mean "the next one"?
 *
 * A thumb scrolling the page drifts sideways, and a swipe that counted every
 * drift would walk the collection while someone was reading one. So: past 55px
 * of travel, and at least half again as far across as down.
 */
export function isSwipe(dx: number, dy: number): boolean {
  return Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5
}

/** Everything a keyboard can land on. Elements inside a `hidden` parent are
 *  display:none and never match `:not([hidden])`-style queries by themselves,
 *  so offsetParent is what actually filters them out. */
function focusables(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter(
    (el) => el.offsetParent !== null || el === document.activeElement
  )
}

export function PageLightbox({
  items,
  index,
  onIndex,
  onClose,
}: {
  items: readonly LightboxItem[]
  index: number
  onIndex: (next: number) => void
  onClose: () => void
}) {
  const panel = useRef<HTMLDivElement>(null)
  const restore = useRef<Element | null>(null)
  const touch = useRef<{ x: number; y: number } | null>(null)
  const [loaded, setLoaded] = useState(false)

  const item = items[index]
  const many = items.length > 1
  const step = useCallback(
    (delta: number) => {
      if (!many) return
      onIndex(stepIndex(index, delta, items.length))
    },
    [index, items.length, many, onIndex]
  )

  // Focus goes in on open and comes back to the card on close — a reader who
  // opened this with a keyboard is otherwise dropped at the top of the page.
  useEffect(() => {
    restore.current = document.activeElement
    const first = panel.current ? focusables(panel.current)[0] : null
    ;(first ?? panel.current)?.focus()
    return () => {
      const el = restore.current
      if (el instanceof HTMLElement && document.contains(el)) el.focus()
    }
  }, [])

  // The page behind must not scroll under the dialog: on a phone the swipe
  // that walks the collection would otherwise scroll the grid instead.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key === 'ArrowLeft') step(-1)
      else if (e.key === 'ArrowRight') step(1)
      else if (e.key === 'Tab' && panel.current) {
        const ring = focusables(panel.current)
        if (!ring.length) return
        const first = ring[0]
        const last = ring[ring.length - 1]
        const here = document.activeElement
        if (e.shiftKey && (here === first || here === panel.current)) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && here === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    // Capture: the dialogs this opens from (the picker) also listen for
    // Escape on window, and the topmost surface is the one that should close.
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose, step])

  // A new picture is a new decode; hold the frame until it lands rather than
  // flashing the previous résumé's page at the new one's size.
  useEffect(() => setLoaded(false), [item?.src])

  if (!item) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`${item.title} — full page`}
      onTouchStart={(e) => {
        const t = e.touches[0]
        touch.current = { x: t.clientX, y: t.clientY }
      }}
      onTouchEnd={(e) => {
        const start = touch.current
        touch.current = null
        if (!start) return
        const t = e.changedTouches[0]
        const dx = t.clientX - start.x
        const dy = t.clientY - start.y
        if (isSwipe(dx, dy)) step(dx < 0 ? 1 : -1)
      }}
    >
      <div className="absolute inset-0 bg-black/85" onClick={onClose} aria-hidden />

      {/* The panel fills a phone edge to edge, so there is no backdrop left
          beside it to tap: measured at 375x812, a tap anywhere outside the
          page landed on the panel and the dialog stayed open. Any click that
          lands on the panel's own padding or on the empty space beside the
          page closes it, which is the gesture people already try. */}
      <div
        ref={panel}
        tabIndex={-1}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
        className="relative z-10 flex h-full max-h-full w-full max-w-5xl flex-col p-2 outline-none sm:p-5"
      >
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-white sm:text-base">{item.title}</h2>
            <p className="truncate text-xs text-white/70">{item.caption}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {many && (
              <span className="text-xs tabular-nums text-white/60" aria-hidden>
                {index + 1} / {items.length}
              </span>
            )}
            {/* Desk only — see the note at the top of the file. */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="hidden h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:inline-flex"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div
          className="relative flex min-h-0 flex-1 items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          {many && (
            <NavArrow side="left" onClick={() => step(-1)} />
          )}
          <img
            key={item.src}
            src={item.src}
            width={PAGE_IMAGE_WIDTH}
            height={item.height}
            alt={item.alt}
            decoding="async"
            onLoad={() => setLoaded(true)}
            className={cn(
              'max-h-full w-auto max-w-full rounded-lg bg-white object-contain shadow-float transition-opacity',
              loaded ? 'opacity-100' : 'opacity-0'
            )}
            style={{ aspectRatio: `${PAGE_IMAGE_WIDTH} / ${item.height}` }}
          />
          {many && <NavArrow side="right" onClick={() => step(1)} />}
        </div>

        {/* The thumb bar. Big targets, and the only close a phone is offered.
            Two rows on a phone, one on a desk: five controls on one 375px row
            left "Use this example" truncated to "Us…" (measured at 375x812). */}
        <div className="mt-2 flex flex-col gap-2 sm:mt-3 sm:flex-row sm:justify-center">
          <div className="flex items-center gap-2">
            {many && (
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:hidden"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}
            <button
              type="button"
              onClick={item.onUse}
              className="inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition hover:brightness-110 sm:flex-none sm:px-5"
            >
              <Wand2 className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.useLabel}</span>
            </button>
            {many && (
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:hidden"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={item.aboutHref}
              className="inline-flex h-11 min-w-0 flex-1 items-center justify-center rounded-lg bg-white/10 px-3 text-sm font-medium text-white transition hover:bg-white/20 sm:flex-none sm:px-5"
            >
              <span className="truncate">{item.aboutLabel}</span>
            </Link>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:hidden"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

/** The desk's arrows: outside the page on a wide window, over its edge on a
 *  narrow one — never covering the middle of the résumé being read. */
function NavArrow({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === 'left' ? 'Previous' : 'Next'}
      className={cn(
        'absolute top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/25 sm:inline-flex',
        side === 'left' ? 'left-0' : 'right-0'
      )}
    >
      <Icon className="h-6 w-6" />
    </button>
  )
}
