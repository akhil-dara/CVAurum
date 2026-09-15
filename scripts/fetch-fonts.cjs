/**
 * One-time (re-runnable) generator: self-host every font family in the registry.
 *
 * For each family we ask the Google Fonts CSS2 API for the exact weights the app
 * uses, keep the `latin` + `latin-ext` subsets (covers English + accented
 * European names), download the woff2 binaries into public/fonts/, and emit
 * src/styles/fonts.css with @font-face rules pointing at the LOCAL files.
 *
 * After this runs the app makes ZERO external font requests — fonts ship with
 * the bundle. Re-run whenever src/data/fonts.ts changes:  node scripts/fetch-fonts.cjs
 *
 * NOT every family comes from here. A face whose publisher distributes bare
 * OpenType files has no stylesheet to query, and scripts/make-built-fonts.py
 * builds those instead, writing its own @font-face rules into a marked region
 * of the same file. This script regenerates fonts.css WHOLESALE — one run
 * re-downloads every family listed below — so it must carry that region across
 * intact, or adding a single built face would mean a 5.6 MB re-fetch of the 45
 * fetched ones. See BUILT_BEGIN below.
 */
const https = require('https')
const fs = require('fs')
const path = require('path')

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const ROOT = path.resolve(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'public', 'fonts')
const CSS_OUT = path.join(ROOT, 'src', 'styles', 'fonts.css')
// Every script a résumé written in Europe is likely to need. Google splits a
// family into disjoint per-script files and the browser fetches only the
// ones a page's text touches (unicode-range), so a Latin-only résumé costs
// nothing extra; the PDF builder (scripts/make-pdf-fonts.py) merges all of a
// family's files into one embeddable TTF. Before this, only latin and
// latin-ext were kept, and a Cyrillic résumé exported with every Cyrillic
// letter dropped, whatever font was chosen (issue #10).
const KEEP = new Set(['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext', 'greek', 'greek-ext', 'vietnamese'])

const DW = [400, 500, 600, 700]
// Mirror of src/data/fonts.ts (name -> requested weights).
const FONTS = [
  ['Inter', [400, 500, 600, 700, 800]], ['Roboto', DW], ['Open Sans', DW], ['Lato', [400, 700, 900]],
  ['Montserrat', [400, 500, 600, 700, 800]], ['Raleway', DW], ['Rubik', DW], ['Poppins', DW],
  ['Work Sans', DW], ['Source Sans 3', DW], ['Nunito Sans', DW], ['Mulish', DW], ['Karla', DW],
  ['Figtree', DW], ['PT Sans', [400, 700]], ['Arimo', DW], ['Chivo', DW], ['Exo 2', DW],
  ['IBM Plex Sans', DW], ['DM Sans', DW],
  ['Merriweather', [400, 700, 900]], ['Lora', DW], ['PT Serif', [400, 700]],
  ['Playfair Display', [400, 500, 600, 700, 800]], ['Source Serif 4', DW], ['Roboto Slab', DW],
  ['Bitter', DW], ['Tinos', [400, 700]], ['Volkhov', [400, 700]], ['Gelasio', DW], ['EB Garamond', DW],
  ['Cormorant Garamond', [400, 500, 600, 700]], ['Libre Baskerville', [400, 700]], ['Spectral', DW],
  ['JetBrains Mono', DW], ['IBM Plex Mono', DW], ['Source Code Pro', DW],
  ['Oswald', DW], ['Bebas Neue', [400]], ['Abril Fatface', [400]], ['Archivo', DW],
  ['Dancing Script', [400, 500, 600, 700]], ['Dynalight', [400]], ['Ms Madi', [400]], ['Meow Script', [400]],
]

const slug = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// The region scripts/make-built-fonts.py owns. Read out of the existing
// stylesheet before we overwrite it and appended again afterwards, so the two
// generators can be run in either order, any number of times, without either
// one erasing the other. If the markers are missing the region is simply
// absent and nothing is carried — a fresh checkout is the normal case.
const BUILT_BEGIN = '/* ===== BUILT FACES (scripts/make-built-fonts.py owns this region) ===== */'
const BUILT_END = '/* ===== END BUILT FACES ===== */'

