import type { PDFDocument, PDFFont } from 'pdf-lib'

export class PdfFontMissingError extends Error {}

let indexPromise: Promise<Record<string, string>> | null = null
export function loadPdfFontIndex(): Promise<Record<string, string>> {
  if (!indexPromise) {
    indexPromise = fetch('/fonts-pdf/index.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('font index missing'))))
      .catch((e) => { indexPromise = null; throw e })
  }
  return indexPromise
}

const slug = (family: string) =>
  family.replace(/^['"]|['"]$/g, '').split(',')[0].trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/** Pure font-key resolution, exported for testing. */
export function resolveFontKey(index: Record<string, string>, family: string, weight: number): string | null {
  const fam = slug(family)
  if (index[`${fam}|${weight}`]) return `${fam}|${weight}`
  const weights = Object.keys(index)
    .filter((k) => k.startsWith(`${fam}|`))
    .map((k) => Number(k.split('|')[1]))
    .sort((a, b) => Math.abs(a - weight) - Math.abs(b - weight))
  return weights.length ? `${fam}|${weights[0]}` : null
}

/** Embeds each (family, weight) once per document. */
export class PdfFontCache {
  private cache = new Map<string, Promise<PDFFont>>()
  constructor(private doc: PDFDocument, private index: Record<string, string>) {}

  embed(family: string, weight: number): Promise<PDFFont> {
    const key = this.resolve(family, weight)
    if (!key) throw new PdfFontMissingError(`no static font for ${family} ${weight}`)
    let p = this.cache.get(key)
    if (!p) {
      p = fetch(`/fonts-pdf/${this.index[key]}`)
        .then((r) => r.arrayBuffer())
        .then((b) => this.doc.embedFont(b, { subset: true }))
      this.cache.set(key, p)
    }
    return p
  }

  /** exact weight, else nearest weight in the same family */
  private resolve(family: string, weight: number): string | null {
    return resolveFontKey(this.index, family, weight)
  }
}
