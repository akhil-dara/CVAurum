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

const TOUR_KEY = 'cvaurum:tour:v1'
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
  mobileShow?: { tab?: 'content' | 'design' | 'templates' | 'ats'; panelOpen?: boolean }
}

/* Titles carry no numbers - the prefix is added at render, so skipping the
   desktop-only steps on a phone keeps the numbering sequential. */
const STEPS: Step[] = [
  { title: 'Welcome — quick tour 👋', body: "A 30-second look at where everything is. Skip anytime, and reopen it from the “?” in the top bar." },
  { sel: '[data-tour="nav"]', title: 'Choose a section', body: 'Switch between Content, Design, Templates, and the ATS check here.', mobileBody: 'The bottom bar switches between Content, Design, Templates, the ATS check and Preview.' },
  { sel: '[data-tour="panel"]', mobileShow: { tab: 'content', panelOpen: true }, title: 'Fill in your details', body: 'Type your name, experience, and skills. Empty sections show an “Add” button — nothing is hidden.' },
  { sel: '[data-tour="canvas"]', mobileShow: { tab: 'content', panelOpen: true }, title: 'Edit on the page', body: 'Click any text on the resume to edit it right there. What you see is exactly what you export.', mobileBody: 'On a phone this panel is the editor — everything you type lands on the resume instantly. Tap Preview any time to see the page itself.' },
  { sel: '[data-tour="canvas"]', title: 'Restyle any section', body: 'Hover a section and press its “Style” pill — pick heading, layout, and skill styles from live visual previews. The eye icon beside it hides the section. The header has its own Style pill too, with photo/monogram options.', mobileBody: 'Open “Style” beside any section in the panel for its full style sheet — heading style, skills layout, badge size and shape. The ⋯ menu renames, hides or removes it.' },
  { mobileShow: { tab: 'content', panelOpen: true }, title: 'Links that read as words', body: 'Every link keeps its display text separate from its address — “Portfolio” can point anywhere. Click the chain beside a title or contact, or the printed word itself, for one card: Shown as, Goes to, and whether exports make links clickable. While editing, a faint dotted mark shows which words carry a link.', mobileBody: 'Every link keeps its display text separate from its address — “Portfolio” can point anywhere. Each link is a plain pair of fields in the panel, and one switch (in any link card, or under Design) turns clickability on or off for the whole document.' },
  { sel: '[data-tour="modes"]', title: 'Edit · Preview · ATS', body: 'Edit is the live canvas. Preview shows exactly what exports. ATS shows the plain text a recruiting system reads — plus a per-system parse simulation (Workday, Greenhouse, Lever, Taleo, iCIMS) and an on-device writing coach.' },
  { sel: '[data-tour="templates"]', mobileShow: { tab: 'templates', panelOpen: true }, title: 'Switch templates', body: 'Try any of 52 designs — hover one for a full-size preview with your content, click to switch. Nothing is re-typed.', mobileBody: 'Try any of 52 designs — tap one to switch. Nothing is re-typed.' },
  { sel: '[data-tour="share"]', title: 'Share privately', body: 'Send an encrypted link — your résumé is sealed with a passphrase inside the link and never touches a server, so even a cached link can’t be read without it.' },
  { sel: '[data-tour="palette"]', title: 'Do anything with ⌘K', body: 'Press ⌘K / Ctrl+K for a command palette — switch templates, fonts, accents, add sections, change mode. Inside a summary, type “/” for quick inserts.', desktopOnly: true },
  { sel: '[data-tour="export"]', title: 'Download, free', body: 'Export a crisp PDF or Word file — unlimited, no account, no watermark. Everything stays in your browser.' },
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

  // md is where the canvas appears beside the panel (`hidden md:block`), so
  // it is also where the desktop wording becomes true.
  const mobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  const steps = mobile ? STEPS.filter((st) => !st.desktopOnly) : STEPS
  const step = steps[i]

  // Bring the surface a step talks about onto the screen (phone only).
  useEffect(() => {
    if (!open || !mobile || !step?.mobileShow) return
    import('@/store/useEditorStore').then(({ useEditorStore }) => {
      const es = useEditorStore.getState()
      if (step.mobileShow!.tab) es.setLeftTab(step.mobileShow!.tab)
      if (step.mobileShow!.panelOpen !== undefined) es.setLeftOpen(step.mobileShow!.panelOpen)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, i, mobile])

  // Measure the current target (re-measure on step change, resize, scroll).
  const measure = useCallback(() => {
    if (!open || !step?.sel) return setRect(null)
    const el = document.querySelector(step.sel) as HTMLElement | null
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
