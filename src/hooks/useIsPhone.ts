import { useEffect, useState } from 'react'

/**
 * A phone: narrower than the `md` breakpoint the editor's layout already
 * switches on (LeftRail becomes a bottom tab bar, the panel takes the whole
 * width and covers the canvas) AND driven by a finger rather than a mouse.
 *
 * Both halves matter. The width alone would also catch a desktop browser
 * window dragged narrow, where a mouse can still hit a 3px control and hover
 * still works — so that window keeps every desktop affordance. The pointer
 * alone would catch tablets, where the canvas IS editable.
 */
export const PHONE_MEDIA_QUERY = '(max-width: 767px) and (pointer: coarse)'

export function useIsPhone(): boolean {
  const [phone, setPhone] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.(PHONE_MEDIA_QUERY).matches
  )
  useEffect(() => {
    const mq = window.matchMedia?.(PHONE_MEDIA_QUERY)
    if (!mq) return
    const sync = () => setPhone(mq.matches)
    // Rotating the device, or an iPad switching to a split view, changes the
    // answer after mount.
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return phone
}
