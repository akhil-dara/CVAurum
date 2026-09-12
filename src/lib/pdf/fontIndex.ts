/**
 * The PDF font index, and the rule for picking a file out of it.
 *
 * Its own module because the export's font machinery (fonts.ts) pulls in
 * pdf-lib and fontkit, which belong in the lazily-loaded export chunk and must
 * never reach the editor's bundle. The warmer (fontWarm.ts) needs the index
 * and the rule and nothing else, so both live here, dependency-free.
 */

let indexPromise: Promise<Record<string, string>> | null = null

/** family|weight -> file name under /fonts-pdf/. Fetched once. */
export function loadPdfFontIndex(): Promise<Record<string, string>> {
  if (!indexPromise) {
    indexPromise = fetch('/fonts-pdf/index.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('font index missing'))))
      .catch((e) => {
        indexPromise = null
        throw e
      })
  }
  return indexPromise
}

const slug = (family: string) =>
  family
    .replace(/^['"]|['"]$/g, '')
    .split(',')[0]
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/** Pure font-key resolution: exact weight, else nearest weight in the family. */
export function resolveFontKey(index: Record<string, string>, family: string, weight: number): string | null {
  const fam = slug(family)
  if (index[`${fam}|${weight}`]) return `${fam}|${weight}`
  const weights = Object.keys(index)
    .filter((k) => k.startsWith(`${fam}|`))
    .map((k) => Number(k.split('|')[1]))
    .sort((a, b) => Math.abs(a - weight) - Math.abs(b - weight))
  return weights.length ? `${fam}|${weights[0]}` : null
}
