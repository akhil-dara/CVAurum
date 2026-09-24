/**
 * Build the three cards a link to the site itself unfurls into:
 *
 *   public/og.png            the site card (home, and every page with no card)
 *   public/og/templates.jpg  the design gallery, /templates
 *   public/og/examples.jpg   the example library, /examples
 *
 * What was here before rasterised a hand-drawn public/og.svg with resvg. That
 * SVG predated most of the site: it drew six pages as flat shapes, named a
 * template count in typed text, and said nothing about the example library,
 * which did not exist when it was drawn. Every typed number in a picture is a
 * number that goes stale silently, and /examples and /templates both fell back
 * to it, so all three surfaces showed the same out-of-date drawing.
 *
 * So these are composed the way scripts/make-share-cards.cjs composes the
 * per-design and per-example cards: laid out in the browser that already has
 * the site's stylesheet and fonts, screenshotted at 2x, brought back down to
 * 1200x630. One engine draws everything, and the two numbers on the card
 * (designs, examples) are read out of the registry and the library count at
 * build time - they cannot be typed wrong because they are not typed.
 *
 * Each card is the site's own identity, not a plain caption: the brand mark
 * (read out of the running app's header, so it is the one mark and not a
 * copy that could drift), the wordmark with its gold, the dark ground with
 * the gold glow the landing page opens on, a pill of the three privacy words,
 * a bold headline from the site copy, and the counts. The page pictures
 * fanned beside the type are the lossless page images of the real exported
 * PDFs (public/img/templates, public/img/examples), loaded off the dev
 * server. They are addressed by path rather than through the seoPages
 * helpers on purpose: this is a build script, and every file it uses is
 * checked on disk first, so a missing picture fails here with its name rather
 * than composing a card with a hole in it.
 *
 * Format: the collection cards are JPEG like every other card. The site card
 * stays a PNG because /og.png is the URL already in index.html, robots.txt and
 * the JSON-LD, and because a palette PNG of this composition measures smaller
 * than the JPEG of it. Never WebP - the big unfurlers document JPG, PNG and
 * GIF, and one has been measured showing nothing at all for a WebP card.
 *
 * Needs the dev server. Usage:
 *   node scripts/make-og.cjs
 */
const fs = require('fs')
const path = require('path')
const { chromium } = require('playwright')
const sharp = require('sharp')

const ROOT = path.resolve(__dirname, '..')
const PUBLIC = path.join(ROOT, 'public')
const BASE = process.env.CVA_URL || 'http://localhost:5299'

/** The card size every unfurler crops to. */
const W = 1200
const H = 630
/** Supersample, so the small type inside a page picture averages instead of
 *  aliasing when the card is brought down to 1200x630. */
const DPR = 2
const QUALITY = 78
/** A card over this is a composition mistake, not a compression one. The
 *  per-design cards keep 90 KB with one page on them; these carry four page
 *  pictures, a gradient and a glow, and 150 KB is still a fifth of what the
 *  hand-drawn card weighed. */
const MAX_KB = 150

/** The page pictures are 1200x1697 (A4 at 1200 wide), and both sides are set
 *  here rather than left to width:auto: a rotated absolutely-positioned image
 *  whose height the layout has to derive from its natural size was measured
 *  laying out at full height before the picture decoded, and the screenshot
 *  caught that state. Explicit numbers, and the run prints the measured boxes.
 */
const PAGE_H = 380
const PAGE_W = Math.round((PAGE_H * 1200) / 1697)
/** Four pages, each a step to the right and a hair higher than the one behind
 *  it, the front one nearly upright - the fan says "a shelf of these" without
 *  a word. The type column ends at 560; the back page's tilted corner swings
 *  about 32px left of its box, so the fan starts far enough right that the
 *  measured boxes never reach the type. */
const FAN_LEFT = 628
const FAN_STEP = 94
const FAN_TOP = 150
const FAN_RISE = 10
const TILT = [-9, -5, -1.5, 2]

