/**
 * The homepage's template shelf: real pages, large enough to judge, in a row
 * you scroll or step through, grouped by the kind of résumé people ask for.
 * The plainest single-column designs come first (every design exports text an
 * ATS reads word for word; these are simply the quietest); the
 * Signature designs live in the gallery, not here.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { TEMPLATES } from '@/templates/registry'
import type { TemplateConfig, TemplateTag } from '@/types/template'

export const SHELF_TABS = [
  // The registry spells it 'ats-safe', but it marks the plainest layouts, not
  // an ATS verdict: every design passes. Labelled so the other tabs do not
  // read as failing (the gallery's own toggle learned this: templateFilter.ts).
  { tag: 'ats-safe', label: 'Simple' },
  { tag: 'two-column', label: 'Two columns' },
  { tag: 'classic', label: 'Classic' },
  { tag: 'modern', label: 'Modern' },
  { tag: 'creative', label: 'Creative' },
] as const satisfies readonly { tag: TemplateTag; label: string }[]

/** The first tab's opening run, hand-ordered: calm designs with some range. */
/** The Signature designs: Broadsheet leads (the owner's call), then calm structures, loud colour last. */
const SIGNATURE_ORDER = ['broadsheet', 'meridian', 'atlas', 'terrace', 'keystone', 'chronicle', 'flare', 'volta', 'dossier', 'schematic', 'punch', 'marquee', 'folio-noir']
const LEAD = ['modern', 'harvard', 'executive', 'cambridge', 'minimal', 'garamond', 'mercury', 'onyx', 'classic', 'ivy', 'compact', 'graphite']
const PER_TAB = 14

/** 'two-column' -> 'Two column' (seoPages has the same; importing it would pull that module onto the homepage). */
const tagLabel = (tag: string) => tag.charAt(0).toUpperCase() + tag.slice(1).replace(/-/g, ' ')

export function shelfFor(tag: TemplateTag): TemplateConfig[] {
  const signature = tag === 'signature'
  const pool = TEMPLATES.filter((t) => t.tags.includes(tag) && (signature || !t.tags.includes('signature')))
  const order = signature ? SIGNATURE_ORDER : LEAD
  const rank = (t: TemplateConfig) => {
    const i = order.indexOf(t.id)
    return i < 0 ? order.length : i
  }
  return [...pool].sort((a, b) => rank(a) - rank(b)).slice(0, PER_TAB)
}

export function TemplateCarousel({
  onPick,
  tabs = SHELF_TABS,
  label = 'Kinds of résumé',
}: {
  onPick: (id: string) => void
  /** One entry shows that shelf with no tab row. */
  tabs?: readonly { tag: TemplateTag; label: string }[]
  label?: string
}) {
  const [tab, setTab] = useState<TemplateTag>(tabs[0].tag)
  const items = useMemo(() => shelfFor(tab), [tab])
  const track = useRef<HTMLUListElement>(null)
  const [edge, setEdge] = useState({ start: true, end: false })

  const measure = () => {
    const el = track.current
    if (!el) return
    setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 })
  }
  useEffect(() => {
    const el = track.current
    if (!el) return
    el.scrollTo({ left: 0 })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [tab])

  const step = (dir: 1 | -1) => {
    const el = track.current
    if (!el) return
    const card = el.querySelector('li')
    const by = card ? card.getBoundingClientRect().width + 24 : el.clientWidth * 0.8
    el.scrollBy({ left: dir * Math.max(by, Math.floor(el.clientWidth / by) * by), behavior: 'smooth' })
  }

  return (
    <div>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 sm:px-6">
        <div role="tablist" aria-label={label} className={`-mx-1 flex gap-2 overflow-x-auto px-1 py-1${tabs.length < 2 ? ' invisible' : ''}`}>
          {tabs.map((t) => {
            const on = t.tag === tab
            return (
              <button
                key={t.tag}
                role="tab"
                aria-selected={on}
                onClick={() => setTab(t.tag)}
                className={`h-9 shrink-0 rounded-full px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b07a1e] focus-visible:ring-offset-2 ${
                  on
                    ? 'bg-foreground text-background'
                    : 'border border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                }`}
              >
                {t.label}
              </button>
            )
          })}
        </div>
        <div className="hidden gap-2 sm:flex">
          <button
            onClick={() => step(-1)}
            disabled={edge.start}
            aria-label="Previous designs"
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-background text-foreground transition hover:bg-surface-muted disabled:opacity-35 disabled:hover:bg-background"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => step(1)}
            disabled={edge.end}
            aria-label="Next designs"
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-background text-foreground transition hover:bg-surface-muted disabled:opacity-35 disabled:hover:bg-background"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* The row runs to the window's edges; its first card lines up with the page column. */}
      <ul
        ref={track}
        onScroll={measure}
        className="shelf-track mt-6 flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth pb-8 pt-2"
        data-nosnippet
      >
        {items.map((t) => (
          <li key={t.id} className="w-[15rem] shrink-0 snap-start sm:w-[17.5rem]">
            <button
              onClick={() => onPick(t.id)}
              className="group block w-full text-left focus-visible:outline-none"
              aria-label={`Start with the ${t.name} design`}
            >
              <span className="block overflow-hidden rounded-[3px] bg-white shadow-[0_1px_3px_rgba(22,23,29,0.08),0_16px_36px_-22px_rgba(22,23,29,0.42)] ring-1 ring-black/[0.04] transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_2px_4px_rgba(22,23,29,0.08),0_26px_50px_-24px_rgba(22,23,29,0.5)] group-focus-visible:ring-2 group-focus-visible:ring-[#b07a1e]">
                <img
                  src={`/img/templates/thumb/${t.id}.webp`}
                  alt={`A page in the ${t.name} design`}
                  width={520}
                  height={735}
                  loading="lazy"
                  decoding="async"
                  className="block aspect-[520/735] w-full"
                />
              </span>
              <span className="mt-3 flex items-baseline justify-between gap-3">
                <span className="text-[15px] font-semibold text-foreground">{t.name}</span>
                <span className="text-xs text-muted-foreground opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                  Use this →
                </span>
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {t.tags.filter((g: TemplateTag) => g !== 'premium' && g !== 'photo' && g !== 'bare' && g !== 'signature' && g !== 'ats-safe').slice(0, 3).map(tagLabel).join(' · ')}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
