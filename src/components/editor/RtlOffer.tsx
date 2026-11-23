/**
 * The one tap a resume in Persian or Arabic needs.
 *
 * Right to left stays out of sight for everyone else: no switch in the Design
 * panel, no card here, nothing for a page with no Arabic-script letters
 * (src/lib/script.ts reads what the page shows). Once the page has them -
 * a Persian name typed into an empty resume is enough - this card asks once,
 * above the page, in normal flow like the blank-canvas tip, and "Mirror the
 * page" runs the whole setup (src/lib/rtlSetup.ts): the page mirrors, the
 * dates follow its language, and the faces with no Arabic letters become the
 * Arabic one. "Not now" is remembered on the document itself, so it stays
 * declined after a reload and on another device.
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
import { applyRtlSetup, rtlOfferShown } from '@/lib/rtlSetup'

export function RtlOffer({ doc }: { doc: ResumeDocument }) {
  const script = useMemo(() => documentScript(doc), [doc])
  if (!rtlOfferShown(doc.metadata, script)) return null

  const language = script.persian ? 'Persian' : 'Arabic'
  const mirror = () => {
    const before = structuredClone({
      rtl: doc.metadata.layout.rtl,
      dates: doc.metadata.dates.language,
      typography: doc.metadata.typography,
    })
    useResumeStore.getState().updateMetadata((m) => applyRtlSetup(m, script))
    // Faces and the date language changed too: say so, with the way back.
    useAppStore.getState().toast('Mirrored right to left. Fonts and dates follow the page.', 'info', {
      label: 'Undo',
      run: () =>
        useResumeStore.getState().updateMetadata((m) => {
          m.layout.rtl = before.rtl
          m.dates.language = before.dates
          m.typography.fontFamily = before.typography.fontFamily
          m.typography.headingFamily = before.typography.headingFamily
          m.typography.nameFamily = before.typography.nameFamily
        }),
    })
  }
  const decline = () =>
    useResumeStore.getState().updateMetadata((m) => {
      m.layout.rtlOfferDismissed = true
    })

  return (
    <div className="flex justify-center px-6 pt-5 phone:px-4" data-rtl-offer>
      <div
        role="region"
        aria-label="Right-to-left page"
        className="flex w-full max-w-[210mm] flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-primary/25 bg-primary/5 px-3.5 py-2.5 text-xs leading-relaxed text-foreground"
      >
        <span className="flex min-w-0 flex-1 basis-56 items-start gap-2.5">
          <PilcrowLeft className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
          <span className="min-w-0">{`This resume is in ${language}. Mirror the page right to left?`}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5 ms-auto">
          <button type="button" className="btn-ghost btn-xs coarse:min-h-9" onClick={decline}>Not now</button>
          <button type="button" className="btn-primary btn-xs coarse:min-h-9" onClick={mirror}>Mirror the page</button>
        </span>
      </div>
    </div>
  )
}
