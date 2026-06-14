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
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2"
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
              <button className="btn-icon h-6 w-6" onClick={() => dismiss(t.id)} aria-label="Dismiss">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
