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

let mountQueue: Array<() => void> = []
let draining = false
let lastScrollTs = 0
let scrollHooked = false
/* Rolling frame health. Strict quiescence read as "the gallery takes ages to
 * load": a reader who keeps gently scrolling never pauses 160ms, so nothing
 * ever filled for them. A gentle scroll has frame budget to spare - when the
 * last few frames all ran fast, one card can mount mid-scroll without
 * dropping the rate. A flick still blocks everything: its frames are busy. */
let frameTimes: number[] = []
let frameClockOn = false
function hookFrameClock() {
  // Runs only while the queue drains - a permanent rAF loop would keep the
  // page from ever being truly idle, which is the exact sin (the forever-
  // animating hero) this module exists to prevent.
  if (frameClockOn || typeof window === 'undefined') return
  frameClockOn = true
  let last = performance.now()
  const tick = (t: number) => {
    if (!draining && mountQueue.length === 0) {
      frameClockOn = false
      frameTimes = []
      return
    }
    frameTimes.push(t - last)
    if (frameTimes.length > 5) frameTimes.shift()
    last = t
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}
const framesHealthy = () => frameTimes.length === 5 && frameTimes.every((d) => d < 22)

function hookScrollClock() {
  if (scrollHooked || typeof window === 'undefined') return
  scrollHooked = true
  window.addEventListener('scroll', () => { lastScrollTs = performance.now() }, { capture: true, passive: true })
}

function grantNextMount() {
  if (performance.now() - lastScrollTs < 160 && !framesHealthy()) {
    scheduleGrant()
    return
  }
  const next = mountQueue.pop()
  if (!next) {
    draining = false
    return
  }
  next()
  scheduleGrant()
}

function scheduleGrant() {
  if (typeof requestIdleCallback === 'function') requestIdleCallback(() => grantNextMount(), { timeout: 250 })
  else setTimeout(grantNextMount, 120)
}

export function enqueueMount(fn: () => void) {
  hookScrollClock()
  hookFrameClock()
  mountQueue.push(fn)
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
        enqueueMount(() => {
          if (alive.current) setSeen(true)
        })
      }
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(check)
    }
    check()
    window.addEventListener('scroll', schedule, { passive: true, capture: true })
    window.addEventListener('resize', schedule, { passive: true })
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule, { capture: true } as EventListenerOptions)
      window.removeEventListener('resize', schedule)
    }
  }, [seen, marginPx])
  return [ref, seen] as const
}
