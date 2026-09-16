/**
 * Everything the per-template pages need that is NOT React.
 *
 * A single-page app is invisible to anything that does not run JavaScript, and
 * every design in the registry is something people search for by name — so each
 * one gets its own URL (/templates/<id>), its own head, and a block of real HTML
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
import { ResumeContentSchema } from '@/types/document'
import { orderedSampleSlugs as librarySlugs, samplePageImage } from '@/lib/seoLibrary'
import { SAMPLE_COUNT } from '@/data/library/count'
import { PAGE_IMAGE_HEIGHT, PAGE_IMAGE_WIDTH } from '@/data/pageImages'
import LASTMOD from '@/data/lastmod.json'

/**
 * The example library's own pages, re-exported so the build step keeps loading
 * ONE module. They live apart because they are a different collection with a
 * different shape, and this file was already long.
 */
export {
  EXAMPLES_INTRO,
  examplesItemListJsonLd,
  examplesJsonLd,
  examplesMarkdown,
  examplesPageMeta,
  examplesStaticHtml,
  isSampleSlug,
  orderedSampleSlugs,
  sampleBreadcrumbJsonLd,
  sampleImageAlt,
  sampleMarkdown,
  samplePageImage,
  samplePageImageHeight,
  samplePageMeta,
  sampleShareCard,
  sampleStaticHtml,
} from '@/lib/seoLibrary'

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
    // The gallery's own card - a fan of real design pages with the count on
    // it. It fell back to the site card, which shows one design and no count.
    image: '/og/templates.jpg',
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

/* ------------------------------------------------------------- the pictures
 * A design has two files, and they are not interchangeable:
 *
 *   /img/templates/<id>.webp   the page image — the whole résumé at 1200 px
 *                              wide, lossless WebP: under half the bytes of
 *                              JPEG q82 for a page of text, and bit-exact
 *                              (measured). This is what a reader looks at and
 *                              what an image index crawls.
 *   /og/<id>.jpg               the share card — 1200×630 JPEG, and og:image
 *                              never points anywhere else: the big link-preview
 *                              readers document JPG/PNG/GIF between them, and
 *                              one has been measured failing on WebP.
 *
 * The page used to show the share card as its picture, so what a crawler
 * indexed for a design was a cropped 630-pixel band of it, not the page.
 */

/** A4 at 1200 px wide, for a design whose entry the generated map is missing:
 *  a width and a height that are nearly right beat no box at all. */
const FALLBACK_HEIGHT = Math.round((PAGE_IMAGE_WIDTH * 297) / 210)

/** The indexable picture of a résumé in this design. */
export function templatePageImage(id: string): string {
  return `/img/templates/${id}.webp`
}

/** Its intrinsic height — A4 and US Letter are different shapes. */
export function templatePageImageHeight(id: string): number {
  return PAGE_IMAGE_HEIGHT[`templates/${id}`] ?? FALLBACK_HEIGHT
}

/**
 * What the picture shows: a résumé page set in this design, and what the
 * design is — its style tags in words. Not the description, which is a
 * paragraph of sales prose about the design rather than a description of the
 * image, and reads as stuffing in an alt.
 */
export function imageAlt(tpl: TemplateConfig): string {
  const tags = tagSentence(tpl.tags).toLowerCase()
  return `A full résumé page in the ${tpl.name} template${tags ? `: ${tags}` : ''}`
}

/** One picture per design, as real content: an image that lives only in
 *  og:image is never indexed as an image, and Google's image documentation is
 *  explicit that it does not index CSS images either. */
