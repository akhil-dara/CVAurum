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
import { metaColumnOn, resolveOrder, sectionLabel } from '@/lib/sections'
import { currentYearMonth, entryDateOptions, formatDate, formatDateRange, htmlToText, sectionDateOptions } from '@/lib/utils'
import { cleanEmail, linkWords, prettyUrl } from '@/templates/_shared/atoms'
import { contactLines, contactsInSidebar, levelIsText } from '@/templates/_shared/contacts'
import { dateAlignOf, entryMetaOf, entryOrderOf, linkStyleOf } from '@/templates/_shared/sectionClasses'

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

/**
 * An entry's two lines, in the order the page prints them.
 *
 * The page draws the title and the DATE on one row - the date at the far edge
 * of it - and the organisation with the location on the row beneath. This used
 * to emit title, organisation, then date, which put the employer where the
 * file puts the date and the date where the file puts the employer. A parser
 * binds an employer by what sits next to the title, so the panel was showing a
 * structure the exported file does not have (measured: eleven tokens out of
 * sequence on every design in the registry).
 *
 * The section says whether the organisation leads, and whether the location
 * rides the head row beside the date rather than the sub-line. Which EDGE the
 * date sits on is ink - a text file has no columns - so dateAlign never
 * reaches these lines.
 */
function entryHead(
  title?: string,
  org?: string,
  date?: string,
  loc?: string,
  orgFirst = false,
  locWithDate = false,
  dateInSub = false,
  /** What else the page prints on the sub-line after the location (an
   *  education entry's score), so a date closing the line comes after it. */
  subTail?: string
): string[] {
  const out: string[] = []
  const [first, second] = orgFirst ? [org, title] : [title, org]
  // With the date at the end of the sub-line, the head row keeps only what
  // the page leaves on it, and the date closes the line under it.
  const head = dateInSub ? line(first, locWithDate ? loc : undefined) : line(first, locWithDate ? line(loc, date) : date)
  if (head) out.push(head)
  const sub = dateInSub
    ? line(second, locWithDate ? undefined : loc, subTail, date)
    : line(locWithDate ? second : line(second, loc), subTail)
  if (sub) out.push(sub)
  return out
}

