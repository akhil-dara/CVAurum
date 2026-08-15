import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ResumeDocument } from '@/types/document'

// vi.mock factories are hoisted above imports, so anything they reference
// must come from vi.hoisted — plain `const x = vi.fn()` above the calls
// would NOT be visible inside them.
const { renderResumePdfMock, openPrintWindowMock, pdfBaseNameMock, saveDocMock } = vi.hoisted(() => ({
  renderResumePdfMock: vi.fn(),
  openPrintWindowMock: vi.fn(),
  pdfBaseNameMock: vi.fn(() => 'Jane_Doe_Resume_2026-08-14'),
  saveDocMock: vi.fn(),
}))

// Keep the real PdfMultiPageUnsupportedError class (export.ts's `instanceof`
// check must see the SAME class the test throws) — only render itself is
// swapped for a spy.
vi.mock('./render', async () => {
  const actual = await vi.importActual<typeof import('./render')>('./render')
  return { ...actual, renderResumePdf: renderResumePdfMock }
})
vi.mock('@/lib/pdf', () => ({
  openPrintWindow: openPrintWindowMock,
  pdfBaseName: pdfBaseNameMock,
}))
vi.mock('@/lib/storage', () => ({
  saveDoc: saveDocMock,
}))

// This suite runs under vitest's plain 'node' environment (see
// vitest.config.ts — no jsdom/happy-dom), so `document`/`URL`/`localStorage`
// are stubbed with the minimal fakes exportResumePdf actually touches —
// same approach as the neighbouring DOM-adjacent tests in this directory
// (text.test.ts, walk.test.ts).
import { exportResumePdf } from './export'
import { PdfMultiPageUnsupportedError } from './render'

const doc = { id: 'doc-1' } as ResumeDocument

