/**
 * First-run guided tour of the editor. Spotlights each key area with a short
 * "here you do this" tooltip. Shown once (localStorage), fully dismissable, and
 * re-openable from the "?" button in the top bar (window 'cvaurum:open-tour').
 *
 * Resilient by design: if a step's target isn't on screen (e.g. the canvas is
 * hidden behind the panel on mobile), that step falls back to a centered card so
 * the guidance still shows and never points at nothing.
 */
import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { isMac, shortcutLabel } from '@/lib/paletteRank'
import { createPortal } from 'react-dom'
import { X, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react'
import { isPhoneLayout } from '@/lib/layoutMode'
import { TEMPLATE_COUNT } from '@/templates/registry'
import { useT, type MsgKey } from '@/i18n'

const TOUR_KEY = 'cvaurum:tour:v2'
/** The command-palette shortcut as this machine spells it: one value for the
 *  title and the body that both name it. */
const PALETTE_KEYS = shortcutLabel('Ctrl+K', isMac())
const CARD_W = 324

interface Step {
  sel?: string
  titleKey: MsgKey
  bodyKey: MsgKey
  /** What this step says on a phone, where the canvas is hidden behind the
   *  panel and hover does not exist. The desktop body told a phone user to
   *  click text they could not see and hover things a finger cannot - the
   *  guidance was WRONG there, not merely unanchored (reported live,
   *  2026-08-29). Steps without one read the same everywhere. */
  mobileBodyKey?: MsgKey
  /** A step about a desktop-only surface (the command palette) is skipped on
   *  a phone rather than described apologetically. */
  desktopOnly?: boolean
  /** On a phone, SHOW the surface the step talks about - the tour used to
   *  describe the template gallery while the Content form stayed on screen,
   *  which read as the tour being broken. Runs when the step opens, phone
   *  only; desktop anchors its ring to the real control instead. */
  mobileShow?: { tab?: 'content' | 'design' | 'templates' | 'ats'; panelOpen?: boolean; event?: string }
  /** Anchor to use on a phone when the desktop one is hidden there - the
   *  restyle step rings the panel's own Style button instead of a canvas
   *  that is not on screen, so the centered fallback card cannot end up
   *  covering the very control the words describe. */
  mobileSel?: string
}

/* Titles carry no numbers - the prefix is added at render, so skipping the
   desktop-only steps on a phone keeps the numbering sequential. */
const STEPS: Step[] = [
  { titleKey: 'tour.s1.title', bodyKey: 'tour.s1.body' },
  {
    sel: '[data-tour="panel"]',
    mobileShow: { tab: 'content', panelOpen: true },
    titleKey: 'tour.s2.title',
    bodyKey: 'tour.s2.body',
  },
  {
    sel: '[data-tour="canvas"]',
    mobileShow: { panelOpen: false },
    titleKey: 'tour.s4.title',
    bodyKey: 'tour.s4.body',
    mobileBodyKey: 'tour.s4.mobile',
  },
  {
    sel: '[data-tour="templates"]',
    mobileShow: { tab: 'templates', panelOpen: true },
    titleKey: 'tour.s3.title',
    bodyKey: 'tour.s3.body',
    mobileBodyKey: 'tour.s3.mobile',
  },
  {
    sel: '[data-tour="design"]',
    mobileShow: { tab: 'design', panelOpen: true },
    titleKey: 'tour.s5.title',
    bodyKey: 'tour.s5.body',
  },
  {
    sel: '[data-tour="canvas"]',
    mobileSel: '.rm-panel-gear .rm-section-gear',
    mobileShow: { tab: 'content', panelOpen: true, event: 'cvaurum:tour-show-style' },
    titleKey: 'tour.s6.title',
    bodyKey: 'tour.s6.body',
    mobileBodyKey: 'tour.s6.mobile',
  },
  {
    sel: '[data-tour="checks"]',
    mobileShow: { panelOpen: false },
    titleKey: 'tour.s7.title',
    bodyKey: 'tour.s7.body',
  },
  { sel: '[data-tour="modes"]', titleKey: 'tour.s8.title', bodyKey: 'tour.s8.body' },
  {
    sel: '[data-tour="palette"]',
    titleKey: 'tour.s9.title',
    bodyKey: 'tour.s9.body',
    desktopOnly: true,
  },
  { sel: '[data-tour="share"]', titleKey: 'tour.s10.title', bodyKey: 'tour.s10.body' },
  { sel: '[data-tour="export"]', titleKey: 'tour.s11.title', bodyKey: 'tour.s11.body' },
]

export function EditorTour() {
  const [open, setOpen] = useState(false)
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [, force] = useState(0)
  const [invite, setInvite] = useState(false)
  const t = useT()
  // Both steps that carry a figure read it from here, so no card builds a
  // sentence in the component.
  const vars = { count: TEMPLATE_COUNT, keys: PALETTE_KEYS }

  // Open on first visit; allow re-open via a global event (the "?" button).
  useEffect(() => {
    let seen = false
    try {
      seen = !!localStorage.getItem(TOUR_KEY)
    } catch {
      /* private mode — just behave as unseen */
    }
    // A first visit is invited, not taken on the tour: it used to open itself,
    // dimmed over the author's resume, before they had done anything - eleven
    // cards of lecture. A small card offers it; either answer settles it.
    if (!seen) {
      const t = setTimeout(() => setInvite(true), 1200)
      return () => clearTimeout(t)
    }
  }, [])

  useEffect(() => {
    const onOpen = () => {
      setI(0)
      setOpen(true)
    }
    window.addEventListener('cvaurum:open-tour', onOpen)
    return () => window.removeEventListener('cvaurum:open-tour', onOpen)
  }, [])

  // The phone layout is where the panel covers the canvas, so it is also
  // where the desktop wording stops being true.
  const mobile = isPhoneLayout()
  const steps = mobile ? STEPS.filter((st) => !st.desktopOnly) : STEPS
  const step = steps[i]

  // Bring the surface a step talks about onto the screen (phone only).
  useEffect(() => {
    if (!open || !mobile || !step?.mobileShow) return
    import('@/store/useEditorStore').then(({ useEditorStore }) => {
      const es = useEditorStore.getState()
      if (step.mobileShow!.tab) es.setLeftTab(step.mobileShow!.tab)
      if (step.mobileShow!.panelOpen !== undefined) es.setLeftOpen(step.mobileShow!.panelOpen)
      // Some steps need a surface prepared beyond tab switching - the restyle
      // step asks the organizer to expand its first card so the Style button
      // the words point at is actually on screen.
      if (step.mobileShow!.event) setTimeout(() => window.dispatchEvent(new Event(step.mobileShow!.event!)), 120)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, i, mobile])

  // Measure the current target (re-measure on step change, resize, scroll).
  const measure = useCallback(() => {
    const mobileNow = isPhoneLayout()
    const sel = (mobileNow && step?.mobileSel) || step?.sel
    if (!open || !sel) return setRect(null)
    const el = document.querySelector(sel) as HTMLElement | null
    const r = el?.getBoundingClientRect() ?? null
    setRect(r && r.width > 4 && r.height > 4 ? r : null)
  }, [open, step])

  useLayoutEffect(() => {
    measure()
    // The panel animates in; re-measure a beat later so the ring lands right.
    const t = setTimeout(measure, 180)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [measure])

  const finish = () => {
    try {
      localStorage.setItem(TOUR_KEY, '1')
    } catch {
      /* ignore */
    }
    setOpen(false)
    // the canvas tip waits for this: a first visit used to get the invite,
    // the tip and the Templates panel all at once (critique round 3)
    window.dispatchEvent(new Event('cvaurum:tour-settled'))
  }

  if (!open) {
    if (!invite) return null
    return createPortal(
      <div
        role="region"
        aria-label={t('tour.label')}
        className="fixed bottom-4 start-4 z-[70] w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface p-4 text-sm text-foreground shadow-float"
      >
        <p className="font-medium">{t('tour.inviteTitle')}</p>
        <p className="mt-1 text-muted-foreground">{t('tour.inviteBody')}</p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className="btn-primary btn-sm phone:h-10"
            onClick={() => {
              setInvite(false)
              setI(0)
              setOpen(true)
            }}
          >
            {t('tour.showMeAround')}
          </button>
          <button
            type="button"
            className="btn-ghost btn-sm phone:h-10"
            onClick={() => {
              setInvite(false)
              finish()
            }}
          >
            {t('tour.noThanks')}
          </button>
        </div>
      </div>,
      document.body
    )
  }

  const last = i === steps.length - 1
  const vw = window.innerWidth
  const vh = window.innerHeight

  // Card placement: below the target if it fits, else above; centered if no target.
  let cardStyle: React.CSSProperties
  if (rect) {
    const estH = 168
    const below = rect.bottom + 12 + estH < vh
    const top = below ? rect.bottom + 12 : Math.max(12, rect.top - estH - 12)
    const left = Math.max(12, Math.min(rect.left + rect.width / 2 - CARD_W / 2, vw - CARD_W - 12))
    cardStyle = { top, left }
  } else {
    cardStyle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  }

  return createPortal(
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label={t('tour.label')} onClick={() => void force((n) => n + 1)}>
      {/* Dim + spotlight. The ring carries the big box-shadow that darkens the
          rest of the screen; with no target, a plain dim layer is used. */}
      {rect ? (
        <div
          className="pointer-events-none absolute rounded-lg ring-2 ring-primary transition-all duration-200"
          style={{
            left: rect.left - 6,
            top: rect.top - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: '0 0 0 9999px rgba(12, 14, 22, 0.55)',
          }}
        />
      ) : (
        <div className="absolute inset-0" style={{ background: 'rgba(12, 14, 22, 0.6)' }} />
      )}

      {/* Tooltip card */}
      <div
        className="absolute w-[324px] max-w-[calc(100vw-1.5rem)] rounded-xl border border-border bg-surface p-4 shadow-float"
        style={cardStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            {i === 0 && <Sparkles className="h-4 w-4 text-primary" />}
            {i > 0 ? `${i} · ` : ''}
            {t(step.titleKey, vars)}
          </div>
          <button className="btn-icon h-6 w-6 shrink-0" onClick={finish} aria-label={t('tour.skip')} title={t('tour.skip')}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{t((mobile && step.mobileBodyKey) || step.bodyKey, vars)}</p>

        <div className="mt-4 flex items-center justify-between">
          {/* progress dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, n) => (
              <span key={n} className={`h-1.5 rounded-full transition-all ${n === i ? 'w-4 bg-primary' : 'w-1.5 bg-muted-foreground/30'}`} />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            {i > 0 && (
              <button className="btn-ghost btn-sm" onClick={() => setI((n) => n - 1)}>
                <ArrowLeft className="flip-rtl h-4 w-4" /> {t('tour.back')}
              </button>
            )}
            {last ? (
              <button className="btn-primary btn-sm" onClick={finish}>
                {t('tour.start')}
              </button>
            ) : (
              <button className="btn-primary btn-sm" onClick={() => setI((n) => n + 1)}>
                {t('tour.next')} <ArrowRight className="flip-rtl h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {i === 0 && (
          <button className="mt-2 w-full text-center text-[11px] text-muted-foreground hover:text-foreground" onClick={finish}>
            {t('tour.skipLink')}
          </button>
        )}
      </div>
    </div>,
    document.body,
  )
}
