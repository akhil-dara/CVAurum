/**
 * Canvas inline reordering (2026-08-17 inline-reorder spec, Task E).
 *
 * Two affordances, both pure edit chrome living OUTSIDE `.rm-root` (portals to
 * document.body), so the print DOM the walker/gates read is untouched:
 *
 * - An entry hover cluster (grip + up/down arrows) floating at the hovered
 *   `[data-item-id]`'s top-right corner.
 * - A drag session shared by section grips (rendered by SectionGear inside the
 *   `.rm-section-controls` edit chrome, tagged `data-canvas-drag="section"`)
 *   and the cluster's entry grip: pointer-captured tracking, a fixed-position
 *   insertion indicator between sibling rects, reduced opacity on the dragged
 *   element, drop routed through the same `moveSectionTo`/`moveEntry` helpers
 *   the panel and arrows use. Cross-column drops are sections-only and only on
 *   two-column layouts.
 *
 * Deliberately NOT dnd-kit: sortable would need to own wrapper DOM inside the
 * templates' print markup. Hand-rolled pointer logic keeps the artboard
 * untouched and gives exactly the spec's behavior (5px mouse activation,
 * 220ms/6px press-and-hold on touch — the SortableList tuning).
 *
 * All geometry is read via getBoundingClientRect (visual/viewport space) and
 * rendered with position:fixed — no offsets inside the zoom-scaled sheet, so
 * the zoom double-scaling class of bugs (bae124d) cannot apply here.
 */
import { useEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { GripVertical, ArrowUp, ArrowDown } from 'lucide-react'
import { useResumeStore } from '@/store/useResumeStore'
import { moveSectionTo, moveEntry } from '@/lib/sections'

const MOUSE_ACTIVATE_PX = 5
const TOUCH_HOLD_MS = 220
const TOUCH_TOLERANCE_PX = 6

interface HoverEntry {
  id: string
  sectionKey: string
  top: number
  right: number
}

interface Slot {
  /** section drags: target column; entry drags: always the own section */
  col: 'main' | 'aside'
  /** DOM key/id immediately after the insertion point (null = end) */
  nextKey: string | null
  /** indicator geometry, viewport px */
  y: number
  left: number
  width: number
}

interface DragSession {
  kind: 'section' | 'entry'
  key: string
  sectionKey: string
  el: HTMLElement
  grip: HTMLElement
  pointerId: number
  startX: number
  startY: number
  started: boolean
  holdTimer: number | null
}

function midY(r: DOMRect): number {
  return r.top + r.height / 2
}

export function CanvasReorder({ rootRef }: { rootRef: RefObject<HTMLDivElement | null> }) {
  const [hover, setHover] = useState<HoverEntry | null>(null)
  const [slot, setSlot] = useState<Slot | null>(null)
  const [dragging, setDragging] = useState(false)
  const drag = useRef<DragSession | null>(null)
  const latestSlot = useRef<Slot | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = () => rootRef.current?.querySelector<HTMLElement>('.rm-root') ?? null

    const endSession = (commit: boolean) => {
      const d = drag.current
      if (!d) return
      if (d.holdTimer !== null) window.clearTimeout(d.holdTimer)
      d.el.style.opacity = ''
      try {
        d.grip.releasePointerCapture(d.pointerId)
      } catch {
        /* capture already gone */
      }
      if (commit && d.started) {
        const s = latestSlot.current
        if (s) {
          const store = useResumeStore.getState()
          if (d.kind === 'section') {
            store.updateMetadata((m) => {
              const arr = m.layout[s.col].filter((k) => k !== d.key)
              const idx = s.nextKey ? arr.indexOf(s.nextKey) : arr.length
              moveSectionTo(m.layout, d.key, s.col, idx >= 0 ? idx : arr.length)
            })
          } else {
            // DOM order == content order in edit mode (renderers only skip
            // empty items in print), so the sibling list minus the dragged
            // entry IS the after-removal order moveEntry indexes into.
            const sectionEl = d.el.closest<HTMLElement>('[data-section]')
            const ids = sectionEl
              ? [...sectionEl.querySelectorAll<HTMLElement>('[data-item-id]')]
                  .map((el) => el.dataset.itemId!)
                  .filter((id) => id !== d.key)
              : []
            const idx = s.nextKey ? ids.indexOf(s.nextKey) : ids.length
            store.updateContent((c) => moveEntry(c, d.sectionKey, d.key, idx >= 0 ? idx : ids.length))
          }
        }
      }
      drag.current = null
      latestSlot.current = null
      setSlot(null)
      setDragging(false)
    }

    /** Insertion slot for the current pointer position. */
    const computeSlot = (d: DragSession, x: number, y: number): Slot | null => {
      const r = root()
      if (!r) return null
      if (d.kind === 'entry') {
        const sectionEl = d.el.closest<HTMLElement>('[data-section]')
        if (!sectionEl) return null
        const sibs = [...sectionEl.querySelectorAll<HTMLElement>('[data-item-id]')].filter((el) => el !== d.el)
        if (!sibs.length) return null
        const rects = sibs.map((el) => el.getBoundingClientRect())
        let idx = 0
        while (idx < rects.length && midY(rects[idx]) < y) idx++
        const secRect = sectionEl.getBoundingClientRect()
        const line = idx < rects.length ? rects[idx].top - 2 : rects[rects.length - 1].bottom + 2
        return {
          col: 'main',
          nextKey: idx < sibs.length ? (sibs[idx].dataset.itemId ?? null) : null,
          y: line,
          left: secRect.left,
          width: secRect.width,
        }
      }
      // section drag: pick the column under (or nearest to) the pointer
      const doc = useResumeStore.getState().doc
      const twoCol = doc?.metadata.layout.columns === 2
      const cols = [...r.querySelectorAll<HTMLElement>('.rm-col-main, .rm-col-aside')].filter(
        (el) => twoCol || el.classList.contains('rm-col-main')
      )
      if (!cols.length) return null
      let colEl = cols[0]
      for (const c of cols) {
        const cr = c.getBoundingClientRect()
        if (x >= cr.left && x <= cr.right) colEl = c
      }
      const colName: 'main' | 'aside' = colEl.classList.contains('rm-col-aside') ? 'aside' : 'main'
      const secs = [...colEl.querySelectorAll<HTMLElement>('[data-section]')].filter((el) => el !== d.el)
      const colRect = colEl.getBoundingClientRect()
      if (!secs.length) {
        return { col: colName, nextKey: null, y: colRect.top + 8, left: colRect.left, width: colRect.width }
      }
      const rects = secs.map((el) => el.getBoundingClientRect())
      let idx = 0
      while (idx < rects.length && midY(rects[idx]) < y) idx++
      const line = idx < rects.length ? rects[idx].top - 3 : rects[rects.length - 1].bottom + 3
      return {
        col: colName,
        nextKey: idx < secs.length ? (secs[idx].dataset.section ?? null) : null,
        y: line,
        left: colRect.left,
        width: colRect.width,
      }
    }

    const onPointerDown = (e: PointerEvent) => {
      const grip = (e.target as Element | null)?.closest?.<HTMLElement>('[data-canvas-drag]')
      if (!grip || drag.current) return
      const r = root()
      if (!r) return
      let kind: 'section' | 'entry'
      let key: string
      let sectionKey: string
      let el: HTMLElement | null
      if (grip.dataset.canvasDrag === 'section') {
        el = grip.closest<HTMLElement>('[data-section]')
        if (!el || !r.contains(el)) return
        kind = 'section'
        key = sectionKey = el.dataset.section ?? ''
      } else {
        key = grip.dataset.entryId ?? ''
        sectionKey = grip.dataset.sectionKey ?? ''
        el = r.querySelector<HTMLElement>(`[data-item-id="${CSS.escape(key)}"]`)
        if (!el) return
        kind = 'entry'
      }
      if (!key) return
      e.preventDefault()
      const d: DragSession = {
        kind,
        key,
        sectionKey,
        el,
        grip,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        started: false,
        holdTimer: null,
      }
      drag.current = d
      try {
        grip.setPointerCapture(e.pointerId)
      } catch {
        /* capture unsupported */
      }
      if (e.pointerType !== 'mouse') {
        d.holdTimer = window.setTimeout(() => {
          const cur = drag.current
          if (cur === d) {
            d.holdTimer = null
            d.started = true
            d.el.style.opacity = '0.35'
            setDragging(true)
          }
        }, TOUCH_HOLD_MS)
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      const d = drag.current
      if (!d || e.pointerId !== d.pointerId) return
      const dist = Math.hypot(e.clientX - d.startX, e.clientY - d.startY)
      if (!d.started) {
        if (e.pointerType === 'mouse') {
          if (dist < MOUSE_ACTIVATE_PX) return
          d.started = true
          d.el.style.opacity = '0.35'
          setDragging(true)
        } else {
          // pre-hold movement beyond tolerance = the user is scrolling
          if (d.holdTimer !== null && dist > TOUCH_TOLERANCE_PX) endSession(false)
          return
        }
      }
      e.preventDefault()
      const s = computeSlot(d, e.clientX, e.clientY)
      latestSlot.current = s
      setSlot(s)
    }

    const onPointerUp = (e: PointerEvent) => {
      const d = drag.current
      if (!d || e.pointerId !== d.pointerId) return
      endSession(true)
    }
    const onPointerCancel = (e: PointerEvent) => {
      const d = drag.current
      if (!d || e.pointerId !== d.pointerId) return
      endSession(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drag.current) endSession(false)
    }

    // Entry hover cluster: delegated tracking; the cluster (a body portal)
    // keeps itself alive by being excluded from the "left the entry" check.
    const onPointerOver = (e: PointerEvent) => {
      if (drag.current?.started) return
      const t = e.target as Element | null
      if (!t) return
      if (overlayRef.current?.contains(t)) return
      const r = root()
      const item = t.closest?.<HTMLElement>('[data-item-id]')
      if (item && r?.contains(item)) {
        const sectionEl = item.closest<HTMLElement>('[data-section]')
        const rect = item.getBoundingClientRect()
        setHover({
          id: item.dataset.itemId ?? '',
          sectionKey: sectionEl?.dataset.section ?? '',
          top: rect.top,
          right: rect.right,
        })
      } else {
        setHover(null)
      }
    }
    const onAnyScroll = () => setHover(null)

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('pointermove', onPointerMove)
    document.addEventListener('pointerup', onPointerUp)
    document.addEventListener('pointercancel', onPointerCancel)
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerover', onPointerOver)
    window.addEventListener('scroll', onAnyScroll, true)
    return () => {
      endSession(false)
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', onPointerUp)
      document.removeEventListener('pointercancel', onPointerCancel)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerover', onPointerOver)
      window.removeEventListener('scroll', onAnyScroll, true)
    }
    // rootRef is a stable ref object; everything else is read at event time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Entry arrows work off the same DOM-order == content-order equivalence the
  // drop handler uses.
  const moveHoveredEntry = (dir: -1 | 1) => {
    if (!hover) return
    const r = rootRef.current?.querySelector<HTMLElement>('.rm-root')
    const sectionEl = r?.querySelector<HTMLElement>(`[data-section="${CSS.escape(hover.sectionKey)}"]`)
    if (!sectionEl) return
    const ids = [...sectionEl.querySelectorAll<HTMLElement>('[data-item-id]')].map((el) => el.dataset.itemId!)
    const from = ids.indexOf(hover.id)
    if (from < 0) return
    const to = from + dir
    if (to < 0 || to >= ids.length) return
    useResumeStore.getState().updateContent((c) => moveEntry(c, hover.sectionKey, hover.id, to))
    setHover(null)
  }

  const clusterBtn =
    'flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground shadow-sm transition hover:text-foreground hover:border-primary/50 disabled:pointer-events-none disabled:opacity-30'

  return createPortal(
    <>
      {hover && !dragging && (
        <div
          ref={overlayRef}
          className="fixed z-40 flex items-center gap-1 rounded-full bg-surface/80 p-0.5 backdrop-blur-sm"
          style={{ top: hover.top - 10, left: hover.right - 96 }}
          data-canvas-entry-cluster
        >
          <button
            type="button"
            className={`${clusterBtn} cursor-grab active:cursor-grabbing`}
            style={{ touchAction: 'none' }}
            data-canvas-drag="entry"
            data-entry-id={hover.id}
            data-section-key={hover.sectionKey}
            aria-label="Drag to reorder entry"
            title="Drag to reorder"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={clusterBtn}
            onClick={() => moveHoveredEntry(-1)}
            aria-label="Move entry up"
            title="Move entry up"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={clusterBtn}
            onClick={() => moveHoveredEntry(1)}
            aria-label="Move entry down"
            title="Move entry down"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {dragging && slot && (
        <div
          className="pointer-events-none fixed z-50 rounded-full bg-primary shadow-[0_0_0_1px_rgba(255,255,255,0.6)]"
          style={{ top: slot.y - 1.5, left: slot.left, width: slot.width, height: 3 }}
          aria-hidden
        />
      )}
    </>,
    document.body
  )
}
