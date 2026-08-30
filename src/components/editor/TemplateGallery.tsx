import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { Check, ShieldCheck } from 'lucide-react'
import type { ResumeDocument } from '@/types/document'
import { TEMPLATES } from '@/templates/registry'
import { applyTemplateToMetadata } from '@/lib/templateApply'
import { useResumeStore } from '@/store/useResumeStore'
import { useAppStore } from '@/store/useAppStore'
import { PreviewThumb } from '@/components/preview/PreviewThumb'
import { HoverZoom } from '@/components/preview/HoverZoom'
import { cn } from '@/lib/utils'
import { SAMPLE_CONTENT } from '@/data/sample'
import { useLazyMount } from '@/components/preview/lazyMount'

export function TemplateGallery({ doc }: { doc: ResumeDocument }) {
  const applyTemplate = useResumeStore((s) => s.applyTemplate)
  const toast = useAppStore((s) => s.toast)
  const current = doc.metadata.template
  // Each mounted card re-renders the whole resume when the document changes,
  // so with this panel open every KEYSTROKE was paying for all of them at
  // once. The thumbnails are a browsing aid: they may lag a few frames behind
  // the text being typed, and deferring them keeps the editor responsive
  // while they catch up. `current` above stays undeferred, so the tick
  // marking the active template never lags behind the click that moved it.
  const doc_ = useDeferredValue(doc)
  // A blank resume would render 52 EMPTY thumbnails — impossible to judge.
  // Preview with sample content until the user has real content of their own.
  const isBlank =
    !doc_.content.basics.name &&
    !doc_.content.work.length &&
    !doc_.content.education.length &&
    !doc_.content.skills.length
  const previewBase = isBlank ? { ...doc_, content: SAMPLE_CONTENT } : doc_

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {TEMPLATES.length} templates — every one ATS-friendly.{' '}
        {isBlank
          ? 'Previews show example content until you add yours.'
          : 'Your content flows into every one — switch any time.'}{' '}
        Hover a card for a full-size look.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {TEMPLATES.map((tpl) => (
          <TemplateCard
            key={tpl.id}
            tpl={tpl}
            doc={previewBase}
            active={current === tpl.id}
            onPick={() => {
              applyTemplate(tpl.defaults)
              toast(`Switched to ${tpl.name}`, 'success')
            }}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * True once the element has come near the viewport, and true forever after.
 *
 * Every card renders the user's WHOLE resume in its template's look, so
 * mounting all 52 at once cost 9.0s of frozen main thread just to open this
 * panel, and a single template switch re-rendered all of them in ONE 8.7s
 * task (measured 2026-08-25). Only the handful a reader can actually see is
 * worth rendering.
 *
 * Deliberately measured with getBoundingClientRect rather than an
 * IntersectionObserver: an observer is driven by the rendering pipeline and
 * reports NOTHING in a context that is not compositing frames - measured, a
 * hidden browser pane left every card an empty placeholder. A rect is
 * answered synchronously by layout, which is always available.
 *
 * Scroll is listened for in the CAPTURE phase because the panel scrolls in an
 * inner container and scroll events do not bubble.
 *
 * It latches rather than unmounting on exit: a card that scrolls out and back
 * would otherwise pay the render again, and scrolling is exactly when the
 * main thread is least able to afford it.
 */
function TemplateCard({
  tpl,
  doc,
  active,
  onPick,
}: {
  tpl: (typeof TEMPLATES)[number]
  doc: ResumeDocument
  active: boolean
  onPick: () => void
}) {
  // Render the thumbnail with the user's content but this template's look.
  const [thumbRef, seen] = useLazyMount<HTMLDivElement>()
  const previewDoc = useMemo<ResumeDocument>(
    () => ({ ...doc, metadata: applyTemplateToMetadata(doc.metadata, tpl.defaults) }),
    [doc, tpl.defaults]
  )

  return (
    <HoverZoom doc={previewDoc} label={`${tpl.name} — with your content`}>
      <button
        onClick={onPick}
        className={cn(
          'group relative flex flex-col overflow-hidden rounded-lg border bg-surface text-left transition-all hover:shadow-card',
          active ? 'border-primary ring-2 ring-primary/40' : 'border-border hover:border-primary/40'
        )}
        title={tpl.description}
      >
        <div
          ref={thumbRef}
          // The placeholder holds the card's exact height, so nothing jumps as
          // previews arrive and the scrollbar stays honest while scrolling.
          style={{ minHeight: 150 * 1.294 + 16 }}
          className="relative flex justify-center overflow-hidden border-b border-border bg-white p-2"
        >
          {/* A pulsing sheet, not blank white - an empty card read as the
              theme failing to load rather than loading. */}
          {seen ? <PreviewThumb doc={previewDoc} width={150} /> : (
            <div className="h-full w-full animate-pulse rounded-sm bg-gradient-to-b from-muted/70 to-muted/30" aria-hidden />
          )}
          {active && (
            <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="h-3.5 w-3.5" />
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-1 px-2.5 py-2">
          <span className="text-[13px] font-medium text-foreground">{tpl.name}</span>
          {tpl.atsSafe && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-medium text-success"
              title="Parses cleanly in ATS"
            >
              <ShieldCheck className="h-3 w-3" />
              ATS
            </span>
          )}
        </div>
      </button>
    </HoverZoom>
  )
}