function figure(tpl: TemplateConfig, eager: boolean): string {
  return `<figure><img src="${templatePageImage(tpl.id)}" width="${PAGE_IMAGE_WIDTH}" height="${templatePageImageHeight(tpl.id)}" alt="${htmlEscape(imageAlt(tpl))}" loading="${eager ? 'eager' : 'lazy'}" decoding="async"><figcaption>${htmlEscape(tpl.name)}</figcaption></figure>`
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
    <p><a href="/app">Start a résumé in this design</a> · <a href="/templates">Browse all ${TEMPLATES.length} résumé templates</a> · <a href="/examples">See ${SAMPLE_COUNT} complete résumé examples</a></p>
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
    <p><a href="/">CVAurum</a> › Résumé templates</p>
    <h1>${TEMPLATES.length} résumé templates, all free</h1>
    <p>${htmlEscape(GALLERY_INTRO)}</p>
    <p><a href="/app">Start a résumé</a> · <a href="/examples">Read ${SAMPLE_COUNT} complete résumé examples</a> · <a href="/prompts">${PROMPTS.length} prompts for an AI assistant</a></p>
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

![${imageAlt(tpl)}](${SITE}${templatePageImage(tpl.id)})

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

/* ------------------------------------------------- the document's own shape
 * An assistant asked to produce a résumé file needs the field names, and a
 * prompt that spells them out in prose is a copy of the schema that nobody
 * will remember to update. So the list below is READ OUT OF THE ZOD SCHEMAS
 * the importer actually validates against (src/types/resume.ts via
 * ResumeContentSchema): rename a field there and this text renames with it.
 * It is published inside SKILL.md, which every prompt on /prompts points at.
 */

/** Peel ZodOptional / ZodDefault / ZodCatch / ZodEffects off a schema. */
function unwrapSchema(schema: unknown): unknown {
  let cur = schema as { _def?: { innerType?: unknown; schema?: unknown } } | undefined
  while (cur?._def?.innerType || cur?._def?.schema) {
    cur = (cur._def.innerType ?? cur._def.schema) as typeof cur
  }
  return cur
}

/** The element schema of an array, or null if it is not one. */
function arrayElement(schema: unknown): unknown {
  const inner = unwrapSchema(schema) as { _def?: { typeName?: string }; element?: unknown } | undefined
  return inner?._def?.typeName === 'ZodArray' ? inner.element : null
}

/** The field map of an object schema, or null if it is not one. */
function objectShape(schema: unknown): Record<string, unknown> | null {
  const inner = unwrapSchema(schema) as { shape?: Record<string, unknown> } | undefined
  return inner?.shape ?? null
}

interface ShapeLine {
  /** 'work[]', 'basics.location' — how the path is written in a JSON file. */
  path: string
  fields: string[]
}

/** One line per object in the document, deepest nesting last. */
function walkShape(schema: unknown, path: string, out: ShapeLine[], depth = 0): void {
  if (depth > 3) return
  const element = arrayElement(schema)
  const shape = objectShape(element ?? schema)
  if (!shape) return
  const label = element ? `${path}[]` : path
  out.push({ path: label, fields: Object.keys(shape) })
  for (const [key, child] of Object.entries(shape)) {
    if (objectShape(arrayElement(child) ?? child)) walkShape(child, `${label}.${key}`, out, depth + 1)
  }
}

/** Every field the importer reads, as it is spelled in the file. */
export function documentShape(): ShapeLine[] {
  const out: ShapeLine[] = []
  for (const [key, schema] of Object.entries(ResumeContentSchema.shape)) walkShape(schema, key, out)
  return out
}

/** Its top-level keys — what a JSON Resume document's own top level holds. */
export function documentSections(): string[] {
  return Object.keys(ResumeContentSchema.shape)
}

export function documentShapeMarkdown(): string {
  const lines = documentShape().map((s) => `- \`${s.path}\`: ${s.fields.join(', ')}`)
  return `A CVAurum file IS a JSON Resume document: the content sits at the top level and CVAurum's own visual settings are namespaced under \`meta.cvaurum\`, which an assistant should leave out entirely — the app fills it in. Import is deliberately forgiving: a field it does not recognise, or one whose value is the wrong type, is dropped on its own; it never rejects the rest of the résumé. So a plain JSON Resume document imports complete, and a near miss imports as most of a résumé rather than as an error.

Top level: ${documentSections().map((s) => `\`${s}\``).join(', ')}. All but \`custom\` are JSON Resume v1; \`custom\` is CVAurum's own, for material that belongs in no standard section. Every field is optional.

${lines.join('\n')}

Dates are strings: \`YYYY-MM-DD\`, \`YYYY-MM\` or \`YYYY\`. An empty \`endDate\` reads as "present". \`summary\` and each string in \`highlights\` may carry simple markup — \`strong\`, \`b\`, \`em\`, \`i\`, \`u\`, \`s\`, \`a\`, \`span\`, \`p\`, \`br\`, \`div\`, \`ul\`, \`ol\`, \`li\` — and anything outside that set is stripped before the page is drawn, so plain text is always safe. \`basics.image\` and any \`logo\` must be a \`data:image/…\` URL — a remote address is dropped on import, because the app makes no outbound request. These are CVAurum's additions to the standard sections and all are optional: \`id\`, \`logo\`, \`badge\`, \`rail\`, \`rating\`, \`links\`, \`urlLabel\`, \`urlIcon\`, \`icon\`, and education's \`status\` and \`level\`.`
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

## The document shape

Produce this and the person can import it. The field names below are read out of the schemas the importer validates against, so they cannot drift from the code.

${documentShapeMarkdown()}

