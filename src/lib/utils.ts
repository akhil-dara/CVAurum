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

/** Options the date formatters share. `month` picks the month spelling;
 *  `duration` appends the length of a range in parentheses, read against
 *  `now` (the caller's own "YYYY-MM") when the range is open-ended and worded
 *  in `language` (a BCP-47 tag; anything unknown falls back to English). */
export type DateRangeOptions = {
  month?: 'short' | 'long'
  duration?: boolean
  now?: string
  language?: string
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

/** "Jan 2021 - Present" style range (an em dash on the page), ending "(2 yrs 3 mos)" when asked. */
export function formatDateRange(start?: string, end?: string, opts?: DateRangeOptions): string {
  const s = formatDate(start, opts)
  const e = end ? formatDate(end, opts) : 'Present'
  if (!s && !e) return ''
  if (!s) return e
  if (!e) return s
  // A SINGLE-date entry (a one-year course, a one-off engagement) is stored as
  // start === end — render it once, never as "2024 — 2024". Keeping it in the
  // start/end fields means it stays valid JSON Resume and flows through the
  // canvas, the ATS text view, and the Word export unchanged.
  if (isSingleDate(start, end)) return s
  // The span is part of this one string on purpose: every renderer prints
  // the string as it is, so none can show a span the others lack.
  const span = opts?.duration ? formatDuration(start, end, opts) : ''
  return span ? `${s} — ${e} (${span})` : `${s} — ${e}`
}

/** The words a time span is counted in, per language: one year, several
 *  years, one month, several months. Abbreviated where a resume in that
 *  language abbreviates; English stands in for any tag not listed. */
const DURATION_WORDS: Record<string, [yr: string, yrs: string, mo: string, mos: string]> = {
  en: ['yr', 'yrs', 'mo', 'mos'],
  de: ['J.', 'J.', 'Mon.', 'Mon.'],
  fr: ['an', 'ans', 'mois', 'mois'],
  es: ['año', 'años', 'mes', 'meses'],
  pt: ['ano', 'anos', 'mês', 'meses'],
  it: ['anno', 'anni', 'mese', 'mesi'],
  nl: ['jr', 'jr', 'mnd', 'mnd'],
  sv: ['år', 'år', 'mån', 'mån'],
  pl: ['rok', 'l.', 'mies.', 'mies.'],
  tr: ['yıl', 'yıl', 'ay', 'ay'],
  hi: ['वर्ष', 'वर्ष', 'माह', 'माह'],
  ja: ['年', '年', 'か月', 'か月'],
}

/** The table key for a BCP-47 tag: its language part when listed, else en. */
function durationLanguage(tag?: string): string {
  const lang = (tag || 'en').trim().toLowerCase().split('-')[0]
  return Object.prototype.hasOwnProperty.call(DURATION_WORDS, lang) ? lang : 'en'
}

/** "YYYY-MM" for a date: the form an open-ended range is read against. The
 *  callers snapshot today with this and pass it in, so the formatter itself
 *  never reads the clock and one document formats the same everywhere. */
export function currentYearMonth(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Absolute month (year * 12 + month) of a "YYYY-MM" or "YYYY-MM-DD" string;
 *  null for a bare year, free text or nothing. A span needs a month at both
 *  ends - guessing one would print a length the author never stated. */
function monthIndex(value?: string): number | null {
  const m = (value || '').trim().match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/)
  if (!m) return null
  const month = parseInt(m[2], 10)
  if (month < 1 || month > 12) return null
  return parseInt(m[1], 10) * 12 + (month - 1)
}

/**
 * The length of a date range in words: "2 yrs 3 mos", "1 yr", "4 mos". Whole
 * months, both ends counted (January to March is three months). An empty or
 * "Present" end reads as `opts.now`; with no `now` there is no answer. Returns
 * '' whenever the span cannot be counted honestly: a bare year on either end,
 * free text, or an end before the start.
 */
export function formatDuration(start?: string, end?: string, opts: { now?: string; language?: string } = {}): string {
  const a = monthIndex(start)
  const endValue = (end || '').trim()
  const open = !endValue || /^present$/i.test(endValue)
  const b = open ? monthIndex(opts.now) : monthIndex(endValue)
  if (a == null || b == null || b < a) return ''
  const months = b - a + 1
  const years = Math.floor(months / 12)
  const rest = months % 12
  const [yr, yrs, mo, mos] = DURATION_WORDS[durationLanguage(opts.language)]
  const parts: string[] = []
  if (years) parts.push(`${years} ${years === 1 ? yr : yrs}`)
  if (rest) parts.push(`${rest} ${rest === 1 ? mo : mos}`)
  return parts.join(' ')
}

/** The range options one section's settings ask for, carrying the caller's
 *  today so the formatter stays clock-free. Undefined when the section never
 *  opted in, so the plain range prints exactly as it always has. */
export function sectionDateOptions(
  settings: { showDuration?: boolean } | undefined,
  now: string,
  language?: string
): DateRangeOptions | undefined {
  if (!settings?.showDuration) return undefined
  return language ? { duration: true, now, language } : { duration: true, now }
}

/** True when a start/end pair represents one single date rather than a range. */
export function isSingleDate(start?: string, end?: string): boolean {
  const a = (start || '').trim()
  const b = (end || '').trim()
  return !!a && a === b
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
