#!/usr/bin/env node
/**
 * Submit the public URLs to the IndexNow endpoint (indexnow.org) after a deploy.
 *
 *   node scripts/indexnow.cjs --dry-run        # print the body, call nothing
 *   node scripts/indexnow.cjs                  # every public URL
 *   node scripts/indexnow.cjs --days=7         # only what changed in 7 days
 *   node scripts/indexnow.cjs --days=7 --date=2026-09-16
 *
 * Run it AFTER the new files are live. The endpoint fetches the key file and
 * then the URLs themselves; submitting a page the host has not published yet
 * asks an engine to crawl the old one.
 *
 * The key is whatever 32-hex-named .txt file sits in public/ — that file IS the
 * proof of ownership, so there is one source for it and no secret to configure.
 * A key is not a credential: it proves nothing but that whoever holds it can
 * publish at the site root, which is why it is committed.
 *
 * The body construction is src/lib/indexNow.ts and is unit-tested
 * (src/lib/indexNow.test.ts); this file only chooses the URLs and speaks HTTP.
 */
const fs = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

const ROOT = path.resolve(__dirname, '..')
const PUBLIC = path.join(ROOT, 'public')

/** Compile the pure part into this process — one definition of the body, shared
 *  with the test (the same trick vite.config.ts uses for the SEO plugin). */
async function loadIndexNow() {
  const { build } = await import('esbuild')
  const out = await build({
    entryPoints: [path.join(ROOT, 'src', 'lib', 'indexNow.ts')],
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
  const file = path.join(dir, 'indexNow.mjs')
  fs.writeFileSync(file, out.outputFiles[0].text)
  return import(`${pathToFileURL(file).href}?v=${Date.now()}`)
}

function arg(name) {
  const hit = process.argv.slice(2).find((a) => a === `--${name}` || a.startsWith(`--${name}=`))
  if (!hit) return null
  return hit.includes('=') ? hit.slice(hit.indexOf('=') + 1) : ''
}

/**
 * The key, read off the file that proves it. Exactly one such file may exist:
 * two keys in public/ means nobody can say which one the site is claiming.
 */
function readKey() {
  const candidates = fs
    .readdirSync(PUBLIC)
    .filter((f) => /^[0-9a-f]{8,128}\.txt$/i.test(f))
  if (!candidates.length) {
    throw new Error(
      'indexnow: no key file in public/. Create one:\n' +
        '  node -e "const k=require(\'crypto\').randomBytes(16).toString(\'hex\');' +
        'require(\'fs\').writeFileSync(`public/${k}.txt`,k);console.log(k)"'
    )
  }
  if (candidates.length > 1) {
    throw new Error(`indexnow: ${candidates.length} key files in public/ (${candidates.join(', ')}); keep one`)
  }
  const file = candidates[0]
  const key = file.slice(0, -'.txt'.length)
  const body = fs.readFileSync(path.join(PUBLIC, file), 'utf8').trim()
  if (body !== key) {
    throw new Error(`indexnow: public/${file} must contain exactly the key "${key}", it holds "${body.slice(0, 40)}"`)
  }
  return key
}

async function main() {
  const lib = await loadIndexNow()
  const dryRun = arg('dry-run') !== null
  const daysArg = arg('days')
  const today = arg('date') || process.env.LASTMOD_DATE || new Date().toISOString().slice(0, 10)
  const key = readKey()

  const urls = daysArg === null ? lib.publicUrls() : lib.urlsChangedWithin(Number(daysArg), today)
  if (!urls.length) {
    console.log(`indexnow: nothing changed in the last ${daysArg} day(s) — nothing submitted.`)
    return
  }
  const bodies = lib.indexNowBodies(key, urls)

  if (dryRun) {
    for (const body of bodies) {
      console.log(`POST ${lib.INDEXNOW_ENDPOINT}`)
      console.log('Content-Type: application/json; charset=utf-8')
      console.log(JSON.stringify(body, null, 2))
    }
    console.log(`\nindexnow: DRY RUN — ${urls.length} URL(s) in ${bodies.length} request(s), nothing sent.`)
    return
  }

  for (const [i, body] of bodies.entries()) {
    const res = await fetch(lib.INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
    })
    console.log(
      `indexnow: request ${i + 1}/${bodies.length}, ${body.urlList.length} URL(s) → ${res.status} ${lib.indexNowStatusMeaning(res.status)}`
    )
    if (res.status >= 400) process.exitCode = 1
  }
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
