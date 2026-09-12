/**
 * Everything the per-template pages need that is NOT React.
 *
 * A single-page app is invisible to anything that does not run JavaScript, and
 * "58 résumé templates" is 58 things people search for by name — so each design
 * gets its own URL (/templates/<id>), its own head, and a block of real HTML
 * that a crawler reads straight out of the file. That HTML is produced here and
 * written into dist/ at build time (see the plugin in vite.config.ts); the same
 * metadata drives the live route's head at runtime. One source, two consumers,
 * so the page a crawler is served and the page a reader gets can never disagree
 * about their title, their description or their canonical URL.
 *
 * Kept pure and dependency-free on purpose: it is imported by a Node build step
 * with no DOM and no browser, and it is the part worth unit-testing.
 */
import { TEMPLATES, TEMPLATE_MAP, galleryOrder } from '@/templates/registry'
import type { TemplateConfig, TemplateTag } from '@/types/template'
import { htmlEscape } from '@/lib/utils'
import { SITE as COPY } from '@/data/siteCopy'

/** Canonical host. Also written in index.html, robots.txt and the sitemap. */
export const SITE = 'https://cvaurum.com'

/**
 * How long a meta description may be. Google renders roughly 155-160
 * characters of one on desktop and truncates the rest mid-word, so a
 * description is cut here — on a word boundary — rather than by the search
 * results page.
 */
export const DESC_MAX = 155

/** The gallery's own order, so a template page's neighbour list and the
 *  sitemap walk the collection the same way the wall of cards does. */
const ORDERED = galleryOrder(TEMPLATES)

/** The tag that marks the plainest layouts. It reads as a pass/fail verdict
 *  next to the others ("this one is ATS-safe, so the rest are not"), which is
 *  false of every design in the registry — the gallery leaves it off its
 *  pills and so does every sentence built here. */
const STRICT_TAG: TemplateTag = 'ats-safe'

export interface PageMeta {
  /** Route path, always absolute and without a trailing slash. */
  path: string
  title: string
  /** At most DESC_MAX characters, cut on a word boundary. */
  description: string
  /** Site-root-relative path to the link-preview image. */
  image: string
}

/** Is this a design the registry actually holds? Guards the route before any
 *  of the builders below are asked for a page that cannot exist. */
export function isTemplateId(id: string | undefined): id is string {
  return !!id && Object.prototype.hasOwnProperty.call(TEMPLATE_MAP, id)
}

function must(id: string): TemplateConfig {
  const tpl = TEMPLATE_MAP[id]
  if (!tpl) throw new Error(`seoPages: no template named "${id}"`)
  return tpl
}

/**
 * Cut a sentence to `max` characters without cutting a word in half. Whatever
 * punctuation the cut lands on is dropped so the ellipsis reads as a trail-off
 * rather than as ",…" or ".…".
 */
export function trimToWords(text: string, max = DESC_MAX): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  // -1 leaves room for the ellipsis, so the result is never longer than max.
  const cut = clean.slice(0, max - 1)
  const space = cut.lastIndexOf(' ')
  const head = (space > 0 ? cut.slice(0, space) : cut).replace(/[\s,;:.…—–-]+$/, '')
  return `${head}…`
}

