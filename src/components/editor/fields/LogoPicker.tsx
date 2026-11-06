/**
 * Tiny per-entry logo picker (company / institution mark). Stores a downscaled
 * data URI in the document — nothing is ever uploaded anywhere.
 */
import { useRef, useState } from 'react'
import { ChevronLeft, ImagePlus, X } from 'lucide-react'
import { downscaleDataUrl } from '@/lib/image'
import { ImageCropper } from '../ImageCropper'
import { Labeled } from './Inputs'
import { MAX_ENTRY_LOGOS } from '@/lib/entryLogos'

export function LogoPicker({
  label = 'Logo',
  value,
  onChange,
}: {
  label?: string
  value?: string
  onChange: (v: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const pick = (file?: File) => {
    // Deliberately permissive about the TYPE. An .ai file is reported as
    // application/postscript (or nothing at all), so this test dropped it in
    // silence - the picker simply appeared to do nothing. The cropper decodes
    // the file and says plainly when it cannot, which is the useful answer.
    // Video and audio are still refused: nothing here can make sense of them.
    if (!file || /^(video|audio)\//.test(file.type)) return
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
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          aria-label={`${label} image`}
          onChange={(e) => pick(e.target.files?.[0] ?? undefined)}
        />
        <button
          type="button"
          className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-white transition hover:border-primary/60"
          onClick={() => inputRef.current?.click()}
          title={value ? 'Replace logo' : 'Add a small logo (shown beside the entry)'}
        >
          {value ? (
            <img src={value} alt="" className="h-full w-full object-contain p-0.5" />
          ) : (
            <ImagePlus className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {value ? (
          <button
            type="button"
            className="btn-icon h-7 w-7"
            onClick={() => onChange('')}
            title="Remove logo"
            aria-label="Remove logo"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <span className="text-[11px] leading-tight text-muted-foreground">
            Optional — appears beside the entry; size adjustable via the section&apos;s Style button.
          </span>
        )}
      </div>
      {cropSrc && <ImageCropper kind="logo" src={cropSrc} onCancel={() => setCropSrc(null)} onSave={onCropSave} />}
    </Labeled>
  )
}

/**
 * The side panel's twin of the canvas logo row (issue #8): an entry that can
 * carry up to three logos. With none it is exactly the single picker above;
 * with one, "+ Add another" sits beside it; with several, each thumbnail
 * replaces on click and has its own remove control, and each after the
 * first a move-left button (buttons rather than drag, so a finger can
 * reorder them too).
 */
export function LogosPicker({
  label,
  logos,
  onLogos,
}: {
  label: string
  logos: string[]
  onLogos: (next: string[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  // Which slot the next picked file fills: an index to replace, or the end.
  const slot = useRef<number>(0)
  if (logos.length === 0) {
    return <LogoPicker label={label} value={undefined} onChange={(v) => onLogos(v ? [v] : [])} />
  }
  const open = (at: number) => {
    slot.current = at
    inputRef.current?.click()
  }
  const pick = (file?: File) => {
    if (!file || /^(video|audio)\//.test(file.type)) return
    const reader = new FileReader()
    reader.onload = () => setCropSrc(String(reader.result))
    reader.readAsDataURL(file)
  }
  const onCropSave = async (dataUrl: string) => {
    setCropSrc(null)
    try {
      const out = await downscaleDataUrl(dataUrl, 128)
      const next = logos.slice()
      next[slot.current] = out
      onLogos(next.slice(0, MAX_ENTRY_LOGOS))
    } catch {
      /* unreadable image - leave as-is */
    }
  }
  const move = (i: number, dir: -1 | 1) => {
    const next = logos.slice()
    ;[next[i], next[i + dir]] = [next[i + dir], next[i]]
    onLogos(next)
  }
  return (
    <Labeled label={logos.length > 1 ? 'Logos' : label}>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          aria-label={`${label} image`}
          onChange={(e) => {
            pick(e.target.files?.[0] ?? undefined)
            e.target.value = ''
          }}
        />
        {/* One move control per pair of neighbours - logo n moves left past
            n-1 - since a right arrow on n-1 would swap the very same pair. */}
        {logos.map((src, i) => (
          <div key={i} className="flex items-center gap-0.5">
            {logos.length > 1 && i > 0 ? (
              <button
                type="button"
                className="btn-icon h-7 w-5 coarse:h-10 coarse:w-8"
                onClick={() => move(i, -1)}
                aria-label={`Move logo ${i + 1} left`}
                title="Move left"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
            ) : null}
            <span className="relative">
              <button
                type="button"
                className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-white transition hover:border-primary/60 coarse:h-11 coarse:w-11"
                onClick={() => open(i)}
                title="Replace logo"
                aria-label={logos.length > 1 ? `Replace logo ${i + 1} of ${logos.length}` : 'Replace logo'}
              >
                <img src={src} alt="" className="h-full w-full object-contain p-0.5" />
              </button>
              <button
                type="button"
                className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground shadow-sm hover:text-danger coarse:h-6 coarse:w-6"
                onClick={() => onLogos(logos.filter((_, j) => j !== i))}
                aria-label={logos.length > 1 ? `Remove logo ${i + 1}` : 'Remove logo'}
                title="Remove logo"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          </div>
        ))}
        {logos.length < MAX_ENTRY_LOGOS ? (
          <button
            type="button"
            className="flex h-9 items-center gap-1 rounded-md border border-dashed border-border px-2.5 text-xs text-muted-foreground transition hover:border-primary/60 hover:text-foreground coarse:h-11"
            onClick={() => open(logos.length)}
            title="Add another logo, for a joint degree or a joint venture"
          >
            + Add another
          </button>
        ) : null}
      </div>
      {cropSrc && <ImageCropper kind="logo" src={cropSrc} onCancel={() => setCropSrc(null)} onSave={onCropSave} />}
    </Labeled>
  )
}
