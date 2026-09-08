import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ResumeDocument } from '@/types/document'

const { exportResumePdfMock, lastUnsupportedCharactersMock } = vi.hoisted(() => ({
  exportResumePdfMock: vi.fn(),
  lastUnsupportedCharactersMock: vi.fn((): string[] => []),
}))
vi.mock('./export', () => ({ exportResumePdf: exportResumePdfMock }))
vi.mock('./metrics', () => ({ lastUnsupportedCharacters: lastUnsupportedCharactersMock }))
// The stores pull storage in for their constants; nothing that touches idb
// runs here, and the persistence calls are stubbed so none can.
vi.mock('@/lib/storage', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/storage')>()),
  loadSettings: vi.fn(),
  saveSettings: vi.fn(),
  loadAllDocs: vi.fn(),
  saveDoc: vi.fn(),
}))

import { formatSize, runPdfExport } from './exportFlow'
import { useEditorStore } from '@/store/useEditorStore'
import { useAppStore } from '@/store/useAppStore'

const doc = { id: 'doc-1' } as ResumeDocument
const toasts = () => useAppStore.getState().toasts.map((t) => `${t.kind}: ${t.message}`)

describe('runPdfExport', () => {
  beforeEach(() => {
    exportResumePdfMock.mockReset()
    lastUnsupportedCharactersMock.mockReset().mockReturnValue([])
    useEditorStore.getState().setPdfExporting(false)
    useAppStore.setState({ toasts: [] })
  })

  it('shows the generating state while the render runs, then says what was downloaded', async () => {
    let finish!: (r: unknown) => void
    exportResumePdfMock.mockReturnValue(new Promise((res) => (finish = res)))

    const run = runPdfExport(doc)
    expect(useEditorStore.getState().pdfExporting).toBe(true)
    await vi.waitFor(() => expect(exportResumePdfMock).toHaveBeenCalledTimes(1))

    finish({ fileName: 'Jane_Doe_Resume.pdf', pages: 2, bytes: 151_552 })
    await run

    expect(useEditorStore.getState().pdfExporting).toBe(false)
    expect(toasts()).toEqual(['success: Downloaded Jane_Doe_Resume.pdf · 2 pages · 148 KB'])
  })

  it('a failure clears the generating state and says nothing was downloaded, with the reason', async () => {
    exportResumePdfMock.mockRejectedValue(new Error('The PDF renderer hit an error (boom).'))

    await runPdfExport(doc)

    expect(useEditorStore.getState().pdfExporting).toBe(false)
    expect(toasts()).toEqual(["error: Couldn't generate the PDF, so nothing was downloaded. The PDF renderer hit an error (boom)."])
  })

  it('a second click while a render is in flight starts nothing', async () => {
    let finish!: (r: unknown) => void
    exportResumePdfMock.mockReturnValue(new Promise((res) => (finish = res)))

    const first = runPdfExport(doc)
    // the flow reaches the renderer after its on-demand imports settle
    await vi.waitFor(() => expect(exportResumePdfMock).toHaveBeenCalledTimes(1))
    await runPdfExport(doc)
    expect(exportResumePdfMock).toHaveBeenCalledTimes(1)

    finish({ fileName: 'a.pdf', pages: 1, bytes: 1024 })
    await first
  })

  it('characters the fonts could not draw are reported instead of a plain success', async () => {
    exportResumePdfMock.mockResolvedValue({ fileName: 'a.pdf', pages: 1, bytes: 1024 })
    lastUnsupportedCharactersMock.mockReturnValue(['అ', 'ఖ'])

    await runPdfExport(doc)

    expect(toasts()).toEqual(['error: Downloaded a.pdf, but 2 characters could not be drawn and were left out: అ ఖ. No bundled font has these characters yet.'])
  })
})

describe('formatSize', () => {
  it('reads as a file size', () => {
    expect(formatSize(300)).toBe('1 KB')
    expect(formatSize(151_552)).toBe('148 KB')
    expect(formatSize(2.5 * 1024 * 1024)).toBe('2.5 MB')
  })
})
