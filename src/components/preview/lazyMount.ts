/**
 * Mount expensive components one at a time, during idle, never mid-scroll.
 *
 * Grown in the template gallery, where every card renders the user's whole
 * resume: mounting cards inside scroll frames measured avg 30ms/frame with
 * 283ms stalls (2026-08-30). The same storm lived unfixed in the dashboard
 * (one full resume PER SAVED DOCUMENT, unbounded, in the route's first
 * commit) and the sample picker (four at once on modal open), so the queue
 * lives here now and all three share it.
 *
 * Grants go newest-first, so the cards beside where the reader actually is
 * fill before the ones they scrolled past. Nothing mounts while a scroll is
 * in flight (quiescence: 160ms without a scroll event) - placeholders hold
 * each card's exact height, so the scrollbar stays honest.
 */
import { useEffect, useRef, useState } from 'react'

type QueueEntry = { fn: () => void; inView?: () => boolean }
let mountQueue: QueueEntry[] = []
let draining = false
let lastScrollTs = 0
let scrollHooked = false
function hookScrollClock() {
  if (scrollHooked || typeof window === 'undefined') return
  scrollHooked = true
  window.addEventListener('scroll', () => { lastScrollTs = performance.now() }, { capture: true, passive: true })
}

function grantNextMount() {
  /* Quiescence only - a 100ms breath, which even attentive browsing takes
   * between looks. Granting mid-scroll whenever frames looked healthy was
   * tried and measured: the first card to mount put a 250ms stall under a
   * moving wheel. The accent sketches carry the visual meanwhile; a pause
   * this short fills the viewport before the eye settles. */
  if (performance.now() - lastScrollTs < 100) {
    scheduleGrant()
    return
  }
  if (!mountQueue.length) {
    draining = false
    return
  }
  // A card the reader can SEE beats every queued card they cannot - newest
  // first within each class, so the cards beside where they stopped win.
  let idx = mountQueue.length - 1
  for (let i = mountQueue.length - 1; i >= 0; i--) {
    if (mountQueue[i].inView?.()) {
      idx = i
      break
    }
  }
  const [next] = mountQueue.splice(idx, 1)
  next.fn()
  scheduleGrant()
}

function scheduleGrant() {
  if (typeof requestIdleCallback === 'function') requestIdleCallback(() => grantNextMount(), { timeout: 250 })
  else setTimeout(grantNextMount, 120)
}

/**
 * A card can be carried into view by the page itself, with no scroll and no
 * resize: filter the gallery down to one match and the surviving card keeps
 * its React key, so its placeholder simply moves up the page. Scroll and
 * resize listeners never fire for that, and the card sat as a grey skeleton
 * forever (measured on a 375x812 phone: search "atlas", still a skeleton at
 * 6s, resolved only after a 200px scroll). So every element still waiting for
 * a turn re-measures itself on a shared slow tick; the tick stops as soon as
 * the last one has been granted.
 */
const layoutWatchers = new Set<() => void>()
let layoutTimer = 0
function watchLayout(fn: () => void) {
  layoutWatchers.add(fn)
  if (!layoutTimer && typeof window !== 'undefined') {
    layoutTimer = window.setInterval(() => {
      for (const watcher of [...layoutWatchers]) watcher()
    }, 250)
  }
  return () => {
    layoutWatchers.delete(fn)
    if (!layoutWatchers.size && layoutTimer) {
      clearInterval(layoutTimer)
      layoutTimer = 0
    }
  }
}

export function enqueueMount(fn: () => void, inView?: () => boolean) {
  hookScrollClock()
  mountQueue.push({ fn, inView })
  if (!draining) {
    draining = true
    scheduleGrant()
  }
}

/**
 * True once this element has come near the viewport AND the idle queue has
 * granted it a turn; true forever after. Render the expensive child only when
 * it returns true, behind a placeholder that holds the exact final size.
 *
 * Measured with getBoundingClientRect rather than an IntersectionObserver: an
 * observer is driven by the rendering pipeline and reports nothing in a
 * context that is not compositing frames (a hidden browser pane left every
 * card an empty placeholder), while a rect is answered synchronously by
 * layout, which is always available.
 */
export function useLazyMount<T extends Element>(
  marginPx = typeof window !== 'undefined' && window.innerWidth < 640 ? 150 : 400
) {
  return useNearby<T>(marginPx, true)
}

/**
 * The same viewport test WITHOUT the idle queue: true as soon as this element
 * is near the viewport, on the next frame.
 *
 * For a static picture, which is what the public walls show now, the queue is
 * the wrong instrument. It exists to stop expensive MOUNTS from landing inside
 * scroll frames, and it holds everything back until 100ms after the last
 * scroll event — with an <img> that means a reader dragging down the page sees
 * only grey until they stop, which is the complaint the pictures were meant to
 * end. An <img> costs a decode off the main thread; there is nothing to queue.
 *
 * The gate is still needed, and not as a duplicate of loading="lazy": measured
 * on the production build (2026-09-15, both headless Chromium and a full
 * Chrome), every one of /examples' 108 pictures downloaded on first paint —
 * 10.7 MB — with loading="lazy" set on 104 of them. The route is served with a
 * pre-rendered crawler list inside #root that names the same 108 files, and
 * while React is replacing that list with this grid the browser abandons the
 * deferral. With the crawler list stripped out by an interceptor the same grid
 * fetched 40; with the grid's URLs redirected instead, the crawler list fetched
 * 3. Neither half is expensive alone. Until the pre-rendered list changes, this
 * is what keeps the first view to the cards a reader can see.
 */
export function useNearViewport<T extends Element>(
  marginPx = typeof window !== 'undefined' && window.innerWidth < 640 ? 500 : 800
) {
  return useNearby<T>(marginPx, false)
}

function useNearby<T extends Element>(marginPx: number, queue: boolean) {
  const ref = useRef<T | null>(null)
  const [seen, setSeen] = useState(false)
  const queued = useRef(false)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  useEffect(() => {
    if (seen) return
    let frame = 0
    const check = () => {
      frame = 0
      const el = ref.current
      if (!el) return
      const r = el.getBoundingClientRect()
      // A zero-height box has not been laid out yet; ask again on the next
      // scroll rather than declaring it off-screen forever.
      if (r.height > 0 && r.bottom > -marginPx && r.top < window.innerHeight + marginPx && !queued.current) {
        queued.current = true
        if (!queue) {
          setSeen(true)
          return
        }
        enqueueMount(
          () => {
            if (alive.current) setSeen(true)
          },
          () => {
            const el2 = ref.current
            if (!el2) return false
            const r2 = el2.getBoundingClientRect()
            return r2.height > 0 && r2.bottom > 0 && r2.top < window.innerHeight
          }
        )
      }
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(check)
    }
    check()
    window.addEventListener('scroll', schedule, { passive: true, capture: true })
    window.addEventListener('resize', schedule, { passive: true })
    const unwatchLayout = watchLayout(schedule)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule, { capture: true } as EventListenerOptions)
      window.removeEventListener('resize', schedule)
      unwatchLayout()
    }
  }, [seen, marginPx, queue])
  return [ref, seen] as const
}
