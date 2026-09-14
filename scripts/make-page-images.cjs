/**
 * Build the picture of the page itself: public/img/templates/<id>.webp and
 * public/img/examples/<slug>.webp.
 *
 * This is the image a search engine indexes and a reader looks at. Until now
 * the only picture either kind of page had was the 1200x630 link card, which
 * shrinks an A4 page to 430x560 - half of CSS size, so nine-point body text
 * lands on about six pixels - and every one of the 108 example pages borrowed
 * the card belonging to its DESIGN, so a hundred and eight pages shared
 * fifty-eight pictures of somebody else's résumé.
 *
 * Two measured decisions sit behind the output format, both of which run
 * against the usual instinct (numbers in _local/thumb-bakeoff):
 *
 * 1. LOSSLESS WebP, not JPEG and not AVIF. A rendered résumé is flat white
 *    with hard two-tone edges - the content VP8L's predictor coding eats and
 *    the content a DCT wastes bits ringing around. Against the JPEG q82 the
 *    link cards use, lossless WebP is less than half the bytes AND bit-exact,
 *    while JPEG is the only encoder measured that pushes ink pixels more than
 *    40 luma levels off where they belong. Lossy WebP is a trap here: q75 is
 *    24% LARGER than lossless and visibly worse. AVIF only wins on dark,
 *    full-bleed designs, and not by enough to be worth two formats.
 *
 * 2. RASTERISE AT THE DELIVERY SIZE. Never render big and resize down. The
 *    same 1200px page is 1.9x to 4.2x larger as a lossless file when it comes
 *    from a downscaled 1600px render, because resampling smears the clean
 *    grey ramp of hinted antialiasing into every value it can reach, and a
 *    lossless coder pays for each one.
 *
 * 1200px wide is the width Google names for a large image preview, and it is
 * also simply the right display size: the example page shows the picture at
 * about 560 CSS px, which a retina screen wants at 1120.
 *
 * Needs the dev server (it imports the app's own modules to render). Usage:
 *   node scripts/make-page-images.cjs
 *   ONLY=atlas,broadsheet node scripts/make-page-images.cjs
 *   KIND=examples node scripts/make-page-images.cjs
 *   CVA_URL=http://localhost:5199 node scripts/make-page-images.cjs
 */
const fs = require('fs')
const path = require('path')
const { chromium } = require('playwright')
const sharp = require('sharp')

const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'public', 'img')
const BASE = process.env.CVA_URL || 'http://localhost:5199'

/** The delivery width. Everything is rendered AT this size, never resized. */
const W = 1200
/**
 * A lossless page that costs more than this is worth looking at.
 *
 * Most pages land between 50 and 140 KB. The tail is the handful of designs
 * that fill the page with gradients and tinted panels rather than type -
 * Creative at 322 KB is the worst - because a lossless coder pays for every
 * distinct value in a gradient and gets nothing back from flat paper. Those
 * are three times smaller as AVIF, and the whole set was measured both ways:
 * lossless WebP totals 17.1 MB against AVIF's 18.1 MB, because AVIF loses on
 * the other 170 pages by more than it wins on these five. One format,
 * bit-exact everywhere, is worth a megabyte.
 */
const MAX_KB = 360

/** Ids straight out of the registry - a new design gets a picture without
 *  this script being edited. */
function templateIds() {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'templates', 'registry.ts'), 'utf8')
  return [...src.matchAll(/^\s{4}id: '([^']+)'/gm)].map((m) => m[1])
}

/** Slugs straight out of the generated library index, for the same reason. */
function sampleSlugs() {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'data', 'library', 'index.ts'), 'utf8')
  return [...src.matchAll(/^import (\w+) from '\.\/samples\/([^']+)'/gm)].map((m) => m[2])
}

/**
 * Rasterize page 1 of the real export at exactly `width` pixels.
 *
 * Runs inside the page so it uses the app's own renderer: the same PDF a
 * reader would download, not a DOM approximation of it.
 */
