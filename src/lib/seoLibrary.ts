/**
 * Everything the example library's pages need that is NOT React.
 *
 * The library is the part of the site a search engine can actually rank: "data
 * analyst resume example" is a phrase people type, and a page that answers it
 * has to contain a data analyst's résumé in readable HTML, not a canvas of
 * text drawn after a bundle loads. So every sample gets its own URL, its own
 * head, and a crawler-readable block carrying the whole résumé — produced here
 * and written into dist/ at build time (the plugin in vite.config.ts), while
 * the same metadata drives the live route's head. One source, two consumers.
 *
 * Kept pure and dependency-free on purpose: a Node build step with no DOM
 * imports it, and it is the part worth unit-testing.
 */
import { LIBRARY } from '@/data/library'
import { CATEGORY_LABELS, LIBRARY_CATEGORIES, REGION_LABELS, SENIORITY_LABELS } from '@/data/library/types'
import type { LibraryCategory, LibrarySample } from '@/data/library/types'
import { relatedSamples } from '@/data/library/related'
import { TEMPLATE_MAP } from '@/templates/registry'
import { htmlEscape } from '@/lib/utils'
import { SITE as COPY } from '@/data/siteCopy'

/** Canonical host — the same one siteCopy names, so there is one to change. */
export const HOST = COPY.links.site

/** How long a meta description may be, matching the rest of the site. */
const DESC_MAX = 155

/**
 * The library's own order: by shelf, then by career stage, then by job title.
 * Stable, so the pre-rendered files and the sitemap do not reshuffle between
 * builds for no reason.
 */
const STAGE_ORDER = ['student', 'entry', 'mid', 'senior', 'lead']
export const ORDERED_SAMPLES: readonly LibrarySample[] = [...LIBRARY].sort(
  (a, b) =>
    LIBRARY_CATEGORIES.indexOf(a.category) - LIBRARY_CATEGORIES.indexOf(b.category) ||
    STAGE_ORDER.indexOf(a.seniority) - STAGE_ORDER.indexOf(b.seniority) ||
    a.role.localeCompare(b.role) ||
    a.slug.localeCompare(b.slug)
)

export interface SamplePageMeta {
  path: string
  title: string
  description: string
  image: string
}

function must(slug: string): LibrarySample {
  const s = LIBRARY.find((x) => x.slug === slug)
  if (!s) throw new Error(`seoLibrary: no sample named "${slug}"`)
  return s
}

/** Is this a sample the library actually holds? Guards the route before any
 *  of the builders below are asked for a page that cannot exist. */
export function isSampleSlug(slug: string | undefined): slug is string {
  return !!slug && LIBRARY.some((s) => s.slug === slug)
}

/** Cut to DESC_MAX on a word boundary rather than letting the results page
 *  truncate it mid-word. */
