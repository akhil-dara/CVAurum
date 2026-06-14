/** Small shared building blocks used by section renderers across all templates. */
import { memo } from 'react'
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
  type LucideIcon,
} from 'lucide-react'
import { sanitizeHtml } from '@/lib/sanitize'

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
  if (!items?.length) return null
  return (
    <div className="rm-chips">
      {items.map((k, i) => (
        <span key={i} className="rm-chip">
          {k}
        </span>
      ))}
    </div>
  )
}

const NETWORK_ICONS: Record<string, LucideIcon> = {
  linkedin: Linkedin,
  github: Github,
  twitter: Twitter,
  x: Twitter,
  dribbble: Dribbble,
  youtube: Youtube,
  instagram: Instagram,
}

export function networkIcon(network?: string): LucideIcon {
  if (!network) return LinkIcon
  return NETWORK_ICONS[network.toLowerCase().trim()] ?? LinkIcon
}

export const ContactIcons = { Mail, Phone, Globe, MapPin }

/** Strip protocol for cleaner display of URLs. */
export function prettyUrl(url?: string): string {
  if (!url) return ''
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
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
