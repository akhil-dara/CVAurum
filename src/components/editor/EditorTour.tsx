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
import { createPortal } from 'react-dom'
import { X, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react'
import { isPhoneLayout } from '@/lib/layoutMode'
import { TEMPLATE_COUNT } from '@/templates/registry'

const TOUR_KEY = 'cvaurum:tour:v2'
const CARD_W = 324

interface Step {
  sel?: string
  title: string
  body: string
  /** What this step says on a phone, where the canvas is hidden behind the
   *  panel and hover does not exist. The desktop body told a phone user to
   *  click text they could not see and hover things a finger cannot - the
   *  guidance was WRONG there, not merely unanchored (reported live,
   *  2026-08-29). Steps without one read the same everywhere. */
  mobileBody?: string
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
  { title: 'Welcome — a quick tour 👋', body: 'Thirty seconds on where everything is. Skip it anytime and reopen it from the “?” in the top bar.' },
  { sel: '[data-tour="panel"]', mobileShow: { tab: 'content', panelOpen: true }, title: 'Fill in your details', body: 'Type your name, experience and skills here. Empty sections show an “Add” button — nothing is hidden.' },
  { sel: '[data-tour="canvas"]', mobileShow: { panelOpen: false }, title: 'Or edit on the page', body: 'Click any text on the résumé to edit it right there. What you see is exactly what you download.', mobileBody: 'This is the page itself — tap any text to edit it. The Content tab below reopens the full forms; everything you type lands here instantly.' },
  { sel: '[data-tour="templates"]', mobileShow: { tab: 'templates', panelOpen: true }, title: `${TEMPLATE_COUNT} designs, one résumé`, body: 'Hover a design for a full-size preview with your own content; click to switch. Nothing is retyped, and every design can be restyled afterwards.', mobileBody: 'Tap any design to switch. Nothing is retyped, and every design can be restyled afterwards.' },
  { sel: '[data-tour="design"]', mobileShow: { tab: 'design', panelOpen: true }, title: 'Make it yours', body: 'Design changes colours, fonts, the header, the contact line and where it sits, heading styles, where dates and language levels go, one or two columns, spacing and page size — on any template.' },
  { sel: '[data-tour="canvas"]', mobileSel: '.rm-panel-gear .rm-section-gear', mobileShow: { tab: 'content', panelOpen: true, event: 'cvaurum:tour-show-style' }, title: 'Restyle one section', body: 'Hover a section and press its “Style” pill to change just that section: heading, icon, entry layout, date position. The eye beside it hides the section.', mobileBody: 'This “Style” button restyles one section — heading, icon, entry layout, date position. The ⋯ menu renames, hides or removes it.' },
  { sel: '[data-tour="checks"]', mobileShow: { panelOpen: false }, title: 'Fits the page, reads for everyone', body: 'Magic fit sizes the text to your page target inside rules you set; tap it for the details. Beside it, the contrast check confirms every line meets WCAG AA — and offers the fix when one does not.' },
  { sel: '[data-tour="modes"]', title: 'Edit · Preview · ATS', body: 'Preview shows exactly what exports. ATS shows the plain text an applicant-tracking system reads, how five kinds of system would split it into fields, and a keyword match against the job.' },
  { sel: '[data-tour="palette"]', title: 'Do anything with ⌘K', body: 'Press ⌘K / Ctrl+K for a command palette — switch designs, fonts and colours, add sections, change mode. In a summary, type “/” for quick inserts.', desktopOnly: true },
  { sel: '[data-tour="share"]', title: 'Share privately', body: 'Send an encrypted link: the résumé is sealed with a passphrase inside the link and never touches a server.' },
  { sel: '[data-tour="export"]', title: 'Download, free', body: 'PDF or Word, unlimited, no account, no watermark. The PDF is real selectable text, tagged for screen readers (PDF/UA-1) and archival (PDF/A-2B).' },
]

export function EditorTour() {
  const [open, setOpen] = useState(false)
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [, force] = useState(0)

  // Open on first visit; allow re-open via a global event (the "?" button).
  useEffect(() => {
    let seen = false
    try {
      seen = !!localStorage.getItem(TOUR_KEY)
    } catch {
      /* private mode — just behave as unseen */
    }
    if (!seen) {
      const t = setTimeout(() => setOpen(true), 650)
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
  }

  if (!open) return null

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
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Editor tour" onClick={() => void force((n) => n + 1)}>
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
            {step.title}
          </div>
          <button className="btn-icon h-6 w-6 shrink-0" onClick={finish} aria-label="Skip tour" title="Skip">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{(mobile && step.mobileBody) || step.body}</p>

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
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            )}
            {last ? (
              <button className="btn-primary btn-sm" onClick={finish}>
                Get started
              </button>
            ) : (
              <button className="btn-primary btn-sm" onClick={() => setI((n) => n + 1)}>
                Next <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {i === 0 && (
          <button className="mt-2 w-full text-center text-[11px] text-muted-foreground hover:text-foreground" onClick={finish}>
            Skip the tour
          </button>
        )}
      </div>
    </div>,
    document.body,
  )
}