Never invent an employer, a date, a qualification or a figure a person has not given you. An empty field is a question to ask them; a filled-in guess is something they have to defend in an interview.

Ready-made prompts for the jobs people actually bring — notes into a résumé, tailoring to a posting, rewriting bullets to name a number, writing a summary, starting from nothing — are at ${SITE}/prompts (Markdown twin: ${SITE}/prompts.md).

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

/* ------------------------------------------------------- the prompt library
 * /prompts. Someone who already talks to an assistant every day has their
 * history in a chat window, not in a form — so the shortest path into this
 * app is a prompt whose answer the app imports.
 *
 * The format is JSON Resume, which is what the app's own files already are
 * (src/lib/io.ts), which is an open standard the large assistants already
 * know, and whose import here drops a bad field rather than the file. The
 * prompts therefore never describe the schema themselves: they point at
 * SKILL.md, where the field list is generated from the Zod schemas above.
 *
 * Kept here rather than in the route so the page a person reads, the HTML a
 * crawler is served and the Markdown twin are one text.
 *
 * NOT YET WIRED INTO THE BUILD. The SEO plugin names the pages it stamps out
 * one by one, and it lives in vite.config.ts, which this change was not
 * allowed to touch. Everything else already flows: sitemapXml() lists
 * /prompts and llms.txt describes it (both verified in a real build). What is
 * missing is the file itself — until these two lines join the others in
 * seoPages()'s closeBundle, /prompts has no pre-rendered HTML and no
 * Markdown twin, so the sitemap entry and the /prompts.md this file
 * advertises both resolve to the host's 404 shell for anything that does not
 * run JavaScript:
 *
 *     write('prompts', pageHtml(shell, seo.SITE, seo.promptsPageMeta(), seo.promptsStaticHtml()))
 *     writeText('prompts.md', seo.promptsMarkdown())
 *
 * and, for the dev server to answer /prompts.md the way it answers
 * /templates.md, one line in machineReadersDev's `files` map:
 *
 *     '/prompts.md': (seo) => seo.promptsMarkdown(),
 */

/** Where an assistant should read the field names. Generated, so a prompt
 *  that sends someone here can never quote a field that no longer exists. */
export const SCHEMA_DOC = `${SITE}/skills/cvaurum/SKILL.md`

export interface PromptEntry {
  /** URL fragment and React key. */
  id: string
  title: string
  /** One line: when this is the prompt to reach for. */
  when: string
  /** The prompt itself, verbatim, as it is copied. */
  prompt: string
  /** What to do with what comes back. */
  after: string
}

/**
 * The one line the page leads with, and the head's description.
 *
 * It used to be four sentences, and on a phone it cost six lines of the first
 * screen before a reader learned that there was anything to press. What a
 * first-time visitor needs is the loop — copy, paste, paste back — and the
 * rest (the format, the refusal to invent) is a sentence at the foot of the
 * page, where someone who wants it will look.
 */
export const PROMPTS_INTRO =
  'Copy a prompt, paste it into the assistant you already use, then paste the answer back here — it opens as a résumé you can edit.'

/** The same footnote on the page, in the crawler's HTML and in the Markdown
 *  twin. One sentence, because the schema is not what anyone came for. */
export const PROMPTS_SCHEMA_NOTE =
  'Every prompt asks for JSON Resume, the open format this app reads and writes, and sends the assistant to the generated field list rather than letting it guess; none of them will invent a job, a date or a number you did not give it.'