/** The designs fanned on the site card and on the gallery card: pages that
 *  differ from across a room, because at feed size a fan of three pages in the
 *  same shape reads as one page repeated. The site card keeps the typeset end
 *  of the range; the gallery card spreads it - a colour-banded header, a
 *  sidebar page, a centred classic - so it reads as "designs", plural. A dark
 *  design was tried first and measured disappearing into the dark ground. */
const SITE_FAN = ['broadsheet', 'aurum-editorial', 'ivy', 'measure']
const GALLERY_FAN = ['marquee', 'sienna', 'chronicle', 'atlas']
/** Three examples from three different shelves, same reason. */
const EXAMPLES_FAN = ['product-manager', 'registered-nurse', 'logistics-coordinator', 'senior-backend-engineer']

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * A paragraph written for a page, cut down to a line that fits the card whole.
 *
 * First sentence; and if that still runs long, the clause before its dash -
 * the line is clamped at three lines and a sentence that ends in an ellipsis
 * mid-thought reads like a mistake rather than a card.
 */
const cardLine = (s, max = 120) => {
  const m = String(s).match(/^[^.!?]+[.!?]/)
  let out = (m ? m[0] : String(s)).trim()
  if (out.length > max) out = `${out.split(/\s+[—–-]\s+/)[0].replace(/[,;:]$/, '')}.`
  return out
}

/** The copy and the counts, read out of the app's own modules. */
const FACTS = async () => {
  const reg = await import('/src/templates/registry.ts')
  const count = await import('/src/data/library/count.ts')
  const copy = await import('/src/data/siteCopy.ts')
  const pages = await import('/src/lib/seoPages.ts')
  const lib = await import('/src/lib/seoLibrary.ts')
  return {
    name: copy.SITE.name,
    // The one-liner is written as "<what it is>: <the list of what it has>".
    // The card takes the first half and the first clause of the second, which
    // is the whole claim the site makes, minus the inventory.
    oneLiner: copy.SITE.oneLiner
      .split(':')[0]
      .replace(/^CVAurum is /, '')
      .trim()
      .replace(/^./, (c) => c.toUpperCase()),
    aside: copy.SITE.oneLiner.split(':')[1].split(';')[0].trim(),
    hero: copy.SITE.hero,
    // "no account, no server, no tracking" - the three words the pill shows
    privacyWords: copy.SITE.oneLiner.split(':')[1].split(';')[0].split(',').map((w) => w.trim()),
    host: new URL(copy.SITE.links.site).host,
    templates: reg.TEMPLATE_COUNT,
    samples: count.SAMPLE_COUNT,
    galleryIntro: pages.GALLERY_INTRO,
    examplesIntro: lib.EXAMPLES_INTRO,
    // The mark, exactly as the app draws it: the header of the page this
    // runs in carries one. Read rather than redrawn, so the card can never
    // show a mark the site has moved on from.
    mark: document.querySelector('a[aria-label="CVAurum home"] svg')?.outerHTML || '',
  }
}

/**
 * The card. Plain inline style: it is injected into a page that has already
 * loaded the site's fonts, and must not depend on class names that could be
 * renamed out from under it.
 *
 * Left, the site's identity: mark and wordmark, the privacy pill, a headline
 * in the landing page's voice with its last word in gold, a line of facts,
 * and the host. Right, four page pictures fanned, on the dark ground and
 * gold glow the landing hero opens on, each with a hairline and a shadow so
 * it reads as paper. A veil keeps the type's side of the card dark whatever
 * the fan does.
 */
