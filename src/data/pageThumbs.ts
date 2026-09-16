/**
 * The grid twin of a page picture: how wide it is, and how tall that makes it.
 *
 * Every design and every example ships two files of the same page. The 1200px
 * LOSSLESS one (see pageImages.ts, generated) is what the lightbox opens, what
 * the design's and the example's own pages show, and what an image index
 * crawls. The twin beside it — /img/<kind>/thumb/<id>.webp — is 520px and
 * LOSSY, and it exists for one reader: the person scrolling a grid of cards.
 *
 * 520 is the widest a card is ever painted: 260 CSS px on a desk at DPR 2, and
 * 172 CSS px on a 375px phone, which is 344 at DPR 2 and 516 at DPR 3. Both
 * files are written by scripts/make-page-images.cjs, from the same bytes, in
 * the same pass — read its header for the measurement behind the format.
 *
 * Deliberately NOT part of the generated pageImages.ts: that file is a table of
 * heights the renderer produced, rewritten wholesale on every rebuild, and this
 * is a decision about delivery.
 */
import { PAGE_IMAGE_WIDTH } from './pageImages'

export const PAGE_THUMB_WIDTH = 520

/**
 * The twin's own intrinsic height, from the big picture's.
 *
 * A4 and US Letter are different shapes, so this cannot be one number — and the
 * <img> must carry the size of the file it is actually loading, or the browser
 * is told a 520px picture is 1200px wide and picks the wrong one out of a
 * srcset it is later given.
 */
export function pageThumbHeight(height: number): number {
  return Math.round((height * PAGE_THUMB_WIDTH) / PAGE_IMAGE_WIDTH)
}
