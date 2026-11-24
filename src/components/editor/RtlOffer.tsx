/**
 * The one tap a resume in Persian or Arabic needs.
 *
 * Right to left stays out of sight for everyone else: no switch in the Design
 * panel, no card here, nothing for a page with no Arabic-script letters
 * (src/lib/script.ts reads what the page shows). Once the page has them -
 * a Persian name typed into an empty resume is enough - this card asks once,
 * and "Mirror the page" runs the whole setup (src/lib/rtlSetup.ts): the page
 * mirrors, the dates follow its language, and the faces with no Arabic
 * letters become the Arabic one. "Not now" is remembered on the document
 * itself, so it stays declined after a reload and on another device.
 *
 * It FLOATS at the foot of the scrollport, in a zero-height sticky row like
 * the canvas zoom pill. In the page's flow above the sheet it arrived while
 * the author was typing the name and pushed the page - and the caret - down
 * (review, 2026-11-23). At the foot it is far from the name it reacts to.
 *
 * The row is a polite live region that is always mounted, empty until the
 * card shows: a screen reader hears the question without the caret leaving
 * the name. A region that mounted together with its text is often not
 * announced at all.
 *
 * Edit chrome, outside the artboard: the print tree and every export are
 * untouched by it.
 */
import { useMemo } from 'react'
import { PilcrowLeft } from 'lucide-react'
import type { ResumeDocument } from '@/types/document'
import { useResumeStore } from '@/store/useResumeStore'
import { useAppStore } from '@/store/useAppStore'
import { documentScript } from '@/lib/script'
import { applyRtlSetup, rtlOfferShown, rtlSetupSnapshot, undoRtlSetup } from '@/lib/rtlSetup'

export function RtlOffer({ doc, raised = false }: { doc: ResumeDocument; raised?: boolean }) {
  const script = useMemo(() => documentScript(doc), [doc])
  const shown = rtlOfferShown(doc.metadata, script)

  const language = script.persian ? 'Persian' : 'Arabic'
  const mirror = () => {
    const before = rtlSetupSnapshot(doc.metadata)
    useResumeStore.getState().updateMetadata((m) => applyRtlSetup(m, script))
    // Faces and the date language changed too: say so, with the way back.
    // Undo puts every field back and declines the offer, so it does not ask
    // again at once.
    useAppStore.getState().toast('Mirrored right to left. Fonts and dates follow the page.', 'info', {
      label: 'Undo',
      run: () => useResumeStore.getState().updateMetadata((m) => undoRtlSetup(m, before)),
    })
  }
  const decline = () =>
    useResumeStore.getState().updateMetadata((m) => {
      m.layout.rtlOfferDismissed = true
    })

  return (
    <div
      data-rtl-offer
      role="status"
      aria-live="polite"
      // `raised`: the zoom pill owns the foot of the scrollport where it shows
      // (a phone, a narrow bar), so the card sits above it.
      className={`pointer-events-none sticky z-10 flex h-0 items-end justify-center overflow-visible px-4 ${raised ? 'bottom-[4.25rem]' : 'bottom-4'}`}
    >
      {shown && (
        <div
          className="pointer-events-auto flex w-full max-w-xl flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-primary/30 bg-surface/95 px-3.5 py-2.5 text-xs leading-relaxed text-foreground shadow-float backdrop-blur"
        >
          <span className="flex min-w-0 flex-1 basis-56 items-start gap-2.5">
            <PilcrowLeft className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
            <span className="min-w-0">{`This resume is in ${language}. Mirror the page right to left?`}</span>
          </span>
          <span className="ms-auto flex shrink-0 items-center gap-1.5">
            <button type="button" className="btn-ghost btn-xs coarse:min-h-9" onClick={decline}>Not now</button>
            <button type="button" className="btn-primary btn-xs coarse:min-h-9" onClick={mirror}>Mirror the page</button>
          </span>
        </div>
      )}
    </div>
  )
}
