/**
 * Build the link-preview card for every design and every example:
 * public/og/<template-id>.jpg and public/og/examples/<slug>.jpg.
 *
 * The card that shipped before this put a whole A4 page in the middle of a
 * 1200x630 box and left two thirds of the card empty. The page came out
 * 430x560 - half of CSS size - so nine-point body text landed on about six
 * pixels, and a feed shows that card at half again. Nothing on it could be
 * read. Nine designs had no card at all, and seven more were pictures of a
 * bug: they were generated while the PDF renderer was dropping most of its
 * glyphs, so they showed an empty résumé with a name on top.
 *
 * So the card keeps the page - a shared link should show the design - and
 * spends the empty two thirds on type large enough to survive a feed. The
 * earlier script refused to draw text on the grounds that "a second place
 * that renders type is a second place it can go wrong", which is true of
 * compositing pixels by hand and not true here: the card is laid out in the
 * same Chromium, with the same stylesheet and the same fonts the site uses,
 * and screenshotted. One engine draws everything.
 *
 * JPEG, deliberately, though every measurement says lossless WebP is smaller
 * and exact for a résumé page (see scripts/make-page-images.cjs): this file is
 * an og:image, and the link-preview readers do not take WebP. Between them
 * they document JPG, PNG and GIF, and one of the big ones has been measured
 * showing nothing at all for a WebP card.
 *
 * The card also downscales the page about three times before encoding, which
 * averages away the block noise that makes JPEG the wrong choice at full size.
 *
 * Needs the dev server. Usage:
 *   node scripts/make-share-cards.cjs
 *   ONLY=broadsheet,ivy node scripts/make-share-cards.cjs
 *   KIND=examples node scripts/make-share-cards.cjs
 */
const fs = require('fs')
const path = require('path')
const { chromium } = require('playwright')
const sharp = require('sharp')

const ROOT = path.resolve(__dirname, '..')
const OG = path.join(ROOT, 'public', 'og')
const BASE = process.env.CVA_URL || 'http://localhost:5199'

/** The card size every unfurler crops to. */
const W = 1200
const H = 630
/** How tall the page stands in the card, in CSS pixels. */
const PAGE_H = 546
/** Screenshotted at 2x and brought down, so the page's own small type is
 *  supersampled rather than rendered at a size nothing can resolve. */
const DPR = 2
const QUALITY = 82
/** A card over this is a composition mistake, not a compression one. */
const MAX_KB = 90

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Everything the cards need, read out of the app's own modules so a new
 *  design or a new example is covered without this script being edited. */
const CATALOGUE = async () => {
  const reg = await import('/src/templates/registry.ts')
  const lib = await import('/src/data/library/index.ts')
  const types = await import('/src/data/library/types.ts')
  const tagLabel = (t) => String(t).replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase())
  return {
    templates: reg.TEMPLATES.map((t) => ({
      kind: 'templates',
      id: t.id,
      eyebrow: 'Résumé template',
      title: t.name,
      desc: t.description,
      tags: (t.tags || []).slice(0, 3).map(tagLabel),
      foot: 'Free · no account · every edit stays in your browser',
    })),
    examples: lib.LIBRARY.map((s) => ({
      kind: 'examples',
      id: s.slug,
      eyebrow: `Résumé example · ${types.CATEGORY_LABELS[s.category]}`,
      title: s.role,
      desc: s.blurb,
      tags: [types.SENIORITY_LABELS[s.seniority], types.REGION_LABELS[s.region], reg.TEMPLATE_MAP[s.template]?.name].filter(Boolean),
      foot: 'Free to open and edit · every name and employer invented',
    })),
  }
}

/** Page 1 of the real export, rasterized at the width the card shows it at
 *  times the device pixel ratio, so the browser maps it one to one. */
const RASTER = async ({ kind, id, pxWide }) => {
  const rmod = await import('/src/lib/pdf/render.tsx')
  let doc
  if (kind === 'templates') {
    const def = await import('/src/data/defaults.ts')
    const reg = await import('/src/templates/registry.ts')
    const ta = await import('/src/lib/templateApply.ts')
    doc = def.createDocument({ sample: true })
    doc.metadata = ta.applyTemplateToMetadata(doc.metadata, reg.getTemplate(id).defaults)
  } else {
    const lib = await import('/src/data/library/index.ts')
    const dm = await import('/src/data/library/doc.ts')
    doc = dm.sampleDoc(lib.LIBRARY.find((x) => x.slug === id))
  }
  const bytes = await rmod.renderResumePdf(doc)
  const pdfjs = await import('/node_modules/pdfjs-dist/build/pdf.mjs')
  pdfjs.GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/build/pdf.worker.min.mjs'
  const pdf = await pdfjs.getDocument({ data: bytes.slice() }).promise
  const pg = await pdf.getPage(1)
  const unit = pg.getViewport({ scale: 1 })
  const vp = pg.getViewport({ scale: pxWide / unit.width })
  const cv = document.createElement('canvas')
  cv.width = Math.round(vp.width)
  cv.height = Math.round(vp.height)
  await pg.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise
  return cv.toDataURL('image/png')
}