export const PROMPTS: readonly PromptEntry[] = [
  {
    id: 'notes-to-resume',
    title: 'Turn what I already have into a résumé file',
    when: 'You have notes, an old résumé or a job history in some other shape, and no wish to retype it.',
    prompt: `I want to turn what I already have into a résumé I can edit.

Here is my raw material. It is unstructured and probably incomplete:

<paste your notes, an old résumé, a list of jobs — whatever you have>

Produce one JSON Resume document from it. The exact field names are written out at ${SCHEMA_DOC}; read that rather than guessing, and do not use a field it does not list.

Rules I care about:
- Use only what is in my material. Do not invent an employer, a date, a qualification, a skill or a figure. If a date is missing, leave the field empty rather than guessing a year.
- Keep my own wording wherever it already says something concrete. Fix grammar and tense. Do not inflate.
- One job per entry in work, with name for the employer, position for my title, startDate and endDate as YYYY-MM (or YYYY if that is all I gave you), and one string in highlights per bullet.
- If something in my material fits no standard section, put it in custom rather than dropping it.

Reply with the JSON in a single fenced block. After it, list the fields you left empty because my material did not answer them — that list is what I need to go and find out.`,
    after: 'Copy the JSON block and paste it below, or save it as a .json file and use Create resume → import a JSON Resume file. Anything the assistant got wrong is dropped field by field on import, so a near miss still arrives as most of a résumé.',
  },
  {
    id: 'tailor-to-a-job',
    title: 'Tailor a résumé I already have to one job description',
    when: 'You have a résumé that works and a posting you want it to answer, and you do not want the two to drift apart into a lie.',
    prompt: `Here is my résumé as a JSON Resume document:

<paste the JSON Resume file this app exported>

Here is the job description:

<paste the posting>

Rewrite the résumé for this job without adding anything I have not done.

- Reorder the highlights inside each work entry so the ones closest to the posting come first. Drop one only if it is genuinely irrelevant here, and tell me which you dropped.
- Reword a highlight to use the posting's vocabulary only where my version already describes that same work. If the posting asks for something my history does not show, do not write a bullet for it — put it under "gaps" at the end instead.
- Rewrite basics.summary to point at this role: three sentences, and no adjective I could not defend in an interview.
- Reorder skills so the ones the posting names come first. Do not add a skill I have not listed.
- Leave every date, employer and job title exactly as it is.

Return the whole edited document as JSON Resume (field names: ${SCHEMA_DOC}), then a short plain-prose list of what you reordered, what you reworded, what you dropped, and the gaps.`,
    after: 'Import the JSON as a second résumé and keep the original — a tailored copy per application is the point, and the gaps list is worth reading before the interview.',
  },
  {
    id: 'bullets-with-numbers',
    title: 'Rewrite weak bullets into ones that name a number',
    when: 'Your bullets describe duties rather than results, and you know it.',
    prompt: `Here are bullets from my résumé, one per line:

<paste your bullets>

First, do not rewrite them yet. For each bullet, ask me the one question whose answer would turn it into a measurement — how many, how much, how often, how long, compared with what, for whom. Ask, then stop and wait. Do not guess a figure; a number I cannot stand behind is worse than no number.

When I have answered, rewrite each bullet as: what I did, what changed because of it, and the figure that shows it. One sentence each, active voice, about twenty-five words at most. No "responsible for", no "helped to", no "successfully".

Where I could not give you a figure, say so and rewrite that bullet to name the scope or the outcome instead.

Return the finished bullets as a JSON array of strings, ready to drop into the highlights array of a JSON Resume entry.`,
    after: 'Paste the strings straight into the bullets of the right entry in the editor — pasting several lines at once makes one bullet per line.',
  },
  {
    id: 'write-a-summary',
    title: 'Write the summary at the top',
    when: 'The three lines under your name are the hardest three lines on the page, and you have rewritten them five times.',
    prompt: `Here is my résumé as a JSON Resume document:

<paste the JSON Resume file this app exported>

If I am aiming at a particular job, here is the posting; if this line is still here, I am not:

<paste the posting, or delete this line>

Write me three different versions of basics.summary. Three sentences each. Never the word "I". Built only from what the résumé already shows.

- The first leads with what I do and how long I have done it.
- The second leads with the single strongest thing in the résumé.
- The third leads with where I am going — but only if the résumé makes that legible. If it does not, say so instead of inventing an ambition for me.

Under each version, name the entries in the résumé it rests on, so I can check it. If a version would need a claim the résumé does not support, do not write it: tell me what I would have to add first.`,
    after: 'Paste the one you believe into the summary field under your name. If none of the three is true, that is the useful answer.',
  },
  {
    id: 'first-resume',
    title: 'Draft a first résumé from a job title',
    when: 'You are starting out, the page is blank, and everything you have feels too thin to write down.',
    prompt: `I am starting out and I do not have a résumé yet.

The job I want: <job title>, in <field, and the country I am applying in>.
What I actually have: <a course, a part-time job, a project, a club, a certificate — list it however thin it looks>.

Build me a JSON Resume document from what I just gave you and nothing else. The field names are at ${SCHEMA_DOC}. You may not invent an internship, an employer, a grade, a date or a skill. Where a section would be empty, leave it empty.

Then, separately from the JSON, do the part that actually helps:
- Tell me which sections a <job title> résumé is read for, in the order a reader looks at them.
- For each thing I listed, ask me the two or three questions that would turn it into a bullet worth reading.
- Name what is genuinely missing — the kind of evidence this role expects and I do not yet have — and for each, one realistic way to get it in the next few months.

I would rather have a short honest résumé and a list of what to do next than a full page of things I did not do.`,
    after: 'Import the JSON, then work through the questions it asked you and put your own answers in. A short résumé that is true is a résumé you can talk about.',
  },
  {
    id: 'read-it-back',
    title: 'Read my résumé back to me the way a hiring manager would',
    when: 'You have stared at it too long to see it, and you want to know what it says before someone else decides what it says.',
    prompt: `Here is my résumé as a JSON Resume document:

<paste the JSON Resume file this app exported>

I am applying for: <the role>.

Do not rewrite it. Read it the way a hiring manager for that role would, in the thirty seconds they will actually give it, and tell me:

- What they learn about me from the first six lines.
- Which three entries carry the most weight, and which ones take up space without paying for it.
- Every place I have described a duty rather than a result.
- The questions they would be left with — the things the résumé makes them wonder and does not answer.

Then ask me those questions, one at a time, and wait for my answers. When we are through them, turn my answers into the bullets they belong in, in my own wording, using only what I told you.`,
    after: 'This one changes nothing on its own. Take the bullets it ends with back into the editor, then run the ATS panel to see what a parser makes of the result.',
  },
]

