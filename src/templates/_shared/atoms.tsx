/** Small shared building blocks used by section renderers across all templates. */
import { Fragment, memo, type ReactNode } from 'react'
import {
  Mail,
  Phone,
  Globe,
  MapPin,
  Linkedin,
  Github,
  Twitter,
  Link as LinkIcon,
  Dribbble,
  Youtube,
  Instagram,
  Facebook,
  Twitch,
  Gitlab,
  Send,
  FileText,
  BookOpen,
  Code2,
  Briefcase,
  GraduationCap,
  PenTool,
  Music,
  type LucideIcon,
} from 'lucide-react'
import { sanitizeHtml } from '@/lib/sanitize'
import { noBreakCompoundsHtml } from '@/lib/pdf/hyphens'
import { keywordChunks } from '@/lib/keywordChunks'

/** Sanitized rich-text block. */
export const RichText = memo(function RichText({
  html,
  className,
}: {
  html?: string
  className?: string
}) {
  if (!html) return null
  // noBreakCompoundsHtml: the PDF exporter keeps hyphenated words whole
  // (hyphens.ts); rendering from the same processed string keeps the canvas
  // wrapping lines exactly where the export will.
  return <div className={`rm-rich ${className ?? ''}`} dangerouslySetInnerHTML={{ __html: noBreakCompoundsHtml(sanitizeHtml(html)) }} />
})

/** 0–max filled dots (proficiency). */
export function Dots({ value = 0, max = 5 }: { value?: number; max?: number }) {
  return (
    <span className="rm-dots" aria-hidden>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={`rm-dot ${i < value ? 'on' : ''}`} />
      ))}
    </span>
  )
}

/** 0–max filled stars (proficiency). */
export function Stars({ value = 0, max = 5 }: { value?: number; max?: number }) {
  return (
    <span className="rm-stars" aria-hidden>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={`rm-star ${i < value ? 'on' : ''}`}>
          ★
        </span>
      ))}
    </span>
  )
}

/** Horizontal proficiency bar. */
export function LevelBar({ value = 0, max = 5 }: { value?: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <span className="rm-level-track" aria-hidden>
      <span className="rm-level-fill" style={{ width: `${pct}%` }} />
    </span>
  )
}

/** Text a reader sees but a parser must not: year numerals, stats, ring
 *  numbers, running section numbers. aria-hidden makes the painter draw it
 *  as outlines with no text layer, and the Word and ATS builders never emit
 *  it because they read the document, not the page. data-deco says the same
 *  to anything that reads the markup instead. */
export function Deco({
  children,
  className,
  as: Tag = 'span',
}: {
  children: ReactNode
  className?: string
  as?: 'span' | 'div'
}) {
  return (
    <Tag aria-hidden="true" className={className ? `rm-deco ${className}` : 'rm-deco'} data-deco="1">
      {children}
    </Tag>
  )
}

/** Two decimals, and never a negative zero in the markup. */
const round2 = (n: number) => Math.round(n * 100) / 100 || 0

/** A FILLED annular arc for a ring meter: outer radius r + 3, inner r - 3,
 *  swept clockwise from angle a0 to a1 measured from twelve o'clock, as one
 *  path (outer arc, line in, inner arc back, close). One path means the svg
 *  holding it carries a single fill, which is all the painter reads from an
 *  svg root. An empty or backwards sweep is no path at all.
 *
 *  A full turn is a special case: an arc whose two endpoints coincide is
 *  dropped by every renderer (the SVG spec says so, browsers and the
 *  painter's arc conversion both do it), so a sweep of 360 or more is drawn
 *  as two half arcs per radius - the same two-arc circle convention the
 *  walker uses for a <circle>. */
export function ringPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const sweep = a1 - a0
  if (!(sweep > 0)) return ''
  const outer = r + 3
  const inner = r - 3
  const rad = (deg: number) => ((deg - 90) * Math.PI) / 180
  const at = (angle: number, radius: number) =>
    `${round2(cx + radius * Math.cos(angle))} ${round2(cy + radius * Math.sin(angle))}`
  const from = rad(a0)
  if (sweep >= 360) {
    const half = rad(a0 + 180)
    return (
      `M ${at(from, outer)} A ${outer} ${outer} 0 1 1 ${at(half, outer)} A ${outer} ${outer} 0 1 1 ${at(from, outer)}` +
      ` L ${at(from, inner)} A ${inner} ${inner} 0 1 0 ${at(half, inner)} A ${inner} ${inner} 0 1 0 ${at(from, inner)} Z`
    )
  }
  const large = sweep > 180 ? 1 : 0
  const to = rad(a1)
  return `M ${at(from, outer)} A ${outer} ${outer} 0 ${large} 1 ${at(to, outer)} L ${at(to, inner)} A ${inner} ${inner} 0 ${large} 0 ${at(from, inner)} Z`
}

export function Chips({ items }: { items: string[] }) {
  // A keyword that is only whitespace is not a keyword. Blanks are pruned when
  // a chip loses focus, but one that never lost focus - or arrived from an
  // import - reached the page as an EMPTY PILL, and printed as one too.
  const real = (items ?? []).filter((k) => (k || '').trim().length > 0)
  if (!real.length) return null
  return (
    <div className="rm-chips">
      {real.map((k, i) => (
        <span key={i} className="rm-chip">
          {/* A chip too wide for a narrow sidebar has to wrap inside itself,
              and CSS takes any space it finds - including the ones around a
              lone "&". keywordChunks decides which spaces may break; pieces
              rejoin with single spaces and reproduce the keyword exactly. */}
          {keywordChunks(k, '').map((piece, pi) => (
            <Fragment key={pi}>
              {pi > 0 ? ' ' : null}
              {piece.includes(' ') ? <span className="rm-kw-tail">{piece}</span> : piece}
            </Fragment>
          ))}
        </span>
      ))}
    </div>
  )
}

