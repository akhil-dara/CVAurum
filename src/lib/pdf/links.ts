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
type Box = { left: number; top: number; width: number; height: number }

/** Merge rects that sit on the same line into the line box they came from.
 *  Exported for its unit test - the two-line case is the one that matters and
 *  a browser probe could not be made to produce a wrapping anchor reliably. */
export function mergeRuns(rects: Box[]): Box[] {
  const out: Box[] = []
  for (const r of rects.slice().sort((x, y) => x.top - y.top || x.left - y.left)) {
    const last = out[out.length - 1]
    // Same line when the vertical extents overlap by most of their height -
    // superscripts and inline icons sit apart and stay apart.
    const sameLine =
      last && Math.min(last.top + last.height, r.top + r.height) - Math.max(last.top, r.top) > Math.min(last.height, r.height) * 0.6
    if (!sameLine) {
      out.push({ left: r.left, top: r.top, width: r.width, height: r.height })
      continue
    }
    const left = Math.min(last.left, r.left)
    const top = Math.min(last.top, r.top)
    last.width = Math.max(last.left + last.width, r.left + r.width) - left
    last.height = Math.max(last.top + last.height, r.top + r.height) - top
    last.left = left
    last.top = top
  }
  return out
}

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
    // getClientRects can hand back one rect PER WORD, not per line - a title
    // reading "Pulse - Open-source observability" came back as three, and the
    // spaces between the words were then not clickable at all. Rects sharing a
    // line are merged back into the line box they came from; a link that
    // genuinely wraps still gets one rect per line, which is the point of
    // walking rects in the first place.
    for (const r of mergeRuns(Array.from(a.getClientRects()))) {
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