function trim(text: string, max = DESC_MAX): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  if (flat.length <= max) return flat
  const cut = flat.slice(0, max)
  const space = cut.lastIndexOf(' ')
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[,;:.—-]+$/, '')}…`
}

/** Rich-text fields hold sanitized HTML; a crawler block re-escapes from the
 *  words, never from the markup, so no stray tag can reach the static file. */
function plain(html: string | undefined): string {
  return (html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

const esc = (text: string | undefined) => htmlEscape(plain(text))

/** "March 2022 – present", from the YYYY-MM the editor writes. */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
function when(start: string | undefined, end: string | undefined): string {
  const one = (d: string | undefined): string => {
    if (!d) return ''
    const [y, m] = d.split('-')
    return m ? `${MONTHS[Number(m) - 1] ?? ''} ${y}`.trim() : y
  }
  const a = one(start)
  const b = end ? one(end) : 'present'
  return a ? `${a} – ${b}` : b
}

export function samplePageMeta(slug: string): SamplePageMeta {
  const s = must(slug)
  const region = s.region === 'us' ? '' : ` (${REGION_LABELS[s.region]})`
  return {
    path: `/examples/${s.slug}`,
    title: `${s.role} Résumé Example${region} — Free Template You Can Edit · CVAurum`,
    description: trim(s.blurb),
    // A picture of the design it is shown in: the only real image this page
    // has, and the link preview is better for it than for the site's default.
    image: TEMPLATE_MAP[s.template] ? `/og/${s.template}.jpg` : '/og.png',
  }
}

export const EXAMPLES_INTRO =
  'Complete résumés for real jobs, every bullet naming something that happened and what it changed — so there is something to copy the shape of rather than a page of placeholder text. Free, editable in the browser, and every name and employer invented.'

export function examplesPageMeta(): SamplePageMeta {
  return {
    path: '/examples',
    title: `${LIBRARY.length} Résumé Examples for Real Jobs — Free to Copy · CVAurum`,
    description: trim(EXAMPLES_INTRO),
    image: '/og.png',
  }
}

/** Every slug in library order — what the build step iterates. */
export function orderedSampleSlugs(): string[] {
  return ORDERED_SAMPLES.map((s) => s.slug)
}

/* ------------------------------------------------- crawler-readable blocks */

/** The résumé itself, as semantic HTML. This is the page's content: without
 *  it an example page is a heading and a canvas, which is nothing to rank. */
function resumeHtml(s: LibrarySample): string {
  const c = s.content
  const out: string[] = []
  const loc = [c.basics.location?.city, c.basics.location?.region].filter(Boolean).join(', ')
  out.push(`    <h2>${esc(c.basics.name)} — ${esc(c.basics.label)}</h2>`)
  if (loc) out.push(`    <p>${htmlEscape(loc)}</p>`)
  if (c.basics.summary) out.push(`    <p>${esc(c.basics.summary)}</p>`)

  if (c.work.length) {
    out.push('    <h3>Experience</h3>')
    for (const w of c.work) {
      out.push(`    <h4>${esc(w.position)}, ${esc(w.name)} · ${htmlEscape(when(w.startDate, w.endDate))}</h4>`)
      if (w.summary) out.push(`    <p>${esc(w.summary)}</p>`)
      if (w.highlights?.length) {
        out.push('    <ul>')
        for (const h of w.highlights) out.push(`      <li>${esc(h)}</li>`)
        out.push('    </ul>')
      }
    }
  }
  if (c.projects.length) {
    out.push('    <h3>Projects</h3>')
    out.push('    <ul>')
    for (const p of c.projects) out.push(`      <li><strong>${esc(p.name)}</strong> — ${esc(p.description)}</li>`)
    out.push('    </ul>')
  }
  if (c.education.length) {
    out.push('    <h3>Education</h3>')
    out.push('    <ul>')
    for (const e of c.education) {
      const line = [`${plain(e.studyType)} ${plain(e.area)}`.trim(), plain(e.institution), when(e.startDate, e.endDate)]
        .filter(Boolean)
        .join(' · ')
      out.push(`      <li>${htmlEscape(line)}</li>`)
    }
    out.push('    </ul>')
  }
  if (c.skills.length) {
    out.push('    <h3>Skills</h3>')
    out.push('    <ul>')
    for (const g of c.skills) out.push(`      <li><strong>${esc(g.name)}</strong>: ${htmlEscape((g.keywords ?? []).join(', '))}</li>`)
    out.push('    </ul>')
  }
  if (c.certificates.length) {
    out.push('    <h3>Certifications</h3>')
    out.push('    <ul>')
    for (const x of c.certificates) out.push(`      <li>${esc(x.name)}${x.issuer ? ` — ${esc(x.issuer)}` : ''}</li>`)
    out.push('    </ul>')
  }
  return out.join('\n')
}

export function sampleStaticHtml(slug: string): string {
  const s = must(slug)
  const near = relatedSamples(slug, 8)
  const tpl = TEMPLATE_MAP[s.template]
  return `<main class="seo-static">
    <p><a href="/examples">Résumé examples</a> › ${htmlEscape(s.role)}</p>
    <h1>${htmlEscape(s.role)} résumé example</h1>
    <p>${htmlEscape(s.blurb)}</p>
    <p>Written for ${htmlEscape(REGION_LABELS[s.region])}, at ${htmlEscape(SENIORITY_LABELS[s.seniority].toLowerCase())}, in the ${htmlEscape(CATEGORY_LABELS[s.category].toLowerCase())} field${tpl ? `, shown in the <a href="/templates/${s.template}">${htmlEscape(tpl.name)}</a> design` : ''}. Every name, employer, address and number below is invented.</p>
    <p><a href="/app">Use this example</a> · <a href="/examples">Browse all ${LIBRARY.length} résumé examples</a></p>
    <article>
${resumeHtml(s)}
    </article>
    <nav aria-label="Nearby examples">
      <h2>Similar résumé examples</h2>
      <ul>
${near.map((r) => `        <li><a href="/examples/${r.slug}">${htmlEscape(r.role)} résumé example</a></li>`).join('\n')}
      </ul>
    </nav>
  </main>`
}

/** The library itself, grouped by shelf, for whoever does not run scripts. */
export function examplesStaticHtml(): string {
  const groups = LIBRARY_CATEGORIES.map((category) => ({
    category,
    items: ORDERED_SAMPLES.filter((s) => s.category === category),
  })).filter((g) => g.items.length)
  return `<main class="seo-static">
    <h1>${LIBRARY.length} résumé examples, written out in full</h1>
    <p>${htmlEscape(EXAMPLES_INTRO)}</p>
