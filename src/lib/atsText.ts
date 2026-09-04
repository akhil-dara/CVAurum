/**
 * "What ATS sees" — serialize the resume to the plain linear text an ATS parser
 * reads. This mirrors the REAL reading order of the EXPORTED FILE (an ATS reads
 * the underlying text stream, not the visual layout): header first, then the
 * main column, then the sidebar, whichever side that sidebar is drawn on.
 *
 * It used to put a left sidebar first, on the grounds that it comes first in
 * the DOM. That stopped being true when the exporter began emitting the main
 * column ahead of the sidebar in the text layer (readingOrder.ts, asserted by
 * the two-column ATS gate: the candidate's name is the first text item). The
 * view was showing people a worse parse than their own PDF produces.
 *
 * 100% client-side and deterministic: no rendering, no network — the same
 * content model the templates draw from, flattened to text.
 */
import type { ResumeDocument } from '@/types/document'
import { resolveOrder, sectionLabel } from '@/lib/sections'
import { currentYearMonth, formatDate, formatDateRange, htmlToText, sectionDateOptions } from '@/lib/utils'
import { cleanEmail, linkWords, prettyUrl } from '@/templates/_shared/atoms'

const line = (...parts: Array<string | undefined>) => parts.filter(Boolean).join('  ·  ')

/** A project's further named links, as the page prints them. */
const namedLinks = (links?: Array<{ url?: string; label?: string }>) =>
  (links ?? [])
    .map((l) => linkWords(l.url, l.label, 'short'))
    .filter(Boolean)
    .join('  ·  ')

/** A credential's meta line, ending with its short Verify word when it has one -
 *  the page ends it that way, so the text an ATS reads should too. */
const verified = (org?: string, url?: string, urlLabel?: string) => {
  const word = (urlLabel || '').trim()
  return word && url?.trim() ? [org, word].filter(Boolean).join(' | ') : org
}

function heading(label: string): string[] {
  return ['', label, '='.repeat(Math.max(6, Math.min(label.length, 28)))]
}

function entryHead(title?: string, org?: string, date?: string, loc?: string): string[] {
  const out: string[] = []
  if (title) out.push(title)
  if (org) out.push(org)
  const meta = line(date, loc)
  if (meta) out.push(meta)
  return out
}

