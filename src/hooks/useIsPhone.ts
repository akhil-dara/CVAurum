import { useEffect, useState } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches
  )
  useEffect(() => {
    const mq = window.matchMedia?.(query)
    if (!mq) return
    const sync = () => setMatches(mq.matches)
    // Rotating the device, or an iPad switching to a split view, changes the
    // answer after mount.
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [query])
  return matches
}

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
  return useMediaQuery(PHONE_MEDIA_QUERY)
}

/**
 * A touch device too narrow to carry the editor's 64px rail, its 392px panel
 * AND a canvas anyone can actually edit, all at once.
 *
 * The canvas fits the A4 sheet into whatever width is left, down to a 0.35
 * floor. On a 768px tablet the split leaves 312px, so the sheet renders 278px
 * wide: body copy lands around 3.6px and every on-canvas control shrinks with
 * it (the section gear 18x7, a skill chip's remove button 4x4). A 1024px
 * tablet in landscape is only a little better — 0.645 scale, a 34px gear —
 * still under the 40px a fingertip needs. So below `xl` a finger-driven
 * editor gives the panel the whole editing area and shows the canvas at full
 * width when the panel is closed (0.816 scale, a 43px gear at 768px).
 *
 * Pointer, not width, is what makes this a tablet rule: a mouse-driven window
 * of the same width keeps the side-by-side split, because a cursor can still
 * hit a small target and its user can widen the window.
 */
export const COMPACT_EDITOR_MEDIA_QUERY = '(max-width: 1279px) and (pointer: coarse)'

export function useIsCompactEditor(): boolean {
  return useMediaQuery(COMPACT_EDITOR_MEDIA_QUERY)
}