/** 'two-column' is a slug; a sentence says it in words. */
export function tagLabel(tag: string): string {
  const words = tag.replace(/-/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** The design's style tags as one readable line: "Single column · Modern". */
export function tagSentence(tags: readonly string[]): string {
  return tags
    .filter((t) => t !== STRICT_TAG)
    .map(tagLabel)
    .join(' · ')
}

/** The head a single template's page wants. */
export function templatePageMeta(id: string): PageMeta {
  const tpl = must(id)
  return {
    path: `/templates/${tpl.id}`,
    title: `${tpl.name} résumé template — free, ATS-ready · CVAurum`,
    description: trimToWords(tpl.description),
    image: `/og/${tpl.id}.jpg`,
  }
}

/** The gallery's own head, built from the same registry count as its heading. */
export function galleryPageMeta(): PageMeta {
  return {
    path: '/templates',
    title: `All ${TEMPLATES.length} Résumé Templates — Free & ATS-Ready · CVAurum`,
    description: trimToWords(GALLERY_INTRO),
    image: '/og.png',
  }
}

/** The gallery's visible intro sentence — kept here so the pre-rendered file
 *  and the live page say the same thing. */
export const GALLERY_INTRO =
  'Every design is shown on the same example résumé, so what changes between them is the layout and nothing else. Free, ATS-ready, and yours to edit in the browser.'

/**
 * The designs closest to this one: most shared style tags first, ties broken by
 * the gallery's order so the answer is stable between builds.
 */
export function relatedTemplateIds(id: string, limit = 6): string[] {
  const tpl = must(id)
  const mine = new Set(tpl.tags)
  return ORDERED.filter((t) => t.id !== id)
    .map((t, i) => ({ id: t.id, shared: t.tags.filter((tag) => mine.has(tag)).length, i }))
    .sort((a, b) => b.shared - a.shared || a.i - b.i)
    .slice(0, limit)
    .map((t) => t.id)
}

/** One <li> per design, name and href, for the crawler's navigation block. */
function linkList(list: readonly TemplateConfig[]): string {
  return list
    .map(
      (t) =>
        `      <li><a href="/templates/${t.id}">${htmlEscape(t.name)} résumé template</a></li>`
    )
    .join('\n')
}

/** The alt text an image index reads: the design's name and what it is for. */
export function imageAlt(tpl: TemplateConfig): string {
  return `${tpl.name} résumé template: ${trimToWords(tpl.description, 110)}`
}

/** One picture per design, the file the link preview uses, as real content:
 *  an image that lives only in og:image is never indexed as an image. */
function figure(tpl: TemplateConfig, eager: boolean): string {
  return `<figure><img src="/og/${tpl.id}.jpg" width="1200" height="630" alt="${htmlEscape(imageAlt(tpl))}" loading="${eager ? 'eager' : 'lazy'}" decoding="async"><figcaption>${htmlEscape(tpl.name)}</figcaption></figure>`
}

function cardList(list: readonly TemplateConfig[]): string {
  return list
    .map((t) => `      <li>${figure(t, false)}<p><a href="/templates/${t.id}">${htmlEscape(t.name)} résumé template</a> — ${htmlEscape(trimToWords(t.description, 120))}</p></li>`)
    .join('\n')
}

/**
 * The HTML a crawler reads for one template page WITHOUT running a line of
 * JavaScript. It is injected inside <div id="root">, which React's createRoot
 * empties the instant the app boots — so a reader never sees it and a crawler
 * that renders the page sees the real one. Everything a search engine needs is
 * here: the heading, the full description, what the design is good for, and a
 * path onward to every other page in the set.
 */
export function staticHtml(id: string): string {
  const tpl = must(id)
  const others = ORDERED.filter((t) => t.id !== id)
  return `<main class="seo-static">
    <p><a href="/templates">Résumé templates</a> › ${htmlEscape(tpl.name)}</p>
    <h1>${htmlEscape(tpl.name)} résumé template</h1>
    ${figure(tpl, true)}
    <p>${htmlEscape(tpl.description)}</p>
    <p>Best for: ${htmlEscape(tagSentence(tpl.tags))}. Free to use, exports selectable text a résumé parser can read, and edits entirely in your browser — no account and no upload.</p>
    <p><a href="/app">Start a résumé in this design</a> · <a href="/templates">Browse all ${TEMPLATES.length} résumé templates</a></p>
    <nav aria-label="Every other résumé template">
      <h2>The other ${others.length} designs</h2>
      <ul>
${linkList(others)}
      </ul>
    </nav>
  </main>`
}

/** The same crawler-readable block for the gallery itself. */
export function galleryStaticHtml(): string {
  return `<main class="seo-static">
    <h1>${TEMPLATES.length} résumé templates, all free</h1>
    <p>${htmlEscape(GALLERY_INTRO)}</p>
    <nav aria-label="Every résumé template">
      <h2>Every design</h2>
      <ul class="seo-cards">
${cardList(ORDERED)}
      </ul>
    </nav>
  </main>`
}

/* ------------------------------------------------------- markdown twins
 * Each public page has a Markdown twin beside it (index.md, templates.md,
 * templates/<id>.md), linked from the page as its text/markdown alternate
 * and announced in the landing page's Link header. Same data as the HTML,
 * so they cannot drift. (A Pages Function cannot negotiate for them: the
 * host serves an existing file before a function runs, measured 2026-09-12;
 * the host's own Markdown-for-agents switch does that at the edge.) */

const SITE_LIMITS: readonly string[] = COPY.limits

export function landingMarkdown(): string {
  return llmsTxt()
}

export function galleryMarkdown(): string {
  return `# ${TEMPLATES.length} résumé templates, all free

${GALLERY_INTRO}

${ORDERED.map((t) => `- [${t.name}](${SITE}/templates/${t.id}) — ${trimToWords(t.description, 140)} (${tagSentence(t.tags)})`).join('\n')}

Start a résumé: ${SITE}/app · About CVAurum: ${SITE}/llms.txt
`
}

export function templateMarkdown(id: string): string {
  const tpl = must(id)
  const related = relatedTemplateIds(id, 6).map((r) => must(r))
  return `# ${tpl.name} résumé template

${tpl.description}

![${imageAlt(tpl)}](${SITE}/og/${tpl.id}.jpg)

- Best for: ${tagSentence(tpl.tags)}
- Layout: ${tpl.defaults.layout.columns === 2 ? 'two column' : 'single column'}
- Photo: ${tpl.defaults.layout.showPhoto ? 'on by default' : 'optional'}
- Exports: PDF (vector, selectable text), Word, JSON Resume
- Price: free, MIT licensed; no account, nothing uploaded
- Open in the editor: ${SITE}/app

## Related designs

${related.map((r) => `- [${r.name}](${SITE}/templates/${r.id}) — ${trimToWords(r.description, 120)}`).join('\n')}

All ${TEMPLATES.length} designs: ${SITE}/templates
`
}

/* ------------------------------------------------------- agent discovery
 * What is TRUE of this site: no server, no API, no accounts. The documents
 * below say so in the formats readers look for, rather than promising
 * endpoints that do not exist. */

/** RFC 9727 API catalog: the one "service" is the site itself, documented
 *  by llms.txt; there is no API and no OpenAPI description to point at. */
export function apiCatalogJson(): string {
  return JSON.stringify(
    {
      linkset: [
        {
          anchor: `${SITE}/`,
          'service-doc': [{ href: `${SITE}/llms.txt`, type: 'text/plain', title: 'CVAurum, described for machine readers' }],
          'service-meta': [{ href: `${SITE}/llms-full.txt`, type: 'text/plain', title: 'The full description' }],
          describedby: [{ href: `${SITE}/.well-known/agent-skills/index.json`, type: 'application/json' }],
        },
      ],
      // Not part of the linkset: CVAurum has no HTTP API. Everything runs in
      // the visitor's browser; there is nothing to call and no key to hold.
      note: 'CVAurum has no HTTP API: the editor, the PDF engine and the storage run in the browser. The site itself is the service; llms.txt describes it.',
    },
    null,
    2
  )
}

/** A skill file an assistant can load: how to help a person use CVAurum,
 *  including the JSON Resume path in and out and the in-page WebMCP tools. */
export function skillMd(): string {
  return `---
name: cvaurum
description: Help a person build, tailor or export a résumé with CVAurum (${SITE}), a free résumé builder that runs entirely in the browser. Use when someone asks for a résumé template, a PDF/Word résumé, an ATS check, or wants to import or export JSON Resume.
---

# CVAurum

${COPY.oneLiner}

Everything runs in the visitor's browser: no account, no upload, no API. The whole application is open source (${COPY.links.repo}).

## What you can do for a person

1. **Pick a design.** ${TEMPLATES.length} templates, each on its own page: ${SITE}/templates and ${SITE}/templates/<id>. Every page has a Markdown twin beside it: ${SITE}/templates.md, ${SITE}/templates/<id>.md, ${SITE}/index.md (also answered for \`Accept: text/markdown\` where the host negotiates).
2. **Start a résumé.** ${SITE}/app opens the editor; "Start with an example" offers six ready résumés. A template page's "Use this template" opens the editor in that design.
3. **Bring content in.** The editor imports JSON Resume (https://jsonresume.org/schema) and text PDFs (Import in the editor). If you hold a person's résumé as JSON Resume, hand them the file; the editor keeps it in their browser storage only.
4. **Fit and export.** Magic fit (Design → Page) sizes type and spacing to a page target inside rules the person sets and says what it chose. Export gives a vector PDF (PDF/A-2B, PDF/UA-1), a Word file and JSON Resume.
5. **Check for an ATS.** The ATS panel scores the résumé, matches a job description's keywords and shows the plain text a parser reads.

## In the page (WebMCP)

When the page is open in a browser that exposes \`navigator.modelContext\`, the app registers tools: \`list_resume_templates\`, \`open_resume_template\` (\`{ id }\`), \`create_resume_from_json_resume\` (\`{ jsonResume }\`) which saves a new résumé in the browser and opens it. They act only in that browser.

## Limits

${SITE_LIMITS.map((l) => `- ${l}`).join('\n')}
`
}

/** The skills index (Agent Skills Discovery 0.2.0). The digest is the
 *  SHA-256 of the SKILL.md as written; the build computes it. */
export function agentSkillsIndex(digestHex: string): string {
  return JSON.stringify(
    {
      $schema: 'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
      skills: [
        {
          name: 'cvaurum',
          type: 'skill-md',
          description: `Help a person build, tailor or export a résumé with CVAurum, a free résumé builder that runs entirely in the browser (${TEMPLATES.length} templates, PDF/Word/JSON Resume, ATS checks).`,
          url: `${SITE}/skills/cvaurum/SKILL.md`,
          digest: `sha256:${digestHex}`,
        },
      ],
    },
    null,
    2
  )
}

/** auth.md, self-contained: there is nothing to authenticate or register. */
export function authMd(): string {
  return `# auth.md

CVAurum (${SITE}) has no accounts, no API keys and no registration, for people or for agents. Everything runs in the visitor's browser and nothing is stored on a server, so there is no credential to obtain and nothing a credential would unlock.

- Audience: any agent or person may read the public pages (/, /templates, /templates/<id>, /llms.txt) without identifying itself.
- Registration: none exists. There is no endpoint to create an account or provision a credential.
- Credentials: none are used. Requests need no header, token or cookie.
- Authorization servers: none. No OAuth or OpenID Connect metadata is published because no such server exists.

The app's own routes (/app, /tracker, /resume/<id>) are shells that render from the visitor's browser storage; they hold nothing an agent could fetch.
`
}

function urlEntry(loc: string, lastmod: string, changefreq: string, priority: string, images: readonly TemplateConfig[] = []): string {
  const imgs = images
    .map(
      (t) => `
    <image:image>
      <image:loc>${SITE}/og/${t.id}.jpg</image:loc>
      <image:title>${htmlEscape(t.name)} résumé template</image:title>
      <image:caption>${htmlEscape(imageAlt(t))}</image:caption>
    </image:image>`
    )
    .join('')
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>${imgs}
  </url>`
}

/**
 * Every public URL the site has: the landing page, the gallery, and one entry
 * per design. `today` is passed in (rather than read from the clock) so the
 * function stays pure and the file it writes is reproducible.
 */
export function sitemapXml(today: string): string {
  const entries = [
    urlEntry(`${SITE}/`, today, 'weekly', '1.0'),
    urlEntry(`${SITE}/templates`, today, 'weekly', '0.8', ORDERED),
    ...ORDERED.map((t) => urlEntry(`${SITE}/templates/${t.id}`, today, 'monthly', '0.6', [t])),
  ]
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <!--
    The landing page, the template gallery, and one page per design. /app,
    /tracker, /resume/:id and /print/:id are private, account-free shells with
    no shareable content and are deliberately excluded (and Disallowed in
    robots.txt). Generated — see src/lib/seoPages.ts and the SEO plugin in
    vite.config.ts; edit those, not this file.
  -->
${entries.join('\n')}
</urlset>
`
}

/** Breadcrumb structured data for one template page. Data, never script. */
export function breadcrumbJsonLd(id: string): string {
  const tpl = must(id)
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Résumé templates', item: `${SITE}/templates` },
      { '@type': 'ListItem', position: 3, name: `${tpl.name} résumé template`, item: `${SITE}/templates/${tpl.id}` },
    ],
  })
}

