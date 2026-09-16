/**
 * Choosing the profile photo — the file input, the crop dialog and the write
 * back into the document — as ONE piece.
 *
 * Three places offer the choice now (the panel's Personal details, the photo
 * on the canvas itself, and the header's Style popover), and three copies of
 * this wiring would be three chances to drift: a file that is read but never
 * cropped, a crop that sets the image but forgets to show it, a "remove" that
 * leaves the layout asking for a photo that is no longer there. They all call
 * this hook instead, so the flow is identical wherever it is started from.
 *
 * The dialog is portaled to the body: opened from the canvas it would
 * otherwise sit inside the zoom wrapper's `transform`, which re-bases
 * `position: fixed` — the dialog would be scaled and pushed off-centre.
 */
import { Suspense, lazy, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useResumeStore } from '@/store/useResumeStore'
import { applyPickedPhoto, clearPhoto } from '@/lib/photoDoc'

/* Editor-only chrome. Lazy so print, thumbnail and PDF renders never pull the
 * cropper (and its image library) into their bundle. */
const LazyCropper = lazy(() => import('./ImageCropper').then((m) => ({ default: m.ImageCropper })))

export interface PhotoPicker {
  /** Open the file chooser. Must be called from a real user gesture. */
  open: () => void
  /** Clear the picture AND stop the layout asking for one. */
  remove: () => void
  /** True while the crop dialog is up. */
  cropping: boolean
  /** Mount once in the caller's tree: the hidden input and the crop dialog. */
  ui: ReactNode
}

/**
 * A file is turned into a data URL, cropped, and saved as the document's
 * photo. What saving and removing MEAN for the document — the photo turned
 * on, the monogram put away, the layout no longer asking for a picture that
 * has gone — are the recipes in `lib/photoDoc`, shared with every other door.
 */
export function usePhotoPicker(): PhotoPicker {
  const updateDoc = useResumeStore((s) => s.updateDoc)
  const inputRef = useRef<HTMLInputElement>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)

  const read = (file?: File) => {
    // Deliberately permissive about the TYPE — the same call the canvas logo
    // picker makes. A vector file arrives as `application/postscript` or as
    // nothing at all, and refusing it here made the picker look broken; the
    // cropper decodes it and says plainly when it cannot. Video and audio are
    // still refused: nothing downstream can make sense of them.
    if (!file || /^(video|audio)\//.test(file.type)) return
    const reader = new FileReader()
    reader.onload = () => setCropSrc(String(reader.result))
    reader.readAsDataURL(file)
  }

  return {
    open: () => inputRef.current?.click(),
    cropping: cropSrc != null,
    remove: () => updateDoc(clearPhoto),
    ui: (
      <>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          data-photo-input=""
          aria-label="Profile photo file"
          onChange={(e) => {
            read(e.target.files?.[0] ?? undefined)
            // Cleared so picking the SAME file twice still fires a change.
            e.target.value = ''
          }}
        />
        {cropSrc
          ? createPortal(
              <Suspense fallback={null}>
                <LazyCropper
                  src={cropSrc}
                  onCancel={() => setCropSrc(null)}
                  onSave={(url) => {
                    updateDoc((d) => applyPickedPhoto(d, url))
                    setCropSrc(null)
                  }}
                />
              </Suspense>,
              document.body
            )
          : null}
      </>
    ),
  }
}
