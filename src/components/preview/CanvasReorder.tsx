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
 *   and the cluster's entry grip: pointer-captured tracking, drop routed
 *   through the same `moveSectionTo`/`moveEntry` helpers the panel and arrows
 *   use. Cross-column drops are sections-only and only on two-column layouts.
 *
 * UX round (2026-08-17 user feedback: "no feeling that I am dragging...
 * other sections should move down... can't scroll"):
 * - a GHOST pill (grip + name) follows the pointer while dragging;
 * - siblings at/after the insertion point translate DOWN to open a visible
 *   gap (transform-only — layout, pagination and the print portal never see
 *   it; cleared on drop/cancel, and the store re-render replaces it);
 * - the scroll container auto-scrolls when the pointer nears its top/bottom
 *   edge, recomputing the slot as it goes.
 * Because displaced elements carry a live translateY, all hit-testing uses
 * SHIFT-CORRECTED rects (rect.top minus the shift we applied) — measuring
 * transformed rects directly would feed back into the slot choice and jitter.
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
import { moveSectionTo, moveEntry, sectionLabel } from '@/lib/sections'

const MOUSE_ACTIVATE_PX = 5
const TOUCH_HOLD_MS = 220
const TOUCH_TOLERANCE_PX = 6
/** How far siblings part to show where the drop lands (visual px). */
const SECTION_GAP_PX = 48
const ENTRY_GAP_PX = 28
/** Auto-scroll: engage within this distance of the scroller's edge... */
const SCROLL_ZONE_PX = 80
/** ...at up to this many px per frame at the very edge. */
const SCROLL_MAX_STEP = 16

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
  label: string
}

