#!/usr/bin/env node
/**
 * Regenerate src/data/lastmod.json — the truthful <lastmod> for every public URL.
 *
 *   node scripts/make-lastmod.cjs                 # new/changed pages take today
 *   node scripts/make-lastmod.cjs --date=2026-09-16
 *   LASTMOD_DATE=2026-09-16 node scripts/make-lastmod.cjs
 *   node scripts/make-lastmod.cjs --check         # write nothing; exit 1 if stale
 *
 * The date is an argument rather than a call to the clock so a run is
 * reproducible: the same repository and the same --date always write the same
 * file, byte for byte.
 *
 * Run it whenever a design, a sample, the landing copy or a prompt changes.
 * src/data/lastmod.test.ts fails the suite until you do, so a stale sitemap
 * cannot ship quietly. See docs/SEO.md.
 */
const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'src', 'data', 'lastmod.json')

/**
 * Compile src/lib/lastmodHash.ts into this process.
 *
 * The hashes have exactly one definition, shared by this script and the test;
 * two copies of "what a page is made from" would drift the first time a page
 * gained a source. The '@' alias is the one thing esbuild cannot work out on
 * its own here (the same trick vite.config.ts uses for the SEO plugin).
 */
async function loadHasher() {
  const { build } = await import('esbuild')
  const out = await build({
    entryPoints: [path.join(ROOT, 'src', 'lib', 'lastmodHash.ts')],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
    target: 'node18',
    alias: { '@': path.join(ROOT, 'src') },
    logLevel: 'silent',
  })
  const dir = path.join(ROOT, 'node_modules', '.cvaurum')
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, 'lastmodHash.mjs')
  fs.writeFileSync(file, out.outputFiles[0].text)
  return import(`${require('node:url').pathToFileURL(file).href}?v=${Date.now()}`)
}

function arg(name) {
  const hit = process.argv.slice(2).find((a) => a === `--${name}` || a.startsWith(`--${name}=`))
  if (!hit) return null
  return hit.includes('=') ? hit.slice(hit.indexOf('=') + 1) : ''
}

function readPrevious() {
  if (!fs.existsSync(OUT)) return {}
  try {
    return JSON.parse(fs.readFileSync(OUT, 'utf8'))
  } catch (err) {
    throw new Error(`make-lastmod: ${OUT} is not readable JSON (${err.message})`)
  }
}

async function main() {
  const hasher = await loadHasher()
  const date = arg('date') || process.env.LASTMOD_DATE || hasher.todayUtc()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`make-lastmod: --date must be YYYY-MM-DD, got "${date}"`)
  }
  const check = arg('check') !== null

  const hashes = hasher.sourceHashes(ROOT)
  const previous = readPrevious()
  const { file, added, changed, removed } = hasher.nextLastmod(hashes, previous, date)

  // Two spaces and a trailing newline: the shape prettier leaves JSON in, so a
  // regenerated file never shows up as a whitespace diff.
  const text = `${JSON.stringify(file, null, 2)}\n`
  const before = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : ''
  const stale = text !== before

  if (check) {
    if (stale) {
      console.error(
        `lastmod: STALE — ${added.length} new, ${changed.length} changed, ${removed.length} removed. Run: npm run lastmod`
      )
      for (const url of [...added, ...changed].slice(0, 10)) console.error(`  ${url}`)
      process.exit(1)
    }
    console.log(`lastmod: up to date (${Object.keys(file).length} URLs)`)
    return
  }

  fs.writeFileSync(OUT, text)
  const dates = new Set(Object.values(file).map((e) => e.lastmod))
  console.log(
    `lastmod: wrote ${Object.keys(file).length} URLs to src/data/lastmod.json — ` +
      `${added.length} new, ${changed.length} changed, ${removed.length} removed, ` +
      `${Object.keys(file).length - added.length - changed.length} unchanged (kept their date). ` +
      `${dates.size} distinct date${dates.size === 1 ? '' : 's'}.`
  )
  for (const url of [...added, ...changed].slice(0, 20)) console.log(`  ${date}  ${url}`)
  if (added.length + changed.length > 20) console.log(`  … and ${added.length + changed.length - 20} more`)
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
