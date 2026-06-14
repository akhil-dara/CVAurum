import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { customAlphabet } from 'nanoid'

/** Tailwind-aware className combiner. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const nano = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12)
export const uid = (prefix = '') => (prefix ? `${prefix}-${nano()}` : nano())

/**
 * Allowlist a user-supplied URL for use as a link `href`. Returns a safe href or
 * `undefined` (caller renders plain text instead). Blocks `javascript:`,
 * `data:`, `vbscript:` etc. — only http/https/mailto/tel survive. A bare host
 * like "site.com" is assumed https. React 18 does NOT strip dangerous hrefs, so
 * this is the guard against XSS from imported resume URLs.
 */
export function safeHref(url?: string): string | undefined {
  if (!url) return undefined
  // Drop whitespace/control chars (code <= 0x20) so "java\tscript:" can't sneak
  // a dangerous scheme past the check below.
  const s = [...url].filter((c) => c.charCodeAt(0) > 0x20).join('')
  if (!s) return undefined
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(s)
  const candidate = hasScheme ? s : `https://${s}`
  try {
    const u = new URL(candidate)
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(u.protocol.toLowerCase()) ? candidate : undefined
  } catch {
    return undefined
  }
}

/** Debounce a function. */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let t: ReturnType<typeof setTimeout> | undefined
  const debounced = (...args: A) => {
    if (t) clearTimeout(t)
    t = setTimeout(() => {
      t = undefined
      fn(...args)
    }, ms)
  }
  debounced.cancel = () => {
    if (t) clearTimeout(t)
    t = undefined
  }
  // Flush ONLY a genuinely pending call. A no-op when nothing is pending so an
  // unmount/cleanup can't clobber state with a stale flush (e.g. writing []
  // before an async load resolves).
  debounced.flush = (...args: A) => {
    if (!t) return
    clearTimeout(t)
    t = undefined
    fn(...args)
  }
  return debounced
}

/**
 * Leading-edge throttle: fires on the FIRST call, then ignores calls until `ms`
 * has elapsed. Used for undo-history capture so a typing burst collapses to a
 * single step whose baseline is the state BEFORE the burst (not after).
 */
export function throttle<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let last = 0
  return (...args: A) => {
    const now = Date.now()
    if (now - last >= ms) {
      last = now
      fn(...args)
    }
  }
}

/** Escape a plain string for safe insertion into an HTML (rich-text) field. */
export function htmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** Format an ISO-ish date string for display. Accepts "2021", "2021-05", "2021-05-01". */
export function formatDate(value?: string, opts: { month?: 'short' | 'long' } = {}): string {
  if (!value) return ''
  const trimmed = value.trim()
  if (/^present$/i.test(trimmed)) return 'Present'
  // Already human text → pass through
  if (!/^\d{4}(-\d{1,2}){0,2}$/.test(trimmed)) return trimmed
  const [y, m] = trimmed.split('-')
  if (!m) return y
  const monthIdx = Math.max(0, Math.min(11, parseInt(m, 10) - 1))
  const months =
    opts.month === 'long'
      ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[monthIdx]} ${y}`
}

/** "Jan 2021 — Present" style range. */
export function formatDateRange(start?: string, end?: string, opts?: { month?: 'short' | 'long' }): string {
  const s = formatDate(start, opts)
  const e = end ? formatDate(end, opts) : 'Present'
  if (!s && !e) return ''
  if (!s) return e
  if (!e) return s
  return `${s} — ${e}`
}

/** Strip HTML tags to plain text (used for ATS extraction & previews). */
export function htmlToText(html?: string): string {
  if (!html) return ''
  if (typeof document === 'undefined') return html.replace(/<[^>]*>/g, ' ')
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim()
}

/** True when a (possibly rich-text) value has no meaningful content. */
export function isEmptyRich(html?: string): boolean {
  return htmlToText(html).length === 0
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60) || 'resume'
}

/**
 * Default export filename base, e.g. "Alex_Morgan_Resume_2026-06-14". Uses the
 * person's name when present (falling back to the resume title), then the date.
 * Users can still rename in the browser's save dialog.
 */
export function resumeFileBase(name?: string, title?: string): string {
  const clean = (s: string) => s.trim().replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '')
  const date = new Date().toISOString().slice(0, 10)
  const n = clean(name || '')
  if (n) return `${n}_Resume_${date}`
  const t = clean(title || '') || 'Resume'
  return /resume/i.test(t) ? `${t}_${date}` : `${t}_Resume_${date}`
}

/** Default export filename with an extension. */
export function resumeFilename(name: string | undefined, title: string | undefined, ext: string): string {
  return `${resumeFileBase(name, title)}.${ext}`
}

/** Relative humanized time, e.g. "2 minutes ago". */
export function timeAgo(ts: number, now = Date.now()): string {
  const diff = Math.max(0, now - ts)
  const sec = Math.round(diff / 1000)
  if (sec < 60) return 'just now'
  const min = Math.round(sec / 60)
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`
  const day = Math.round(hr / 24)
  if (day < 30) return `${day} day${day === 1 ? '' : 's'} ago`
  const mo = Math.round(day / 30)
  if (mo < 12) return `${mo} month${mo === 1 ? '' : 's'} ago`
  const yr = Math.round(mo / 12)
  return `${yr} year${yr === 1 ? '' : 's'} ago`
}
