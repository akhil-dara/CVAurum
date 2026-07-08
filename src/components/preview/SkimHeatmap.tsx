/**
 * Recruiter skim heatmap — a deterministic, on-device saliency model of where a
 * ~7-second recruiter skim actually lands. No AI, no network, no randomness:
 * the same résumé always produces the same map, so it's a design tool you can
 * iterate against, not a party trick.
 *
 * Model (eye-tracking-informed, fully explainable):
 *  - SIZE      type set larger than body text pulls the eye
 *  - WEIGHT    bold text is fixated before regular text
 *  - POSITION  the F-pattern: top beats bottom, left beats right, page 1
 *              beats page 2 by a wide margin
 *  - STRUCTURE what the element IS — name, headline, section heading, role
 *              title, employer, dates and skill chips are exactly the anchors
 *              recruiters verify in a first pass
 *
 * Rendered as translucent heat rectangles over the live canvas plus a numbered
 * 1→6 "likely gaze path". Everything is pointer-events-none, so you can keep
 * editing with the heat on and watch it shift as you type.
 */
import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useEditorStore } from '@/store/useEditorStore'

/** Floating status pill (lives OUTSIDE the scaled sheet — sticky needs an
 *  untransformed ancestor). The one interactive piece of the skim view. */
export function SkimPill() {
  const setSkimView = useEditorStore((s) => s.setSkimView)
  return (
    <div className="pointer-events-none sticky top-12 z-20 flex h-0 justify-center overflow-visible">
      <div className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-border bg-surface/95 py-1 pl-3 pr-1 text-[11px] font-medium text-foreground shadow-float backdrop-blur">
        <span className="h-2 w-10 rounded-full" style={{ background: 'linear-gradient(90deg, rgba(245,158,11,0.3), rgba(220,38,38,0.6))' }} aria-hidden />
        <span className="whitespace-nowrap">
          Recruiter skim heat<span className="hidden sm:inline"> — 1→6 = likely first fixations · deterministic, on-device</span>
        </span>
        <button
          className="flex h-6 w-6 items-center justify-center rounded-full bg-muted transition hover:bg-muted-foreground/20"
          onClick={() => setSkimView(false)}
          title="Turn off the skim heatmap"
          aria-label="Turn off the skim heatmap"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

interface Heat {
  left: number
  top: number
  width: number
  height: number
  score: number // 0..1
  text: string
  rank?: number // 1-based, only for the top fixations
}

/** Structure prior: what kind of résumé anchor is this element? */
function structureBoost(el: Element): number {
  const c = (sel: string) => el.closest(sel) != null
  if (c('.rm-name')) return 1
  if (c('.rm-headline')) return 0.85
  if (c('.rm-section-title')) return 0.8
  if (c('.rm-item-title')) return 0.78
  if (c('.rm-item-org')) return 0.7
  if (c('.rm-item-date')) return 0.62
  if (c('.rm-item-score')) return 0.5
  if (c('.rm-chip')) return 0.5
  if (c('.rm-contact, .rm-contacts')) return 0.45
  if (el.tagName === 'LI') {
    const ul = el.parentElement
    return ul && el === ul.querySelector('li') ? 0.45 : 0.22
  }
  return 0.2
}

/** Collect the visible text-bearing leaf elements inside the canvas root. */
function collectTargets(root: HTMLElement): Element[] {
  const out = new Set<Element>()
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) =>
      n.textContent && n.textContent.trim().length > 1 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
  })
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement
    if (!el || el.closest('.no-print, .rm-section-gear, .rm-add-btn, button')) continue
    out.add(el)
  }
  return [...out]
}