export function promptsPageMeta(): PageMeta {
  return {
    path: '/prompts',
    title: `${PROMPTS.length} Résumé Prompts for AI Assistants — Free · CVAurum`,
    description: trimToWords(PROMPTS_INTRO),
    image: '/og.png',
  }
}

/** The HTML a crawler reads: every prompt in full, because the prompts ARE
 *  the page's content — a list of titles would be nothing to rank and
 *  nothing for an assistant to quote.
 *
 *  Same shape as the page a person gets: the one-line loop, the six titles as
 *  a list, then the six prompts. The page opens one prompt at a time but
 *  renders all six into the DOM, so this is not a second, fuller document —
 *  it is the same one, unfolded. */
export function promptsStaticHtml(): string {
  const index = PROMPTS.map((p) => `      <li><a href="#${p.id}">${htmlEscape(p.title)}</a></li>`).join('\n')
  const blocks = PROMPTS.map(
    (p) => `    <section id="${p.id}">
      <h2>${htmlEscape(p.title)}</h2>
      <p>${htmlEscape(p.when)}</p>
      <pre>${htmlEscape(p.prompt)}</pre>
      <p>What to do with the answer: ${htmlEscape(p.after)}</p>
    </section>`
  ).join('\n')
  return `<main class="seo-static">
    <p><a href="/">CVAurum</a> › Résumé prompts</p>
    <h1>${PROMPTS.length} résumé prompts for an AI assistant</h1>
    <p>${htmlEscape(PROMPTS_INTRO)}</p>
    <ol>
${index}
    </ol>
${blocks}
    <p>${htmlEscape(PROMPTS_SCHEMA_NOTE)} The field names are at <a href="/skills/cvaurum/SKILL.md">/skills/cvaurum/SKILL.md</a>, generated from the schemas the importer validates against, so they cannot drift from the code.</p>
    <p><a href="/app">Import an answer and start editing</a> · <a href="/templates">Browse the ${TEMPLATES.length} résumé templates</a> · <a href="/examples">Read ${SAMPLE_COUNT} complete examples</a></p>
  </main>`
}

export function promptsMarkdown(): string {
  const index = PROMPTS.map((p, i) => `${i + 1}. ${p.title}`).join('\n')
  const blocks = PROMPTS.map(
    (p) => `## ${p.title}

${p.when}

\`\`\`
${p.prompt}
\`\`\`

What to do with the answer: ${p.after}`
  ).join('\n\n')
  return `# ${PROMPTS.length} résumé prompts for an AI assistant

${PROMPTS_INTRO}

${index}

${PROMPTS_SCHEMA_NOTE} The field names are at ${SCHEMA_DOC}, generated from the schemas the importer validates against.

${blocks}

Import an answer: ${SITE}/app · About CVAurum: ${SITE}/llms.txt
`
}

/**
 * One <url>, with the pictures that page carries.
 *
 * `images` is a plain list of absolute URLs, not a list of designs: the
 * library's pages have pictures too and could not be expressed at all while
 * this took TemplateConfig. Only <image:loc> is emitted — Google has removed
 * image:title, image:caption, image:geo_location and image:license from the
 * sitemap image documentation, and an ignored tag is only bytes to parse.
 */
