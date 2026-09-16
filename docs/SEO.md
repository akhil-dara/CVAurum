# SEO — what is generated, and how to keep it honest

CVAurum is a single-page app. To anything that does not run JavaScript, every
URL would otherwise be the same `index.html` with the same title, the same
description and the same canonical link — 180 addresses and one page. So the
build stamps out a real file per public URL, each with its own head, its own
block of readable HTML and its own structured data, and records per URL the day
that page's sources last changed.

Nothing here is a plugin or a service. It is `src/lib/seoPages.ts`,
`src/lib/seoLibrary.ts` and the `cvaurum-seo-pages` plugin in `vite.config.ts`,
which run at `npx vite build` and write into `dist/`.

---

## 1. What a build writes

`dist/` is generated and git-ignored. After `npx vite build` it holds:

| What | Where | Count |
| --- | --- | --- |
| Landing page | `index.html` | 1 |
| Template gallery | `templates.html` | 1 |
| One page per design | `templates/<id>.html` | 68 |
| Example library | `examples.html` | 1 |
| One page per example | `examples/<slug>.html` | 108 |
| Prompt library | `prompts.html` | 1 |
| Markdown twin of each of the above | `index.md`, `templates.md`, `templates/<id>.md`, `examples.md`, `examples/<slug>.md`, `prompts.md` | 180 |
| Sitemap | `sitemap.xml` | 180 `<url>` entries |
| Crawl rules | `robots.txt` (copied from `public/`) | 1 |
| Machine-reader description | `llms.txt`, `llms-full.txt` | 2 |
| Agent discovery | `.well-known/api-catalog`, `.well-known/agent-skills/index.json`, `skills/cvaurum/SKILL.md`, `auth.md` | 4 |
| Private shells (`noindex`) | `app.html`, `tracker.html`, `r.html`, `shell.html`, `404.html` | 5 |

Each page is written as a **file**, never a folder with an `index.html` inside:
the host answers `/templates/atlas` for a folder with a 307 to
`/templates/atlas/`, which would make every URL in the sitemap a redirect.

`dist/_headers` and `dist/_redirects` are copied verbatim from `public/`.
`_redirects` sends `/resume/*` and `/print/*` to the plain shell so the landing
copy never flashes inside the app.

### What every pre-rendered page carries

- `<title>`, `<meta name="description">` (never longer than 155 characters —
  `DESC_MAX` in `seoPages.ts`, cut on a word boundary), `<link rel="canonical">`
  pointing at its own absolute URL, `og:*` and `twitter:*` for that page, and a
  `<link rel="alternate" type="text/markdown">` to its twin.
- `og:image` is always a `.jpg` or `.png` share card, never the WebP page
  picture: the large link-preview readers document JPG/PNG/GIF between them and
  one has been measured failing on WebP.
- Real HTML inside `<div id="root">`. React's `createRoot` empties it the
  instant the app boots, so a reader never sees it and a crawler that renders
  the page sees the live one.
- A `<script type="application/ld+json" id="ld-breadcrumb">` block:

  | Page | `@graph` |
  | --- | --- |
  | Landing | `SoftwareApplication`, `WebSite`, `FAQPage` (from `index.html`) |
  | `/templates` | `CollectionPage`, `BreadcrumbList`, `ItemList` of 68 designs |
  | `/templates/<id>` | `WebPage` with `primaryImageOfPage`, `BreadcrumbList` |
  | `/examples` | `CollectionPage`, `BreadcrumbList`, `ItemList` of 108 examples |
  | `/examples/<slug>` | `WebPage` with `primaryImageOfPage`, `BreadcrumbList` |
  | `/prompts` | `CollectionPage`, `BreadcrumbList`, `ItemList` of the prompts |

  `primaryImageOfPage` always names the page's **own** 1200px page picture
  (`/img/templates/<id>.webp`, `/img/examples/<slug>.webp`), which matters
  because those pages also list every other design or a hundred other résumés.

### The crawl path without JavaScript

A crawler that runs no scripts walks `<a href>` and nothing else, so every page
is reachable that way and the collections reach each other:

- the landing page links `/templates`, `/examples`, `/prompts` and `/app`;
- `/templates` links all 68 designs, plus `/`, `/examples`, `/prompts`;
- `/examples` links all 108 examples, plus `/`, `/templates`, `/prompts`;
- a design page links up to `/templates`, across to `/examples`, and sideways
  to every other design;
- an example page links up to `/examples` and `/templates`, across to the
  design it is set in, and sideways to eight near neighbours.

`src/lib/seoPages.test.ts` and `src/lib/seoLibrary.test.ts` assert every one of
these, so a rewritten block cannot quietly orphan a collection.

---

## 2. `lastmod` — the rule

**A `<lastmod>` is the day that page's sources last changed. Never the day of
the build.**

Every URL used to be stamped with the build date, so a deploy that changed one
sample told every crawler that all 180 pages had changed. A field that always
moves is a field that gets ignored, which costs exactly the signal it was there
to give.

`src/data/lastmod.json` records, per public URL:

```json
"/examples/data-analyst": { "hash": "b3f0…", "lastmod": "2026-09-16" }
```

`hash` is 16 hex characters of SHA-256 over **what that page is made from**
(`src/lib/lastmodHash.ts`):

| URL | Hashed from |
| --- | --- |
| `/` | the design count, the example count, the prompt count, `src/data/siteCopy.ts`, and `index.html` (the landing page's own head — every other page's head is rewritten at build time) |
| `/templates` | how many designs there are, and which |
| `/templates/<id>` | the design's registry entry, and `src/templates/templates.css` |
| `/examples` | how many samples there are, and which |
| `/examples/<slug>` | the sample's own source file, and the registry entry of the design it is shown in |
| `/prompts` | the prompts themselves |

