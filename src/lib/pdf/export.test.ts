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

  it('PdfMultiPageUnsupportedError falls back to print silently (expected, not a bug) — no console.error', async () => {
    renderResumePdfMock.mockRejectedValue(new PdfMultiPageUnsupportedError('resume does not fit on one page'))

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
})