function readBuiltRegion() {
  if (!fs.existsSync(CSS_OUT)) return ''
  const text = fs.readFileSync(CSS_OUT, 'utf8')
  const i = text.indexOf(BUILT_BEGIN)
  if (i === -1) return ''
  const j = text.indexOf(BUILT_END, i)
  if (j === -1) {
    // Half a region means somebody edited the file by hand. Stopping is the
    // only safe move: writing on would silently drop the built faces, and the
    // PDF builder downstream would then delete their TTFs as stale.
    throw new Error(`${CSS_OUT}: BUILT region opened but never closed — fix it by hand or re-run make-built-fonts.py`)
  }
  return text.slice(i, j + BUILT_END.length)
}

function fetchBuf(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': UA } }, (r) => {
        if (r.statusCode !== 200) {
          reject(new Error('HTTP ' + r.statusCode))
          return
        }
        const chunks = []
        r.on('data', (c) => chunks.push(c))
        r.on('end', () => resolve(Buffer.concat(chunks)))
      })
      .on('error', reject)
  })
}

async function getCss(name, weights) {
  const fam = name.replace(/ /g, '+')
  // Try full weights; fall back to {400,700} then {400} if Google rejects a weight.
  const tries = [weights, weights.filter((w) => w === 400 || w === 700), [400]]
  for (const ws of tries) {
    if (!ws.length) continue
    const url = `https://fonts.googleapis.com/css2?family=${fam}:wght@${[...new Set(ws)].join(';')}&display=swap`
    try {
      return (await fetchBuf(url)).toString('utf8')
    } catch (e) {
      /* try next */
    }
  }
  return null
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  // Read first: everything below overwrites CSS_OUT.
  const built = readBuiltRegion()
  const cssBlocks = []
  const urlMap = new Map() // gstatic url -> local /fonts/x.woff2
  const re = /\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g

  for (const [name, weights] of FONTS) {
    const css = await getCss(name, weights)
    if (!css) {
      console.log('  ✗ CSS FAILED:', name)
      continue
    }
    let m
    let kept = 0
    while ((m = re.exec(css))) {
      const subset = m[1]
      const body = m[2]
      if (!KEEP.has(subset)) continue
      const um = body.match(/url\((https:\/\/fonts\.gstatic[^)]+\.woff2)\)/)
      if (!um) continue
      const gurl = um[1]
      let local = urlMap.get(gurl)
      if (!local) {
        local = `/fonts/${slug(name)}-${gurl.split('/').pop()}`
        urlMap.set(gurl, local)
      }
      const newBody = body.replace(/url\(https:\/\/fonts\.gstatic[^)]+\.woff2\)/, `url(${local})`)
      cssBlocks.push(`/* ${name} ${subset} */\n@font-face {${newBody}}`)
      kept++
    }
    re.lastIndex = 0
    console.log(`  ✓ ${name}: ${kept} faces`)
  }

  // Download every unique woff2 (concurrency-limited).
  const entries = [...urlMap.entries()]
  let i = 0
  let ok = 0
  let fail = 0
  async function worker() {
    while (i < entries.length) {
      const [gurl, local] = entries[i++]
      const dest = path.join(ROOT, 'public', local.replace(/^\//, ''))
      try {
        fs.writeFileSync(dest, await fetchBuf(gurl))
        ok++
      } catch (e) {
        fail++
        console.log('  ✗ DL FAILED:', gurl, e.message)
      }
    }
  }
  await Promise.all(Array.from({ length: 12 }, worker))

  const header = `/* GENERATED by scripts/fetch-fonts.cjs — do not edit by hand.\n   Self-hosted fonts: the app makes zero external font requests. */\n\n`
  const tail = built ? '\n\n' + built + '\n' : ''
  fs.writeFileSync(CSS_OUT, header + cssBlocks.join('\n\n') + '\n' + tail)
  console.log(
    `\nDONE — ${cssBlocks.length} @font-face rules, ${ok} files downloaded, ${fail} failed` +
      `${built ? ', built-faces region carried across' : ''}.`
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