function computeHeat(root: HTMLElement, zoom: number, pageH: number): Heat[] {
  const rootRect = root.getBoundingClientRect()
  const targets = collectTargets(root)
  if (!targets.length) return []

  // Body size = the median font size — everything is scored relative to it.
  const sizes = targets.map((el) => parseFloat(getComputedStyle(el).fontSize) || 10).sort((a, b) => a - b)
  const body = sizes[Math.floor(sizes.length / 2)] || 10

  const heats: Heat[] = []
  for (const el of targets) {
    const r = el.getBoundingClientRect()
    if (r.width < 2 || r.height < 2) continue
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.display === 'none') continue

    const left = (r.left - rootRect.left) / zoom
    const top = (r.top - rootRect.top) / zoom
    const width = r.width / zoom
    const height = r.height / zoom

    const size = Math.max(0, Math.min(1, ((parseFloat(cs.fontSize) || body) / body - 1) * 1.3))
    const weight = Math.max(0, Math.min(1, ((parseInt(cs.fontWeight, 10) || 400) - 400) / 300))
    // F-pattern position: page-1 top-left is hottest; later pages fall off hard.
    const pageIdx = Math.floor(top / pageH)
    const yNorm = Math.min(1, (top - pageIdx * pageH) / pageH)
    const xNorm = Math.min(1, Math.max(0, left / Math.max(1, rootRect.width / zoom)))
    let position = Math.max(0, 1 - 0.62 * yNorm - 0.16 * xNorm)
    if (pageIdx >= 1) position *= 0.4

    const structure = structureBoost(el)
    const score = Math.max(0, Math.min(1, 0.28 * size + 0.16 * weight + 0.28 * position + 0.28 * structure))
    if (score < 0.14) continue
    heats.push({ left, top, width, height, score, text: (el.textContent || '').trim().slice(0, 60) })
  }

  // Rank the top fixations (the 1→6 gaze path), de-duplicated by row so six
  // markers never pile onto one line.
  const byScore = [...heats].sort((a, b) => b.score - a.score)
  const picked: Heat[] = []
  for (const h of byScore) {
    if (picked.length >= 6) break
    if (picked.some((p) => Math.abs(p.top - h.top) < Math.max(10, p.height))) continue
    picked.push(h)
  }
  // Reading order for the path: by position, not by score.
  picked.sort((a, b) => a.top - b.top || a.left - b.left)
  picked.forEach((h, i) => { h.rank = i + 1 })
  return heats
}

/** Heat color: amber → deep red as salience rises; alpha scales with score. */
const heatColor = (s: number) => {
  const t = Math.min(1, Math.max(0, (s - 0.14) / 0.86))
  const r = Math.round(245 - 25 * t)
  const g = Math.round(158 - 120 * t)
  const b = Math.round(11 + 27 * t)
  return `rgba(${r}, ${g}, ${b}, ${(0.1 + 0.3 * t).toFixed(3)})`
}

export function SkimHeatmap({ rootRef, zoom, pageH, docKey }: { rootRef: React.RefObject<HTMLDivElement | null>; zoom: number; pageH: number; docKey: unknown }) {
  const [heats, setHeats] = useState<Heat[]>([])
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const setSkimView = useEditorStore((s) => s.setSkimView)

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const run = () => setHeats(computeHeat(el, zoom, pageH))
    // Debounced: recompute as the user types, after layout settles.
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(run, 320)
    const ro = new ResizeObserver(() => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(run, 320)
    })
    ro.observe(el)
    return () => {
      ro.disconnect()
      if (timer.current) clearTimeout(timer.current)
    }
  }, [rootRef, zoom, pageH, docKey])

  const top = heats.filter((h) => h.rank)

  return (
    <div className="pointer-events-none absolute inset-0 z-10" aria-hidden data-skim-overlay>
      {/* heat rectangles */}
      {heats.map((h, i) => (
        <div
          key={i}
          className="absolute rounded-[3px]"
          style={{ left: h.left - 2, top: h.top - 1, width: h.width + 4, height: h.height + 2, background: heatColor(h.score) }}
        />
      ))}

      {/* likely gaze path 1→6 */}
      <svg className="absolute inset-0 h-full w-full overflow-visible">
        <polyline
          points={top.map((h) => `${h.left - 8},${h.top + h.height / 2}`).join(' ')}
          fill="none"
          stroke="rgba(190, 24, 60, 0.5)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
      </svg>
      {top.map((h) => (
        <div
          key={`r${h.rank}`}
          className="absolute flex h-[18px] w-[18px] items-center justify-center rounded-full bg-rose-700 text-[11px] font-bold leading-none text-white shadow"
          style={{ left: h.left - 17, top: h.top + h.height / 2 - 9 }}
        >
          {h.rank}
        </div>
      ))}
    </div>
  )
}