${groups
  .map(
    (g) => `    <section>
      <h2>${htmlEscape(CATEGORY_LABELS[g.category])} résumé examples</h2>
      <ul>
${g.items
  .map(
    (s) =>
      `        <li><a href="/examples/${s.slug}">${htmlEscape(s.role)} résumé example</a> — ${htmlEscape(SENIORITY_LABELS[s.seniority].toLowerCase())}, ${htmlEscape(REGION_LABELS[s.region])}</li>`
  )
  .join('\n')}
      </ul>
    </section>`
  )
  .join('\n')}
  </main>`
}

/* ------------------------------------------------------- markdown twins */

export function examplesMarkdown(): string {
  const lines = [
    `# ${LIBRARY.length} résumé examples`,
    '',
    EXAMPLES_INTRO,
    '',
    `Every example is a complete résumé that opens in the editor at ${HOST}/app. Nothing in one is real: the people, employers, addresses and phone numbers are invented.`,
    '',
  ]
  for (const category of LIBRARY_CATEGORIES) {
    const items = ORDERED_SAMPLES.filter((s) => s.category === category)
    if (!items.length) continue
    lines.push(`## ${CATEGORY_LABELS[category]}`, '')
    for (const s of items) {
      lines.push(`- [${s.role}](${HOST}/examples/${s.slug}) — ${SENIORITY_LABELS[s.seniority].toLowerCase()}, ${REGION_LABELS[s.region]}. ${s.blurb}`)
    }
    lines.push('')
  }
  return lines.join('\n')
}

export function sampleMarkdown(slug: string): string {
  const s = must(slug)
  const c = s.content
  const lines = [
    `# ${s.role} résumé example`,
    '',
    s.blurb,
    '',
    `- Field: ${CATEGORY_LABELS[s.category]}`,
    `- Career stage: ${SENIORITY_LABELS[s.seniority]}`,
    `- Written for: ${REGION_LABELS[s.region]}`,
    `- Design: ${TEMPLATE_MAP[s.template]?.name ?? s.template} (${HOST}/templates/${s.template})`,
    `- Open it: ${HOST}/examples/${s.slug}`,
    '',
    'Every name, employer, address, phone number and figure below is invented.',
    '',
    '---',
    '',
    `## ${plain(c.basics.name)} — ${plain(c.basics.label)}`,
    '',
  ]
  if (c.basics.summary) lines.push(plain(c.basics.summary), '')
  if (c.work.length) {
    lines.push('### Experience', '')
    for (const w of c.work) {
      lines.push(`**${plain(w.position)}**, ${plain(w.name)} · ${when(w.startDate, w.endDate)}`, '')
      if (w.summary) lines.push(plain(w.summary), '')
      for (const h of w.highlights ?? []) lines.push(`- ${plain(h)}`)
      lines.push('')
    }
  }
  if (c.education.length) {
    lines.push('### Education', '')
    for (const e of c.education) {
      lines.push(`- ${[`${plain(e.studyType)} ${plain(e.area)}`.trim(), plain(e.institution), when(e.startDate, e.endDate)].filter(Boolean).join(' · ')}`)
    }
    lines.push('')
  }
  if (c.skills.length) {
    lines.push('### Skills', '')
    for (const g of c.skills) lines.push(`- **${plain(g.name)}**: ${(g.keywords ?? []).join(', ')}`)
    lines.push('')
  }
  return lines.join('\n')
}

/* ------------------------------------------------------ structured data */

export function sampleBreadcrumbJsonLd(slug: string): string {
  const s = must(slug)
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${HOST}/` },
      { '@type': 'ListItem', position: 2, name: 'Résumé examples', item: `${HOST}/examples` },
      { '@type': 'ListItem', position: 3, name: `${s.role} résumé example`, item: `${HOST}/examples/${s.slug}` },
    ],
  })
}

/** The library as an ItemList, so a results page can show it as a collection
 *  rather than one blue link. */
export function examplesItemListJsonLd(): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Résumé examples',
    numberOfItems: LIBRARY.length,
    itemListElement: ORDERED_SAMPLES.map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: `${s.role} résumé example`,
      url: `${HOST}/examples/${s.slug}`,
    })),
  })
}

/** How many samples each shelf holds — the landing copy and the tests both
 *  want the count without importing the whole library. */
export function sampleCountByCategory(): Record<LibraryCategory, number> {
  const out = {} as Record<LibraryCategory, number>
  for (const c of LIBRARY_CATEGORIES) out[c] = LIBRARY.filter((s) => s.category === c).length
  return out
}
