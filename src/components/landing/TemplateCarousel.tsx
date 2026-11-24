/**
 * The homepage's template shelf: real pages, large enough to judge, in a row
 * you scroll or step through, grouped by the kind of resume people ask for.
 * The plainest single-column designs come first (every design exports text an
 * ATS reads word for word; these are simply the quietest); the
 * Signature designs live in the gallery, not here.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { TEMPLATES } from '@/templates/registry'
import type { TemplateConfig, TemplateTag } from '@/types/template'
import { useLabel } from '@/i18n/labels'
import { useT } from '@/i18n'

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
  label = 'Kinds of resume',
}: {
  onPick: (id: string) => void
  /** One entry shows that shelf with no tab row. */
  tabs?: readonly { tag: TemplateTag; label: string }[]
  label?: string
}) {
  const t = useT()
  const L = useLabel()
  const [tab, setTab] = useState<TemplateTag>(tabs[0].tag)
  const items = useMemo(() => shelfFor(tab), [tab])
  const track = useRef<HTMLUListElement>(null)
  const [edge, setEdge] = useState({ start: true, end: false })

  /** Which way this row runs. In a right-to-left page the shelf starts at the
   *  RIGHT: scrollLeft is 0 there and goes NEGATIVE as the row moves left, so
   *  the old `scrollLeft < 8` test read the start as the end and the Next
   *  button scrolled the wrong way - the row never moved (reported in
   *  Persian, 2026-11-17). Measuring the distance scrolled, with no sign,
   *  works in both directions. */
  const rtl = () => {
    const el = track.current
    return !!el && getComputedStyle(el).direction === 'rtl'
  }
  const measure = () => {
    const el = track.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    const at = Math.abs(el.scrollLeft)
    setEdge({ start: at < 8, end: at > max - 8 })
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
    const amount = Math.max(by, Math.floor(el.clientWidth / by) * by)
    // `dir` is "forward in reading order": to the left in English, to the
    // right in Persian, where the row is mirrored.
    el.scrollBy({ left: (rtl() ? -1 : 1) * dir * amount, behavior: 'smooth' })
  }

  return (
    <div>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 sm:px-6">
        <div role="tablist" aria-label={L(label)} className={`-mx-1 flex gap-2 overflow-x-auto px-1 py-1${tabs.length < 2 ? ' invisible' : ''}`}>
          {tabs.map((tabDef) => {
            const on = tabDef.tag === tab
            return (
              <button
                key={tabDef.tag}
                role="tab"
                aria-selected={on}
                onClick={() => setTab(tabDef.tag)}
                className={`h-9 shrink-0 rounded-full px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b07a1e] focus-visible:ring-offset-2 ${
                  on
                    ? 'bg-foreground text-background'
                    : 'border border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                }`}
              >
                {L(tabDef.label)}
              </button>
            )
          })}
        </div>
        <div className="hidden gap-2 sm:flex">
          <button
            onClick={() => step(-1)}
            disabled={edge.start}
            aria-label={t('shelf.prev')}
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-background text-foreground transition hover:bg-surface-muted disabled:opacity-35 disabled:hover:bg-background"
          >
            {/* The arrow points the way the row moves: the shelf begins at the
                right in Persian, so "back" is a right-pointing chevron. */}
            <ChevronLeft className="h-5 w-5 rtl:hidden" />
            <ChevronRight className="hidden h-5 w-5 rtl:block" />
          </button>
          <button
            onClick={() => step(1)}
            disabled={edge.end}
            aria-label={t('shelf.next')}
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-background text-foreground transition hover:bg-surface-muted disabled:opacity-35 disabled:hover:bg-background"
          >
            <ChevronRight className="h-5 w-5 rtl:hidden" />
            <ChevronLeft className="hidden h-5 w-5 rtl:block" />
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
        {items.map((tpl) => (
          <li key={tpl.id} className="w-[15rem] shrink-0 snap-start sm:w-[17.5rem]">
            <button
              onClick={() => onPick(tpl.id)}
              className="group block w-full text-start focus-visible:outline-none"
              aria-label={t('shelf.startWith', { name: tpl.name })}
            >
              <span className="block overflow-hidden rounded-[3px] bg-white shadow-[0_1px_3px_rgba(22,23,29,0.08),0_16px_36px_-22px_rgba(22,23,29,0.42)] ring-1 ring-black/[0.04] transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_2px_4px_rgba(22,23,29,0.08),0_26px_50px_-24px_rgba(22,23,29,0.5)] group-focus-visible:ring-2 group-focus-visible:ring-[#b07a1e]">
                <img
                  src={`/img/templates/thumb/${tpl.id}.webp`}
                  alt={t('shelf.pageIn', { name: tpl.name })}
                  width={520}
                  height={735}
                  loading="lazy"
                  decoding="async"
                  className="block aspect-[520/735] w-full"
                />
              </span>
              <span className="mt-3 flex items-baseline justify-between gap-3">
                <span className="text-[15px] font-semibold text-foreground">{tpl.name}</span>
                <span className="text-xs text-muted-foreground opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                  {t('shelf.useThis')}
                </span>
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {tpl.tags
                  .filter((g: TemplateTag) => g !== 'premium' && g !== 'photo' && g !== 'bare' && g !== 'signature' && g !== 'ats-safe')
                  .slice(0, 3)
                  .map((g) => L(tagLabel(g)))
                  .join(' · ')}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