/** Serialize one section's content to plain lines. Returns [] when empty. */
function sectionText(key: string, doc: ResumeDocument, compact = false): string[] {
  const c = doc.content
  const label = sectionLabel(key, doc)
  const settings = doc.metadata.layout.sectionSettings?.[key]
  // How the document's dates read, plus the section's own time-span switch
  // read against today the way the page and the Word file read it.
  const now = currentYearMonth()
  const dates = sectionDateOptions(settings, now, doc.metadata.dates)
  // Whether the organisation leads each entry here, as it does on the page.
  // Which line is bold is ink, not words, and never reaches this text.
  const orgFirst = entryOrderOf(settings).lead === 'org'
  // Whether the location shares the head row with the date, as it does on
  // the page and in the Word file: then it leads the pair here too. Which
  // edge the date sits on is ink - a text file has no columns - so dateAlign
  // never reaches these lines.
  const locWithDate = entryMetaOf(settings).locWithDate
  // Where the page puts the date decides where it falls in the reading:
  // closing the sub-line when the section asks for that and no date column
  // (which only the body's single flow opens) has taken it.
  const inAside = resolveOrder(doc).aside.includes(key) && doc.metadata.layout.columns === 2
  const dateInSub =
    !compact &&
    dateAlignOf(settings, doc.metadata.layout.dateAlign) === 'inline' &&
    (inAside || metaColumnOn(doc.metadata, doc.content) === 'none')
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
          ...entryHead(w.position, w.name, formatDateRange(w.startDate, w.endDate, dates), w.location, orgFirst, locWithDate, dateInSub),
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
            // A course still under way names its finish as expected, here as
            // on the page: the entry's own progress rides on the same options.
            formatDateRange(e.startDate, e.endDate, entryDateOptions(dates, e.status, now)),
            e.location,
            orgFirst,
            locWithDate,
            dateInSub,
            dateInSub ? e.score : undefined,
          ),
          ...(e.score && !dateInSub ? [e.score] : []),
          ...(htmlToText(e.summary) ? [htmlToText(e.summary)] : []),
          ...(e.courses?.length ? [e.courses.join(', ')] : []),
          '',
        ]),
      )
      break
    case 'projects':
      push(
        c.projects.flatMap((p) => [
          // The address prints where the page prints it - and not at all when
          // the section's link style says the line is not drawn. This text
          // reads the DOCUMENT, so it would otherwise hand a parser an
          // address the author had taken off the page.
          ...entryHead(
            p.name,
            linkStyleOf(settings) === 'none' ? '' : prettyUrl(p.url, doc.metadata.links?.display),
            formatDateRange(p.startDate, p.endDate, dates)
          ),
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
      // Only the words the file actually carries: with a dots, bars or stars
      // meter the level is vector marks and the text layer has the language
      // name alone.
      push(c.languages.filter((l) => l.language).map((l) => line(l.language, levelIsText(doc, 'languages', l.rating, compact) ? l.fluency : undefined)))
      break
    case 'certificates':
      // Name and date share the head row, issuer beneath - the shape the page
      // draws and therefore the shape the file carries. See entryHead.
      push(
        c.certificates
          .filter((x) => x.name)
          .flatMap((x) => [line(x.name, formatDate(x.date, dates)), verified(x.issuer, x.url, x.urlLabel) ?? ''].filter(Boolean)),
      )
      break
    case 'awards':
      push(
        c.awards
          .filter((a) => a.title)
          .flatMap((a) => [
            line(a.title, formatDate(a.date, dates)),
            ...(verified(a.awarder, a.url, a.urlLabel) ? [verified(a.awarder, a.url, a.urlLabel) as string] : []),
            ...(htmlToText(a.summary) ? [htmlToText(a.summary)] : []),
          ]),
      )
      break
    case 'publications':
      push(
        c.publications
          .filter((p) => p.name)
          .flatMap((p) => [
            line(p.name, formatDate(p.releaseDate, dates)),
            ...(p.publisher ? [p.publisher] : []),
            ...(htmlToText(p.summary) ? [htmlToText(p.summary)] : []),
          ]),
      )
      break
    case 'volunteer':
      push(
        c.volunteer.flatMap((v) => [
          ...entryHead(v.position, v.organization, formatDateRange(v.startDate, v.endDate, dates), undefined, orgFirst, locWithDate, dateInSub),
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
              ...entryHead(it.name, it.subtitle, formatDate(it.date, dates), it.location, orgFirst, locWithDate, dateInSub),
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
 * layer rather than following the DOM. The footer strip is read last of all,
 * after the sidebar - or after the main column alone when there is none.
 */
export function atsSectionOrder(main: string[], aside: string[], twoCol: boolean, footer: string[] = []): string[] {
  return [...(twoCol ? [...main, ...aside] : main), ...footer]
}

export function resumeToAtsText(doc: ResumeDocument): string {
  const b = doc.content.basics
  const { main, aside, footer } = resolveOrder(doc)
  const twoCol = doc.metadata.layout.columns === 2 && aside.length > 0

  const head: string[] = []
  if (b.name) head.push(b.name)
  if (b.label) head.push(b.label)
  head.push('')
  // The page's own list, in the page's own order - email, phone, location,
  // site, profiles. This block used to build a second one, which put the
  // location last and named links by a different rule, so the panel showed a
  // reading order the exported file does not have.
  //
  // Contacts placed at the top of the SIDEBAR are read where the file writes
  // them: the main column comes first, so they follow it and lead the sidebar.
  const contacts = contactLines(doc).map((c) => c.text)
  const inSidebar = contactsInSidebar(doc)
  if (!inSidebar) head.push(...contacts)

  const order = atsSectionOrder(main, aside, twoCol, footer)
  // A section in the footer strip renders through the compact row, which
  // words its levels differently - the serializer has to know which it is.
  const text = (key: string) => sectionText(key, doc, footer.includes(key))
  const body = inSidebar
    ? [...main.flatMap(text), '', ...contacts, '', ...aside.flatMap(text), ...footer.flatMap(text)]
    : order.flatMap(text)

  return [...head, ...body].join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
}