`templates.css` is hashed whole, because it is not split per design — so a
stylesheet edit dates all 68 design pages at once. That is a deliberate
over-approximation: it over-reports a CSS change and never under-reports
anything, which is the safe direction, and it is still nothing like "every page
on every deploy".

Files are read with `\r\n` normalised to `\n`, so a Windows checkout and a Linux
one produce the same hash.

### Running it

```sh
npm run lastmod                       # new and changed pages take today (UTC)
npm run lastmod -- --date=2026-09-16  # …take this date instead
LASTMOD_DATE=2026-09-16 npm run lastmod
npm run lastmod:check                 # write nothing; exit 1 if the file is stale
```

The date is an argument rather than a call to the clock so a run is
reproducible: the same repository and the same `--date` write the same file
byte for byte. An entry whose hash still matches **keeps the date it already
had** — that is the whole mechanism. A URL that no longer exists is dropped.

Run it whenever a design, a sample, the landing copy or a prompt changes, then
commit `src/data/lastmod.json` with that change.

It is deliberately **not** wired into `npm run build`: a build would then read
the clock and rewrite a tracked file as a side effect, and a build on a machine
with a wrong date would write a wrong date. The guard below is what makes
forgetting impossible instead.

### The guard

`src/data/lastmod.test.ts` recomputes every hash from the current sources and
fails the suite if one no longer matches, naming the URL. So a content change
that ships without `npm run lastmod` fails `npm test` first. Measured: adding
one comment line to one sample file fails exactly one entry
(`/examples/data-analyst`) and no others.

The same test also asserts that every public URL has an entry, that the file is
in sitemap order, that no recorded date is in the future, and that
`sitemapXml()` reads the file rather than its `today` argument — the argument
survives only as the fallback for a URL with no entry yet.

---

## 3. IndexNow

A sitemap is a standing invitation: an engine re-reads it when it chooses to.
IndexNow (the open protocol at indexnow.org) is the other direction — one POST
naming the URLs that moved, which the participating engines share between
themselves, so a single submission reaches all of them. There is no account and
no registration. Ownership is proved by serving a file named after a key, at the
root of the site, whose contents are that key.

- **The key** is `public/<key>.txt` — a 32-character hex name, and the file
  holds exactly that string with no trailing newline. It is committed on
  purpose: it is not a credential, it proves only that whoever holds it can
  publish at the site root.
- **The body** is built by `src/lib/indexNow.ts` (pure, no network) and
  unit-tested by `src/lib/indexNow.test.ts`:

  ```json
  {
    "host": "cvaurum.com",
    "key": "<32 hex>",
    "keyLocation": "https://cvaurum.com/<32 hex>.txt",
    "urlList": ["https://cvaurum.com/", "https://cvaurum.com/templates", "…"]
  }
  ```

- **The call** is `scripts/indexnow.cjs`, the only part that speaks HTTP.

```sh
npm run indexnow:dry              # print the body, call nothing
npm run indexnow                  # submit every public URL
npm run postdeploy                # submit only what changed in the last 7 days
node scripts/indexnow.cjs --days=30
node scripts/indexnow.cjs --days=7 --date=2026-09-16
```

`--days=N` filters on the recorded `lastmod`, which is why §2 has to be honest:
a deploy that changed nothing then submits nothing, instead of asking every
engine to re-crawl 180 unchanged pages.

**Run it after the deploy is live, not before.** The endpoint fetches the key
file and then the URLs themselves; submitting a page the host has not published
yet only asks an engine to re-read the old one.

`npm run postdeploy` is a plain script (there is no `deploy` script for npm to
hook), so it is run by hand or by whatever job publishes the site — after the
upload step, e.g.:

```sh
npx vite build && <publish dist/> && npm run postdeploy
```

Status codes are printed with what they mean: `403` means the key file was not
reachable at `keyLocation`, `422` means a URL did not belong to the host.

---

## 4. Auditing a build

```sh
npx vite build
node _local/seo-audit.cjs
```

It counts rather than eyeballs: `<url>` and `<loc>` entries and whether each one
resolves to a file in `dist/`, title and description lengths per kind of page,
canonical presence and exactness, which `@type`s the JSON-LD carries, whether
`primaryImageOfPage` names the page's own picture, how many design and example
pages are reachable by plain `<a href>` from their hub, and whether every `<img>`
carries width, height and alt.

---

## 5. The manual steps — only the site owner can do these

Everything above is in the repository. These are not, and nothing in a build can
do them for you:

1. **Verify the domain** in each search engine's webmaster/site-owner console.
   The usual proofs are a DNS TXT record or an HTML file at the site root; DNS
   is the more durable of the two because it survives a redeploy.
2. **Submit the sitemap URL** — `https://cvaurum.com/sitemap.xml` — in each of
   those consoles. `robots.txt` already names it, but an explicit submission is
   what starts the first crawl rather than waiting to be discovered.
3. **Request indexing of the hubs** (`/`, `/templates`, `/examples`,
   `/prompts`) by hand, once, on the first deploy. The 176 pages below them are
   reached from the hubs and from the sitemap; the hubs are the ones worth
   spending a manual request on.
4. **Check the first crawl** a few days later: how many URLs are indexed against
   the 180 submitted, and what was excluded and why. A page excluded as a
   duplicate is usually a canonical problem, which §1 is what fixes.
5. **Re-check after a domain change.** The host is written in `index.html`,
   `public/robots.txt`, `src/data/siteCopy.ts` and `src/lib/seoPages.ts`
   (`SITE`); all four have to move together, and the IndexNow key file has to be
   served from the new root before a submission will be accepted.
6. **Keep the key file.** If `public/<key>.txt` is ever removed or renamed,
   every IndexNow submission starts answering `403` until a new key is generated
   and published.
