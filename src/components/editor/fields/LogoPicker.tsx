/**
 * Per-entry logo row (company / institution marks). Up to `max` marks
 * (multi-entry-icons, issue #8 — e.g. a joint degree across two schools, or a
 * role that spans an acquisition) render as a small row of thumbnails; each
 * click-to-replace, with its own remove button, plus an "add" tile while
 * under the cap. Stores downscaled data URIs in the document — nothing is
 * ever uploaded anywhere. Callers pass the entry's already-resolved
 * `effectiveMarks(item)` and write back through `applyMarks` (see
 * lib/sections.ts) so the legacy single-`logo` field and the new `logos[]`
 * array stay consistent regardless of how many marks came in.
 */
import { useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { downscaleDataUrl } from '@/lib/image'
import { ImageCropper } from '../ImageCropper'
import { Labeled } from './Inputs'

export function LogoPicker({
  label = 'Logo',
  marks,
  onChange,
  max = 3,
}: {
  label?: string
  marks: string[]
  onChange: (next: string[]) => void
  max?: number
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  // Index the crop-save should write to: an existing mark (replace) or
  // `marks.length` at the time the picker opened (append).
  const pendingIndex = useRef(0)

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
      const small = await downscaleDataUrl(dataUrl, 128)
      const next = marks.slice()
      if (pendingIndex.current < next.length) next[pendingIndex.current] = small
      else next.push(small)
      onChange(next)
    } catch {
      /* unreadable image — leave as-is */
    }
  }
  const openFor = (index: number) => {
    pendingIndex.current = index
    inputRef.current?.click()
  }
  const remove = (index: number) => onChange(marks.filter((_, i) => i !== index))

  return (
    <Labeled label={label}>
      <div className="flex flex-wrap items-center gap-2">
        <input ref={inputRef} type="file" accept="image/*" className="hidden" aria-label={`${label} image`} onChange={(e) => { pick(e.target.files?.[0] ?? undefined); e.target.value = '' }} />
        {marks.map((m, i) => (
          <div key={i} className="relative">
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-white transition hover:border-primary/60"
              onClick={() => openFor(i)}
              title="Replace logo"
            >
              <img src={m} alt="" className="h-full w-full object-contain p-0.5" />
            </button>
            <button
              type="button"
              className="btn-icon absolute -right-1.5 -top-1.5 h-4 w-4 rounded-full border border-border bg-surface"
              onClick={() => remove(i)}
              title="Remove logo"
              aria-label={`Remove logo ${i + 1}`}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        ))}
        {marks.length < max ? (
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-transparent text-muted-foreground transition hover:border-primary/60"
            onClick={() => openFor(marks.length)}
            title={marks.length ? 'Add another logo' : 'Add a small logo (shown beside the entry)'}
          >
            <ImagePlus className="h-4 w-4" />
          </button>
        ) : null}
        {!marks.length ? (
          <span className="text-[11px] leading-tight text-muted-foreground">
            Optional — appears beside the entry; add up to {max} (e.g. a joint program across two schools).
          </span>
        ) : null}
      </div>
      {cropSrc && <ImageCropper src={cropSrc} onCancel={() => setCropSrc(null)} onSave={onCropSave} />}
    </Labeled>
  )
}
