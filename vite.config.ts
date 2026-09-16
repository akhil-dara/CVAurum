import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'
import type * as SeoPages from './src/lib/seoPages'

const OUT = path.resolve(__dirname, 'dist')
const SRC = path.resolve(__dirname, 'src')

/**
 * The web-font files that carry a script other than Latin (Cyrillic, Greek,
 * Vietnamese; see scripts/fetch-fonts.cjs). The browser fetches one only
 * when a page's text needs it, so they stay OUT of the install-time
 * precache (which would otherwise grow by about 2.4 MB for every visitor)
 * and are cached on first use instead (runtimeCaching below). Read off the
 * generated stylesheet, whose comments name each block's subset.
 */
function nonLatinFontFiles(): string[] {
  const css = fs.readFileSync(path.join(SRC, 'styles', 'fonts.css'), 'utf8')
  const files: string[] = []
  const re = /\/\*\s*[^*]*?\s(latin-ext|latin|cyrillic-ext|cyrillic|greek-ext|greek|vietnamese)\s*\*\/\s*@font-face\s*\{[^}]*?url\(\/fonts\/([^)]+)\)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(css))) if (m[1] !== 'latin' && m[1] !== 'latin-ext') files.push(`fonts/${m[2]}`)
  return [...new Set(files)]
}

/**
 * Load src/lib/seoPages.ts into this Node process.
 *
 * It cannot simply be imported at the top of this file: Vite bundles its own
 * config with esbuild and externalises every bare specifier, so the '@/…'
 * aliases inside the module (and inside the registry it reads) arrive at Node
 * as missing packages. Compiling it here — with the alias spelled out — is what
 * lets the build step and the app share one definition of every page's title,
 * description and crawler HTML instead of keeping two copies in step by hand.
 */
async function loadSeoPages(): Promise<typeof SeoPages> {
  const { build } = await import('esbuild')
  const out = await build({
    entryPoints: [path.join(SRC, 'lib', 'seoPages.ts')],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
    target: 'node18',
    // The one thing esbuild cannot work out on its own here.
    alias: { '@': SRC },
    logLevel: 'silent',
  })
  const dir = path.resolve(__dirname, 'node_modules', '.cvaurum')
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, 'seoPages.mjs')
  fs.writeFileSync(file, out.outputFiles[0].text)
  // Cache-busted so a rebuild in the same process picks up an edited module.
  return import(`${pathToFileURL(file).href}?v=${Date.now()}`) as Promise<typeof SeoPages>
}

/** Replace the content= of one meta tag, whichever attribute names it. */
function setMeta(html: string, key: 'name' | 'property', tag: string, content: string): string {
  const re = new RegExp(`(<meta\\s+${key}="${tag}"\\s+content=")[^"]*(")`)
  return html.replace(re, `$1${content.replace(/\$/g, '$$$$')}$2`)
}

function setAttr(html: string, pattern: RegExp, value: string): string {
  return html.replace(pattern, `$1${value.replace(/\$/g, '$$$$')}$2`)
}

/**
 * Rewrite the head of the built index.html so it describes ONE page, and drop
 * a block of real HTML inside #root so the page says something before a line
 * of JavaScript runs. React's createRoot empties #root on boot, so a reader
 * never sees the block and a crawler that renders the app sees the live page.
 */