export function CanvasReorder({ rootRef }: { rootRef: RefObject<HTMLDivElement | null> }) {
  const [hover, setHover] = useState<HoverEntry | null>(null)
  const [slot, setSlot] = useState<Slot | null>(null)
  const [dragging, setDragging] = useState(false)
  const [ghost, setGhost] = useState<{ x: number; y: number; label: string } | null>(null)
  const drag = useRef<DragSession | null>(null)
  const latestSlot = useRef<Slot | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = () => rootRef.current?.querySelector<HTMLElement>('.rm-root') ?? null
    const scroller = () => rootRef.current?.closest<HTMLElement>('.canvas-bg') ?? null

    // live translateY per displaced sibling — the source of truth for the
    // shift-corrected hit-testing described in the header comment.
    const shifts = new Map<HTMLElement, number>()
    const lastPt = { x: 0, y: 0 }
    let rafId: number | null = null

    const clearDisplacement = () => {
      for (const [el] of shifts) {
        el.style.transform = ''
        el.style.transition = ''
      }
      shifts.clear()
    }
    const applyDisplacement = (after: HTMLElement[], gap: number) => {
      const want = new Set(after)
      for (const [el] of shifts) {
        if (!want.has(el)) {
          el.style.transform = ''
          shifts.delete(el)
        }
      }
      for (const el of after) {
        if (!shifts.has(el)) {
          el.style.transition = 'transform 160ms ease'
          el.style.transform = `translateY(${gap}px)`
          shifts.set(el, gap)
        }
      }
    }
    // The displacement TRANSITIONS over 160ms, so the stored target shift is
    // wrong mid-flight — subtract the ACTUAL current translateY from the
    // computed matrix instead (sections/entries carry no transform of their
    // own; the sheet's zoom scale lives on an ancestor and never shows up in
    // an element's OWN computed transform).
    const actualShift = (el: HTMLElement): number => {
      if (!shifts.has(el)) return 0
      const t = getComputedStyle(el).transform
      if (!t || t === 'none') return 0
      const m = t.match(/matrix\(([^)]+)\)/)
      if (!m) return 0
      const f = parseFloat(m[1].split(',')[5])
      return Number.isFinite(f) ? f : 0
    }
    // rect.* is visual space (post ancestor zoom scale) while the element's
    // own translateY is local space — scale the shift by the same
    // rect/offsetWidth ratio the page-gap overlay uses (bae124d).
    const correctedTop = (el: HTMLElement, rect: DOMRect) =>
      rect.top - actualShift(el) * (el.offsetWidth ? rect.width / el.offsetWidth : 1)

    const activate = (d: DragSession) => {
      d.started = true
      d.el.style.opacity = '0.35'
      document.body.style.cursor = 'grabbing'
      setDragging(true)
      setGhost({ x: lastPt.x + 14, y: lastPt.y + 12, label: d.label })
      if (rafId === null) rafId = requestAnimationFrame(autoScrollTick)
    }

    // Auto-scroll runs on its own frame loop so holding the pointer still
    // near an edge keeps scrolling (pointermove alone would stall).
    const autoScrollTick = () => {
      const d = drag.current
      if (!d || !d.started) {
        rafId = null
        return
      }
      const sc = scroller()
      if (sc) {
        const r = sc.getBoundingClientRect()
        let dy = 0
        if (lastPt.y < r.top + SCROLL_ZONE_PX) {
          dy = -Math.ceil(((r.top + SCROLL_ZONE_PX - lastPt.y) / SCROLL_ZONE_PX) * SCROLL_MAX_STEP)
        } else if (lastPt.y > r.bottom - SCROLL_ZONE_PX) {
          dy = Math.ceil(((lastPt.y - (r.bottom - SCROLL_ZONE_PX)) / SCROLL_ZONE_PX) * SCROLL_MAX_STEP)
        }
        if (dy !== 0) {
          const before = sc.scrollTop
          sc.scrollTop += dy
          if (sc.scrollTop !== before) {
            const s = computeSlot(d, lastPt.x, lastPt.y)
            latestSlot.current = s
            setSlot(s)
          }
        }
      }
      rafId = requestAnimationFrame(autoScrollTick)
    }

    const endSession = (commit: boolean) => {
      const d = drag.current
      if (!d) return
      if (d.holdTimer !== null) window.clearTimeout(d.holdTimer)
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      d.el.style.opacity = ''
      document.body.style.cursor = ''
      clearDisplacement()
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
      setGhost(null)
    }

    /** Insertion slot for the current pointer position (shift-corrected). */
    const computeSlot = (d: DragSession, x: number, y: number): Slot | null => {
      const r = root()
      if (!r) return null
      if (d.kind === 'entry') {
        const sectionEl = d.el.closest<HTMLElement>('[data-section]')
        if (!sectionEl) return null
        const sibs = [...sectionEl.querySelectorAll<HTMLElement>('[data-item-id]')].filter((el) => el !== d.el)
        if (!sibs.length) return null
        const tops = sibs.map((el) => {
          const rect = el.getBoundingClientRect()
          return { el, top: correctedTop(el, rect), h: rect.height }
        })
        let idx = 0
        while (idx < tops.length && tops[idx].top + tops[idx].h / 2 < y) idx++
        applyDisplacement(sibs.slice(idx), ENTRY_GAP_PX)
        const secRect = sectionEl.getBoundingClientRect()
        const line =
          idx < tops.length ? tops[idx].top + ENTRY_GAP_PX / 2 : tops[tops.length - 1].top + tops[tops.length - 1].h + 4
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
        clearDisplacement()
        return { col: colName, nextKey: null, y: colRect.top + 8, left: colRect.left, width: colRect.width }
      }
      const tops = secs.map((el) => {
        const rect = el.getBoundingClientRect()
        return { el, top: correctedTop(el, rect), h: rect.height }
      })
      let idx = 0
      while (idx < tops.length && tops[idx].top + tops[idx].h / 2 < y) idx++
      applyDisplacement(secs.slice(idx), SECTION_GAP_PX)
      const line =
        idx < tops.length ? tops[idx].top + SECTION_GAP_PX / 2 : tops[tops.length - 1].top + tops[tops.length - 1].h + 6
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
      lastPt.x = e.clientX
      lastPt.y = e.clientY
      const doc = useResumeStore.getState().doc
      const label =
        kind === 'section' && doc
          ? sectionLabel(key, doc)
          : (el.innerText || '')
              .split('\n')
              .find((l) => l.trim())
              ?.trim()
              .slice(0, 36) || 'Entry'
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
        label,
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
            activate(d)
          }
        }, TOUCH_HOLD_MS)
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      const d = drag.current
      if (!d || e.pointerId !== d.pointerId) return
      lastPt.x = e.clientX
      lastPt.y = e.clientY
      const dist = Math.hypot(e.clientX - d.startX, e.clientY - d.startY)
      if (!d.started) {
        if (e.pointerType === 'mouse') {
          if (dist < MOUSE_ACTIVATE_PX) return
          activate(d)
        } else {
          // pre-hold movement beyond tolerance = the user is scrolling
          if (d.holdTimer !== null && dist > TOUCH_TOLERANCE_PX) endSession(false)
          return
        }
      }
      e.preventDefault()
      setGhost({ x: e.clientX + 14, y: e.clientY + 12, label: d.label })
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
      // Keyword-level hover means keyword-level work: a chip reveals its own
      // grip and cross, and this ENTRY cluster would portal itself at the
      // entry's top-right - measured landing exactly on the last chip's cross
      // in a sidebar (clarity, inline skills), so the entry chrome swallowed
      // the click meant for the chip's. The cluster stands back while the
      // pointer is on a keyword; the entry's own gutter still summons it.
      if (t.closest?.('.rm-chip-edit, .rm-kw-edit')) {
        setHover(null)
        return
      }
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
    const onAnyScroll = () => {
      if (!drag.current?.started) setHover(null)
    }

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
          // Fully ABOVE the entry, not 14px into it. Half-inside, it sat on
          // the first keyword line of a narrow sidebar entry, and because it
          // eats its own pointerover, the chip underneath could never be
          // hovered again - the cluster kept itself alive by being pointed
          // at. Above the top edge it can only cover the previous entry's
          // tail, whose controls are not revealed - they need THEIR hover.
          style={{ top: hover.top - 30, left: hover.right - 96 }}
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
      {dragging && ghost && (
        <div
          className="pointer-events-none fixed z-[70] flex max-w-[260px] items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground shadow-float"
          style={{ left: ghost.x, top: ghost.y }}
          data-canvas-ghost
          aria-hidden
        >
          <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{ghost.label}</span>
        </div>
      )}
    </>,
    document.body
  )
}
