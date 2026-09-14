import type { ResumeDocument } from '@/types/document'
import { safeHref } from '@/lib/utils'
import { cleanEmail, prettyUrl } from './atoms'

/**
 * The contact block, as ONE list that both readers walk.
 *
 * The header draws it and the ATS text serializes it, and until this module
 * existed each of them built the list for itself. They disagreed: the page
 * prints email, phone, LOCATION, site, then profiles - the order a reader
 * scans - while the ATS panel printed email, phone, site, profiles and put the
 * location last. So the panel showed people a reading order their own PDF does
 * not have, on all 67 designs (measured: fourteen tokens out of sequence on
 * every one of them).
 *
 * That is the same fault src/lib/atsText.ts's header already records once
 * before, when the panel put a left sidebar ahead of the main column and the
 * exporter had stopped doing that. Two lists that must agree, kept in two
 * places, drift - so there is one list now, and the icons are the only thing
 * the page adds on top of it.
 */
export interface ContactLine {
  /** Stable key for React, and the reason the row exists. */
  key: string
  /** Exactly the words that reach the page - and so the file. */
  text: string
  href?: string
  /** Which icon the page should wear; the ATS text ignores it. */
  network?: string
  icon?: string
  kind: 'email' | 'phone' | 'location' | 'url' | 'profile'
}

/**
 * In the order the page prints them. Anything with no words and no address is
 * not a contact, however the row happens to be named.
 */
export function contactLines(doc: ResumeDocument): ContactLine[] {
  const b = doc.content.basics
  // How URLs READ is the author's choice; where they POINT never changes.
  const disp = doc.metadata.links?.display ?? 'pretty'
  const out: ContactLine[] = []

  const email = cleanEmail(b.email)
  if (email) out.push({ key: 'email', kind: 'email', text: email, href: `mailto:${email}` })
  if (b.phone) out.push({ key: 'phone', kind: 'phone', text: b.phone, href: `tel:${b.phone.replace(/[^\d+]/g, '')}` })

  const loc = [b.location?.city, b.location?.region].filter(Boolean).join(', ')
  if (loc) out.push({ key: 'location', kind: 'location', text: loc })

  // The author's own words win over anything derived from the address: a link
  // labelled "Portfolio" is what they typed, not what the URL happens to say.
  if (b.url || b.urlLabel) {
    const text = b.urlLabel?.trim() || prettyUrl(b.url, disp)
    if (text) out.push({ key: 'url', kind: 'url', text, href: safeHref(b.url), icon: b.urlIcon })
  }

  for (const p of b.profiles ?? []) {
    // Keep profiles legible even when the design hides icons: prefer the clean
    // URL (so one network is told from another), else "Network · handle"
    // rather than a bare, ambiguous username.
    const handle = (p.username || '').replace(/^@+/, '')
    const text =
      p.label?.trim() ||
      prettyUrl(p.url, disp) ||
      (p.network ? (handle ? `${p.network} · ${handle}` : p.network) : handle)
    if (text && (p.url?.trim() || handle)) {
      out.push({ key: p.id ?? `${p.network}-${handle}`, kind: 'profile', text, href: safeHref(p.url), network: p.network, icon: p.icon })
    }
  }
  return out
}

/**
 * Does a language's level reach the file as WORDS?
 *
 * When the design draws proficiency as a meter - dots, bars, stars - the level
 * is vector marks and the text layer carries the language name alone. The ATS
 * panel used to print "English · Native" regardless, so the score and the
 * per-parser simulation both counted two words no parser can read. The rule
 * here is the one the languages section itself branches on, so the two cannot
 * disagree.
 */
export function levelIsText(doc: ResumeDocument, sectionKey: string, rating: number | undefined, compact = false): boolean {
  // A section's own meter wins over the document's, which is how a design
  // turns the meters off for its own languages list while the rest of the
  // document keeps dots. Reading only the document-level setting got this
  // backwards on every design that does so.
  const prof = doc.metadata.layout.sectionSettings?.[sectionKey]?.meterStyle ?? doc.metadata.typography.proficiency
  const meter = prof === 'dots' || prof === 'bars' || prof === 'stars'
  // Two ways for the words to be absent, and the section branches on both: a
  // meter draws the level as marks whenever there is a rating to draw, and
  // 'none' draws no level at all. Everything else prints the words.
  // In a footer strip there is no room for a meter, so the compact row prints
  // the level in brackets whatever the meter says - and the words ARE in the
  // file there, which is why this cannot read the meter alone.
  if (!compact && meter && typeof rating === 'number') return false
  return prof !== 'none'
}