const NETWORK_ICONS: Record<string, LucideIcon> = {
  linkedin: Linkedin,
  github: Github,
  gitlab: Gitlab,
  twitter: Twitter,
  x: Twitter,
  dribbble: Dribbble,
  youtube: Youtube,
  instagram: Instagram,
  facebook: Facebook,
  twitch: Twitch,
  telegram: Send,
  behance: PenTool,
  medium: BookOpen,
  substack: BookOpen,
  'stack overflow': Code2,
  stackoverflow: Code2,
  leetcode: Code2,
  kaggle: Code2,
  scholar: GraduationCap,
  'google scholar': GraduationCap,
  orcid: GraduationCap,
  portfolio: Briefcase,
  website: Globe,
  blog: FileText,
  spotify: Music,
  soundcloud: Music,
  // Reachable only as an explicit choice, so every option in
  // CONTACT_ICON_CHOICES resolves to a real icon.
  mail: Mail,
  phone: Phone,
  link: LinkIcon,
}

/**
 * The icons an author can pick from by hand.
 *
 * Guessing from the network NAME covers the common cases and nothing else: a
 * network the map has never heard of got a generic chain link with no way to
 * change it, which is what "no icon customization" meant. An explicit choice
 * always wins over the guess.
 */
export const CONTACT_ICON_CHOICES: { v: string; label: string; Icon: LucideIcon }[] = [
  { v: '', label: 'Auto', Icon: LinkIcon },
  { v: 'linkedin', label: 'LinkedIn', Icon: Linkedin },
  { v: 'github', label: 'GitHub', Icon: Github },
  { v: 'gitlab', label: 'GitLab', Icon: Gitlab },
  { v: 'x', label: 'X', Icon: Twitter },
  { v: 'instagram', label: 'Instagram', Icon: Instagram },
  { v: 'facebook', label: 'Facebook', Icon: Facebook },
  { v: 'youtube', label: 'YouTube', Icon: Youtube },
  { v: 'twitch', label: 'Twitch', Icon: Twitch },
  { v: 'dribbble', label: 'Dribbble', Icon: Dribbble },
  { v: 'behance', label: 'Behance', Icon: PenTool },
  { v: 'medium', label: 'Writing', Icon: BookOpen },
  { v: 'stackoverflow', label: 'Code', Icon: Code2 },
  { v: 'scholar', label: 'Scholar', Icon: GraduationCap },
  { v: 'portfolio', label: 'Portfolio', Icon: Briefcase },
  { v: 'blog', label: 'Document', Icon: FileText },
  { v: 'telegram', label: 'Telegram', Icon: Send },
  { v: 'website', label: 'Website', Icon: Globe },
  { v: 'mail', label: 'Mail', Icon: Mail },
  { v: 'phone', label: 'Phone', Icon: Phone },
]

export function networkIcon(network?: string): LucideIcon {
  if (!network) return LinkIcon
  return NETWORK_ICONS[network.toLowerCase().trim()] ?? LinkIcon
}

/** The author's explicit choice if they made one, else the guess. */
export function contactIcon(network?: string, override?: string): LucideIcon {
  const key = (override || '').toLowerCase().trim()
  if (key && NETWORK_ICONS[key]) return NETWORK_ICONS[key]
  return networkIcon(network)
}

export const ContactIcons = { Mail, Phone, Globe, MapPin }

/** Strip protocol for cleaner display of URLs. */
/**
 * How a URL should READ on the page. The link's destination is always the full
 * address - this only decides what the reader sees, which used to be forced to
 * one form with no way to ask for another.
 */
export function prettyUrl(url?: string, display: 'pretty' | 'full' | 'short' = 'pretty'): string {
  if (!url) return ''
  const trimmed = url.trim()
  if (display === 'full') return trimmed
  const bare = trimmed.replace(/^https?:\/\//, '').replace(/\/$/, '')
  if (display !== 'short') return bare
  // Drop the host and any leading path segments, keeping the last meaningful
  // one: "linkedin.com/in/someone" reads as "someone".
  const parts = bare.split('/').filter(Boolean)
  return parts.length > 1 ? parts[parts.length - 1] : bare.replace(/^www\./, '')
}

/**
 * The words a link SHOWS - the one rule every renderer must agree on.
 *
 * A link is a display name and a destination. The page prints the name when
 * there is one and the tidied address otherwise; the Word file and the ATS
 * text used to print the address either way, so a site the author had named
 * Portfolio came out of Word as myportfolio.com/work. One document cannot
 * read two ways, so all three now ask this.
 */
export function linkWords(url?: string, label?: string, display: 'pretty' | 'full' | 'short' = 'pretty'): string {
  const named = (label || '').trim()
  return named || prettyUrl(url, display)
}

/**
 * Normalize an email for display: decode stray percent-encoding (e.g. a pasted
 * "%7C" pipe), drop a `mailto:` prefix, and extract the address token if the
 * stored value has surrounding junk. Falls back to a trimmed, leading-symbol-
 * stripped string so we never show "%7C…" or "|…" to the user.
 */
export function cleanEmail(raw?: string): string {
  if (!raw) return ''
  let s = raw.trim().replace(/^mailto:/i, '')
  if (/%[0-9a-f]{2}/i.test(s)) {
    try {
      s = decodeURIComponent(s)
    } catch {
      /* leave as-is */
    }
  }
  const m = s.match(/[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/)
  return m ? m[0] : s.replace(/^[^A-Za-z0-9]+/, '')
}
