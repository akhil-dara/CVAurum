import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import LASTMOD from '@/data/lastmod.json'
import {
  INDEXNOW_ENDPOINT,
  INDEXNOW_MAX_URLS,
  hostOf,
  indexNowBodies,
  indexNowBody,
  indexNowStatusMeaning,
  isValidKey,
  keyLocation,
  urlsChangedWithin,
} from '@/lib/indexNow'
import { SITE, publicUrls } from '@/lib/seoPages'

const PUBLIC = fileURLToPath(new URL('../../public/', import.meta.url))
const recorded = LASTMOD as Record<string, { hash: string; lastmod: string }>

/** The one key file the site publishes, named for the key it holds. */
function keyFiles(): string[] {
  return fs.readdirSync(PUBLIC).filter((f) => /^[0-9a-f]{8,128}\.txt$/i.test(f))
}

describe('the key that proves the site is ours', () => {
  it('is published exactly once, at the site root', () => {
    // Two keys in public/ and nothing can say which one the site is claiming.
    expect(keyFiles()).toHaveLength(1)
  })

  it('is 32 hex characters, and the file holds exactly the key it is named for', () => {
    const file = keyFiles()[0]
    const key = file.slice(0, -'.txt'.length)
    expect(key).toMatch(/^[0-9a-f]{32}$/)
    expect(isValidKey(key)).toBe(true)
    // The protocol reads the file and compares it with the key, character for
    // character — a trailing newline from an editor is a 403.
    expect(fs.readFileSync(`${PUBLIC}${file}`, 'utf8')).toBe(key)
  })

  it('is served from where the body says it is', () => {
    const key = keyFiles()[0].slice(0, -'.txt'.length)
    expect(keyLocation(key)).toBe(`${SITE}/${key}.txt`)
    // …and that URL is the published file, so the check the endpoint makes is
    // the check this asserts.
    expect(fs.existsSync(`${PUBLIC}${key}.txt`)).toBe(true)
  })

  it('refuses a key of the wrong shape', () => {
    expect(isValidKey('')).toBe(false)
    expect(isValidKey('abc')).toBe(false)
    expect(isValidKey('z'.repeat(32))).toBe(false)
    expect(isValidKey(`${'a'.repeat(32)} `)).toBe(false)
    expect(isValidKey('a'.repeat(129))).toBe(false)
    expect(isValidKey('a'.repeat(8))).toBe(true)
  })
})

describe('the request body', () => {
  const key = 'a'.repeat(32)
  const body = (k: string) => indexNowBody(k, publicUrls())

  it('carries the four fields the protocol reads, and nothing else', () => {
    const body = indexNowBody(key, [`${SITE}/`, `${SITE}/templates`])
    expect(Object.keys(body).sort()).toEqual(['host', 'key', 'keyLocation', 'urlList'])
    expect(body.host).toBe('cvaurum.com')
    expect(body.key).toBe(key)
    expect(body.keyLocation).toBe(`${SITE}/${key}.txt`)
    expect(body.urlList).toEqual([`${SITE}/`, `${SITE}/templates`])
  })

  it('names the bare host, never the scheme', () => {
    expect(hostOf()).toBe('cvaurum.com')
    expect(body(key).host).not.toContain('https')
  })

  it('is JSON that survives a round trip', () => {
    const sent = JSON.parse(JSON.stringify(body(key)))
    expect(sent.urlList).toHaveLength(publicUrls().length)
    expect(sent.urlList[0]).toBe(`${SITE}/`)
  })

  it('refuses to build something the endpoint would reject', () => {
    expect(() => indexNowBody('not-hex', [`${SITE}/`])).toThrow(/8–128 hex/)
    expect(() => indexNowBody(key, [])).toThrow(/nothing to submit/)
    // A URL on another host is the documented 422, and the commonest mistake.
    expect(() => indexNowBody(key, [`${SITE}/`, 'https://example.com/x'])).toThrow(/not on cvaurum.com/)
    expect(() => indexNowBody(key, ['/templates'])).toThrow(/not on cvaurum.com/)
  })

  it('splits a list longer than one request may carry', () => {
    const many = Array.from({ length: INDEXNOW_MAX_URLS + 5 }, (_, i) => `${SITE}/templates/x${i}`)
    const bodies = indexNowBodies(key, many)
    expect(bodies).toHaveLength(2)
    expect(bodies[0].urlList).toHaveLength(INDEXNOW_MAX_URLS)
    expect(bodies[1].urlList).toHaveLength(5)
    expect(bodies.flatMap((b) => b.urlList)).toEqual(many)
  })

  it('sends this site in one request as it stands', () => {
    expect(indexNowBodies(key, publicUrls())).toHaveLength(1)
  })

  it('posts to the shared endpoint, so one call reaches every engine', () => {
    expect(INDEXNOW_ENDPOINT).toBe('https://api.indexnow.org/indexnow')
  })
})

describe('choosing what to submit', () => {
  const dates = [...new Set(Object.values(recorded).map((e) => e.lastmod))].sort()
  const newest = dates[dates.length - 1]

  it('submits everything when the window covers every recorded date', () => {
    const span = Math.ceil((Date.parse(`${newest}T00:00:00Z`) - Date.parse(`${dates[0]}T00:00:00Z`)) / 86400000)
    expect(urlsChangedWithin(span, newest)).toEqual(publicUrls())
  })

  it('submits only the pages inside the window', () => {
    const sameDay = urlsChangedWithin(0, newest)
    const expected = publicUrls().filter((u) => recorded[new URL(u).pathname].lastmod === newest)
    expect(sameDay).toEqual(expected)
  })

  it('submits nothing when nothing moved in the window', () => {
    // A day far past every recorded date: the window ends after them all.
    expect(urlsChangedWithin(0, '2099-12-31')).toEqual([])
  })

  it('keeps the order the sitemap uses, so a submission is readable', () => {
    const all = urlsChangedWithin(3650, newest)
    expect(all).toEqual(publicUrls().filter((u) => all.includes(u)))
  })

  it('refuses a window that is not a number of days', () => {
    expect(() => urlsChangedWithin(-1, newest)).toThrow(/zero or more/)
    expect(() => urlsChangedWithin(Number.NaN, newest)).toThrow(/zero or more/)
  })
})

describe('what comes back', () => {
  it('says what each documented status means', () => {
    expect(indexNowStatusMeaning(200)).toContain('accepted')
    expect(indexNowStatusMeaning(403)).toContain('key file')
    expect(indexNowStatusMeaning(422)).toContain('host')
    expect(indexNowStatusMeaning(429)).toContain('too often')
    expect(indexNowStatusMeaning(500)).toContain('unexpected status 500')
  })
})
