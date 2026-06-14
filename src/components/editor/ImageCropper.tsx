import { useCallback, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { Check, X, ZoomIn } from 'lucide-react'
import { cropToDataUrl, downscaleDataUrl } from '@/lib/image'

export function ImageCropper({ src, onCancel, onSave }: { src: string; onCancel: () => void; onSave: (dataUrl: string) => void }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [area, setArea] = useState<Area | null>(null)
  const [busy, setBusy] = useState(false)

  const onComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), [])

  const save = async () => {
    if (!area) return
    setBusy(true)
    try {
      onSave(await cropToDataUrl(src, area))
    } catch {
      // If cropping fails, never persist the full-size original — downscale it.
      onSave(await downscaleDataUrl(src))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4" onClick={onCancel}>
      <div className="card w-full max-w-sm overflow-hidden p-0 shadow-float" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <h2 className="text-sm font-semibold">Crop photo</h2>
          <button className="btn-icon" onClick={onCancel} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="relative h-72 w-full bg-neutral-900">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            zoomSpeed={0.25}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onComplete}
          />
        </div>
        <div className="space-y-3 p-4">
          <div className="flex items-center gap-2.5">
            <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="range-input flex-1"
              aria-label="Zoom"
            />
          </div>
          <p className="text-center text-[11px] text-muted-foreground">Drag to reposition · scroll or use the slider to zoom</p>
          <div className="flex justify-end gap-2">
            <button className="btn-outline btn-sm" onClick={onCancel}>
              Cancel
            </button>
            <button className="btn-primary btn-sm" onClick={save} disabled={busy || !area}>
              <Check className="h-4 w-4" /> {busy ? 'Saving…' : 'Use photo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
