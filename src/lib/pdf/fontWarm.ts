import { scriptFallbacks } from '@/data/fonts'
import { loadPdfFontIndex, resolveFontKey } from './fontIndex'

/**
 * Put this résumé's PDF fonts on the device before they are needed.
 *
 * The export embeds static font instances from /fonts-pdf/ (19.7 MB across 156
 * files), far too much to precache, so they are kept the first time they are
 * fetched. That left a hole the app never admitted to: a résumé that had never
 * been exported WITH a connection could not be exported without one, though
 * the app promises exactly that. Measured on the production build: a first
 * offline export failed on nine .ttf files, 1.79 MB, for the default example.
 *
 * So the handful this document needs are fetched quietly while there IS a
 * connection - the same bytes the export would have fetched, only earlier, and
 * the worker's CacheFirst rule keeps them. Once per set of families, on an idle
 * frame, never on a metered connection, and silent when it fails: nothing here
 * is on the path of anything the author is doing.
 */

/** The weights a template can ask of a family. `resolveFontKey` folds any it
 *  does not have onto the nearest one it does and the Set drops the repeats,
 *  so a family carrying two weights costs two files, not four. */
const WEIGHTS = [400, 500, 600, 700] as const

const warmedUrls = new Set<string>()

/**
 * Every /fonts-pdf/ file an export of these families could need: each family
 * at every weight, and the script fallbacks behind it. The fallbacks are not
 * optional padding - the exporter walks them when it checks which characters
 * no embedded font can draw (fonts.ts `coverage`), and that check is what
 * stops a résumé exporting with whole sentences silently missing.
 */
export async function pdfFontUrlsFor(families: readonly string[]): Promise<string[]> {
  const index = await loadPdfFontIndex()
  const urls = new Set<string>()
  const want = new Set<string>()
  for (const family of families) {
    if (!family) continue
    // The run carries a whole CSS stack; the registry knows its first name.
    const primary = family.split(',')[0].trim().replace(/^['"]|['"]$/g, '')
    want.add(primary)
    for (const fb of scriptFallbacks(primary)) want.add(fb)
  }
  for (const family of want) {
    for (const weight of WEIGHTS) {
      const key = resolveFontKey(index, family, weight)
      const file = key ? index[key] : null
      if (file) urls.add(`/fonts-pdf/${file}`)
    }
  }
  return [...urls]
}

/** True when fetching now would be rude: no connection, or the visitor has
 *  asked the browser to save data. */
function shouldHold(): boolean {
  if (typeof navigator === 'undefined') return true
  if (navigator.onLine === false) return true
  const conn = (navigator as unknown as { connection?: { saveData?: boolean } }).connection
  return !!(conn && conn.saveData)
}

/** Fetches what is missing and returns the URLs it warmed (for the tests and
 *  the probes). Never throws. */
export async function warmPdfFonts(families: readonly string[]): Promise<string[]> {
  if (shouldHold()) return []
  try {
    const urls = (await pdfFontUrlsFor(families)).filter((u) => !warmedUrls.has(u))
    if (!urls.length) return []
    // Marked before the fetch, not after: a second call while these are still
    // in flight must not start them again.
    urls.forEach((u) => warmedUrls.add(u))
    const done: string[] = []
    await Promise.all(
      urls.map((u) =>
        // The bare URL, never a cache-buster: the worker's rule for these ends
        // in `$`, so a query string would make it store nothing at all.
        fetch(u)
          .then((r) => {
            if (!r.ok) throw new Error(String(r.status))
            // Drain the body so the connection closes; the worker has put its
            // own copy in the cache by now.
            return r.arrayBuffer()
          })
          .then(() => {
            done.push(u)
          })
          .catch(() => {
            // A font that did not arrive is not warm: let a later call retry.
            warmedUrls.delete(u)
          })
      )
    )
    return done
  } catch {
    return []
  }
}

/** Warm on an idle frame, so nothing here competes with the editor's work. */
export function scheduleWarmPdfFonts(families: readonly string[]): void {
  if (shouldHold()) return
  const run = () => void warmPdfFonts(families)
  const ric = (globalThis as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number })
    .requestIdleCallback
  if (typeof ric === 'function') ric(run, { timeout: 10000 })
  else setTimeout(run, 4000)
}
