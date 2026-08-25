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

/**
 * What sits behind a mark: nothing (keep it see-through), white, or dark.
 *
 * `auto` keeps the old rule - a ground only for images that have no
 * transparency of their own, because JPEG cannot store any.
 */
export type Ground = 'auto' | 'none' | 'white' | 'dark'

const DARK_GROUND = '#111827'

/** Paints the chosen ground. Returns true when the result is fully opaque. */
function paintGround(ctx: CanvasRenderingContext2D, out: number, ground: Ground, alpha: boolean): boolean {
  const g: Ground = ground === 'auto' ? (alpha ? 'none' : 'white') : ground
  if (g === 'none') return false
  ctx.fillStyle = g === 'dark' ? DARK_GROUND : '#ffffff'
  ctx.fillRect(0, 0, out, out)
  return true
}

export interface MarkStats {
  /** False when the browser cannot decode this at all - an .ai or .eps file,
   *  say, which is a PDF wearing an image's name. */
  decodable: boolean
  hasAlpha: boolean
  /** Fraction of the square the mark actually covers. */
  opaque: number
  /** Of the mark's own pixels, how many are near-white / near-black. */
  light: number
  dark: number
  width: number
  height: number
}

/**
 * What kind of image is this, really?
 *
 * Needed because "the logo is blank" has more than one cause and they need
 * different answers: a file the browser cannot decode is an error, while a
 * WHITE mark on a transparent ground is a perfectly good file that simply
 * cannot be seen on white paper. Guessing between them is what left a blank
 * square on the page with nothing said about it.
 */
export async function analyseImage(src: string): Promise<MarkStats> {
  const empty: MarkStats = { decodable: false, hasAlpha: false, opaque: 0, light: 0, dark: 0, width: 0, height: 0 }
  try {
    const img = await loadImage(src)
    const s = 96
    const c = document.createElement('canvas')
    c.width = s
    c.height = s
    const x = c.getContext('2d')
    if (!x) return empty
    x.clearRect(0, 0, s, s)
    const w = img.naturalWidth || 1
    const h = img.naturalHeight || 1
    // Contain, so a wide wordmark is not judged by a stretched sample.
    const sc = Math.min(s / w, s / h)
    x.drawImage(img, (s - w * sc) / 2, (s - h * sc) / 2, w * sc, h * sc)
    const d = x.getImageData(0, 0, s, s).data
    let opaque = 0
    let light = 0
    let dark = 0
    let total = 0
    let anyAlpha = false
    for (let i = 0; i < d.length; i += 4) {
      total++
      const a = d[i + 3]
      if (a < 250) anyAlpha = true
      if (a > 200) {
        opaque++
        const [r, g, b] = [d[i], d[i + 1], d[i + 2]]
        if (r > 200 && g > 200 && b > 200) light++
        else if (r < 90 && g < 90 && b < 90) dark++
      }
    }
    return {
      decodable: true,
      hasAlpha: anyAlpha,
      opaque: total ? opaque / total : 0,
      light: opaque ? light / opaque : 0,
      dark: opaque ? dark / opaque : 0,
      width: w,
      height: h,
    }
  } catch {
    return empty
  }
}

/**
 * True when the image carries real transparency.
 *
 * Flattening every image onto white fixed one bug and caused its mirror: a
 * BLACK mark on a transparent ground stopped going black (good), and a WHITE
 * mark on a transparent ground became invisible - a plain white square, which
 * is exactly what a company logo looked like when it was added (reported
 * 2026-08-25). A logo also has to sit on a coloured sidebar, where any ground
 * we invent is the wrong one. So keep the alpha instead of choosing for them.
 */
function imageHasAlpha(img: HTMLImageElement): boolean {
  try {
    const s = 64
    const c = document.createElement('canvas')
    c.width = s
    c.height = s
    const x = c.getContext('2d')
    if (!x) return false
    x.clearRect(0, 0, s, s)
    x.drawImage(img, 0, 0, s, s)
    const d = x.getImageData(0, 0, s, s).data
    for (let i = 3; i < d.length; i += 4) if (d[i] < 250) return true
    return false
  } catch {
    return false
  }
}

/** PNG keeps transparency; JPEG is smaller for everything else. */
function encode(canvas: HTMLCanvasElement, alpha: boolean): string {
  return alpha ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', QUALITY)
}

/**
 * Draw the WHOLE image centred in a square, padded rather than cut.
 * Shared by the fit mode and by the blank-crop rescue below.
 */
function drawContain(
  img: HTMLImageElement,
  ctx: CanvasRenderingContext2D,
  out: number,
  pad: number,
  alpha: boolean,
  ground: Ground
): boolean {
  ctx.imageSmoothingQuality = 'high'
  ctx.clearRect(0, 0, out, out)
  const opaqueGround = paintGround(ctx, out, ground, alpha)
  const w = img.naturalWidth || 1
  const h = img.naturalHeight || 1
  const box = out * (1 - pad * 2)
  const scale = Math.min(box / w, box / h)
  const dw = w * scale
  const dh = h * scale
  ctx.drawImage(img, (out - dw) / 2, (out - dh) / 2, dw, dh)
  return opaqueGround
}