/** Every id, in gallery order — what the build step iterates. */
export function allTemplateIds(): string[] {
  return ORDERED.map((t) => t.id)
}

/* ---- The landing page for whoever does not run scripts ------------------
   An assistant asked to compare résumé builders fetches https://cvaurum.com
   and reads the HTML before any JavaScript runs. That HTML used to be the
   head and an empty <div id="root">: nothing to quote, compare or rank. The
   block below is written into dist/index.html's #root at build time (the
   plugin in vite.config.ts); React empties it the moment the app boots, so
   a person sees the page they always did. It renders from the same object
   the page renders from (src/data/siteCopy.ts), so the two cannot drift. */

/** The six designs whose structure is different, one sentence each. */
const SIGNATURE_STRUCTURE: Record<string, string> = {
  broadsheet:
    'A front page: the name set huge in a display serif across the full width, a byline of contacts between double rules, and numbered running heads down one column.',
  marquee:
    'A poster: the name fills a colour block in tall condensed capitals, the body runs in one column beneath, and skills and languages live in a dark strip along the foot of the page.',
  atlas:
    'A dashboard: a navy-to-teal band carries the name, and beneath it a numbers band of figures the app reads out of the content itself (years, companies, projects, a headline figure), each tile editable.',
  chronicle:
    'A ledger: every entry hands its opening year to a tinted rail down the left, set in tall condensed numerals, while the entry keeps its own dates in a plain column beside them; any entry can set its own year and word.',
  'folio-noir':
    'A gallery wall: gold on near-black, a band of art behind the name, a hairline running out of every heading, and each entry’s dates and places set in a narrow margin down the right.',
  terrace:
    'Three steps of green carry the name, the role and the contacts across the top, and beneath them every section title sits in a column of its own, beside the words it labels.',
}

