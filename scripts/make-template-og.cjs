/**
 * Build the link-preview image for every template page: public/og/<id>.jpg.
 *
 * When someone shares /templates/broadsheet the card should show Broadsheet,
 * not the site's generic banner — the design IS the page. Each image is the
 * template's own first page, rendered through the real PDF pipeline (so it is
 * exactly what the reader would export, not a DOM approximation), dropped on
 * the site's dark ground with a soft shadow at the 1200x630 every unfurler
 * wants.
 *
 * Deliberately no text overlay: drawing the template's name would mean
 * rasterising a font here, and a second place that renders type is a second
 * place it can go wrong. The name is in the og:title beside the image.
 *
 * Needs the dev server (it imports the app's own modules to render). Usage:
 *   node scripts/make-template-og.cjs            # all of them
 *   ONLY=broadsheet,atlas node scripts/make-template-og.cjs
 *   CVA_URL=http://localhost:5199 node scripts/make-template-og.cjs
 */
const fs = require('fs')
const path = require('path')
const { chromium } = require('playwright')
const sharp = require('sharp')

const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'public', 'og')
const BASE = process.env.CVA_URL || 'http://localhost:5199'

/** The card size every link unfurler crops to. */
const W = 1200
const H = 630
/** How tall the page sits in the card — 560 of 630 leaves an even margin. */
const PAGE_H = 560
/** The site's dark ground (index.html's dark theme-color). */
const GROUND = { r: 11, g: 13, b: 18, alpha: 1 }
/** Rendered above the final size so the downscale stays crisp. */
const RENDER_SCALE = 1.5
const QUALITY = 82

/** Read the ids straight out of the registry — a new template gets an image
 *  without this script being edited. */
function templateIds() {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'templates', 'registry.ts'), 'utf8')
  return [...src.matchAll(/^\s{4}id: '([^']+)'/gm)].map((m) => m[1])
}

/** The page on its ground, with a soft drop shadow under it. */
async function compose(pngBuffer, outFile) {
  const meta = await sharp(pngBuffer).metadata()
  const pageW = Math.round((PAGE_H * meta.width) / meta.height)
  const x = Math.round((W - pageW) / 2)
  const y = Math.round((H - PAGE_H) / 2)

  const page = await sharp(pngBuffer).resize(pageW, PAGE_H, { fit: 'fill' }).png().toBuffer()
  // A blurred black slab a little larger than the page, sat behind it. Blurring
  // needs room to fall off, so the slab is inset inside a transparent margin.
  const pad = 26
  const shadow = await sharp({
    create: { width: pageW + pad * 2, height: PAGE_H + pad * 2, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      {
        input: {
          create: { width: pageW, height: PAGE_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0.72 } },
        },
        left: pad,
        top: pad + 8, // cast slightly downward, as a light from above would
      },
    ])
    .blur(14)
    .png()
    .toBuffer()

  await sharp({ create: { width: W, height: H, channels: 4, background: GROUND } })
    .composite([
      { input: shadow, left: x - pad, top: y - pad },
      { input: page, left: x, top: y },
    ])
    .jpeg({ quality: QUALITY, chromaSubsampling: '4:4:4', mozjpeg: true })
    .toFile(outFile)
}

;(async () => {
  const only = process.env.ONLY ? process.env.ONLY.split(',').map((s) => s.trim()) : null
  const ids = templateIds().filter((id) => !only || only.includes(id))
  fs.mkdirSync(OUT, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } })
  await ctx.addInitScript(() => localStorage.setItem('cvaurum:tour:v1', '1'))
  const page = await ctx.newPage()
  await page.goto(`${BASE}/app`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)

  const sizes = []
  for (const id of ids) {
    const dataUrl = await page.evaluate(
      async ({ id, scale }) => {
        const def = await import('/src/data/defaults.ts')
        const reg = await import('/src/templates/registry.ts')
        const ta = await import('/src/lib/templateApply.ts')
        const rmod = await import('/src/lib/pdf/render.tsx')
        const doc = def.createDocument({ sample: true })
        doc.metadata = ta.applyTemplateToMetadata(doc.metadata, reg.getTemplate(id).defaults)
        const bytes = await rmod.renderResumePdf(doc)
        const pdfjs = await import('/node_modules/pdfjs-dist/build/pdf.mjs')
        pdfjs.GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/build/pdf.worker.min.mjs'
        const pdf = await pdfjs.getDocument({ data: bytes.slice() }).promise
        const pg = await pdf.getPage(1)
        const vp = pg.getViewport({ scale })
        const cv = document.createElement('canvas')
        cv.width = Math.round(vp.width)
        cv.height = Math.round(vp.height)
        await pg.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise
        return cv.toDataURL('image/png')
      },
      { id, scale: RENDER_SCALE }
    )
    const png = Buffer.from(dataUrl.split(',')[1], 'base64')
    const file = path.join(OUT, `${id}.jpg`)
    await compose(png, file)
    const kb = fs.statSync(file).size / 1024
    sizes.push({ id, kb })
    console.log(`${id.padEnd(18)} ${kb.toFixed(1)} KB`)
  }
  await browser.close()

  const over = sizes.filter((s) => s.kb > 90)
  const worst = sizes.slice().sort((a, b) => b.kb - a.kb)[0]
  console.log(`\n${sizes.length} images in public/og/ — largest ${worst.id} at ${worst.kb.toFixed(1)} KB`)
  if (over.length) {
    console.error(`OVER 90 KB: ${over.map((s) => `${s.id} (${s.kb.toFixed(1)})`).join(', ')}`)
    process.exit(1)
  }
})().catch((e) => {
  console.error(String(e).slice(0, 600))
  process.exit(1)
})
