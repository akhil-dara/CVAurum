/**
 * The picture of a résumé page, as a FILE rather than a render.
 *
 * Every design and every example already ships a lossless page image of its
 * exported PDF (1200px wide, /img/templates/<id>.webp, /img/examples/<slug>.webp).
 * A grid card was mounting a live React résumé instead — the whole template
 * engine, per card, 108 times on /examples. Measured on the production build
 * (2026-09-15, _local/grid-perf.cjs): 10.5s of main-thread task time on a desk
 * and 14.5s on a phone to browse /examples to the bottom, and even after all
 * that only 47 of the 108 cards had a résumé in them — the rest were still the
 * grey sketch, because the idle queue that keeps the scroll smooth can only
 * grant one card at a time and the reader scrolls past faster than it grants.
 *
 * A picture costs a decode. What it cannot do is reflect a document edited a
 * second ago — which none of these three grids ever showed: /templates renders
 * one fixed sample, /examples and the picker render the library's own samples.
 * The pictures are made from those same samples by scripts/make-page-images.cjs,
 * so what a card shows is the page the export produces, not an approximation
 * of it — the live thumbnail was the approximation (it re-ran the fit-to-page
 * search itself, at card size, in at most two passes).
 *
 * The box carries the picture's OWN aspect ratio, from its declared height, so
 * nothing is cropped and nothing shifts as the file lands. The accent sketch
 * stays underneath until the decode finishes: a white gap reads as a card that
 * failed, a sketch reads as one arriving.
 */
import { useEffect, useRef, useState } from 'react'
import { PAGE_IMAGE_WIDTH } from '@/data/pageImages'
import { ThumbSkeleton } from './ThumbSkeleton'
import { useNearViewport } from './lazyMount'
import { cn } from '@/lib/utils'

export function PagePicture({
  src,
  height,
  alt,
  accent,
  eager = false,
  className,
}: {
  src: string
  /** The picture's intrinsic height at PAGE_IMAGE_WIDTH — A4 and US Letter are
   *  different shapes, and a box built for the wrong one crops or letterboxes. */
  height: number
  alt: string
  accent?: string
  /** The handful of cards a reader can already see; everything else waits. */
  eager?: boolean
  className?: string
}) {
  const ref = useRef<HTMLImageElement>(null)
  const [loaded, setLoaded] = useState(false)
  // The <img> goes into the DOM only once the card is near the viewport, and
  // loading="lazy" is set on top of that. Two gates for one job, because one
  // of them does not hold here: measured on the production build (2026-09-15,
  // headless Chromium and a full Chrome alike), every one of /examples' 108
  // pictures — 10.7 MB — downloaded on first paint with lazy set. See
  // useNearViewport for the cause, which is in the page this route is served
  // with rather than in this grid. `eager` skips the gate for the handful of
  // cards that are on screen before anything is measured.
  const [box, near] = useNearViewport<HTMLDivElement>()
  const show = eager || near
  // A picture already in the browser's cache (or the worker's) can finish
  // before React attaches onLoad, and the sketch would then never lift.
  useEffect(() => {
    const img = ref.current
    if (img?.complete && img.naturalWidth > 0) setLoaded(true)
  }, [src, show])

  return (
    <div
      ref={box}
      className={cn('relative overflow-hidden bg-white', className)}
      style={{ aspectRatio: `${PAGE_IMAGE_WIDTH} / ${height}` }}
    >
      {!loaded && (
        <div className="absolute inset-0">
          <ThumbSkeleton accent={accent} />
        </div>
      )}
      {show && (
        <img
          ref={ref}
          src={src}
          width={PAGE_IMAGE_WIDTH}
          height={height}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={cn(
            'h-full w-full object-cover transition-opacity duration-200',
            loaded ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}
    </div>
  )
}