const SIGNATURE_IDS = ORDERED.filter((t) => t.tags.includes('signature')).map((t) => t.id)

function esc(s: string): string {
  return htmlEscape(s).replace(/"/g, '&quot;')
}

export function landingStaticHtml(): string {
  const steps = COPY.steps.map((s) => `        <li><strong>${esc(s.title)}.</strong> ${esc(s.body)}</li>`).join('\n')
  const rows = COPY.comparison
    .map((r) => `        <tr><th scope="row">${esc(r.capability)}</th><td>${esc(r.cvaurum)}</td><td>${esc(r.others)}</td></tr>`)
    .join('\n')
  const privacy = COPY.privacy.map((p) => `        <li>${esc(p)}</li>`).join('\n')
  const faq = COPY.faq.map((f) => `        <dt>${esc(f.q)}</dt>\n        <dd>${esc(f.a)}</dd>`).join('\n')
  const signature = SIGNATURE_IDS.map((id) => {
    const t = must(id)
    return `        <li><a href="/templates/${t.id}">${esc(t.name)}</a>: ${esc(SIGNATURE_STRUCTURE[id] ?? t.description)}</li>`
  }).join('\n')
  return `<main class="seo-static">
    <h1>${esc(COPY.hero)}</h1>
    <p>${esc(COPY.oneLiner)}</p>
    <p><a href="${COPY.links.app}">Create a résumé</a> · <a href="${COPY.links.gallery}">Browse the ${TEMPLATES.length} templates</a> · <a href="${COPY.links.repo}">Source on GitHub</a></p>
    <h2>Three steps</h2>
    <ol>
${steps}
    </ol>
    <h2>Head-to-head</h2>
    <table>
      <thead><tr><th>Capability</th><th>CVAurum</th><th>Most builders</th></tr></thead>
      <tbody>
${rows}
      </tbody>
    </table>
    <h2>Privacy</h2>
    <ul>
${privacy}
    </ul>
    <h2>Questions</h2>
    <dl>
${faq}
    </dl>
    <h2>Templates</h2>
    <p>${TEMPLATES.length} designs, every one exporting real selectable text, each on its own page. The Signature collection changes the structure of the page, not only its colours:</p>
    <ul>
${signature}
    </ul>
    <p><a href="${COPY.links.gallery}">Every template, rendered on the same example résumé</a>.</p>
    <p>CVAurum is open source under the MIT licence: <a href="${COPY.links.repo}">${COPY.links.repo}</a>.</p>
  </main>`
}

/**
 * The built index.html with its own title and a noindex, and nothing in
 * #root: what /app, /tracker and /r are served, so the landing block never
 * flashes inside the app before the bundle loads.
 */
export function shellHtml(indexHtml: string, title: string): string {
  return indexHtml.replace(
    /<title>[^<]*<\/title>/,
    `<title>${htmlEscape(title)}</title>\n    <meta name="robots" content="noindex" />`
  )
}

/* ---- llms.txt ------------------------------------------------------------
   What a machine reader finds at /llms.txt. The convention is an H1, a
   blockquote summary and sections of links; this one goes further, because
   an assistant asked "which résumé builder should I use" needs the facts,
   the limits, every page and the sitemap in one place, in plain prose it
   can quote. llms-full.txt carries the same plus the long-form sections.
   Every claim here is true of the code; no superlatives (a test checks). */

function templateLine(t: TemplateConfig): string {
  const tags = tagSentence(t.tags)
  return `- [${t.name}](${SITE}/templates/${t.id}): ${t.description}${tags ? ` (${tags})` : ''}`
}

function signatureLines(): string {
  return SIGNATURE_IDS.map((id) => {
    const t = must(id)
    return `- [${t.name}](${SITE}/templates/${t.id}): ${SIGNATURE_STRUCTURE[id] ?? t.description}`
  }).join('\n')
}

function factsBlock(): string {
  return COPY.facts.map((f) => `- ${f.label}: ${f.value}`).join('\n')
}

function limitsBlock(): string {
  return COPY.limits.map((l) => `- ${l}`).join('\n')
}

function audienceBlock(): string {
  return COPY.audience.map((a) => `- ${a}`).join('\n')
}

function pagesBlock(): string {
  return [
    `- [Home](${SITE}/): what CVAurum is, how it compares with other résumé builders, the three steps, privacy, questions and answers.`,
    `- [Template gallery](${SITE}/templates): all ${TEMPLATES.length} designs rendered on the same example résumé, searchable and filterable by tag; each design has its own page.`,
    `- [The app](${SITE}/app): the résumé dashboard and the editor. Nothing to sign up for; the page is private to the visitor's browser and not indexed.`,
    `- [Questions and answers](${SITE}/#faq): privacy, the ATS check, file formats, archival PDF, phones, résumé length.`,
  ].join('\n')
}

function resourcesBlock(): string {
  return [
    `- [Sitemap](${SITE}/sitemap.xml): every public URL (the home page, the gallery and one page per design).`,
    `- [robots.txt](${SITE}/robots.txt): the public pages are open to crawlers and machine readers by name; the private routes are not.`,
    `- [llms-full.txt](${SITE}/llms-full.txt): the long form of this file.`,
    `- Markdown twins: every public page has one beside it, at ${SITE}/index.md, ${SITE}/templates.md and ${SITE}/templates/<id>.md, linked from the page as its text/markdown alternate.`,
    `- [API catalog](${SITE}/.well-known/api-catalog) (RFC 9727): says plainly that there is no HTTP API; the site itself is the service.`,
    `- [Skills index](${SITE}/.well-known/agent-skills/index.json) and [SKILL.md](${SITE}/skills/cvaurum/SKILL.md): how an assistant can help a person use CVAurum, with the in-page WebMCP tools it can call.`,
    `- [auth.md](${SITE}/auth.md): there are no accounts, keys or registration, for people or for agents.`,
    `- [Source repository](${COPY.links.repo}): the whole application, MIT licensed; issues and contributions go there.`,
    `- [JSON Resume schema](https://jsonresume.org/schema): the open format CVAurum imports and exports.`,
  ].join('\n')
}

/** Every public URL, in sitemap order: home, gallery, then each design. */
export function siteUrls(): string[] {
  return [`${SITE}/`, `${SITE}/templates`, ...ORDERED.map((t) => `${SITE}/templates/${t.id}`)]
}

function sitemapBlock(): string {
  return siteUrls().map((u) => `- ${u}`).join('\n')
}

export function llmsTxt(): string {
  return `# CVAurum

> ${COPY.oneLiner}

CVAurum, at ${SITE}, is a résumé builder published as a static web app: the editor, the fonts, the PDF engine, the ATS checks and the storage all run in the visitor's browser. There is no backend, no account, no paid tier and no watermark. The source is public under the MIT licence at ${COPY.links.repo}.

## Facts at a glance

${factsBlock()}

## What it does not do

${limitsBlock()}

## Who it is for

${audienceBlock()}

## Pages

${pagesBlock()}

## Signature designs

Six single-column designs whose structure is different, not only their colours. The structures they introduce are editable (Atlas's numbers band, Chronicle's year rail):

${signatureLines()}

## Every template

${TEMPLATES.length} designs, every one exporting real selectable text, each on its own page:

${ORDERED.map(templateLine).join('\n')}

## Machine-readable resources

${resourcesBlock()}

## Sitemap

${siteUrls().length} public URLs, as in ${SITE}/sitemap.xml:

${sitemapBlock()}
`
}

export function llmsFullTxt(): string {
  const rest = ORDERED.filter((t) => !SIGNATURE_IDS.includes(t.id)).map(templateLine).join('\n')
  const faq = COPY.faq.map((f) => `**${f.q}** ${f.a}`).join('\n\n')
  const steps = COPY.steps.map((s, i) => `${i + 1}. ${s.title}. ${s.body}`).join('\n')
  const table = [
    '| Capability | CVAurum | Most builders |',
    '| --- | --- | --- |',
    ...COPY.comparison.map((r) => `| ${r.capability} | ${r.cvaurum} | ${r.others} |`),
  ].join('\n')
  return `# CVAurum

> ${COPY.oneLiner}

## What it is

CVAurum is a résumé builder published as a static web app at ${SITE}. There is no backend: the editor, the fonts, the PDF engine and the ATS checks all run in the visitor's browser, and every résumé is stored in that browser's own storage. It needs no account, has no paid tier and no watermark, and its source is public under the MIT licence at ${COPY.links.repo}.

## Facts at a glance

${factsBlock()}

## What it does not do

${limitsBlock()}

## Who it is for

${audienceBlock()}

## How it works

${steps}

## Head-to-head with most résumé builders

${table}

## Privacy architecture

${COPY.privacy.map((p) => `- ${p}`).join('\n')}
- The site's Content-Security-Policy allows no outbound request at all (connect-src 'self'), so even a future bug could not send data anywhere.
- A share link carries the résumé inside the URL fragment, which browsers never send to a server, encrypted with AES-256-GCM under a key derived from a passphrase by PBKDF2-SHA-256 (600,000 iterations).

## Export

- PDF: a vector renderer in the browser paints the same document the preview shows, page for page, with real selectable text, clickable links and multi-page output that breaks at section or entry boundaries; a typical file is about 50 KB. Every export conforms to PDF/A-2B (archival: fonts and an sRGB profile embedded) and PDF/UA-1 (accessible: a tagged structure in logical reading order), verified against the veraPDF validator. It is the only export path; there is no print-dialog fallback, and a failure is reported as one. The file carries the author's own title, subject and language in its metadata, not a toolchain's.
- Word (.docx): a single-column, ATS-friendly document with real bullet lists and real hyperlinks that follows the template's fonts, accent colour, margins and type size.
- JSON Resume: the open schema, with CVAurum's design choices under meta.cvaurum, so a file round-trips with the JSON Resume ecosystem.
- A full backup of every résumé in the browser, as one file, restorable anywhere.

## ATS check

- Deterministic and on-device: the same résumé and job description always give the same result. Structural checks (contact details, a summary, quantified bullets, action verbs, length, layout, standard headings) roll into a score.
- Paste a job description to see matched and missing keywords and a match score.
- A parser's-eye view shows the plain text an applicant-tracking system reads, in its reading order.
- A per-system parse simulation models how five common applicant-tracking systems (Workday, Greenhouse, Lever, Taleo, iCIMS) read the page, with the structural risks each one flags; it is guidance, not a claim about any vendor's internals.
- A writing coach flags weak openers, passive voice, first-person pronouns, clichés, missing metrics and over-long bullets, with a fix for each. It is rule-based, not generative.
- A recruiter skim heatmap shows where a first skim lands on the page, deterministically.
- Optional semantic matching with a small on-device language model (about 34 MB, self-hosted, opt-in) checks whether each requirement in a job description is expressed in the résumé even when the wording differs.

## Import

- PDF import reconstructs an existing résumé into editable sections (contact, experience, education, skills and so on) in the browser; scanned pages are read with on-device OCR. Nothing is uploaded, and the result is meant to be reviewed.
- JSON Resume files import and keep editing.

## Editing

- Edit directly on the page or in a form panel; both stay in sync, with undo and redo and autosave.
- Per-section styles: eight heading styles, four skills displays, four entry layouts (timeline, cards, grid, divided), eight bullet markers, five proficiency meters, logos and credential badges, date format and language, time spans on date ranges, a copy-and-paste style painter.
- Header layouts (classic, centered, split, banner, compact and the Signature compositions), 45 bundled fonts, colours for the name, headline, headings, contacts and links, spacing, margins, A4 or US Letter, light or dark theme.
- Links keep their display text and their destination apart, print as tags or plain words, and read the same in the PDF, the Word file and the ATS view; one switch turns clickability off for paper.
- The Signature designs' structures are editable: Atlas's numbers band is a list of figures to choose, rename, override, reorder or add to; Chronicle's year rail derives each entry's year and word and any entry can set its own.
- Six example résumés to start from: an experienced engineer, a growth marketer, a recent graduate, a final-year student with internships, a current student and a product designer.
- Paste a list into a bullet field and it becomes one bullet per line. A command palette (Ctrl+K) reaches every action; slash commands insert bullet templates and metrics; a focus mode dims everything but the section under the cursor.
- Automatic fit to one page when the content is close, live page-break guides, a pin to start any section or entry on a new page, and a switch that keeps entries whole across pages.
- The page is editable on a phone and a tablet as well as a desktop; on a small screen the form panel is the comfortable route, and every canvas control has a panel equivalent.
- A multi-résumé dashboard and a job application tracker (a kanban board from wishlist to offer).

## Templates

${TEMPLATES.length} designs, every one exporting real selectable text; each has its own page at ${SITE}/templates/<id>. The gallery at ${SITE}/templates renders them all on the same example résumé.

### Signature collection

Single-column designs whose structure is different, not only their colours:

${signatureLines()}

### All other designs

${rest}

## Offline and installation

CVAurum installs as a web app (Add to Home Screen or Install) on desktop and mobile. The whole app and all fonts are precached by a service worker, so it works with no connection at all, including PDF export.

## Sharing

An encrypted share link (the résumé rides in the URL fragment, unreadable without the passphrase, which travels by another channel) or an exported file: a full backup, a JSON Resume file, a PDF or a Word document.

## Questions and answers

${faq}

## Machine-readable resources

${resourcesBlock()}

## Sitemap

${siteUrls().length} public URLs, as in ${SITE}/sitemap.xml:

${sitemapBlock()}

## Licence and source

MIT licence. Source: ${COPY.links.repo}. Site: ${SITE}.
`
}
