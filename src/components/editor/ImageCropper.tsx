import { useCallback, useEffect, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { AlertTriangle, Check, Maximize2, Minus, Plus, Scissors, X } from 'lucide-react'
import {
  analyseImage,
  cropToDataUrl,
  downscaleDataUrl,
  fitToSquareDataUrl,
  type Ground,
  type MarkStats,
} from '@/lib/image'

/**
 * Two ways to square an image, because a photo and a company mark want
 * opposite things.
 *
 * FIT keeps the whole image and pads the leftover space. A wordmark is wide,
 * and cropping one to a square (let alone a circle) can only ever show a
 * slice. Reported against the TCS logo, which could not be framed at all: the
 * cropper's zoom floor is "cover the crop area", so pulling back far enough to
 * see the whole mark was simply not reachable.
 *
 * CROP is the portrait behaviour, now able to zoom BELOW cover with position
 * restriction lifted, so a subject can be framed loosely instead of only
 * tightly.
 *
 * The dialog also refuses to hand back something that cannot be seen. "The
 * logo came out blank" turned out to have three different causes - a crop that
 * caught empty space, transparency flattened onto white, and a WHITE mark on
 * white paper - and the first two are now impossible. The third is not a bug
 * at all: a white mark genuinely cannot be seen on a light page, so it is said
 * out loud here, with a dark ground offered, rather than saved in silence.
 */
export function ImageCropper({
  src,
  onCancel,
  onSave,
  kind = 'photo',
}: {
  src: string
  onCancel: () => void
  onSave: (dataUrl: string) => void
  /** A mark defaults to FIT, a portrait to CROP - the usual intent for each. */
  kind?: 'photo' | 'logo'
}) {
  const [mode, setMode] = useState<'fit' | 'crop'>(kind === 'logo' ? 'fit' : 'crop')
  const [round, setRound] = useState(kind !== 'logo')
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [area, setArea] = useState<Area | null>(null)
  const [busy, setBusy] = useState(false)
  const [stats, setStats] = useState<MarkStats | null>(null)
  const [ground, setGround] = useState<Ground>('auto')

  useEffect(() => {
    let alive = true
    analyseImage(src).then((s) => {
      if (alive) setStats(s)
    })
    return () => {
      alive = false
    }
  }, [src])

  const MIN_ZOOM = 0.4
  const MAX_ZOOM = 4
  const nudge = (by: number) => setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +(z + by).toFixed(2))))
  const onComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), [])

  // A mark that is almost entirely white vanishes on a light page. That is not
  // a fault in the file - it is the wrong file for a white page, or it wants a
  // dark ground behind it.
  const invisible = !!stats?.decodable && stats.hasAlpha && stats.light > 0.6 && ground !== 'dark'
  const unreadable = stats !== null && !stats.decodable

  const save = async () => {
    setBusy(true)
    try {
      onSave(
        mode === 'fit'
          ? await fitToSquareDataUrl(src, undefined, 0.06, ground)
          : await cropToDataUrl(src, area!, undefined, ground)
      )
    } catch {
      // Never persist a full-size original if the operation fails.
      onSave(await downscaleDataUrl(src))
    } finally {
      setBusy(false)
    }
  }

  const tab = (v: 'fit' | 'crop', label: string, Icon: typeof Scissors, title: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === v}
      title={title}
      onClick={() => setMode(v)}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium transition ${
        mode === v
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border text-muted-foreground hover:border-primary/50'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  )

  const groundSwatch = (v: Ground, label: string, style: string) => (
    <button
      key={v}
      type="button"
      role="radio"
      aria-checked={ground === v}
      title={label}
      onClick={() => setGround(v)}
      className={`flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium transition ${
        ground === v
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border text-muted-foreground hover:border-primary/50'
      }`}
    >
      <span className={`h-3 w-3 rounded-sm border border-border ${style}`} />
      {label}
    </button>
  )

  // What the saved square will sit on, mirrored in the preview.
  const previewGround =
    ground === 'dark'
      ? '#111827'
      : ground === 'white'
        ? '#ffffff'
        : ground === 'auto' && !stats?.hasAlpha
          ? '#ffffff'
          : null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4" onClick={onCancel}>
      {/* text-foreground is explicit: when this dialog is opened from inside the
          resume canvas it would otherwise inherit the page's print-ink color,
          which is unreadable on the dark-mode surface. */}
      <div
        className="card w-full max-w-md overflow-hidden p-0 text-foreground shadow-float"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <h2 className="text-sm font-semibold">{kind === 'logo' ? 'Add logo' : 'Crop photo'}</h2>
          <button className="btn-icon" onClick={onCancel} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {unreadable ? (
          /* An .ai or .eps is a PDF wearing an image's name, and no browser can
             draw one. Saying so beats saving a blank square in silence. */
          <div className="space-y-3 p-6 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
            <p className="text-sm font-medium">This file isn&apos;t an image the browser can read.</p>
            <p className="text-[12px] leading-snug text-muted-foreground">
              Vector files like <code>.ai</code> and <code>.eps</code> are PDFs underneath, so they can&apos;t be drawn
              here. Export the mark as <strong>PNG</strong> (or use SVG, JPG, WebP) and add that instead.
            </p>
            <div className="flex justify-center">
              <button className="btn-outline btn-sm" onClick={onCancel}>
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-1.5 px-4 pt-3" role="tablist" aria-label="How to fit the image">
              {tab('fit', 'Fit whole', Maximize2, 'Keep the entire image and pad the space around it')}
              {tab('crop', 'Crop', Scissors, 'Cut a square out of the image')}
            </div>

            <div className="relative mt-3 h-80 w-full bg-neutral-900">
              {mode === 'fit' ? (
                <div className="flex h-full w-full items-center justify-center p-6">
                  {/* Exactly what will be produced, over a checkerboard so
                      TRANSPARENCY is visible. A see-through mark used to look
                      like an empty white square, with no way to tell a blank
                      file from a pale one. */}
                  <div
                    className="flex aspect-square h-full items-center justify-center overflow-hidden rounded-md p-[6%]"
                    style={
                      previewGround
                        ? { backgroundColor: previewGround }
                        : {
                            backgroundColor: '#ffffff',
                            backgroundImage:
                              'linear-gradient(45deg,#d4d4d8 25%,transparent 25%),linear-gradient(-45deg,#d4d4d8 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#d4d4d8 75%),linear-gradient(-45deg,transparent 75%,#d4d4d8 75%)',
                            backgroundSize: '14px 14px',
                            backgroundPosition: '0 0,0 7px,7px -7px,-7px 0',
                          }
                    }
                  >
                    <img src={src} alt="" className="max-h-full max-w-full object-contain" />
                  </div>
                </div>
              ) : (
                <Cropper
                  image={src}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape={round ? 'round' : 'rect'}
                  showGrid={false}
                  zoomSpeed={0.15}
                  minZoom={MIN_ZOOM}
                  maxZoom={MAX_ZOOM}
                  // Lifted so the image can sit smaller than the crop box; with
                  // it on, zooming out below "cover" is silently undone.
                  restrictPosition={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onComplete}
                />
              )}
            </div>

            <div className="space-y-3 p-4">
              {mode === 'crop' ? (
                <>
                  <div className="flex items-center gap-2">
                    <button
                      className="btn-icon h-7 w-7"
                      onClick={() => nudge(-0.1)}
                      aria-label="Zoom out"
                      title="Zoom out"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <input
                      type="range"
                      min={MIN_ZOOM}
                      max={MAX_ZOOM}
                      step={0.02}
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="range-input flex-1"
                      aria-label="Zoom"
                    />
                    <button
                      className="btn-icon h-7 w-7"
                      onClick={() => nudge(0.1)}
                      aria-label="Zoom in"
                      title="Zoom in"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:border-primary/50"
                      onClick={() => {
                        setZoom(1)
                        setCrop({ x: 0, y: 0 })
                      }}
                    >
                      Reset
                    </button>
                  </div>
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground">Shape</span>
                    {[
                      { v: true, label: 'Round' },
                      { v: false, label: 'Square' },
                    ].map((o) => (
                      <button
                        key={String(o.v)}
                        type="button"
                        onClick={() => setRound(o.v)}
                        className={`rounded-md border px-2 py-0.5 text-[11px] font-medium transition ${
                          round === o.v
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/50'
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}

              {/* Only an image with transparency has a ground to choose. */}
              {stats?.hasAlpha ? (
                <div
                  className="flex flex-wrap items-center justify-center gap-1.5"
                  role="radiogroup"
                  aria-label="Background"
                >
                  <span className="text-[11px] text-muted-foreground">Background</span>
                  {groundSwatch('auto', 'None', 'bg-transparent')}
                  {groundSwatch('white', 'White', 'bg-white')}
                  {groundSwatch('dark', 'Dark', 'bg-neutral-900')}
                </div>
              ) : null}

              {invisible ? (
                <p className="flex items-start gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-[11px] leading-snug text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
                  <span>
                    This mark is almost entirely white, so it will be invisible on a light page. Choose the{' '}
                    <strong>Dark</strong> background, or add the dark version of the logo instead.
                  </span>
                </p>
              ) : (
                <p className="text-center text-[11px] text-muted-foreground">
                  {mode === 'fit'
                    ? 'The whole image is kept and centred — nothing is cut off, and transparency is preserved.'
                    : 'Drag to reposition · scroll or use the slider to zoom · zoom out past the frame to fit more in'}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <button className="btn-outline btn-sm" onClick={onCancel}>
                  Cancel
                </button>
                <button className="btn-primary btn-sm" onClick={save} disabled={busy || (mode === 'crop' && !area)}>
                  <Check className="h-4 w-4" /> {busy ? 'Saving…' : kind === 'logo' ? 'Use logo' : 'Use photo'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
