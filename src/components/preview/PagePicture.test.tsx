import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { PagePicture } from './PagePicture'
import { PAGE_IMAGE_WIDTH, PAGE_IMAGE_HEIGHT } from '@/data/pageImages'

/**
 * The card picture. What is asserted here is what makes it cheaper than the
 * render it replaced — and what stops it from costing a reflow:
 *
 *  - a card that is not on screen yet puts NO <img> in the DOM. That gate,
 *    not loading="lazy", is what holds the bytes down on /examples: the
 *    route's pre-rendered HTML names the same 108 files, and while React
 *    swaps one for the other the browser abandons the deferral and fetches
 *    all of them (10.7 MB, measured on the production build 2026-09-15).
 *  - the width/height pair and the box's aspect ratio keep the grid from
 *    jumping as files land, and both come from the generated map rather than
 *    a guess: A4 and US Letter are different shapes.
 *  - an alt that is a real sentence, because a picture of a résumé is the
 *    content of these cards, not decoration.
 *
 * Rendered to markup, which is all this repo's runner can do (vitest.config.ts:
 * environment 'node'); the gate's scrolling half is measured in the browser
 * instead, with _local/grid-perf.cjs.
 */
describe('the page picture on a card', () => {
  const height = PAGE_IMAGE_HEIGHT['examples/registered-nurse']

  it('holds the box with the accent sketch and no <img> until the card is near', () => {
    const html = renderToStaticMarkup(
      <PagePicture src="/img/examples/registered-nurse.webp" height={height} alt="x" accent="#123456" />
    )
    expect(html).not.toContain('<img')
    expect(html).toContain('animate-pulse')
    expect(html).toContain('#123456')
    expect(html).toContain(`aspect-ratio:${PAGE_IMAGE_WIDTH} / ${height}`)
  })

  it('is an async-decoded image at the picture’s own intrinsic size once shown', () => {
    const html = renderToStaticMarkup(
      <PagePicture src="/img/examples/registered-nurse.webp" height={height} alt="A résumé page" eager />
    )
    expect(html).toContain('decoding="async"')
    expect(html).toContain(`width="${PAGE_IMAGE_WIDTH}"`)
    expect(html).toContain(`height="${height}"`)
    expect(html).toContain('alt="A résumé page"')
    expect(html).toContain('src="/img/examples/registered-nurse.webp"')
    // The cards already on screen are not held back by the gate or by lazy.
    expect(html).toContain('loading="eager"')
  })

  it('reserves the picture’s own aspect ratio, so nothing shifts as it lands', () => {
    const html = renderToStaticMarkup(
      <PagePicture src="/img/templates/broadsheet.webp" height={1553} alt="A résumé page" eager />
    )
    // 1553 is US Letter at 1200 wide; a box built for A4 would letterbox it.
    expect(html).toContain(`aspect-ratio:${PAGE_IMAGE_WIDTH} / 1553`)
  })

  it('keeps the picture transparent until it has decoded', () => {
    const html = renderToStaticMarkup(
      <PagePicture src="/img/examples/registered-nurse.webp" height={height} alt="x" eager />
    )
    // Half a résumé painted over the sketch reads as a broken card.
    expect(html).toContain('opacity-0')
    expect(html).toContain('animate-pulse')
  })

  it('every example and every design has a declared height to reserve', () => {
    // The map is generated; a design added without rebuilding the pictures
    // falls back to A4, which is what all of them are today. This test is here
    // so that stops being silently true if a US Letter design is ever added.
    const heights = new Set(Object.values(PAGE_IMAGE_HEIGHT))
    expect(heights.size).toBeGreaterThan(0)
    for (const h of heights) expect(h).toBeGreaterThan(1000)
  })
})
