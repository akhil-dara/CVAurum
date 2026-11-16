import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ResumeDocument } from '@/types/document'

// vi.mock factories are hoisted above imports, so anything they reference
// must come from vi.hoisted — plain `const x = vi.fn()` above the calls
// would NOT be visible inside them.
const { renderResumePdfMock, lastRenderedPageCountMock, pdfBaseNameMock, saveDocMock } = vi.hoisted(() => ({
  renderResumePdfMock: vi.fn(),
  lastRenderedPageCountMock: vi.fn(() => 1),
  pdfBaseNameMock: vi.fn(() => 'Jane_Doe_Resume_2026-08-14'),
  saveDocMock: vi.fn(),
}))

// Keep the real PdfMultiPageUnsupportedError class (export.ts's `instanceof`
// check must see the SAME class the test throws) — only render itself is
// swapped for a spy.
vi.mock('./render', async () => {
  const actual = await vi.importActual<typeof import('./render')>('./render')
  return { ...actual, renderResumePdf: renderResumePdfMock, lastRenderedPageCount: lastRenderedPageCountMock }
})
vi.mock('@/lib/pdf', () => ({
  pdfBaseName: pdfBaseNameMock,
}))
vi.mock('@/lib/storage', () => ({
  saveDoc: saveDocMock,
}))

// This suite runs under vitest's plain 'node' environment (see
// vitest.config.ts — no jsdom/happy-dom), so `document`/`URL` are stubbed
// with the minimal fakes exportResumePdf actually touches — same approach as
// the neighbouring DOM-adjacent tests in this directory.
import { exportResumePdf, PdfExportError } from './export'
import { PdfMultiPageUnsupportedError } from './render'

const doc = { id: 'doc-1' } as ResumeDocument

describe('exportResumePdf', () => {
  const originalDocument = globalThis.document
  const originalURL = globalThis.URL
  const originalConsoleError = console.error

  let lastAnchor: {
    href: string
    download: string
    click: ReturnType<typeof vi.fn>
    remove: ReturnType<typeof vi.fn>
  } | null
  let createObjectURL: ReturnType<typeof vi.fn>
  let revokeObjectURL: ReturnType<typeof vi.fn>

  beforeEach(() => {
    renderResumePdfMock.mockReset()
    lastRenderedPageCountMock.mockReset().mockReturnValue(1)
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

    console.error = vi.fn()
    vi.useFakeTimers()
  })

  afterEach(() => {
    globalThis.document = originalDocument
    globalThis.URL = originalURL
    console.error = originalConsoleError
    vi.useRealTimers()
  })

  it('downloads the native render under the resume filename and reports pages and size', async () => {
    renderResumePdfMock.mockResolvedValue(new Uint8Array([1, 2, 3]))
    lastRenderedPageCountMock.mockReturnValue(2)

    const result = await exportResumePdf(doc)

    expect(result).toEqual({ kind: 'file', fileName: 'Jane_Doe_Resume_2026-08-14.pdf', pages: 2, bytes: 3 })
    expect(saveDocMock).toHaveBeenCalledWith(doc)
    expect(lastAnchor?.download).toBe('Jane_Doe_Resume_2026-08-14.pdf')
    expect(lastAnchor?.click).toHaveBeenCalledTimes(1)
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    // downloadBlob defers the revoke by a beat so the click has time to start
    // the save — not revoked synchronously.
    expect(revokeObjectURL).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1000)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    expect(console.error).not.toHaveBeenCalled()
  })

  it('a renderer failure is reported as a failed export and downloads NOTHING', async () => {
    renderResumePdfMock.mockRejectedValue(new Error('fontkit.create is not a function'))

    await expect(exportResumePdf(doc)).rejects.toBeInstanceOf(PdfExportError)
    await expect(exportResumePdf(doc)).rejects.toThrow(/renderer hit an error \(fontkit\.create is not a function\)/)
    expect(lastAnchor).toBeNull()
    expect(createObjectURL).not.toHaveBeenCalled()
    // logged unconditionally so a bug report carries the real error
    expect(console.error).toHaveBeenCalled()
  })

  it('a document with no legal page break is explained in the author’s terms, and still downloads nothing', async () => {
    renderResumePdfMock.mockRejectedValue(new PdfMultiPageUnsupportedError('no legal page-break candidate exists'))

    await expect(exportResumePdf(doc)).rejects.toThrow(/no place where a page can end/)
    expect(lastAnchor).toBeNull()
  })

  it('saves a right-to-left resume from the browser print window instead of drawing it', async () => {
    // The native renderer paints run by run with pdf-lib: no GSUB joining, no
    // bidi reordering, so Persian/Arabic comes out as disconnected, reverse
    // ordered letters. The browser's own engine shapes it, and the print view
    // renders the same mirrored DOM (TemplateRenderer + dir="rtl").
    renderResumePdfMock.mockResolvedValue(new Uint8Array([1, 2, 3]))
    const tab = { location: { href: '' } }
    const open = vi.fn(() => tab)
    const assign = vi.fn()
    // @ts-expect-error the node test env has no window; the print path needs one
    globalThis.window = { open, location: { assign } }

    const rtlDoc = { id: 'doc-fa', metadata: { layout: { rtl: true } } } as unknown as ResumeDocument
    const result = await exportResumePdf(rtlDoc)

    expect(saveDocMock).toHaveBeenCalledWith(rtlDoc)
    // opened before the first await, so the browser counts it as the click
    expect(open).toHaveBeenCalledWith('about:blank', '_blank')
    expect(tab.location.href).toBe('/print/doc-fa')
    expect(result).toEqual({ kind: 'print', fileName: 'Jane_Doe_Resume_2026-08-14.pdf' })
    // nothing is drawn or downloaded here
    expect(renderResumePdfMock).not.toHaveBeenCalled()
    expect(createObjectURL).not.toHaveBeenCalled()
    expect(assign).not.toHaveBeenCalled()
    delete (globalThis as { window?: unknown }).window
  })

  it('has exactly one print path — the RTL one — and no hidden fallback', () => {
    // The rule the user set, made executable: a fallback that hands over a
    // different document would hide renderer regressions. The browser print
    // path is allowed ONLY for a right-to-left resume, where the native
    // renderer cannot shape the script, and exportFlow announces it.
    const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'export.ts'), 'utf8')
    expect(source).not.toMatch(/pdf-engine/)
    const printAt = source.indexOf('/print/${doc.id}')
    const renderAt = source.indexOf('await renderResumePdf')
    expect(printAt).toBeGreaterThan(-1)
    expect(renderAt).toBeGreaterThan(printAt)
  })
})