function urlEntry(loc: string, lastmod: string, changefreq: string, priority: string, images: readonly string[] = []): string {
  const imgs = images
    .map(
      (src) => `
    <image:image>
      <image:loc>${src}</image:loc>
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

/* ------------------------------------------------------------- lastmod
 * A <lastmod> that reads as "today" on every deploy is a <lastmod> a crawler
 * learns to ignore: it says the page changed when only the build did. So the
 * date is not read from the clock here. src/data/lastmod.json holds, per
 * public URL, a hash of the sources that page is made from and the day that
 * hash last changed; scripts/make-lastmod.cjs updates it, and
 * src/data/lastmod.test.ts fails the suite if a source moved without the
 * script being run. See docs/SEO.md.
 */

export interface LastmodEntry {
  /** Hash of the sources the page is built from — see src/lib/lastmodHash.ts. */
  hash: string
  /** YYYY-MM-DD: the day that hash last changed. */
  lastmod: string
}

const LASTMOD_MAP = LASTMOD as Record<string, LastmodEntry>

/** Every public URL as a site-root-relative path, in sitemap order. The one
 *  list the sitemap, the lastmod file and the IndexNow submission all walk. */
export function publicUrlPaths(): string[] {
  return [
    '/',
    '/templates',
    ...ORDERED.map((t) => `/templates/${t.id}`),
    '/examples',
    ...librarySlugs().map((slug) => `/examples/${slug}`),
    '/prompts',
  ]
}

/** The same list as absolute URLs — what IndexNow and a sitemap want. */
export function publicUrls(): string[] {
  return publicUrlPaths().map((p) => `${SITE}${p}`)
}

/** What the file records for one page, or null if it has no entry yet. */
export function lastmodEntry(path: string): LastmodEntry | null {
  return LASTMOD_MAP[path] ?? null
}

/**
 * The day this page's sources last changed. `fallback` is used only for a URL
 * the file has no entry for — a page added since the script was last run,
 * which the test catches before it can ship.
 */
export function lastmodFor(path: string, fallback: string): string {
  return LASTMOD_MAP[path]?.lastmod ?? fallback
}

/**
 * Every public URL the site has: the landing page, the gallery, and one entry
 * per design. `today` is passed in (rather than read from the clock) so the
 * function stays pure and the file it writes is reproducible; it is now only
 * the fallback for a URL with no recorded lastmod.
 */
export function sitemapXml(today: string): string {
  // Absolute URLs, computed once: a collection page declares every picture it
  // lists, a single page declares its own.
  const designs = ORDERED.map((t) => `${SITE}${templatePageImage(t.id)}`)
  const slugs = librarySlugs()
  const samples = slugs.map((slug) => `${SITE}${samplePageImage(slug)}`)
  const mod = (path: string) => lastmodFor(path, today)
  const entries = [
    urlEntry(`${SITE}/`, mod('/'), 'weekly', '1.0'),
    urlEntry(`${SITE}/templates`, mod('/templates'), 'weekly', '0.8', designs),
    ...ORDERED.map((t, i) => urlEntry(`${SITE}/templates/${t.id}`, mod(`/templates/${t.id}`), 'monthly', '0.6', [designs[i]])),
    urlEntry(`${SITE}/examples`, mod('/examples'), 'weekly', '0.8', samples),
    ...slugs.map((slug, i) => urlEntry(`${SITE}/examples/${slug}`, mod(`/examples/${slug}`), 'monthly', '0.6', [samples[i]])),
    // A collection too, of prompts rather than designs; it carries no picture
    // of its own, so it declares none.
    urlEntry(`${SITE}/prompts`, mod('/prompts'), 'weekly', '0.8'),
  ]
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <!--
    The landing page, the template gallery and one page per design, then the
    example library and one page per sample. /app,
    /tracker, /resume/:id and /print/:id are private, account-free shells with
    no shareable content and are deliberately excluded (and Disallowed in
    robots.txt). Generated — see src/lib/seoPages.ts and the SEO plugin in
    vite.config.ts; edit those, not this file.

    Each <lastmod> is the day THAT page's sources last changed, recorded in
    src/data/lastmod.json by scripts/make-lastmod.cjs — not the day of the
    build. A date that moved is a page that moved.
  -->
${entries.join('\n')}
</urlset>
`
}

/**
 * The structured data one template page carries: the trail back up, and which
 * picture is the page's own. Data, never script.
 *
 * One @graph rather than two blocks, because the build and the live page write
 * a single <script type="application/ld+json"> between them; primaryImageOfPage
 * is how Google documents naming the image it should prefer for a page, which
 * matters here because the page also lists every other design.
 */
export function breadcrumbJsonLd(id: string): string {
  const tpl = must(id)
  const url = `${SITE}/templates/${tpl.id}`
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': url,
        url,
        name: `${tpl.name} résumé template`,
        primaryImageOfPage: {
          '@type': 'ImageObject',
          contentUrl: `${SITE}${templatePageImage(tpl.id)}`,
          width: PAGE_IMAGE_WIDTH,
          height: templatePageImageHeight(tpl.id),
          caption: imageAlt(tpl),
        },
      },
      breadcrumbList([
        { name: 'Home', path: '/' },
        { name: 'Résumé templates', path: '/templates' },
        { name: `${tpl.name} résumé template`, path: `/templates/${tpl.id}` },
      ]),
    ],
  })
}

