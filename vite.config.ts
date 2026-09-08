import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
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
  html = setMeta(html, 'property', 'og:image:type', image.endsWith('.jpg') ? 'image/jpeg' : 'image/png')
  html = setMeta(html, 'property', 'og:image:alt', meta.title)
  html = setMeta(html, 'name', 'twitter:title', meta.title)
  html = setMeta(html, 'name', 'twitter:description', meta.description)
  html = setMeta(html, 'name', 'twitter:image', image)
  html = setMeta(html, 'name', 'twitter:image:alt', meta.title)
  html = setAttr(html, /(<link rel="canonical" href=")[^"]*(")/, url)
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
  html = html.replace(
    /<noscript>[\s\S]*?<\/noscript>/,
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

      const write = (dir: string, html: string) => {
        fs.mkdirSync(path.join(OUT, dir), { recursive: true })
        fs.writeFileSync(path.join(OUT, dir, 'index.html'), html)
        written.push(`${dir.replace(/\\/g, '/')}/index.html`)
      }

      write('templates', pageHtml(shell, seo.SITE, seo.galleryPageMeta(), seo.galleryStaticHtml()))
      const ids = seo.allTemplateIds()
      for (const id of ids) {
        write(
          path.join('templates', id),
          pageHtml(shell, seo.SITE, seo.templatePageMeta(id), seo.staticHtml(id), seo.breadcrumbJsonLd(id))
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

      const today = new Date().toISOString().slice(0, 10)
      fs.writeFileSync(path.join(OUT, 'sitemap.xml'), seo.sitemapXml(today))

      console.log(
        `\nSEO: wrote ${written.length} pre-rendered pages (dist/${written[0]} … dist/${written[written.length - 1]}) ` +
          `and dist/sitemap.xml with ${ids.length + 2} URLs (lastmod ${today})`
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
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2,icc}'],
        // OCR engine assets (tesseract worker/core/traineddata, ~10MB) are only
        // needed when a user imports a scanned PDF — keep them OUT of the precache
        // so first load stays lean; they fetch on demand, same-origin, from /ocr/.
        // Same for the opt-in semantic-match engine (~34MB) under /semantic/,
        // and its worker chunk — it must download only after the user opts in.
        // /fonts-pdf/ holds static font instances used ONLY when exporting a
        // PDF; they are fetched on demand (1–3 families per résumé).
        // The 58 pre-rendered template pages (about 0.8 MB) are never read by
        // a browser: the fallback below serves the shell and the app renders
        // the page, online or offline.
        globIgnores: [
          '**/ocr/**',
          '**/semantic/**',
          '**/semantic.worker-*.js',
          '**/fonts-pdf/**',
          'templates/**/index.html',
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
        ],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
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
