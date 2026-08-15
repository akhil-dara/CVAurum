/**
 * Tiny per-entry logo picker (company / institution mark). Stores a downscaled
 * data URI in the document — nothing is ever uploaded anywhere.
 */
import { useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { downscaleDataUrl } from '@/lib/image'
import { ImageCropper } from '../ImageCropper'
import { Labeled } from './Inputs'

export function LogoPicker({ label = 'Logo', value, onChange }: { label?: string; value?: string; onChange: (v: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const pick = (file?: File) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    // Open the same friendly cropper the profile photo uses.
    reader.onload = () => setCropSrc(String(reader.result))
    reader.readAsDataURL(file)
  }
  const onCropSave = async (dataUrl: string) => {
    setCropSrc(null)
    try {
      onChange(await downscaleDataUrl(dataUrl, 128))
    } catch {
      /* unreadable image — leave as-is */
    }
  }
  return (
    <Labeled label={label}>
      <div className="flex items-center gap-2">
        <input ref={inputRef} type="file" accept="image/*" className="hidden" aria-label={`${label} image`} onChange={(e) => pick(e.target.files?.[0] ?? undefined)} />
        <button
          type="button"
          className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-white transition hover:border-primary/60"
          onClick={() => inputRef.current?.click()}
          title={value ? 'Replace logo' : 'Add a small logo (shown beside the entry)'}
        >
          {value ? <img src={value} alt="" className="h-full w-full object-contain p-0.5" /> : <ImagePlus className="h-4 w-4 text-muted-foreground" />}
        </button>
        {value ? (
          <button type="button" className="btn-icon h-7 w-7" onClick={() => onChange('')} title="Remove logo" aria-label="Remove logo">
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <span className="text-[11px] leading-tight text-muted-foreground">
            Optional — appears beside the entry; size adjustable via the section&apos;s Style button.
          </span>
        )}
      </div>
      {cropSrc && <ImageCropper src={cropSrc} onCancel={() => setCropSrc(null)} onSave={onCropSave} />}
    </Labeled>
  )
}
