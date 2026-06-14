/**
 * Shared image helpers. Photos are stored as compact JPEG data URLs so they stay
 * small in IndexedDB and embed cleanly in the PDF and Word exports (OOXML can't
 * embed WebP/SVG). The original full-size pick is never persisted — only the
 * processed output below.
 */

const CROP_PX = 360 // avatar renders ~96px; 360 covers retina with headroom
const QUALITY = 0.85

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

/** Crop a square region of `src` and encode a compact JPEG data URL (~15–30 KB). */
export async function cropToDataUrl(src: string, area: CropArea, out = CROP_PX): Promise<string> {
  const img = await loadImage(src)
  const canvas = document.createElement('canvas')
  canvas.width = out
  canvas.height = out
  const ctx = canvas.getContext('2d')
  if (!ctx) return src
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, out, out)
  return canvas.toDataURL('image/jpeg', QUALITY)
}

/**
 * Downscale a raster image data URL so its longest edge ≤ `max`, re-encoded as
 * JPEG. Used as a safeguard for photos that arrive outside the cropper (e.g. via
 * JSON import) so a multi-MB embedded image can't bloat storage. Returns the
 * input unchanged if it isn't a decodable raster data URL or is already small.
 */
export async function downscaleDataUrl(dataUrl: string, max = 512, quality = QUALITY): Promise<string> {
  if (!/^data:image\/(png|jpe?g|webp);base64,/i.test(dataUrl)) return dataUrl
  if (dataUrl.length < 60_000) return dataUrl // already tiny — leave it
  try {
    const img = await loadImage(dataUrl)
    const longest = Math.max(img.naturalWidth, img.naturalHeight) || max
    const scale = Math.min(1, max / longest)
    const w = Math.max(1, Math.round(img.naturalWidth * scale))
    const h = Math.max(1, Math.round(img.naturalHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return dataUrl
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, w, h)
    const out = canvas.toDataURL('image/jpeg', quality)
    return out.length < dataUrl.length ? out : dataUrl
  } catch {
    return dataUrl
  }
}