const RASTER = async ({ kind, id, width }) => {
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
    const s = lib.LIBRARY.find((x) => x.slug === id)
    if (!s) throw new Error(`no sample "${id}"`)
    doc = dm.sampleDoc(s)
  }
  const bytes = await rmod.renderResumePdf(doc)
  const pdfjs = await import('/node_modules/pdfjs-dist/build/pdf.mjs')
  pdfjs.GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/build/pdf.worker.min.mjs'
  const pdf = await pdfjs.getDocument({ data: bytes.slice() }).promise
  const pg = await pdf.getPage(1)
  // Scale so the raster IS the delivery size: a page this size resized from a
  // larger one would cost two to four times the bytes for the same picture.
  const unit = pg.getViewport({ scale: 1 })
  const vp = pg.getViewport({ scale: width / unit.width })
  const cv = document.createElement('canvas')
  cv.width = Math.round(vp.width)
  cv.height = Math.round(vp.height)
  await pg.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise
  return { png: cv.toDataURL('image/png'), pages: pdf.numPages }
}

;(async () => {
  const only = process.env.ONLY ? process.env.ONLY.split(',').map((s) => s.trim()) : null
  const kinds = process.env.KIND ? [process.env.KIND] : ['templates', 'examples']
  const jobs = []
  if (kinds.includes('templates')) for (const id of templateIds()) jobs.push({ kind: 'templates', id })
  if (kinds.includes('examples')) for (const slug of sampleSlugs()) jobs.push({ kind: 'examples', id: slug })
  const todo = jobs.filter((j) => !only || only.includes(j.id))

  for (const k of kinds) fs.mkdirSync(path.join(OUT, k), { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } })
  await ctx.addInitScript(() => localStorage.setItem('cvaurum:tour:v1', '1'))
  const page = await ctx.newPage()
  await page.goto(`${BASE}/app`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)

  const made = []
  for (const j of todo) {
    const { png: dataUrl, pages } = await page.evaluate(RASTER, { kind: j.kind, id: j.id, width: W })
    const raw = Buffer.from(dataUrl.split(',')[1], 'base64')
    // The canvas is transparent where the PDF paints nothing. Flatten onto
    // white before encoding: a reader expects paper, and dropping the alpha
    // channel is also what lets the lossless coder do its best work.
    const buf = await sharp(raw).flatten({ background: '#ffffff' }).webp({ lossless: true, effort: 6 }).toBuffer()
    const file = path.join(OUT, j.kind, `${j.id}.webp`)
    fs.writeFileSync(file, buf)
    const meta = await sharp(buf).metadata()
    made.push({ key: `${j.kind}/${j.id}`, h: meta.height, kb: buf.length / 1024, pages })
    process.stdout.write(`${`${j.kind}/${j.id}`.padEnd(46)} ${meta.width}x${meta.height}  ${(buf.length / 1024).toFixed(1)} KB\n`)
  }
  await browser.close()

  // The heights differ (A4 and US Letter are both in the library), and an
  // <img> without them shifts the page as it loads. Written as a module so
  // the routes and the build-time HTML read the same numbers.
  if (!only && kinds.length === 2) {
    const lines = made.sort((a, b) => a.key.localeCompare(b.key)).map((m) => `  '${m.key}': ${m.h},`)
    fs.writeFileSync(
      path.join(ROOT, 'src', 'data', 'pageImages.ts'),
      `/**
 * How tall each page picture is, at PAGE_IMAGE_WIDTH.
 *
 * GENERATED by scripts/make-page-images.cjs - do not edit by hand.
 *
 * The library holds both A4 and US Letter résumés, so the heights differ;
 * an <img> that does not carry its own height shifts everything under it
 * as it loads.
 */
export const PAGE_IMAGE_WIDTH = ${W}

export const PAGE_IMAGE_HEIGHT: Record<string, number> = {
${lines.join('\n')}
}
`
    )
    console.log(`\nsrc/data/pageImages.ts written with ${made.length} entries`)
  }

  const total = made.reduce((a, b) => a + b.kb, 0)
  const worst = made.slice().sort((a, b) => b.kb - a.kb)[0]
  console.log(`${made.length} images, ${(total / 1024).toFixed(1)} MB total, largest ${worst.key} at ${worst.kb.toFixed(1)} KB`)
  const over = made.filter((m) => m.kb > MAX_KB)
  if (over.length) {
    console.error(`OVER ${MAX_KB} KB: ${over.map((m) => `${m.key} (${m.kb.toFixed(1)})`).join(', ')}`)
    process.exit(1)
  }
})().catch((e) => {
  console.error(String(e && e.stack ? e.stack : e).slice(0, 900))
  process.exit(1)
})