/**
 * A crumb trail as schema.org writes one. Every public page gets the same
 * shape, so a results page can show the path to it rather than a bare URL.
 */
export function breadcrumbList(trail: readonly { name: string; path: string }[]): Record<string, unknown> {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((step, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: step.name,
      item: `${SITE}${step.path}`,
    })),
  }
}

/**
 * The gallery's own structured data.
 *
 * It had none: every design page declared its trail and its picture while the
 * page that lists all 68 declared nothing at all, so the collection was 68
 * unrelated documents to a results page. This says what the page is (a
 * collection), how to walk back up, and — as an ItemList, the way the example
 * shelf already does it — what is on it and which picture stands for each.
 */
export function galleryJsonLd(): string {
  const url = `${SITE}/templates`
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': url,
        url,
        name: `${TEMPLATES.length} résumé templates`,
        description: trimToWords(GALLERY_INTRO),
        isPartOf: { '@type': 'WebSite', '@id': `${SITE}/`, url: `${SITE}/`, name: 'CVAurum' },
      },
      breadcrumbList([
        { name: 'Home', path: '/' },
        { name: 'Résumé templates', path: '/templates' },
      ]),
      {
        '@type': 'ItemList',
        name: 'Résumé templates',
        numberOfItems: ORDERED.length,
        itemListElement: ORDERED.map((t, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: `${t.name} résumé template`,
          url: `${SITE}/templates/${t.id}`,
          image: `${SITE}${templatePageImage(t.id)}`,
        })),
      },
    ],
  })
}

/** The prompt library's, for the same reason: a collection of six documents
 *  that said nothing about itself. No picture — the page carries none. */
export function promptsJsonLd(): string {
  const url = `${SITE}/prompts`
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': url,
        url,
        name: `${PROMPTS.length} résumé prompts for an AI assistant`,
        description: trimToWords(PROMPTS_INTRO),
        isPartOf: { '@type': 'WebSite', '@id': `${SITE}/`, url: `${SITE}/`, name: 'CVAurum' },
      },
      breadcrumbList([
        { name: 'Home', path: '/' },
        { name: 'Résumé prompts', path: '/prompts' },
      ]),
      {
        '@type': 'ItemList',
        name: 'Résumé prompts',
        numberOfItems: PROMPTS.length,
        itemListElement: PROMPTS.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: p.title,
          url: `${url}#${p.id}`,
        })),
      },
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
  const textLayer = COPY.textLayer.map((t) => `        <li>${esc(t)}</li>`).join('\n')
  const faq = COPY.faq.map((f) => `        <dt>${esc(f.q)}</dt>\n        <dd>${esc(f.a)}</dd>`).join('\n')
  const signature = SIGNATURE_IDS.map((id) => {
    const t = must(id)
    return `        <li><a href="/templates/${t.id}">${esc(t.name)}</a>: ${esc(SIGNATURE_STRUCTURE[id] ?? t.description)}</li>`
  }).join('\n')
  return `<main class="seo-static">
    <h1>${esc(COPY.hero)}</h1>
    <p>${esc(COPY.oneLiner)}</p>
    <p><a href="${COPY.links.app}">Create a résumé</a> · <a href="${COPY.links.gallery}">Browse the ${TEMPLATES.length} templates</a> · <a href="/examples">Read ${SAMPLE_COUNT} résumé examples</a> · <a href="/prompts">${PROMPTS.length} prompts for an AI assistant</a> · <a href="${COPY.links.repo}">Source on GitHub</a></p>
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
    <h2>What reaches the exported file's text layer</h2>
    <p>Whether numbered headings, bullet glyphs and decorative marks break a résumé parser is the question people ask about a design that looks designed. Each line is the output of a gate in the repository, run against the real exporter:</p>
    <ul>
${textLayer}
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
    <h2>Examples</h2>
    <p>${SAMPLE_COUNT} complete résumés for named jobs, each written out in full on its own page and filterable by field, career stage and the country it is written for — <a href="/examples">read the ${SAMPLE_COUNT} résumé examples</a>. Every person, employer, address and figure in them is invented.</p>
    <h2>Prompts</h2>
    <p>${PROMPTS.length} copy-ready prompts for whatever AI assistant you already use — <a href="/prompts">start from your own history instead of a blank page</a>. Each asks for JSON Resume, which this app imports, and none of them will invent experience you do not have.</p>
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

/** The measured answer to "does the decoration end up in the text a parser
 *  reads". Same array the landing page's questions and the static HTML use. */
function textLayerBlock(): string {
  return COPY.textLayer.map((t) => `- ${t}`).join('\n')
}

function pagesBlock(): string {
  return [
    `- [Home](${SITE}/): what CVAurum is, how it compares with other résumé builders, the three steps, privacy, questions and answers.`,
    `- [Template gallery](${SITE}/templates): all ${TEMPLATES.length} designs rendered on the same example résumé, searchable and filterable by tag; each design has its own page.`,
    `- [Example library](${SITE}/examples): ${SAMPLE_COUNT} complete example résumés for named jobs, filterable by field, career stage and the country they are written for; each has its own page. Every person, employer, address and figure in them is invented.`,
    `- [Prompts](${SITE}/prompts): ${PROMPTS.length} copy-ready prompts for an AI assistant — notes into a résumé, tailoring to a posting, rewriting bullets to name a number, writing the summary, starting from nothing. Each asks for JSON Resume so the answer imports here, and none of them will invent experience.`,
    `- [The app](${SITE}/app): the résumé dashboard and the editor. Nothing to sign up for; the page is private to the visitor's browser and not indexed.`,
    `- [Questions and answers](${SITE}/#faq): privacy, the ATS check, file formats, archival PDF, phones, résumé length.`,
  ].join('\n')
}

