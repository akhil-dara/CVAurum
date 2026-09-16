import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import LASTMOD from '@/data/lastmod.json'
import { nextLastmod, sourceHashes, todayUtc } from '@/lib/lastmodHash'
import { lastmodEntry, publicUrlPaths, sitemapXml } from '@/lib/seoPages'

/** The repository root, the way the generator script sees it. */
const ROOT = fileURLToPath(new URL('../../', import.meta.url))

const recorded = LASTMOD as Record<string, { hash: string; lastmod: string }>
const URLS = publicUrlPaths()

describe('the recorded lastmod file', () => {
  it('has an entry for every public URL and nothing else', () => {
    expect(Object.keys(recorded).sort()).toEqual([...URLS].sort())
  })

  it('lists them in sitemap order, so a regenerated file diffs cleanly', () => {
    expect(Object.keys(recorded)).toEqual(URLS)
  })

  it('records a date a sitemap can carry', () => {
    for (const [url, entry] of Object.entries(recorded)) {
      expect(entry.lastmod, url).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      // A date in the future is not a lastmod, it is a promise.
      expect(entry.lastmod <= todayUtc(), url).toBe(true)
      expect(entry.hash, url).toMatch(/^[0-9a-f]{16}$/)
    }
  })

  /**
   * The point of the whole mechanism. Edit a design, a sample, the landing
   * copy or a prompt and this fails until `npm run lastmod` is run — so the
   * sitemap can never claim a page is older than it is, and can never claim
   * a page changed when it did not.
   */
  it('matches the hash of what every page is currently made from', () => {
    const hashes = sourceHashes(ROOT)
    const stale = URLS.filter((url) => recorded[url]?.hash !== hashes[url])
    expect(stale, `stale lastmod entries — run: npm run lastmod\n${stale.slice(0, 10).join('\n')}`).toEqual([])
  })
})

describe('the hashes themselves', () => {
  const hashes = sourceHashes(ROOT)

  it('covers exactly the public URLs', () => {
    expect(Object.keys(hashes).sort()).toEqual([...URLS].sort())
  })

  it('gives different pages different hashes', () => {
    // Not a cryptographic claim: designs share a stylesheet and samples share
    // a design, so a collision here would mean two pages built from the same
    // sources — which would make one of them a duplicate.
    expect(new Set(Object.values(hashes)).size).toBe(URLS.length)
  })

  it('is stable across runs of the same repository', () => {
    expect(sourceHashes(ROOT)).toEqual(hashes)
  })
})

describe('what the generator does with them', () => {
  const hashes = sourceHashes(ROOT)

  it('leaves an unchanged page on the date it already had', () => {
    const { file, added, changed } = nextLastmod(hashes, recorded, '2099-01-01')
    expect([added.length, changed.length]).toEqual([0, 0])
    expect(file).toEqual(recorded)
  })

  it('moves only the page whose sources moved', () => {
    const edited = { ...hashes, '/templates': 'ffffffffffffffff' }
    const { file, changed } = nextLastmod(edited, recorded, '2099-01-01')
    expect(changed).toEqual(['/templates'])
    expect(file['/templates'].lastmod).toBe('2099-01-01')
    expect(file['/'].lastmod).toBe(recorded['/'].lastmod)
  })

  it('dates a page that did not exist before, and drops one that no longer does', () => {
    const previous = { ...recorded, '/templates/gone': { hash: 'a'.repeat(16), lastmod: '2020-01-01' } }
    delete (previous as Record<string, unknown>)['/prompts']
    const { file, added, removed } = nextLastmod(hashes, previous, '2099-01-01')
    expect(added).toEqual(['/prompts'])
    expect(file['/prompts'].lastmod).toBe('2099-01-01')
    expect(removed).toEqual(['/templates/gone'])
    expect(file['/templates/gone']).toBeUndefined()
  })
})

describe('the sitemap reads the file rather than the clock', () => {
  const xml = sitemapXml('2099-12-31')
  const stamps = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1])

  it('stamps every URL with its own recorded date', () => {
    expect(stamps).toHaveLength(URLS.length)
    expect(stamps).toEqual(URLS.map((u) => recorded[u].lastmod))
  })

  it('never falls back to the day of the build while every URL has an entry', () => {
    expect(stamps).not.toContain('2099-12-31')
  })

  it('exposes the entry behind each one', () => {
    for (const url of URLS) expect(lastmodEntry(url), url).toEqual(recorded[url])
    expect(lastmodEntry('/app')).toBeNull()
  })
})
