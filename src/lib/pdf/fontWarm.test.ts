import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const INDEX: Record<string, string> = {
  'inter|400': 'inter-400.ttf',
  'inter|700': 'inter-700.ttf',
  'source-serif-4|400': 'source-serif-4-400.ttf',
  'source-serif-4|500': 'source-serif-4-500.ttf',
  'source-serif-4|600': 'source-serif-4-600.ttf',
  'source-serif-4|700': 'source-serif-4-700.ttf',
}

const online = (v: boolean) => Object.defineProperty(navigator, 'onLine', { value: v, configurable: true })
const okFetch = () =>
  vi.fn(async (url: string) =>
    String(url).endsWith('index.json')
      ? ({ ok: true, json: async () => INDEX } as unknown as Response)
      : ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) } as unknown as Response)
  )

/** A fresh module for each test: the warmer remembers what it has fetched. */
async function freshModule() {
  vi.resetModules()
  return import('./fontWarm')
}

describe('the PDF font warmer', () => {
  beforeEach(() => {
    online(true)
    vi.stubGlobal('fetch', okFetch())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('names every file an export of these families could need, folding the weights it lacks', async () => {
    const { pdfFontUrlsFor } = await freshModule()
    // Inter has 400 and 700 only: 500 and 600 fold onto them, so two files.
    // Its own fallback chain is Inter, which drops out, so nothing is added.
    expect((await pdfFontUrlsFor(['Inter'])).sort()).toEqual(['/fonts-pdf/inter-400.ttf', '/fonts-pdf/inter-700.ttf'])
  })

  it('warms the script fallbacks too, because the export consults them', async () => {
    const { pdfFontUrlsFor } = await freshModule()
    // A serif falls back to Inter, and the exporter walks that chain when it
    // works out which characters no embedded font can draw (fonts.ts
    // `coverage`). Warming the family alone would leave that check offline.
    // A CSS stack resolves by its head, quotes and all.
    const urls = await pdfFontUrlsFor(['"Source Serif 4", Georgia, serif'])
    expect(urls.filter((u) => u.includes('source-serif-4'))).toHaveLength(4)
    expect(urls.filter((u) => u.includes('inter'))).toHaveLength(2)
  })

  it('takes an unknown family down the sans chain, and an empty one nowhere', async () => {
    const { pdfFontUrlsFor } = await freshModule()
    // The index has no Comic Sans MS, and neither has the registry, so it is
    // treated as sans and Inter is warmed for it - exactly what the export
    // would reach for. An empty family contributes nothing at all.
    expect((await pdfFontUrlsFor(['Comic Sans MS'])).sort()).toEqual([
      '/fonts-pdf/inter-400.ttf',
      '/fonts-pdf/inter-700.ttf',
    ])
    expect(await pdfFontUrlsFor([''])).toEqual([])
  })

  it('fetches each file once, however many times it is asked', async () => {
    const { warmPdfFonts } = await freshModule()
    const first = await warmPdfFonts(['Inter'])
    expect(first.sort()).toEqual(['/fonts-pdf/inter-400.ttf', '/fonts-pdf/inter-700.ttf'])
    expect(await warmPdfFonts(['Inter'])).toEqual([])
    // the index once, the two files once, and nothing added by the second call
    expect(vi.mocked(fetch).mock.calls).toHaveLength(3)
  })

  it('holds off with no connection, and when the visitor asked to save data', async () => {
    const { warmPdfFonts } = await freshModule()
    online(false)
    expect(await warmPdfFonts(['Inter'])).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
    online(true)
    Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true })
    expect(await warmPdfFonts(['Inter'])).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
    Object.defineProperty(navigator, 'connection', { value: undefined, configurable: true })
  })

  it('lets a font that did not arrive be tried again later', async () => {
    const { warmPdfFonts } = await freshModule()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        String(url).endsWith('index.json')
          ? ({ ok: true, json: async () => INDEX } as unknown as Response)
          : ({ ok: false, status: 503 } as unknown as Response)
      )
    )
    expect(await warmPdfFonts(['Inter'])).toEqual([])
    vi.stubGlobal('fetch', okFetch())
    expect((await warmPdfFonts(['Inter'])).sort()).toEqual(['/fonts-pdf/inter-400.ttf', '/fonts-pdf/inter-700.ttf'])
  })

  it('never throws when the index itself cannot be reached', async () => {
    const { warmPdfFonts } = await freshModule()
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('Failed to fetch'))))
    await expect(warmPdfFonts(['Inter'])).resolves.toEqual([])
  })
})
