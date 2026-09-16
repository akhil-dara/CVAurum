/**
 * IndexNow (indexnow.org) — telling search engines a page changed, instead of
 * waiting to be asked.
 *
 * A sitemap is a standing invitation: an engine re-reads it when it feels like
 * it, which for a small site can be days. IndexNow is the other direction — one
 * HTTP POST naming the URLs that moved, which the participating engines share
 * between themselves, so a submission to one reaches the rest. It is an open
 * protocol with no account, no key exchange and no rate card: ownership is
 * proved by serving a file named after the key, at the root of the site, whose
 * contents are the key.
 *
 * Everything here is PURE — it builds the request body and decides which URLs
 * belong in it, and makes no network call. scripts/indexnow.cjs is the part
 * that speaks HTTP, and this is the part with a unit test, because a body that
 * is wrong in a field is rejected as a whole and there is nothing to see.
 */
import { SITE, lastmodEntry, publicUrls } from '@/lib/seoPages'

/** Re-exported so the submission script loads ONE module. */
export { publicUrls, SITE }

/** Where a submission is POSTed. The generic endpoint hands it on to every
 *  participating engine, so there is one call to make, not one per engine. */
export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'

/** The protocol's ceiling for one request. This site is far under it; the
 *  submission is split anyway, because "far under it" is a fact about today. */
export const INDEXNOW_MAX_URLS = 10000

export interface IndexNowBody {
  /** The bare host — no scheme, no path. */
  host: string
  /** 8–128 hexadecimal characters. */
  key: string
  /** The absolute URL of the file that proves the key. */
  keyLocation: string
  urlList: string[]
}

/** The host a set of URLs belongs to, as the body must spell it. */
export function hostOf(site: string = SITE): string {
  return new URL(site).host
}

/** Where the key file has to be served from: the site root, named for the key. */
export function keyLocation(key: string, site: string = SITE): string {
  return `${site.replace(/\/$/, '')}/${key}.txt`
}

/** A key the protocol will accept: 8–128 hex characters. The generator writes
 *  32, which is what this repository ships. */
export function isValidKey(key: string): boolean {
  return /^[0-9a-fA-F]{8,128}$/.test(key)
}

/**
 * Every public URL, or only those whose recorded lastmod is within `days` of
 * `today` — the difference between "here is the whole site" (what a new key or
 * a rebuilt library wants) and "here is what changed this week" (what a normal
 * deploy wants). `days: 0` is a valid answer meaning "changed today".
 *
 * The dates come from src/data/lastmod.json, which is the point: a deploy that
 * changed nothing submits nothing, rather than asking every engine to re-crawl
 * 180 unchanged pages.
 */
export function urlsChangedWithin(days: number, today: string): string[] {
  if (!Number.isFinite(days) || days < 0) throw new Error(`indexNow: --days must be zero or more, got ${days}`)
  const cutoff = new Date(`${today}T00:00:00Z`)
  cutoff.setUTCDate(cutoff.getUTCDate() - days)
  const from = cutoff.toISOString().slice(0, 10)
  return publicUrls().filter((url) => {
    const entry = lastmodEntry(new URL(url).pathname)
    // A URL with no recorded date is a page the generator has not seen yet;
    // it is new by definition, so it goes in rather than being skipped.
    return !entry || entry.lastmod >= from
  })
}

/**
 * The request body, exactly as the protocol reads it.
 *
 * Throws rather than posting something that will be refused: a key of the wrong
 * shape, a URL on another host, or an empty list are all rejections that come
 * back as one opaque status code.
 */
export function indexNowBody(key: string, urls: readonly string[], site: string = SITE): IndexNowBody {
  if (!isValidKey(key)) throw new Error(`indexNow: key must be 8–128 hex characters, got "${key}"`)
  if (!urls.length) throw new Error('indexNow: nothing to submit')
  const host = hostOf(site)
  const wrong = urls.filter((u) => {
    try {
      return new URL(u).host !== host
    } catch {
      return true
    }
  })
  if (wrong.length) throw new Error(`indexNow: ${wrong.length} URL(s) not on ${host}, first "${wrong[0]}"`)
  if (urls.length > INDEXNOW_MAX_URLS) throw new Error(`indexNow: ${urls.length} URLs exceeds the ${INDEXNOW_MAX_URLS} a request may carry`)
  return { host, key, keyLocation: keyLocation(key, site), urlList: [...urls] }
}

/** One body per request when a list is longer than a request may carry. */
export function indexNowBodies(key: string, urls: readonly string[], site: string = SITE): IndexNowBody[] {
  const out: IndexNowBody[] = []
  for (let i = 0; i < urls.length; i += INDEXNOW_MAX_URLS) {
    out.push(indexNowBody(key, urls.slice(i, i + INDEXNOW_MAX_URLS), site))
  }
  return out
}

/**
 * What the endpoint's status codes mean. The protocol answers with a status and
 * no body worth reading, so a script that only printed the number would leave
 * whoever ran it to look it up.
 */
export function indexNowStatusMeaning(status: number): string {
  switch (status) {
    case 200:
      return 'accepted — the URLs are queued for every participating engine'
    case 202:
      return 'accepted, key still being validated — check that the key file is reachable'
    case 400:
      return 'bad request — the body was malformed'
    case 403:
      return 'forbidden — the key file was not found at keyLocation, or did not contain the key'
    case 422:
      return 'unprocessable — a URL did not belong to the host, or the key did not match'
    case 429:
      return 'too many requests — submitting too often'
    default:
      return `unexpected status ${status}`
  }
}