function pageHtml(shell: string, site: string, meta: SeoPages.PageMeta, body: string, jsonLd?: string): string {
  const url = `${site}${meta.path}`
  const image = `${site}${meta.image}`
  let html = shell
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${meta.title}</title>`)
  html = setMeta(html, 'name', 'description', meta.description)
  html = setMeta(html, 'property', 'og:title', meta.title)
  html = setMeta(html, 'property', 'og:description', meta.description)
  html = setMeta(html, 'property', 'og:url', url)
  html = setMeta(html, 'property', 'og:image', image)
  html = setMeta(html, 'property', 'og:image:secure_url', image)
  // Only ever .jpg or .png reaches here, and it has to stay that way: og:image
  // is JPEG on purpose. The page images are lossless WebP (under half the bytes
  // of JPEG q82 for a full résumé page, and bit-exact), but the share-card
  // consumers do not take it: between them the big link-preview readers
  // document JPG, PNG and GIF, and one has been measured failing on WebP. A
  // .webp here would also be announced as image/png, which is worse than the
  // wrong format: it is a lie about it.
  html = setMeta(html, 'property', 'og:image:type', image.endsWith('.jpg') ? 'image/jpeg' : 'image/png')
  html = setMeta(html, 'property', 'og:image:alt', meta.title)
  html = setMeta(html, 'name', 'twitter:title', meta.title)
  html = setMeta(html, 'name', 'twitter:description', meta.description)
  html = setMeta(html, 'name', 'twitter:image', image)
  html = setMeta(html, 'name', 'twitter:image:alt', meta.title)
  html = setAttr(html, /(<link rel="canonical" href=")[^"]*(")/, url)
  // The page's Markdown twin, for a reader that prefers it.
  html = html.replace(/\s*<link rel="alternate" type="text\/markdown"[^>]*>/, '')
  html = html.replace(/<link rel="canonical"[^>]*>/, (m) => `${m}\n    <link rel="alternate" type="text/markdown" href="${site}${meta.path === '/' ? '/index' : meta.path}.md" />`)
  html = setAttr(html, /(<link rel="alternate" hreflang="en" href=")[^"]*(")/, url)
  html = setAttr(html, /(<link rel="alternate" hreflang="x-default" href=")[^"]*(")/, url)
  if (jsonLd) {
    html = html.replace(
      '</head>',
      // id: the live page's own breadcrumb effect reuses this block instead
      // of appending a second BreadcrumbList beside it.
      `  <script type="application/ld+json" id="ld-breadcrumb">\n    ${jsonLd}\n    </script>\n  </head>`
    )
  }
  // The FAQ rich result describes the homepage's visible FAQ. Repeating it on
  // 59 pages that do not carry that FAQ is structured data about content the
  // page does not have, which is exactly what a rich-result check flags.
  html = html.replace(/\s*<!-- FAQ rich result[^>]*-->\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/, '')
  // Same reason for the no-script fallback: it is the landing page's pitch,
  // heading and all, and it would put a second <h1> — the same second <h1> —
  // on every page in the set. Each page now carries its own copy in #root.
  // Anchored on the <main> inside it, NOT on the first <noscript> in the file:
  // the head carries a one-line <noscript><style> that hides the boot splash
  // when scripts are off, and a looser pattern ate that instead, leaving every
  // generated page with the splash over its content and the landing pitch
  // underneath.
  html = html.replace(
    /<noscript>\s*<main[\s\S]*?<\/noscript>/,
    `<noscript><p style="max-width:760px;margin:0 auto;padding:24px 20px;font-family:system-ui,sans-serif">CVAurum needs JavaScript to edit and export a résumé. <a href="/">About CVAurum</a> · <a href="/templates">All templates</a></p></noscript>`
  )
  // The shell ships #root empty; fill it for whoever does not run scripts.
  return html.replace(/(<div id="root"[^>]*>)(<\/div>)/, `$1\n${body}\n    $2`)
}

/**
 * After the bundle is written, stamp out one static file per public page.
 *
 * The site is a single-page app served from one index.html, so /templates/<id>
 * and / were byte-identical to anything that does not run JavaScript — same
 * title, same description, same canonical URL. A crawler had no reason to
 * index 58 designs separately and no words to rank them by. This writes the
 * page a crawler is actually served: dist/templates/index.html and
 * dist/templates/<id>/index.html, each with its own head and a block of real
 * HTML in #root. Node only — nothing here launches a browser.
 */
function seoPages(): Plugin {
  return {
    name: 'cvaurum-seo-pages',
    apply: 'build',
    async closeBundle() {
      const seo = await loadSeoPages()
      const shell = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8')
      const written: string[] = []

      // One FILE per page (templates.html, templates/<id>.html), never a
      // folder with an index.html: the host answered /templates/atlas with a
      // 307 to /templates/atlas/ for a folder, so every URL in the sitemap
      // was a redirect (measured live 2026-09-12). A file is served at its
      // clean URL, and the slash form redirects back to it.
      const write = (file: string, html: string) => {
        const target = path.join(OUT, `${file}.html`)
        fs.mkdirSync(path.dirname(target), { recursive: true })
        fs.writeFileSync(target, html)
        written.push(`${file.replace(/\\/g, '/')}.html`)
      }
      const writeText = (file: string, text: string) => {
        const target = path.join(OUT, file)
        fs.mkdirSync(path.dirname(target), { recursive: true })
        fs.writeFileSync(target, text)
      }

      // The gallery declares itself too: what the page is, the trail back up
      // and an ItemList of the designs. It used to declare nothing at all
      // while every page inside it declared a breadcrumb and a picture.
      write('templates', pageHtml(shell, seo.SITE, seo.galleryPageMeta(), seo.galleryStaticHtml(), seo.galleryJsonLd()))
      const ids = seo.allTemplateIds()
      for (const id of ids) {
        write(
          path.join('templates', id),
          pageHtml(shell, seo.SITE, seo.templatePageMeta(id), seo.staticHtml(id), seo.breadcrumbJsonLd(id))
        )
      }

      // The example library: the shelf, then one page per sample. These carry
      // the most content of any page on the site - a whole resume in readable
      // HTML - which is the only reason a search for "data analyst resume
      // example" can land anywhere but the homepage.
      write('examples', pageHtml(shell, seo.SITE, seo.examplesPageMeta(), seo.examplesStaticHtml(), seo.examplesJsonLd()))
      write('prompts', pageHtml(shell, seo.SITE, seo.promptsPageMeta(), seo.promptsStaticHtml(), seo.promptsJsonLd()))
      const slugs = seo.orderedSampleSlugs()
      for (const slug of slugs) {
        write(
          path.join('examples', slug),
          pageHtml(shell, seo.SITE, seo.samplePageMeta(slug), seo.sampleStaticHtml(slug), seo.sampleBreadcrumbJsonLd(slug))
        )
      }

      // The app routes get content-free shells (their own title, noindex),
      // and public/_redirects sends /resume/* and /print/* to the plain
      // shell, so the landing block below never flashes inside the app.
      fs.writeFileSync(path.join(OUT, 'shell.html'), shell)
      write('app', seo.shellHtml(shell, 'Your Resumes · CVAurum'))
      write('tracker', seo.shellHtml(shell, 'Job Application Tracker · CVAurum'))
      write('r', seo.shellHtml(shell, 'Shared resume · CVAurum'))
      // Served by the host with a 404 status for any path that is not a
      // file above and not rewritten by _redirects; the app boots from it
      // and shows its not-found page, so a wrong address is a real 404 to a
      // crawler and a clear page to a person.
      fs.writeFileSync(path.join(OUT, '404.html'), seo.shellHtml(shell, 'Page not found · CVAurum'))

      // The landing page carries its content in its HTML, for a reader that
      // does not run scripts (an assistant asked to compare résumé builders
      // reads exactly this). React empties #root the moment the app boots.
      const rootRe = /(<div id="root"[^>]*>)(<\/div>)/
      if (!rootRe.test(shell)) throw new Error('seoPages: dist/index.html has no empty <div id="root"> to fill')
      fs.writeFileSync(path.join(OUT, 'index.html'), shell.replace(rootRe, `$1\n${seo.landingStaticHtml()}\n    $2`))

      fs.writeFileSync(path.join(OUT, 'llms.txt'), seo.llmsTxt())
      fs.writeFileSync(path.join(OUT, 'llms-full.txt'), seo.llmsFullTxt())

      // Markdown twins of the public pages (served for Accept: text/markdown
      // by the host for Accept: text/markdown, linked as alternates from each page).
      writeText('index.md', seo.landingMarkdown())
      writeText('templates.md', seo.galleryMarkdown())
      for (const id of ids) writeText(path.join('templates', `${id}.md`), seo.templateMarkdown(id))
      writeText('examples.md', seo.examplesMarkdown())
      writeText('prompts.md', seo.promptsMarkdown())
      for (const slug of slugs) writeText(path.join('examples', `${slug}.md`), seo.sampleMarkdown(slug))

      // Agent discovery, truthful for a site with no server: an API catalog
      // that points at the description, a skill file with its digest, and
      // an auth.md that says there is nothing to register.
      writeText(path.join('.well-known', 'api-catalog'), seo.apiCatalogJson())
      const skill = seo.skillMd()
      writeText(path.join('skills', 'cvaurum', 'SKILL.md'), skill)
      writeText(path.join('.well-known', 'agent-skills', 'index.json'), seo.agentSkillsIndex(createHash('sha256').update(skill).digest('hex')))
      writeText('auth.md', seo.authMd())

      // Only the fallback: each <lastmod> is the day THAT page's sources last
      // changed, recorded in src/data/lastmod.json (scripts/make-lastmod.cjs,
      // guarded by src/data/lastmod.test.ts). A sitemap that stamped the build
      // day on all 180 URLs told a crawler every page changed every deploy,
      // which is how the field stops being read.
      const today = new Date().toISOString().slice(0, 10)
      fs.writeFileSync(path.join(OUT, 'sitemap.xml'), seo.sitemapXml(today))
      const urls = seo.publicUrlPaths()
      const dates = new Set(urls.map((u) => seo.lastmodFor(u, today)))

      console.log(
        `\nSEO: wrote ${written.length} pre-rendered pages (dist/${written[0]} … dist/${written[written.length - 1]}) ` +
          `and dist/sitemap.xml with ${urls.length} URLs ` +
          `(${dates.size} distinct lastmod: ${[...dates].sort().join(', ')})`
      )
    },
  }
}

/**
 * The dev server's copy of what the build writes for machine readers, so
 * http://localhost:5199/llms.txt answers the same way https://cvaurum.com/llms.txt
 * does (without this the dev server fell through to the app shell and the
 * router's not-found page). The generated text is built once per server.
 */
function machineReadersDev(): Plugin {
  let seoPromise: Promise<typeof SeoPages> | null = null
  const files: Record<string, (seo: typeof SeoPages) => string> = {
    '/llms.txt': (seo) => seo.llmsTxt(),
    '/llms-full.txt': (seo) => seo.llmsFullTxt(),
    '/index.md': (seo) => seo.landingMarkdown(),
    '/templates.md': (seo) => seo.galleryMarkdown(),
    '/examples.md': (seo) => seo.examplesMarkdown(),
    '/prompts.md': (seo) => seo.promptsMarkdown(),
    '/auth.md': (seo) => seo.authMd(),
    '/.well-known/api-catalog': (seo) => seo.apiCatalogJson(),
    '/skills/cvaurum/SKILL.md': (seo) => seo.skillMd(),
    '/.well-known/agent-skills/index.json': (seo) => seo.agentSkillsIndex(createHash('sha256').update(seo.skillMd()).digest('hex')),
  }
  return {
    name: 'cvaurum-machine-readers-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url || '').split('?')[0]
        const make = files[url]
        if (!make) return next()
        seoPromise ??= loadSeoPages()
        seoPromise.then(
          (seo) => {
            res.setHeader('Content-Type', 'text/plain; charset=utf-8')
            res.end(make(seo))
          },
          (err) => next(err)
        )
      })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    seoPages(),
    machineReadersDev(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'icon.svg'],
      manifest: {
        id: '/',
        name: 'CVAurum — Free Open-Source Resume Builder',
        short_name: 'CVAurum',
        description: 'Free, open-source, 100% local resume builder. 58 ATS-ready templates, a built-in ATS score, PDF résumé import, and PDF / Word / JSON export — no account, fully offline.',
        categories: ['productivity', 'business', 'utilities'],
        theme_color: '#d4982f',
        background_color: '#0b0f1a',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          // Concrete PNG sizes — required before Chrome offers "Install app".
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Fonts are self-hosted, so they precache via the woff2 glob below — no
        // third-party runtime caching is needed. The app contacts no external host.
        // .icc: the 3KB sRGB profile embedded as every export's PDF/A
        // OutputIntent — precached so an OFFLINE export is still PDF/A
        // (without it the fetch fails and conformance silently drops).
        globPatterns: ['**/*.{js,mjs,css,html,svg,png,ico,woff,woff2,icc,webp,json}'],
        // OCR engine assets (tesseract worker/core/traineddata, ~10MB) are only
        // needed when a user imports a scanned PDF — keep them OUT of the precache
        // so first load stays lean; they fetch on demand, same-origin, from /ocr/.
        // Same for the opt-in semantic-match engine (~34MB) under /semantic/,
        // and its worker chunk — it must download only after the user opts in.
        // /fonts-pdf/ holds static font instances used ONLY when exporting a
        // PDF; they are fetched on demand (1–3 families per résumé). Only the
        // .ttf files are held back: its 6 KB index.json is the FIRST thing an
        // export fetches, and while the whole folder was ignored every offline
        // export died on it with "Failed to fetch" (measured on the production
        // build, 2026-09-12, _local/probe-offline-export.cjs). The fonts
        // themselves are put on the device by src/lib/pdf/fontWarm.ts while
        // there is still a connection.
        // The 58 pre-rendered template pages (1.01 MB) are never read by a
        // browser: the fallback below serves the shell and the app renders the
        // page, online or offline. The pattern must match what the build
        // WRITES - it wrote folders with an index.html until the pages became
        // one flat file each, after which this ignore matched nothing and all
        // 58 shipped in every install (11.2% of the precache, measured).
        globIgnores: [
          '**/ocr/**',
          '**/semantic/**',
          '**/semantic.worker-*.js',
          '**/fonts-pdf/*.ttf',
          'templates/*.html',
          // Same reason as the line above: the pre-rendered per-sample pages
          // exist for a crawler. The app serves /examples/<slug> from the
          // shell, so precaching 108 of them bought nothing offline and cost
          // about four megabytes of first load.
          'examples/*.html',
          // The page images: one full-size picture of every design (67 files,
          // 6.4 MB) and every example (108 files, 10.7 MB). The glob above
          // sweeps up webp, and every file is far under
          // maximumFileSizeToCacheInBytes, so without these two lines all 175
          // of them — 17.1 MB, measured — would install on every first visit,
          // for pages most visitors never open. They are cached the first time
          // one is actually looked at instead (runtimeCaching below).
          //
          // Same shape as the two ignores above:
          // DIST-RELATIVE, matching what the build writes (public/img is
          // copied verbatim to dist/img) — a pattern that matches nothing
          // fails silently, which is how the 58 template pages shipped in
          // every install for a while.
          'img/templates/*.webp',
          'img/examples/*.webp',
          // And their 520px grid twins (176 files, 5.9 MB), for the same
          // reason. A separate line because a `*` does not cross a slash: the
          // two patterns above match nothing inside thumb/, so without these
          // the cheap files the grids were given would install on every first
          // visit — the whole saving, handed back at install time.
          'img/templates/thumb/*.webp',
          'img/examples/thumb/*.webp',
          ...nonLatinFontFiles(),
        ],
        // Whatever the precache leaves out of /fonts/ and /fonts-pdf/ (the
        // non-Latin web subsets, the PDF instances) is cached the first time
        // it is fetched, so a résumé in Cyrillic still exports offline once
        // it has been exported online.
        runtimeCaching: [
          {
            urlPattern: /\/(fonts|fonts-pdf)\/.+\.(woff2|ttf)$/,
            handler: 'CacheFirst',
            options: { cacheName: 'cvaurum-fonts', expiration: { maxEntries: 400, maxAgeSeconds: 365 * 24 * 3600 } },
          },
          // The pictures of résumés — the page images under /img/ (17.1 MB) and
          // the share cards under /og/ (about 40 KB each) — are far too much to
          // put in every install, but a page that has been looked at should
          // still show its design with no connection.
          //
          // The pattern used to be /\/og\/[^/]+\.jpg$/, which was written when
          // /og/ held 58 flat files and nothing else existed. [^/]+ cannot
          // cross a slash, so it matches neither the nested share cards
          // (/og/examples/<slug>.jpg) nor the page images at all — both would
          // have been refetched on every visit and missing offline.
          //
          // The `.+` crosses slashes, so it also covers the 520px grid twins
          // under /img/<kind>/thumb/ — the files the three grids actually
          // load. They are the ones a second visit most wants to find here.
          //
          // maxEntries 600: the pattern can match 528 files in total (176 page
          // images, 176 twins, 176 share cards). Anything smaller is an LRU
          // ceiling someone can actually hit — 283 would start dropping the
          // template previews partway through a browse of the 108-example
          // library, which is exactly the case this cache exists for, and 400
          // (the bound before the twins existed) is now inside the reachable
          // set. 600 means eviction by count never happens; the bound is only a
          // guard against unbounded growth, the same one the font cache uses.
          // Worst case is ~30 MB, and only for someone who has opened every
          // picture on the site at full size.
          {
            urlPattern: /\/(img|og)\/.+\.(webp|jpg)$/,
            handler: 'CacheFirst',
            // Thirty days, not a year. These URLs carry a design's id or a
            // sample's slug, never a hash of the bytes, so the same URL does
            // serve a different picture after one is redrawn - and a year of
            // CacheFirst would have kept the seven designs whose pictures were
            // taken while the renderer was dropping its glyphs on returning
            // visitors' machines until 2027.
            options: { cacheName: 'cvaurum-previews', expiration: { maxEntries: 600, maxAgeSeconds: 30 * 24 * 3600 } },
          },
          // The opt-in semantic model (34 MB) is downloaded only by someone
          // who turns it on; keeping what they downloaded is what makes the
          // panel's own promise ("works offline after the first load") true.
          {
            urlPattern: /\/semantic\/.+\.(wasm|onnx|json|txt)$/,
            handler: 'CacheFirst',
            options: { cacheName: 'cvaurum-semantic', expiration: { maxEntries: 40, maxAgeSeconds: 365 * 24 * 3600 } },
          },
        ],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // Control the FIRST visit too. Without this the opening page is not
        // controlled by the worker, so nothing it fetches is cached and a
        // connection lost during that first session takes the export with it.
        // Safe beside registerType 'prompt': a worker only claims when there
        // is no previous one to displace; an UPDATE still waits for the prompt.
        clientsClaim: true,
        // The plain shell, not index.html: that one carries the landing
        // page's content in #root, which would flash inside /resume/<id>.
        navigateFallback: '/shell.html',
        // The print route renders client-side; never serve the SPA shell for it from cache wrongly.
        // A path that names a file (llms.txt, robots.txt, sitemap.xml, an
        // image) is a file, not a page: with the worker installed, typing
        // cvaurum.com/llms.txt got the app's not-found page instead of the
        // text (measured), because the fallback answered the navigation.
        navigateFallbackDenylist: [/^\/print\//, /\/[^/]+\.[a-z0-9]+$/i],
      },
      // Keep the dev server untouched; the service worker only ships in builds.
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: false,
  },
  build: {
    target: 'es2021',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          editor: ['@tiptap/react', '@tiptap/starter-kit'],
          dnd: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities', '@dnd-kit/modifiers'],
          motion: ['framer-motion'],
        },
      },
    },
  },
})
