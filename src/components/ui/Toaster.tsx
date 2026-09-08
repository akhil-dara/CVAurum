import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Info, XCircle, X } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
}

export function Toaster() {
  const toasts = useAppStore((s) => s.toasts)
  const dismiss = useAppStore((s) => s.dismissToast)
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="false"
      // On a phone the editor's bottom tab bar owns the last ~54px of the
      // screen, and a toast pinned to bottom-4 lands on top of it and eats
      // its taps (the card is pointer-events-auto). Sit above the bar below
      // md - the same breakpoint that turns the bar back into the desktop
      // left rail - and keep the desktop corner unchanged.
      className="pointer-events-none fixed bottom-20 right-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 md:bottom-4"
    >
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = ICONS[t.kind]
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="card pointer-events-auto flex items-start gap-3 p-3 shadow-float"
            >
              <Icon
                className={
                  t.kind === 'success'
                    ? 'mt-0.5 h-5 w-5 shrink-0 text-success'
                    : t.kind === 'error'
                      ? 'mt-0.5 h-5 w-5 shrink-0 text-danger'
                      : 'mt-0.5 h-5 w-5 shrink-0 text-primary'
                }
              />
              <p className="flex-1 text-sm leading-snug text-foreground">{t.message}</p>
              {/* 40px of touch target on a phone, without growing the card:
                  the negative margin gives the button back the 24px box the
                  layout had. */}
              <button
                className="btn-icon -m-2 h-10 w-10 shrink-0 md:m-0 md:h-6 md:w-6"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
