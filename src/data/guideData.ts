import { LIBRARY } from '@/data/library'
import { CATEGORY_LABELS, LIBRARY_CATEGORIES, REGION_LABELS, SENIORITY_LABELS } from '@/data/library/types'
import type { LibrarySample } from '@/data/library/types'
import type { Guide, GuideSection } from './guides'

/**
 * The body of the guides built from the sample library (Guide.generated):
 * every summary, every role's skills, and the verbs the bullets open with -
 * the library's own writing, gathered by what people search for. Kept out of
 * guides.ts because the router and the site footer import that file and must
 * not carry a hundred résumés; this one is read only where the library
 * already is (the guide route and the build).
 */

const plain = (html: string): string =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()

const BY_ROLE = (a: LibrarySample, b: LibrarySample) => a.role.localeCompare(b.role)
const link = (s: LibrarySample) => `[${s.role}](/examples/${s.slug})`
const where = (s: LibrarySample) => `${SENIORITY_LABELS[s.seniority].toLowerCase()}, ${REGION_LABELS[s.region]}`

function shelves(): { label: string; items: LibrarySample[] }[] {
  return LIBRARY_CATEGORIES.map((c) => ({
    label: CATEGORY_LABELS[c],
    items: LIBRARY.filter((s) => s.category === c).sort(BY_ROLE),
  })).filter((g) => g.items.length)
}

function summaries(): GuideSection[] {
  return shelves().map((g) => ({
    heading: `${g.label} resume summary examples`,
    paragraphs: [],
    list: g.items
      .filter((s) => s.content.basics.summary)
      .map((s) => `${link(s)} (${where(s)}): ${plain(s.content.basics.summary!)}`),
  }))
}

function skills(): GuideSection[] {
  return shelves().map((g) => ({
    heading: `Skills on ${g.label.toLowerCase()} résumés`,
    paragraphs: [],
    list: g.items
      .filter((s) => s.content.skills.length)
      .map(
        (s) =>
          `${link(s)}: ${s.content.skills
            .map((k) => `${plain(k.name)}: ${(k.keywords ?? []).map(plain).join(', ')}`)
            .join('; ')}`
      ),
  }))
}

/** The verbs, grouped by the kind of claim they open. A verb not listed goes
 *  under "More verbs", so a new sample can never drop one silently. */
const THEMES: [string, string[]][] = [
  ['Verbs for leading people and work', ['Led', 'Managed', 'Mentored', 'Coached', 'Ran', 'Directed', 'Headed', 'Supervised', 'Trained', 'Hired', 'Owned', 'Coordinated', 'Chaired', 'Oversaw']],
  ['Verbs for building and making', ['Built', 'Designed', 'Developed', 'Created', 'Launched', 'Wrote', 'Set', 'Introduced', 'Established', 'Shipped', 'Produced', 'Drafted', 'Rebuilt', 'Redesigned', 'Modelled', 'Modeled', 'Implemented', 'Delivered', 'Opened', 'Started']],
  ['Verbs for improving a result', ['Cut', 'Reduced', 'Increased', 'Raised', 'Grew', 'Improved', 'Lifted', 'Saved', 'Recovered', 'Shortened', 'Lowered', 'Doubled', 'Halved', 'Brought', 'Moved', 'Turned', 'Replaced', 'Automated', 'Streamlined', 'Consolidated']],
  ['Verbs for finding and deciding', ['Found', 'Identified', 'Analysed', 'Analyzed', 'Audited', 'Assessed', 'Investigated', 'Tested', 'Reviewed', 'Measured', 'Diagnosed', 'Researched', 'Traced', 'Mapped', 'Forecast', 'Evaluated']],
  ['Verbs for winning and persuading', ['Won', 'Negotiated', 'Secured', 'Closed', 'Sold', 'Signed', 'Pitched', 'Persuaded', 'Presented', 'Renegotiated']],
]

interface VerbUse {
  verb: string
  count: number
  example: string
  from: LibrarySample
}

function verbUses(): VerbUse[] {
  const uses = new Map<string, VerbUse>()
  for (const s of [...LIBRARY].sort((a, b) => a.slug.localeCompare(b.slug)))
    for (const w of s.content.work)
      for (const h of w.highlights ?? []) {
        const text = plain(h)
        const verb = text.match(/^([A-Z][a-z]+)\b/)?.[1]
        if (!verb || verb.length < 3) continue
        const u = uses.get(verb)
        if (u) u.count++
        else uses.set(verb, { verb, count: 1, example: text, from: s })
      }
  return [...uses.values()].sort((a, b) => b.count - a.count || a.verb.localeCompare(b.verb))
}

const MIN_USES = 2

function verbs(): GuideSection[] {
  const all = verbUses().filter((u) => u.count >= MIN_USES)
  const placed = new Set<string>()
  const line = (u: VerbUse) => `${u.verb} (${u.count} bullets): “${u.example}” (${link(u.from)})`
  const out: GuideSection[] = THEMES.map(([heading, list]) => {
    const items = all.filter((u) => list.includes(u.verb))
    items.forEach((u) => placed.add(u.verb))
    return { heading, paragraphs: [], list: items.map(line) }
  }).filter((s) => s.list!.length)
  const rest = all.filter((u) => !placed.has(u.verb))
  if (rest.length) out.push({ heading: 'More verbs from the examples', paragraphs: [], list: rest.map(line) })
  return out
}

/** The sections a guide's `generated` body adds after its written ones. */
export function generatedSections(g: Guide): GuideSection[] {
  switch (g.generated) {
    case 'summaries':
      return summaries()
    case 'skills':
      return skills()
    case 'verbs':
      return verbs()
    default:
      return []
  }
}

/** A guide's whole body: what was written for it, then what is built from
 *  the library. Every copy of a guide (page, HTML, Markdown) reads this. */
export function guideSections(g: Guide): GuideSection[] {
  return [...g.sections, ...generatedSections(g)]
}