/** The card itself. Plain inline style: it is injected into a page that has
 *  already loaded the site's fonts, and it must not depend on class names
 *  that could be renamed out from under it. */
function cardHtml(job, pageSrc) {
  const pills = job.tags
    .map(
      (t) =>
        `<span style="display:inline-block;border:1px solid #2a2f3a;border-radius:999px;padding:5px 14px;font-size:15px;color:#aab2c0;white-space:nowrap">${esc(t)}</span>`
    )
    .join('')
  return `<div id="card" style="position:relative;width:${W}px;height:${H}px;background:#0b0d12;overflow:hidden;
      font-family:Inter,ui-sans-serif,system-ui,sans-serif;display:flex;align-items:center;gap:52px;padding:0 60px;box-sizing:border-box">
    <img src="${pageSrc}" style="height:${PAGE_H}px;width:auto;border-radius:3px;flex:none;
        box-shadow:0 24px 60px -12px rgba(0,0,0,.85),0 2px 8px rgba(0,0,0,.6)" />
    <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:17px">
      <div style="font-size:15px;letter-spacing:.13em;text-transform:uppercase;color:#8b93a3;font-weight:600;
          display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden">${esc(job.eyebrow)}</div>
      <div style="font-size:${job.title.length > 22 ? 44 : 54}px;line-height:1.05;font-weight:600;color:#f2f4f8;letter-spacing:-.02em;
          display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(job.title)}</div>
      <div style="font-size:21px;line-height:1.48;color:#9aa3b2;
          display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">${esc(job.desc)}</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:2px;max-height:76px;overflow:hidden">${pills}</div>
      <div style="margin-top:8px;font-size:16px;color:#6f7787;
          display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden">${esc(job.foot)}</div>
    </div>
  </div>`
}

;(async () => {
  const only = process.env.ONLY ? process.env.ONLY.split(',').map((s) => s.trim()) : null
  const kinds = process.env.KIND ? [process.env.KIND] : ['templates', 'examples']
  fs.mkdirSync(OG, { recursive: true })
  fs.mkdirSync(path.join(OG, 'examples'), { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR })
  await ctx.addInitScript(() => localStorage.setItem('cvaurum:tour:v1', '1'))
  const page = await ctx.newPage()
  await page.goto(`${BASE}/app`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)

  const catalogue = await page.evaluate(CATALOGUE)
  const jobs = kinds.flatMap((k) => catalogue[k]).filter((j) => !only || only.includes(j.id))

  const made = []
  for (const job of jobs) {
    // Enough pixels for the page to fill its slot at the screenshot's own
    // device ratio, with a little headroom for the widest page shapes.
    const pxWide = Math.ceil((PAGE_H / 1.2) * DPR)
    const dataUrl = await page.evaluate(RASTER, { kind: job.kind, id: job.id, pxWide })
    const png = Buffer.from(dataUrl.split(',')[1], 'base64')
    const flat = await sharp(png).flatten({ background: '#ffffff' }).png().toBuffer()

    await page.evaluate(
      ({ html }) => {
        document.body.innerHTML = html
        document.body.style.margin = '0'
        document.body.style.background = '#0b0d12'
      },
      { html: cardHtml(job, `data:image/png;base64,${flat.toString('base64')}`) }
    )
    await page.waitForTimeout(320)
    const shot = await (await page.$('#card')).screenshot({ type: 'png' })
    const file = job.kind === 'templates' ? path.join(OG, `${job.id}.jpg`) : path.join(OG, 'examples', `${job.id}.jpg`)
    await sharp(shot)
      .resize(W, H, { kernel: 'lanczos3' })
      .jpeg({ quality: QUALITY, chromaSubsampling: '4:4:4', mozjpeg: true })
      .toFile(file)

    const kb = fs.statSync(file).size / 1024
    made.push({ key: `${job.kind}/${job.id}`, kb })
    process.stdout.write(`${`${job.kind}/${job.id}`.padEnd(46)} ${kb.toFixed(1)} KB\n`)

    // The injected card replaced the app; put it back so the next raster has
    // the app's modules to import.
    await page.goto(`${BASE}/app`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(900)
  }
  await browser.close()

  const total = made.reduce((a, b) => a + b.kb, 0)
  const worst = made.slice().sort((a, b) => b.kb - a.kb)[0]
  console.log(`\n${made.length} cards, ${(total / 1024).toFixed(1)} MB total, largest ${worst.key} at ${worst.kb.toFixed(1)} KB`)
  const over = made.filter((m) => m.kb > MAX_KB)
  if (over.length) {
    console.error(`OVER ${MAX_KB} KB: ${over.map((m) => `${m.key} (${m.kb.toFixed(1)})`).join(', ')}`)
    process.exit(1)
  }
})().catch((e) => {
  console.error(String(e && e.stack ? e.stack : e).slice(0, 900))
  process.exit(1)
})
