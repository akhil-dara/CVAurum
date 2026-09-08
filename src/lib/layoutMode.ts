import { useSyncExternalStore } from 'react'

/**
 * The phone layout - panel-only editor, bottom tab bar, hidden canvas - is
 * for a phone, never for a desktop window that happens to be narrow. A
 * laptop window snapped to half a 1366px screen is 683px wide and used to
 * get the phone layout because every shell decision was a width alone
 * (`md:` classes, `innerWidth < 768`). Two things decide it now: under 560px
 * nothing fits side by side whatever the pointer; between 560 and 768 only a
 * finger-driven screen (a small tablet held upright) is a phone.
 */
export function phoneLayoutFor(width: number, coarsePointer: boolean): boolean {
  return width < 560 || (width < 768 && coarsePointer)
}

const coarse = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches

export function isPhoneLayout(): boolean {
  return typeof window !== 'undefined' && phoneLayoutFor(window.innerWidth, coarse())
}

const listeners = new Set<() => void>()
let current = isPhoneLayout()

function stamp() {
  const next = isPhoneLayout()
  document.documentElement.dataset.layout = next ? 'phone' : 'desk'
  if (next !== current) {
    current = next
    for (const l of listeners) l()
  }
}

/**
 * Stamp html[data-layout] now and on every change; the Tailwind variants
 * `desk:` and `phone:` (tailwind.config.js) read it. Returns a stop function.
 */
export function watchLayoutMode(): () => void {
  stamp()
  const mq = typeof window.matchMedia === 'function' ? window.matchMedia('(pointer: coarse)') : null
  window.addEventListener('resize', stamp)
  mq?.addEventListener('change', stamp)
  return () => {
    window.removeEventListener('resize', stamp)
    mq?.removeEventListener('change', stamp)
  }
}

export function usePhoneLayout(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => current,
    () => false
  )
}