/** Serialize one section's content to plain lines. Returns [] when empty. */
function sectionText(key: string, doc: ResumeDocument): string[] {
  const c = doc.content
  const label = sectionLabel(key, doc)
  // How the document's dates read, plus the section's own time-span switch
  // read against today the way the page and the Word file read it.
  const dates = sectionDateOptions(doc.metadata.layout.sectionSettings?.[key], currentYearMonth(), doc.metadata.dates)
  const out: string[] = []
  const push = (lines: string[]) => {
    if (lines.length) out.push(...heading(label), ...lines)
  }

  switch (key) {
    case 'summary': {
      const t = htmlToText(c.basics.summary)
      if (t) push([t])
      break
    }
    case 'work':
      push(
        c.work.flatMap((w) => [
          ...entryHead(w.position, w.name, formatDateRange(w.startDate, w.endDate, dates), w.location),
          ...(htmlToText(w.summary) ? [htmlToText(w.summary)] : []),
          ...w.highlights.map((h) => ` - ${htmlToText(h)}`).filter((h) => h.trim() !== '-'),
          '',
        ]),
      )
      break
    case 'education':
      push(
        c.education.flatMap((e) => [
          ...entryHead(
            [e.studyType, e.area].filter(Boolean).join(', '),
            e.institution,
            formatDateRange(e.startDate, e.endDate, dates),
            e.location,
          ),
          ...(e.score ? [e.score] : []),
          ...(htmlToText(e.summary) ? [htmlToText(e.summary)] : []),
          ...(e.courses?.length ? [e.courses.join(', ')] : []),
          '',
        ]),
      )
      break
    case 'projects':
      push(
        c.projects.flatMap((p) => [
          ...entryHead(p.name, prettyUrl(p.url, doc.metadata.links?.display), formatDateRange(p.startDate, p.endDate, dates)),
          ...(htmlToText(p.description) ? [htmlToText(p.description)] : []),
          // The further named links, in the place the page prints them. They
          // were in the PDF and nowhere else, so a reader pasting the text lost
          // every one of them.
          ...(namedLinks(p.links) ? [namedLinks(p.links)] : []),
          ...p.highlights.map((h) => ` - ${htmlToText(h)}`).filter((h) => h.trim() !== '-'),
          ...(p.keywords?.length ? [p.keywords.join(', ')] : []),
          '',
        ]),
      )
      break
    case 'skills':
      push(
        c.skills
          .filter((g) => g.name || g.keywords?.length)
          .map((g) => (g.name ? `${g.name}: ${(g.keywords ?? []).join(', ')}` : (g.keywords ?? []).join(', '))),
      )
      break
    case 'languages':
      push(c.languages.filter((l) => l.language).map((l) => line(l.language, l.fluency)))
      break
    case 'certificates':
      push(
        c.certificates
          .filter((x) => x.name)
          .map((x) => line(x.name, verified(x.issuer, x.url, x.urlLabel), formatDate(x.date, dates))),
      )
      break
    case 'awards':
      push(
        c.awards
          .filter((a) => a.title)
          .flatMap((a) => [
            line(a.title, verified(a.awarder, a.url, a.urlLabel), formatDate(a.date, dates)),
            ...(htmlToText(a.summary) ? [htmlToText(a.summary)] : []),
          ]),
      )
      break
    case 'publications':
      push(
        c.publications
          .filter((p) => p.name)
          .flatMap((p) => [
            line(p.name, p.publisher, formatDate(p.releaseDate, dates)),
            ...(htmlToText(p.summary) ? [htmlToText(p.summary)] : []),
          ]),
      )
      break
    case 'volunteer':
      push(
        c.volunteer.flatMap((v) => [
          ...entryHead(v.position, v.organization, formatDateRange(v.startDate, v.endDate, dates)),
          ...(htmlToText(v.summary) ? [htmlToText(v.summary)] : []),
          ...v.highlights.map((h) => ` - ${htmlToText(h)}`).filter((h) => h.trim() !== '-'),
          '',
        ]),
      )
      break
    case 'interests':
      push(c.interests.filter((i) => i.name || i.keywords?.length).map((i) => line(i.name, i.keywords?.join(', '))))
      break
    case 'references':
      push(c.references.filter((r) => r.name).flatMap((r) => [r.name, ...(htmlToText(r.reference) ? [htmlToText(r.reference)] : [])]))
      break
    case 'profiles':
      // profiles are already in the header contact block; skip the duplicate
      break
    default:
      if (key.startsWith('custom-')) {
        const cs = c.custom.find((x) => `custom-${x.id}` === key)
        if (cs) {
          push(
            cs.items.flatMap((it) => [
              ...entryHead(it.name, it.subtitle, formatDate(it.date, dates), it.location),
              ...(htmlToText(it.summary) ? [htmlToText(it.summary)] : []),
              ...(it.highlights ?? []).map((h) => ` - ${htmlToText(h)}`).filter((h) => h.trim() !== '-'),
              '',
            ]),
          )
        }
      }
  }
  // trim trailing blank line inside the section
  while (out.length && out[out.length - 1] === '') out.pop()
  return out
}

/**
 * The order sections are read in, matching the exported text layer.
 *
 * The main column always comes first in a two-column export - which side the
 * sidebar is drawn on changes nothing, because the exporter reorders the text
 * layer rather than following the DOM.
 */
export function atsSectionOrder(main: string[], aside: string[], twoCol: boolean): string[] {
  return twoCol ? [...main, ...aside] : main
}

export function resumeToAtsText(doc: ResumeDocument): string {
  const b = doc.content.basics
  const { main, aside } = resolveOrder(doc)
  const twoCol = doc.metadata.layout.columns === 2 && aside.length > 0

  const head: string[] = []
  if (b.name) head.push(b.name)
  if (b.label) head.push(b.label)
  head.push('')
  const email = cleanEmail(b.email)
  if (email) head.push(email)
  if (b.phone) head.push(b.phone)
  const linkDisplay = doc.metadata.links?.display
  // A named contact link reads as its name here too. The page shows Portfolio;
  // this used to show myportfolio.com/work, so the ATS preview disagreed with
  // the document it was previewing.
  if (b.url) head.push(linkWords(b.url, b.urlLabel, linkDisplay))
  for (const p of b.profiles ?? []) {
    const t = linkWords(p.url, p.label, linkDisplay) || [p.network, p.username].filter(Boolean).join(' ')
    if (t) head.push(t)
  }
  const loc = [b.location?.city, b.location?.region].filter(Boolean).join(', ')
  if (loc) head.push(loc)

  const order = atsSectionOrder(main, aside, twoCol)
  const body = order.flatMap((key) => sectionText(key, doc))

  return [...head, ...body].join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
}
