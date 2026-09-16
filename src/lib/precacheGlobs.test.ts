import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { minimatch } from 'minimatch'

/**
 * What installs on a first visit, and what does not.
 *
 * The service worker's precache is built from globs over the BUILT folder, and
 * a glob that matches too much costs every visitor the difference before the
 * page paints — silently, which is how 58 pre-rendered template pages (11.2%
 * of the precache) and, later, all 175 page images (17.1 MB) each shipped in
 * every install for a while. Nothing in the app says so; only a measurement,
 * or this file, does.
 *
 * vite.config.ts cannot be imported here (its PWA plugin wants a real build
 * context — see vitest.config.ts), so the rules are read out of its source and
 * matched with minimatch, which is the matcher the glob workbox runs on uses.
 */
describe('what the service worker precaches', () => {
  const root = path.resolve(__dirname, '../..')
  const config = fs.readFileSync(path.join(root, 'vite.config.ts'), 'utf8')

  /** The quoted entries of one array literal in the config's workbox block. */
  function list(key: string): string[] {
    const m = config.match(new RegExp(`${key}: \\[([\\s\\S]*?)\\n\\s*\\]`))
    expect(m, `${key} not found in vite.config.ts`).toBeTruthy()
    return [...(m as RegExpMatchArray)[1].matchAll(/'([^']+)'/g)].map((x) => x[1])
  }

  const patterns = list('globPatterns')
  const ignores = list('globIgnores')

  /** Every picture file the build copies to dist, dist-relative. */
  const pictures = (['templates', 'examples'] as const).flatMap((kind) => {
    const dir = path.join(root, 'public', 'img', kind)
    const big = fs.readdirSync(dir).filter((f) => f.endsWith('.webp'))
    const thumbs = fs.readdirSync(path.join(dir, 'thumb')).filter((f) => f.endsWith('.webp'))
    return [...big.map((f) => `img/${kind}/${f}`), ...thumbs.map((f) => `img/${kind}/thumb/${f}`)]
  })

  const swept = (file: string) => patterns.some((p) => minimatch(file, p))
  const ignored = (file: string) => ignores.some((p) => minimatch(file, p))

  it('would sweep up every page picture, big and thumb, without an ignore', () => {
    // The point of the two assertions below: the webp glob is what makes the
    // ignores necessary. If this ever stops being true, they are dead lines.
    expect(pictures.length).toBeGreaterThan(300)
    expect(pictures.filter((f) => !swept(f))).toEqual([])
  })

  it('leaves all of them out — including the twins in thumb/', () => {
    const leaked = pictures.filter((f) => !ignored(f))
    expect(leaked).toEqual([])
  })

  it('names the thumb folders separately, because a * does not cross a slash', () => {
    // The exact failure this guards: the two big-picture ignores look like they
    // cover the whole folder, and they do not.
    expect(minimatch('img/examples/thumb/ux-designer.webp', 'img/examples/*.webp')).toBe(false)
    expect(ignores).toContain('img/templates/thumb/*.webp')
    expect(ignores).toContain('img/examples/thumb/*.webp')
  })

  it('still precaches the app itself', () => {
    for (const f of ['index.html', 'assets/index-abc123.js', 'shell.html', 'fonts/inter-latin-400.woff2']) {
      expect(swept(f), f).toBe(true)
      expect(ignored(f), f).toBe(false)
    }
  })

  /**
   * The other half of the deal: what the precache refuses, the runtime cache
   * keeps once it has actually been looked at. A pattern that misses the thumb
   * paths would mean a grid re-downloads every card on a second visit and
   * shows nothing offline — which is exactly what the previous /og/ pattern
   * did, for two years, because [^/]+ cannot cross a slash either.
   */
  it('runtime-caches the pictures it refused, thumbs included', () => {
    const m = config.match(/urlPattern: (\/[^\n]+\/),\n\s*handler: 'CacheFirst',\n\s*\/\/ Thirty days/)
    expect(m, 'the /img/ + /og/ runtime rule moved').toBeTruthy()
    const body = (m as RegExpMatchArray)[1]
    const re = new RegExp(body.slice(1, -1))
    for (const url of [
      '/img/examples/ux-designer.webp',
      '/img/examples/thumb/ux-designer.webp',
      '/img/templates/atlas.webp',
      '/img/templates/thumb/atlas.webp',
      '/og/atlas.jpg',
      '/og/examples/ux-designer.jpg',
    ]) {
      expect(re.test(url), url).toBe(true)
    }
  })
})