describe('exportResumePdf', () => {
  const originalDocument = globalThis.document
  const originalURL = globalThis.URL
  const originalLocalStorage = globalThis.localStorage
  const originalConsoleError = console.error

  let lastAnchor: {
    href: string
    download: string
    click: ReturnType<typeof vi.fn>
    remove: ReturnType<typeof vi.fn>
  } | null
  let createObjectURL: ReturnType<typeof vi.fn>
  let revokeObjectURL: ReturnType<typeof vi.fn>
  let store: Record<string, string>

  beforeEach(() => {
    renderResumePdfMock.mockReset()
    openPrintWindowMock.mockReset()
    pdfBaseNameMock.mockClear()
    saveDocMock.mockReset()

    lastAnchor = null
    globalThis.document = {
      createElement: vi.fn((tag: string) => {
        const el = { href: '', download: '', click: vi.fn(), remove: vi.fn() }
        if (tag === 'a') lastAnchor = el
        return el
      }),
      body: { appendChild: vi.fn() },
    } as unknown as Document

    createObjectURL = vi.fn(() => 'blob:mock-url')
    revokeObjectURL = vi.fn()
    globalThis.URL = { ...originalURL, createObjectURL, revokeObjectURL } as unknown as typeof URL

    store = {}
    globalThis.localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v
      },
      removeItem: (k: string) => {
        delete store[k]
      },
      clear: () => {
        store = {}
      },
      key: () => null,
      length: 0,
    } as unknown as Storage

    console.error = vi.fn()
    vi.useFakeTimers()
  })

  afterEach(() => {
    globalThis.document = originalDocument
    globalThis.URL = originalURL
    globalThis.localStorage = originalLocalStorage
    console.error = originalConsoleError
    vi.useRealTimers()
  })

  it("flag 'print' forces the print fallback and never touches the native renderer", async () => {
    store['cvaurum:pdf-engine'] = 'print'

    const outcome = await exportResumePdf(doc)

    expect(outcome).toBe('print-fallback')
    expect(renderResumePdfMock).not.toHaveBeenCalled()
    expect(openPrintWindowMock).toHaveBeenCalledWith('doc-1')
    expect(saveDocMock).toHaveBeenCalledWith(doc)
  })

  it('native success triggers a download with the print-page filename convention, returns native, and revokes the object URL', async () => {
    renderResumePdfMock.mockResolvedValue(new Uint8Array([1, 2, 3]))

    const outcome = await exportResumePdf(doc)

    expect(outcome).toBe('native')
    expect(openPrintWindowMock).not.toHaveBeenCalled()
    expect(lastAnchor?.download).toBe('Jane_Doe_Resume_2026-08-14.pdf')
    expect(lastAnchor?.click).toHaveBeenCalledTimes(1)
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    // downloadBlob defers the revoke by a beat so the click has time to start
    // the save — not revoked synchronously.
    expect(revokeObjectURL).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1000)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('an overflowing auto-fit-off doc resolves via the native path (page count itself is mocked, not verified here) -> download with correct filename, no print fallback', async () => {
    // renderResumePdf itself does the pagination (walk.ts/paginate.ts/paint.ts,
    // native-multipage-pdf plan tasks 1-3) and resolves with the FULL
    // multi-page PDF's bytes exactly like a single-page doc would — from
    // exportResumePdf's perspective a 2-page and 200-page resume are
    // identical: both are just "renderResumePdf resolved", so this mock
    // doesn't (and can't, being a mock) encode page count. What it DOES
    // capture is the task-4 semantics change: a multi-page doc with auto-fit
    // off no longer throws PdfMultiPageUnsupportedError at all (that's the
    // obsolete pre-native-pagination behaviour the old version of this test
    // covered) — it now resolves like any other doc. The real end-to-end
    // claim (actual multi-page bytes, correct page count, pdf-lib producer)
    // is not reproducible here since this suite runs under vitest's plain
    // node environment with no DOM (see the file-header comment) — verified
    // live instead (task-4 report: Playwright download + pdf.js page count).
    renderResumePdfMock.mockResolvedValue(new Uint8Array([1, 2, 3, 4, 5]))

    const outcome = await exportResumePdf(doc)

    expect(outcome).toBe('native')
    expect(openPrintWindowMock).not.toHaveBeenCalled()
    expect(lastAnchor?.download).toBe('Jane_Doe_Resume_2026-08-14.pdf')
    expect(lastAnchor?.click).toHaveBeenCalledTimes(1)
    expect(console.error).not.toHaveBeenCalled()
  })

  it('impossible pagination (PdfMultiPageUnsupportedError) falls back to print silently (expected, not a bug) — no console.error', async () => {
    // The ONLY two triggers left for this error post-task-4 (see export.ts's
    // catch-block comment): auto-fit ON still overflowing, or paginate()
    // finding no legal break candidate anywhere (PaginationImpossibleError,
    // wrapped by render.tsx's paginateOrThrow). Ordinary multi-page docs no
    // longer reach this branch at all — covered by the test above.
    renderResumePdfMock.mockRejectedValue(
      new PdfMultiPageUnsupportedError('resume cannot be paginated: no legal page-break candidate exists')
    )

    const outcome = await exportResumePdf(doc)

    expect(outcome).toBe('print-fallback')
    expect(openPrintWindowMock).toHaveBeenCalledWith('doc-1')
    expect(console.error).not.toHaveBeenCalled()
  })

  it('a generic render failure logs once and still exports via the print fallback', async () => {
    renderResumePdfMock.mockRejectedValue(new Error('boom'))

    const outcome = await exportResumePdf(doc)

    expect(outcome).toBe('print-fallback')
    expect(console.error).toHaveBeenCalledTimes(1)
    expect(openPrintWindowMock).toHaveBeenCalledWith('doc-1')
  })

  it('a throwing localStorage.getItem (sandboxed/blocked storage) is treated as flag-unset — native path still runs', async () => {
    globalThis.localStorage = {
      ...globalThis.localStorage,
      getItem: () => {
        throw new Error('SecurityError: storage is blocked')
      },
    } as unknown as Storage
    renderResumePdfMock.mockResolvedValue(new Uint8Array([1, 2, 3]))

    const outcome = await exportResumePdf(doc)

    expect(outcome).toBe('native')
    expect(renderResumePdfMock).toHaveBeenCalledTimes(1)
    expect(openPrintWindowMock).not.toHaveBeenCalled()
    expect(lastAnchor?.click).toHaveBeenCalledTimes(1)
    expect(console.error).not.toHaveBeenCalled()
  })
})
