/**
 * OCR fallback for the local PDF import engine (Phase 3).
 *
 * Some résumés have no usable text layer — scanned-to-PDF, exported as images,
 * or built with subset fonts that carry no ToUnicode map (pdf.js then returns
 * empty / Private-Use-Area gibberish). For those pages we rasterise the page
 * with pdf.js and read it back with Tesseract, entirely in the browser.
 *
 * Privacy: the Tesseract worker, wasm core and English model are all SELF-HOSTED
 * under /ocr/ (see public/ocr). Nothing is fetched from a CDN and the résumé
 * never leaves the device — identical guarantees to the rest of CVAurum. The
 * engine (~6MB wasm + ~2MB model) is lazy-loaded only when a low-text page is
 * actually encountered, so normal text PDFs never pay for it.
 *
 * Output: word boxes mapped into the SAME coordinate space the text path uses
 * (scale-1 PDF points, top-left origin, y-down) so they flow through the exact
 * same column-detection → line-grouping → parsing pipeline as native text.
 */
import type { PDFPageProxy } from 'pdfjs-dist'
import type { Item } from './layoutGraph'

// Self-hosted engine assets (see vite.config workbox globIgnores: kept out of the
// precache; fetched on demand, same-origin). Must be ABSOLUTE (origin-qualified):
// Tesseract loads the worker as a blob and `importScripts()` the core from inside
// it, where a root-relative "/ocr/…" path fails to resolve.
const OCR_BASE = `${typeof self !== 'undefined' && self.location ? self.location.origin : ''}/ocr`

export interface OcrProgress {
  page: number
  pages: number
  /** 0..1 within the current page (model load + recognition). */
  ratio: number
}

type TesseractWorker = {
  recognize: (image: unknown) => Promise<{ data: { words?: Array<OcrWord>; text?: string } }>
  terminate: () => Promise<unknown>
}
interface OcrWord {
  text: string
  confidence: number
  bbox: { x0: number; y0: number; x1: number; y1: number }
}

let workerPromise: Promise<TesseractWorker> | null = null

/** Lazily create one shared Tesseract worker pointed at our self-hosted assets. */
async function getWorker(onLoad?: (ratio: number) => void): Promise<TesseractWorker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker, OEM } = await import('tesseract.js')
      // oem=LSTM_ONLY → loads the smaller `-lstm` core variant we vendored.
      const worker = await createWorker('eng', OEM.LSTM_ONLY, {
        workerPath: `${OCR_BASE}/worker.min.js`,
        corePath: OCR_BASE, // directory → runtime picks the simd-lstm / lstm build
        langPath: OCR_BASE,
        gzip: true, // eng.traineddata.gz
        logger: (m: { status?: string; progress?: number }) => {
          if (onLoad && typeof m.progress === 'number' && /load|init|recogn/i.test(m.status ?? '')) onLoad(m.progress)
        },
      })
      return worker as unknown as TesseractWorker
    })().catch((e) => {
      workerPromise = null // allow a later retry rather than caching the failure
      throw e
    })
  }
  return workerPromise
}

/** Release the engine + free its memory once an import is done. */
export async function disposeOcr(): Promise<void> {
  if (!workerPromise) return
  try {
    const w = await workerPromise
    await w.terminate()
  } catch {
    /* already gone */
  }
  workerPromise = null
}

/**
 * Rasterise a PDF page and OCR it, returning word boxes as layout-graph Items in
 * scale-1 PDF coordinates (top-left origin). `viewportHeight1`/`width1` are the
 * page's scale-1 dimensions (for coordinate mapping). Returns [] on failure.
 */
export async function ocrPage(
  page: PDFPageProxy,
  pageNumber: number,
  onProgress?: (ratio: number) => void,
): Promise<Item[]> {
  // Render at ~216 DPI (clamped) — sharp enough for clean OCR, bounded for memory.
  const base = page.getViewport({ scale: 1 })
  const scale = Math.min(4, Math.max(2, 2200 / base.width))
  const viewport = page.getViewport({ scale })
  const W = Math.ceil(viewport.width)
  const H = Math.ceil(viewport.height)

  // Prefer OffscreenCanvas: it renders off the compositor, so it isn't throttled
  // when the tab is backgrounded (a visible <canvas> can stall there). Fall back
  // to a detached <canvas> on older browsers.
  const offscreen = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(W, H) : null
  const canvas: OffscreenCanvas | HTMLCanvasElement = offscreen ?? document.createElement('canvas')
  if (!offscreen) {
    ;(canvas as HTMLCanvasElement).width = W
    ;(canvas as HTMLCanvasElement).height = H
  }
  const ctx = canvas.getContext('2d') as
    | OffscreenCanvasRenderingContext2D
    | CanvasRenderingContext2D
    | null
  if (!ctx) return []
  // White matte so transparent scans don't OCR as black-on-black.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)
  await page.render({ canvasContext: ctx as CanvasRenderingContext2D, viewport }).promise

  let words: OcrWord[] = []
  try {
    const worker = await getWorker((r) => onProgress?.(r * 0.5))
    // Pass ImageData — accepted by Tesseract for both canvas kinds and avoids any
    // OffscreenCanvas serialisation quirks.
    const image = ctx.getImageData(0, 0, W, H)
    const { data } = await worker.recognize(image)
    words = data.words ?? []
    onProgress?.(1)
  } catch (e) {
    console.error('[ocr] recognition failed on page', pageNumber, e)
    return []
  } finally {
    // Free the (large) raster immediately.
    if (!offscreen) {
      ;(canvas as HTMLCanvasElement).width = 0
      ;(canvas as HTMLCanvasElement).height = 0
    }
  }

  const items: Item[] = []
  for (const w of words) {
    const str = (w.text ?? '').trim()
    if (!str) continue
    if (w.confidence < 35) continue // drop near-noise glyphs
    const { x0, y0, x1, y1 } = w.bbox
    items.push({
      str,
      x: x0 / scale,
      top: y0 / scale,
      width: Math.max(0, (x1 - x0) / scale),
      height: Math.max(0, (y1 - y0) / scale),
      bold: false, // OCR can't reliably tell weight; heading tiers don't rely on it
      page: pageNumber,
      col: 0,
    })
  }
  return items
}
