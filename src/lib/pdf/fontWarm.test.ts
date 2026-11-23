import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const INDEX: Record<string, string> = {
  'inter|400': 'inter-400.ttf',
  'inter|700': 'inter-700.ttf',
  'source-serif-4|400': 'source-serif-4-400.ttf',
  'source-serif-4|500': 'source-serif-4-500.ttf',
  'source-serif-4|600': 'source-serif-4-600.ttf',
  'source-serif-4|700': 'source-serif-4-700.ttf',
  'vazirmatn|400': 'vazirmatn-400.ttf',
  'vazirmatn|500': 'vazirmatn-500.ttf',
  'vazirmatn|600': 'vazirmatn-600.ttf',
  'vazirmatn|700': 'vazirmatn-700.ttf',
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
    // A navigator of the test's own: Node has one only from version 21, so a
    // test that reached for the runtime's failed on the CI runner (Node 20)
    // while passing on a newer local Node.
    vi.stubGlobal('navigator', {})
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

  it('leaves the Arabic face to resumes that have Arabic letters', async () => {
    const { pdfFontUrlsFor } = await freshModule()
    // Vazirmatn sits in every fallback chain, but its four files (about
    // 436 KB) are only worth fetching for a page that can reach them.
    expect((await pdfFontUrlsFor(['Inter'])).filter((u) => u.includes('vazirmatn'))).toEqual([])
    expect((await pdfFontUrlsFor(['"Source Serif 4", Georgia, serif'])).filter((u) => u.includes('vazirmatn'))).toEqual([])
    expect((await pdfFontUrlsFor(['Inter'], { arabic: true })).filter((u) => u.includes('vazirmatn')).sort()).toEqual([
      '/fonts-pdf/vazirmatn-400.ttf',
      '/fonts-pdf/vazirmatn-500.ttf',
      '/fonts-pdf/vazirmatn-600.ttf',
      '/fonts-pdf/vazirmatn-700.ttf',
    ])
    // A face the author chose is the page's own, Arabic letters or not.
    expect((await pdfFontUrlsFor(['Vazirmatn'])).filter((u) => u.includes('vazirmatn'))).toHaveLength(4)
  })

  it('fetches no Arabic face for a Latin resume, and all four for one that needs them', async () => {
    const { warmPdfFonts } = await freshModule()
    expect((await warmPdfFonts(['Inter'])).sort()).toEqual(['/fonts-pdf/inter-400.ttf', '/fonts-pdf/inter-700.ttf'])
    expect(vi.mocked(fetch).mock.calls.map((c) => String(c[0])).filter((u) => u.includes('vazirmatn'))).toEqual([])
    expect((await warmPdfFonts(['Inter'], { arabic: true })).sort()).toEqual([
      '/fonts-pdf/vazirmatn-400.ttf',
      '/fonts-pdf/vazirmatn-500.ttf',
      '/fonts-pdf/vazirmatn-600.ttf',
      '/fonts-pdf/vazirmatn-700.ttf',
    ])
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