/**
 * True when almost every sampled pixel matches the first one.
 *
 * A crop whose rectangle lands on empty space draws NOTHING, and the white
 * ground beneath it is saved instead - which arrives on the page as a mystery
 * white square with a hairline border, looking for all the world like a broken
 * image (reported against the TCS logo). Rather than hand that back, callers
 * treat it as a failed crop.
 */
function isBlank(ctx: CanvasRenderingContext2D, size: number): boolean {
  try {
    const { data } = ctx.getImageData(0, 0, size, size)
    if (!data.length) return false
    const [r0, g0, b0, a0] = [data[0], data[1], data[2], data[3]]
    let same = 0
    let total = 0
    // Every 7th pixel: enough to judge, cheap enough not to matter. Alpha
    // counts, so a fully TRANSPARENT square reads as blank as a white one.
    for (let i = 0; i < data.length; i += 4 * 7) {
      total++
      const clear = data[i + 3] < 8 && a0 < 8
      if (
        clear ||
        (Math.abs(data[i] - r0) < 8 &&
          Math.abs(data[i + 1] - g0) < 8 &&
          Math.abs(data[i + 2] - b0) < 8 &&
          Math.abs(data[i + 3] - a0) < 8)
      )
        same++
    }
    return total > 0 && same / total > 0.995
  } catch {
    // A tainted canvas cannot be sampled; assume the crop is fine.
    return false
  }
}

/** Crop a square region of `src` and encode a compact JPEG data URL (~15–30 KB). */
export async function cropToDataUrl(
  src: string,
  area: CropArea,
  out = CROP_PX,
  ground: Ground = 'auto'
): Promise<string> {
  const img = await loadImage(src)
  const canvas = document.createElement('canvas')
  canvas.width = out
  canvas.height = out
  const ctx = canvas.getContext('2d')
  if (!ctx) return src
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  const alpha = imageHasAlpha(img)
  // JPEG has no alpha, and a fresh canvas is transparent BLACK - so every
  // transparent pixel of the source encodes as black. A company logo on a
  // transparent background is mostly transparent, which is why adding one
  // produced a solid black disc where the mark should be (reported with the
  // TCS logo, 2026-08-25). Painting the sheet white first is what a logo on
  // paper looks like anyway.
  const opaqueGround = paintGround(ctx, out, ground, alpha)
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, out, out)
  // Zooming out below "cover" (and dragging freely) can put the crop frame
  // somewhere the image simply is not, and drawImage then draws nothing at
  // all. Saving that gives a blank square rather than a mark, so fall back to
  // keeping the whole image - the thing the author was plainly reaching for.
  if (isBlank(ctx, out)) {
    drawContain(img, ctx, out, 0.06, alpha, ground)
  }
  return encode(canvas, alpha && !opaqueGround)
}

/**
 * Downscale a raster image data URL so its longest edge ≤ `max`, re-encoded as
 * JPEG. Used as a safeguard for photos that arrive outside the cropper (e.g. via
 * JSON import) so a multi-MB embedded image can't bloat storage. Returns the
 * input unchanged if it isn't a decodable raster data URL or is already small.
 */
/**
 * The WHOLE image, centred in a square, padded rather than cropped.
 *
 * Cropping is the wrong operation for a company mark. A wordmark is wide, and
 * a square (let alone round) crop of it can only ever show a slice - reported
 * against the TCS logo, which could not be framed at all because the cropper's
 * zoom floor is "cover the crop area", so pulling back far enough to see the
 * whole mark was not reachable. This fits instead of filling: nothing is ever
 * cut off, and the leftover space becomes ground.
 */
export async function fitToSquareDataUrl(
  src: string,
  out = CROP_PX,
  pad = 0.06,
  ground: Ground = 'auto'
): Promise<string> {
  const img = await loadImage(src)
  const canvas = document.createElement('canvas')
  canvas.width = out
  canvas.height = out
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no 2d context')
  const alpha = imageHasAlpha(img)
  const opaqueGround = drawContain(img, ctx, out, pad, alpha, ground)
  return encode(canvas, alpha && !opaqueGround)
}

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
    // The canvas logo runs a freshly cropped mark straight through here, so
    // flattening to JPEG at this step would quietly undo the transparency the
    // crop just took care to keep. Only a mark that HAS no transparency gets a
    // ground - without one, its transparent pixels encode as black.
    const alpha = imageHasAlpha(img)
    if (!alpha) {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h)
    }
    ctx.drawImage(img, 0, 0, w, h)
    const out = alpha ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', quality)
    return out.length < dataUrl.length ? out : dataUrl
  } catch {
    return dataUrl
  }
}
