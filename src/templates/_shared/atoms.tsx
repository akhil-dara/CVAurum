/** Small shared building blocks used by section renderers across all templates. */
import { Fragment, memo } from 'react'
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
  return <div className={`rm-rich ${className ?? ''}`} dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />
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