function resourcesBlock(): string {
  return [
    `- [Sitemap](${SITE}/sitemap.xml): every public URL (the home page, the gallery and one page per design, the example library and one page per example), each naming the picture of the page it stands for — the whole résumé at 1200 px wide.`,
    `- [robots.txt](${SITE}/robots.txt): the public pages are open to crawlers and machine readers by name; the private routes are not.`,
    `- [llms-full.txt](${SITE}/llms-full.txt): the long form of this file.`,
    `- Markdown twins: every public page has one beside it, at ${SITE}/index.md, ${SITE}/templates.md, ${SITE}/templates/<id>.md, ${SITE}/examples.md, ${SITE}/examples/<slug>.md and ${SITE}/prompts.md, linked from the page as its text/markdown alternate.`,
    `- [API catalog](${SITE}/.well-known/api-catalog) (RFC 9727): says plainly that there is no HTTP API; the site itself is the service.`,
    `- [Skills index](${SITE}/.well-known/agent-skills/index.json) and [SKILL.md](${SCHEMA_DOC}): how an assistant can help a person use CVAurum, the full field list of the document it should produce (generated from the schemas the importer validates against), and the in-page WebMCP tools it can call.`,
    `- [auth.md](${SITE}/auth.md): there are no accounts, keys or registration, for people or for agents.`,
    `- [Source repository](${COPY.links.repo}): the whole application, MIT licensed; issues and contributions go there.`,
    `- [JSON Resume schema](https://jsonresume.org/schema): the open format CVAurum imports and exports.`,
  ].join('\n')
}

/** Every public URL, in sitemap order: home, gallery, then each design. */
export function siteUrls(): string[] {
  return [
    `${SITE}/`,
    `${SITE}/templates`,
    ...ORDERED.map((t) => `${SITE}/templates/${t.id}`),
    // The library's shelf, not each of its pages: this block is read whole by
    // an assistant, and a hundred more lines of example URLs would crowd out
    // everything the file is for. The sitemap and examples.md carry them all.
    `${SITE}/examples`,
    `${SITE}/prompts`,
  ]
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

## What reaches the exported file's text layer

People ask whether numbered section headings, bullet glyphs and decorative marks break a résumé parser. For this product the answer is measured, by gates in the repository that run the real exporter, and it is this:

${textLayerBlock()}

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

## What reaches the exported file's text layer

Whether a design's decoration ends up in the text a parser reads is the question people actually ask about a résumé that looks designed. Each line below is the output of a gate in the repository, run against the real exporter and re-runnable:

${textLayerBlock()}

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

CVAurum installs as a web app (Add to Home Screen or Install) on desktop and mobile. A service worker saves the app itself, its Latin fonts and the PDF colour profile on the device at install, so editing works with no connection from the first visit; the font files an export embeds are saved quietly while a résumé is open and online, so that résumé exports with no connection too. Scripts beyond Latin, the design previews and the optional matching model are saved the first time they are used. So it works with no connection at all, including PDF export.

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
