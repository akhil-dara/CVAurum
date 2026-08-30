import { memo, useLayoutEffect, useRef, useState } from 'react'
import type { ResumeDocument } from '@/types/document'
import { PAGE_DIMENSIONS } from '@/types/metadata'
import { TemplateRenderer } from '@/templates/TemplateRenderer'
// The exporter's own floor, so a card never claims a document shrinks further
// than the export would.
import { MIN_FIT } from '@/lib/fitOnePage'

/** How many correction passes a card may take before it settles for what it
 *  has. Three lands within a percent or so of the exporter's own search. */
const MAX_FIT_PASSES = 4
/** At grid-card sizes the second correction is already sub-pixel - passes
 *  beyond it double every card's mount cost for nothing a reader can see. */
const SMALL_FIT_PASSES = 2
const SMALL_W = 260

/** A scaled, non-interactive single-page thumbnail of a resume.
 *  It sizes itself to its parent's CONTENT box (ResizeObserver), so responsive
 *  grid cells never crop the page — `width` is only the pre-measure fallback. */
export const PreviewThumb = memo(function PreviewThumb({
  doc,
  width = 150,
}: {
  doc: ResumeDocument
  width?: number
}) {
  const { w: pageW, h: pageH } = PAGE_DIMENSIONS[doc.metadata.page.format]
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(width)
  useLayoutEffect(() => {
    const parent = ref.current?.parentElement
    if (!parent || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((entries) => {
      const cw = entries[0]?.contentRect.width
      if (cw) setW((prev) => (Math.abs(cw - prev) > 0.5 ? cw : prev))
    })
    ro.observe(parent)
    return () => ro.disconnect()
  }, [])
  // A card showed the document at full size while the EXPORT shrinks a
  // fit-to-one-page resume to make it fit, so the thumbnail showed larger type
  // and then clipped whatever ran past the page - content the real first page
  // does not lose. One measurement recovers most of that: height scales very
  // nearly linearly with the fit scale, so pageH/measuredHeight lands close to
  // what the exporter's search settles on, at one extra layout instead of the
  // seven a binary search would cost on every card of a grid.
  const inner = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState(1)
  // Refined over at most a few layout passes, never in a free-running loop.
  // Height does not scale perfectly with the fit - padding and margins do not
  // shrink with the type - so one linear estimate lands close but still over
  // the page. Each pass measures what the last scale produced and corrects,
  // and the pass counter is what keeps the effect from chasing its own output
  // forever, which locked the page hard enough that the example dialog would
  // not open.
  // Keyed on the document's identity and revision, not the object: the store
  // hands out a new object on every render, so an object comparison reset the
  // pass counter every time and the correction never got to run.
  const key = `${doc.id}:${doc.updatedAt}:${pageH}`
  const run = useRef<{ key: string; passes: number }>({ key: '', passes: 0 })
  useLayoutEffect(() => {
    if (run.current.key !== key) {
      run.current = { key, passes: 0 }
      if (fit !== 1) {
        setFit(1) // measure the natural height on the next pass
        return
      }
    }
    if (!doc.metadata.page.autoFit) {
      if (fit !== 1) setFit(1)
      run.current.passes = MAX_FIT_PASSES
      return
    }
    const maxPasses = w < SMALL_W ? SMALL_FIT_PASSES : MAX_FIT_PASSES
    if (run.current.passes >= maxPasses) return
    const h = inner.current?.scrollHeight ?? 0
    if (!h) return
    if (h <= pageH + 1) {
      run.current.passes = MAX_FIT_PASSES // already fits; nothing to correct
      return
    }
    run.current.passes++
    const next = Math.min(1, Math.max(MIN_FIT, fit * (pageH / h)))
    if (Math.abs(next - fit) > 0.005) setFit(next)
    else run.current.passes = MAX_FIT_PASSES
  }, [doc, pageH, fit, key, w])

  const scale = w / pageW
  return (
    <div ref={ref} className="overflow-hidden bg-white" style={{ width: w, height: pageH * scale }} aria-hidden>
      <div
        style={{
          width: pageW,
          height: pageH,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          pointerEvents: 'none',
        }}
      >
        <div ref={inner} style={{ width: pageW, minHeight: pageH }}>
          <TemplateRenderer doc={doc} mode="thumbnail" fitScale={fit} />
        </div>
      </div>
    </div>
  )
})
