import { useEffect, useRef } from 'react'

/**
 * Keyboard lifecycle for canvas popovers (Style panels, logo menu): on open,
 * move focus INTO the panel (it was ~120 tab stops away otherwise); Escape
 * closes it from anywhere; on close, focus returns to the control that opened
 * it instead of being dropped on <body>.
 */
export function usePopoverA11y(open: boolean, onClose: () => void, panelRef: React.RefObject<HTMLElement | null>) {
  const restore = useRef<HTMLElement | null>(null)
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    if (!open) return
    restore.current = document.activeElement as HTMLElement | null
    const t = setTimeout(() => panelRef.current?.focus(), 30)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        close.current()
      }
    }
    // capture phase: works no matter what has focus behind the panel
    document.addEventListener('keydown', onKey, true)
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey, true)
      restore.current?.focus?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
}
