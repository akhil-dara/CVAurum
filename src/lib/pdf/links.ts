/**
 * Clickable links in the exported PDF (2026-08-25).
 *
 * The renderer painted every URL as plain glyphs, so nothing in an exported
 * resume was clickable - a reader looking at a GitHub or LinkedIn address had
 * to retype it. A PDF link is an ANNOTATION, not ink: a rectangle on the page
 * carrying a URI action, which is why this is a separate pass over the
 * artboard's anchors rather than anything the glyph painter does.
 */
import type { DrawOp } from './types'

/** Schemes that must never become a clickable target in a document that will
 *  be opened by people who did not write it. */
const DANGEROUS = /^(javascript|data|vbscript|file):/i
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE = /^\+?[\d][\d\s().-]{5,}$/
/** A bare domain: at least one dot, a plausible TLD, no spaces. */
const DOMAIN = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}(\/[^\s]*)?$/i

/**
 * The URL a piece of text should point at, or `null` when it should not be a
 * link at all. Accepts what people actually type - a bare domain, an email, a
 * phone number - and refuses anything executable.
 */
export function linkTarget(raw?: string | null): string | null {
  const s = (raw ?? '').trim()
  if (!s) return null
  if (DANGEROUS.test(s)) return null
  if (HAS_SCHEME.test(s)) return s
  if (EMAIL.test(s)) return `mailto:${s}`
  if (DOMAIN.test(s)) return `https://${s}`
  if (PHONE.test(s)) return `tel:${s.replace(/[^\d+]/g, '')}`
  return null
}

/**
 * One `link` op per LINE of every anchor inside `root`.
 *
 * Rects come from `getClientRects()`, which returns one rectangle per line
 * box - so a URL that wraps across two lines is clickable on both, and a
 * link inside a wrapped paragraph does not get one huge rectangle covering
 * text that is not part of it.
 *
 * `aria-hidden` anchors are skipped: the templates mark decoration that way,
 * and a decorative mark is not something a reader should be able to click.
 */
export function collectLinkOps(root: HTMLElement): DrawOp[] {
  // The unit suite drives buildDrawList with a hand-built element stub rather
  // than a real DOM. A stub that cannot be queried simply has no anchors -
  // that is a true answer, not an error to throw at the caller.
  if (typeof root.querySelectorAll !== 'function' || typeof root.getBoundingClientRect !== 'function') return []
  const rootRect = root.getBoundingClientRect()
  const ops: DrawOp[] = []
  for (const a of Array.from(root.querySelectorAll('a[href]'))) {
    if (a.closest('.no-print')) continue
    let hidden = false
    for (let cur: Element | null = a; cur && cur !== root.parentElement; cur = cur.parentElement) {
      const v = cur.getAttribute('aria-hidden')
      if (v !== null && v !== 'false') { hidden = true; break }
    }
    if (hidden) continue
    const url = linkTarget(a.getAttribute('href'))
    if (!url) continue
    for (const r of Array.from(a.getClientRects())) {
      if (r.width <= 0 || r.height <= 0) continue
      ops.push({
        kind: 'link',
        xPx: r.left - rootRect.left,
        yPx: r.top - rootRect.top,
        wPx: r.width,
        hPx: r.height,
        url,
      })
    }
  }
  return ops
}
