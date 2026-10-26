/**
 * Preview, page by page: the exported PDF itself, drawn one sheet at a time
 * with real paper between them.
 *
 * Preview used to show the print layout as one continuous strip with a thin
 * line at each break. There was no room for a gap there - the strip is the
 * geometry the PDF is cut from, so a gap drawn on it covered the lines next to
 * each break - and the margins, the page foot and the leftover paper at the
 * foot of a page were not shown at all (2026-10-26). Drawing the PDF's own
 * pages shows all of it, because it is the file a reader will get.
 *
 * The PDF is rendered by the same exporter Download uses (serialized there,
 * so the two never interleave), drawn with pdf.js into one bitmap per page at
 * the canvas zoom and the screen's pixel ratio, and kept on screen while the
 * next version renders after an edit.
 */
import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { ResumeDocument } from '@/types/document'

interface Drawn {
  urls: string[]
  wPx: number
  hPx: number
}

export function PdfPages({ doc, zoom }: { doc: ResumeDocument; zoom: number }) {
  const [drawn, setDrawn] = useState<Drawn | null>(null)
  const [busy, setBusy] = useState(true)
  const [failed, setFailed] = useState<string | null>(null)
  const seq = useRef(0)
  const bytesFor = useRef<{ doc: ResumeDocument; bytes: Uint8Array } | null>(null)

  useEffect(() => {
    const my = ++seq.current
    setBusy(true)
    // After an edit, wait for typing to pause before rendering again.
    const t = setTimeout(async () => {
      try {
        let bytes = bytesFor.current?.doc === doc ? bytesFor.current.bytes : null
        if (!bytes) {
          const { renderResumePdf } = await import('@/lib/pdf/render')
          bytes = await renderResumePdf(doc)
          if (my !== seq.current) return
          bytesFor.current = { doc, bytes }
        }
        const pdfjs = await import('pdfjs-dist')
        const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
        const pdf = await pdfjs.getDocument({ data: bytes.slice(0), isEvalSupported: false }).promise
        try {
          const dpr = Math.min(3, window.devicePixelRatio || 1)
          const urls: string[] = []
          let wPx = 0
          let hPx = 0
          for (let n = 1; n <= pdf.numPages; n++) {
            const page = await pdf.getPage(n)
            const base = page.getViewport({ scale: 1 })
            // PDF points to CSS pixels (96/72), then the canvas zoom.
            const cssScale = (96 / 72) * zoom
            const vp = page.getViewport({ scale: cssScale * dpr })
            const canvas = document.createElement('canvas')
            canvas.width = Math.ceil(vp.width)
            canvas.height = Math.ceil(vp.height)
            await page.render({ canvasContext: canvas.getContext('2d')!, viewport: vp }).promise
            const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res))
            if (!blob) throw new Error('page bitmap')
            urls.push(URL.createObjectURL(blob))
            wPx = base.width * cssScale
            hPx = base.height * cssScale
          }
          if (my !== seq.current) {
            urls.forEach((u) => URL.revokeObjectURL(u))
            return
          }
          setDrawn((prev) => {
            prev?.urls.forEach((u) => URL.revokeObjectURL(u))
            return { urls, wPx, hPx }
          })
          setFailed(null)
        } finally {
          void pdf.destroy()
        }
      } catch (e) {
        if (my === seq.current) setFailed(String((e as Error)?.message || e))
      } finally {
        if (my === seq.current) setBusy(false)
      }
    }, bytesFor.current?.doc === doc ? 0 : 450)
    return () => clearTimeout(t)
  }, [doc, zoom])

  useEffect(() => () => drawn?.urls.forEach((u) => URL.revokeObjectURL(u)), []) // eslint-disable-line react-hooks/exhaustive-deps

  if (failed && !drawn) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground" role="alert">
        The PDF preview could not be drawn ({failed}). Download still works; switch to Edit to keep working.
      </p>
    )
  }
  if (!drawn) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-sm text-muted-foreground" role="status">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        Drawing the PDF…
      </div>
    )
  }
  return (
    <div className="relative flex flex-col items-center gap-7" data-pdf-pages={drawn.urls.length}>
      {busy && (
        <div
          className="pointer-events-none sticky top-3 z-10 -mb-7 flex h-0 justify-center overflow-visible"
          role="status"
          aria-live="polite"
        >
          <span className="flex items-center gap-1.5 rounded-full border border-border bg-surface/95 px-2.5 py-1 text-[11px] font-medium text-muted-foreground shadow-soft">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> Updating
          </span>
        </div>
      )}
      {drawn.urls.map((u, i) => (
        <div key={u} className="relative">
          <img
            src={u}
            width={Math.round(drawn.wPx)}
            height={Math.round(drawn.hPx)}
            alt={`Page ${i + 1} of ${drawn.urls.length} of the PDF`}
            className="block rounded-[2px] bg-white shadow-page"
            draggable={false}
          />
          <span className="pointer-events-none absolute right-2.5 top-2.5 rounded-full border border-border bg-surface/90 px-2 py-0.5 text-[11px] font-medium text-muted-foreground shadow-soft">
            Page {i + 1} / {drawn.urls.length}
          </span>
        </div>
      ))}
    </div>
  )
}