function cardHtml({ mark, pill, headline, line, host, fan }) {
  const pages = fan
    .map(
      (src, i) => `<img class="fanpage" src="${src}" style="position:absolute;left:${FAN_LEFT + i * FAN_STEP}px;top:${FAN_TOP - i * FAN_RISE}px;
        width:${PAGE_W}px;height:${PAGE_H}px;
        transform:rotate(${TILT[i]}deg);transform-origin:50% 100%;border-radius:3px;
        outline:1.5px solid rgba(255,255,255,.22);outline-offset:-1px;
        box-shadow:0 26px 60px -14px rgba(0,0,0,.9),0 3px 10px rgba(0,0,0,.6)" />`
    )
    .join('')
  // The last word carries the gold, the way the landing page sets its own
  // headline; the full stop stays with it.
  const words = headline.trim().split(/\s+/)
  const last = words.pop()
  const title = `${esc(words.join(' '))} <span style="color:#e0ab3e">${esc(last)}</span>`
  return `<div id="card" style="position:relative;width:${W}px;height:${H}px;overflow:hidden;box-sizing:border-box;
      background:linear-gradient(135deg,#0b0d12 0%,#11141c 100%);
      font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#f3f4f8">
    <div style="position:absolute;inset:0;background:radial-gradient(circle at 72% 16%,rgba(212,152,47,.28) 0%,rgba(212,152,47,0) 62%)"></div>
    <div style="position:absolute;top:0;bottom:0;left:0;width:640px;background:linear-gradient(90deg,#0b0d12 0%,rgba(11,13,18,.98) 78%,rgba(11,13,18,0) 100%)"></div>
    ${pages}
    <div id="type" style="position:absolute;left:78px;top:60px;width:482px;display:flex;flex-direction:column">
      <div style="display:flex;align-items:center;gap:14px;height:64px">
        <div style="width:60px;height:60px;color:#f3f4f8;display:flex">${mark}</div>
        <div style="font-size:40px;font-weight:700;letter-spacing:-.02em;line-height:1">CV<span style="color:#e0ab3e">Aurum</span></div>
      </div>
      <div style="display:inline-flex;align-self:flex-start;align-items:center;gap:12px;margin-top:32px;height:42px;padding:0 18px 0 16px;border-radius:21px;
          background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.15);font-size:19px;font-weight:600;color:#c9cdd8;white-space:nowrap">
        <span style="width:11px;height:11px;border-radius:50%;background:#39d98a;flex:none"></span>${esc(pill)}
      </div>
      <div id="headline" style="margin-top:30px;font-size:54px;line-height:1.12;font-weight:800;letter-spacing:-.025em;
          display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">${title}</div>
      <div id="line" style="margin-top:22px;font-size:23px;line-height:1.35;font-weight:500;color:#9aa0ad;
          display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">${esc(line)}</div>
    </div>
    <div style="position:absolute;left:80px;top:545px;font-size:23px;font-weight:700;color:#e0ab3e;white-space:nowrap">${esc(host)}<span style="margin-left:14px;font-size:21px;font-weight:500;color:#6b7280">· free · open source (MIT)</span></div>
  </div>`
}

/** A page picture as a data URL, so the screenshot never races the network. */
function dataUrl(rel) {
  const file = path.join(PUBLIC, rel)
  if (!fs.existsSync(file)) throw new Error(`missing page image: ${rel}`)
  return `data:image/webp;base64,${fs.readFileSync(file).toString('base64')}`
}

