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
import { formatDate, formatDateRange, htmlToText } from '@/lib/utils'
import { cleanEmail, prettyUrl } from '@/templates/_shared/atoms'

const line = (...parts: Array<string | undefined>) => parts.filter(Boolean).join('  ·  ')

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
          ...entryHead(w.position, w.name, formatDateRange(w.startDate, w.endDate), w.location),
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
            formatDateRange(e.startDate, e.endDate),
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
          ...entryHead(p.name, prettyUrl(p.url), formatDateRange(p.startDate, p.endDate)),
          ...(htmlToText(p.description) ? [htmlToText(p.description)] : []),
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
      push(c.certificates.filter((x) => x.name).map((x) => line(x.name, x.issuer, formatDate(x.date))))
      break
    case 'awards':
      push(
        c.awards
          .filter((a) => a.title)
          .flatMap((a) => [line(a.title, a.awarder, formatDate(a.date)), ...(htmlToText(a.summary) ? [htmlToText(a.summary)] : [])]),
      )
      break
    case 'publications':
      push(c.publications.filter((p) => p.name).map((p) => line(p.name, p.publisher, formatDate(p.releaseDate))))
      break
    case 'volunteer':
      push(
        c.volunteer.flatMap((v) => [
          ...entryHead(v.position, v.organization, formatDateRange(v.startDate, v.endDate)),
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
              ...entryHead(it.name, it.subtitle, formatDate(it.date), it.location),
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
  if (b.url) head.push(prettyUrl(b.url))
  for (const p of b.profiles ?? []) {
    const t = prettyUrl(p.url) || [p.network, p.username].filter(Boolean).join(' ')
    if (t) head.push(t)
  }
  const loc = [b.location?.city, b.location?.region].filter(Boolean).join(', ')
  if (loc) head.push(loc)

  const order = atsSectionOrder(main, aside, twoCol)
  const body = order.flatMap((key) => sectionText(key, doc))

  return [...head, ...body].join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
}
