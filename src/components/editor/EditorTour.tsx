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
}

const STEPS: Step[] = [
  { title: 'Welcome — quick tour 👋', body: "A 30-second look at where everything is. Skip anytime, and reopen it from the “?” in the top bar." },
  { sel: '[data-tour="nav"]', title: '1 · Choose a section', body: 'Switch between Content, Design, Templates, and the ATS check here.' },
  { sel: '[data-tour="panel"]', title: '2 · Fill in your details', body: 'Type your name, experience, and skills. Empty sections show an “Add” button — nothing is hidden.' },
  { sel: '[data-tour="canvas"]', title: '3 · Edit on the page', body: 'Click any text on the resume to edit it right there. What you see is exactly what you export.' },
  { sel: '[data-tour="templates"]', title: '4 · Switch templates', body: 'Try any of 36 designs — your content flows in instantly, no re-typing.' },
  { sel: '[data-tour="export"]', title: '5 · Download, free', body: 'Export a crisp PDF or Word file — unlimited, no account, no watermark. Everything stays in your browser.' },
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

  const step = STEPS[i]

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

  const last = i === STEPS.length - 1
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
            {step.title}
          </div>
          <button className="btn-icon h-6 w-6 shrink-0" onClick={finish} aria-label="Skip tour" title="Skip">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>

        <div className="mt-4 flex items-center justify-between">
          {/* progress dots */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, n) => (
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