;(async () => {
  fs.mkdirSync(path.join(PUBLIC, 'og'), { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR })
  await ctx.addInitScript(() => localStorage.setItem('cvaurum:tour:v2', '1'))
  const page = await ctx.newPage()
  await page.goto(`${BASE}/app`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)
  const f = await page.evaluate(FACTS)

  if (!f.mark) throw new Error('the app header carried no brand mark to read')
  const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1)
  const pill = f.privacyWords.map(cap).join(' · ')
  const counts = `${f.templates} designs · ${f.samples} example résumés`
  const cards = [
    {
      out: path.join(PUBLIC, 'og.png'),
      png: true,
      card: {
        mark: f.mark,
        pill,
        headline: f.hero,
        line: `${counts} · built-in ATS check · PDF import · works offline`,
        host: f.host,
        fan: SITE_FAN.map((id) => dataUrl(`img/templates/${id}.webp`)),
      },
    },
    {
      out: path.join(PUBLIC, 'og', 'templates.jpg'),
      card: {
        mark: f.mark,
        pill,
        headline: `${f.templates} résumé templates, all free.`,
        line: cardLine(f.galleryIntro),
        host: f.host,
        fan: GALLERY_FAN.map((id) => dataUrl(`img/templates/${id}.webp`)),
      },
    },
    {
      out: path.join(PUBLIC, 'og', 'examples.jpg'),
      card: {
        mark: f.mark,
        pill,
        headline: `${f.samples} résumé examples, written out in full.`,
        line: cardLine(f.examplesIntro),
        host: f.host,
        fan: EXAMPLES_FAN.map((slug) => dataUrl(`img/examples/${slug}.webp`)),
      },
    },
  ]

  for (const job of cards) {
    await page.evaluate(
      ({ html }) => {
        document.body.innerHTML = html
        document.body.style.margin = '0'
        document.body.style.background = '#0b0d12'
      },
      { html: cardHtml(job.card) }
    )
    await page.waitForTimeout(400)
    // Type lands whole or the run fails. The headline is the site copy's own
    // sentence and the line a whole sentence of an intro, neither written for
    // a 482px column: each is clamped to its lines and then SHRUNK, a pixel
    // of font size at a time, until nothing is cut - measured, so the gold
    // last word can never be the word that goes missing. Below the floor the
    // card is wrong, not small.
    const fit = await page.evaluate(() => {
      const shrink = (id, min) => {
        const el = document.getElementById(id)
        let fs = parseFloat(getComputedStyle(el).fontSize)
        while (el.scrollHeight > el.clientHeight + 1 && fs > min) {
          fs -= 1
          el.style.fontSize = `${fs}px`
        }
        return { fs, whole: el.scrollHeight <= el.clientHeight + 1 }
      }
      return { headline: shrink('headline', 40), line: shrink('line', 18) }
    })
    if (!fit.headline.whole || !fit.line.whole) {
      console.error(`${path.relative(ROOT, job.out)}: type does not fit whole: ${JSON.stringify(fit)}`)
      process.exitCode = 1
    }
    // Measured, not assumed: every page picture has to sit inside the card,
    // and the type column must stop before the fan starts.
    const boxes = await page.evaluate(() => {
      const b = (e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)] }
      return {
        col: b(document.querySelector('#type')),
        pages: [...document.querySelectorAll('.fanpage')].map(b),
      }
    })
    const bad = boxes.pages.filter(([l, t, r, bo]) => t < 0 || l < boxes.col[2] || r > W || bo > H)
    await page.evaluate(() => {})
    const shot = await (await page.$('#card')).screenshot({ type: 'png' })
    const down = sharp(shot).resize(W, H, { kernel: 'lanczos3' })
    // A palette PNG: the card is flat ground, type and three pictures, which
    // 256 colours carry without banding, and it lands well under the budget
    // the other cards keep.
    await (job.png
      ? down.png({ palette: true, quality: 90, colors: 256, dither: 1, effort: 10 })
      : down.jpeg({ quality: QUALITY, chromaSubsampling: '4:4:4', mozjpeg: true })
    ).toFile(job.out)

    const kb = fs.statSync(job.out).size / 1024
    const rel = path.relative(ROOT, job.out).replace(/\\/g, '/')
    process.stdout.write(
      `${rel.padEnd(28)} ${kb.toFixed(1)} KB   headline ${fit.headline.fs}px, line ${fit.line.fs}px, type ends ${boxes.col[2]}, fan ${boxes.pages.map((p) => p.join(',')).join(' | ')}\n`
    )
    if (bad.length) {
      console.error(`${rel}: ${bad.length} page picture(s) outside the card or under the type: ${JSON.stringify(bad)}`)
      process.exitCode = 1
    }
    if (kb > MAX_KB) {
      console.error(`OVER ${MAX_KB} KB: ${rel} (${kb.toFixed(1)})`)
      process.exitCode = 1
    }

    // The injected card replaced the app; put it back so the next evaluate has
    // the app's modules to import.
    await page.goto(`${BASE}/app`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(700)
  }
  await browser.close()
})().catch((e) => {
  console.error(String(e && e.stack ? e.stack : e).slice(0, 900))
  process.exit(1)
})
