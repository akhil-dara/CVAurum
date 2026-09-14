import { describe, expect, it } from 'vitest'
import { fitHeadingWords, refitWhenFontsReady } from './keywordFit'

/**
 * The fit passes measure GLYPH widths, so the face they measure decides what
 * they do. A layout effect fires before a webfont has loaded, so whichever
 * tree happens to render before the face lands settles on a fit taken from
 * the fallback face - and nothing re-renders it afterwards.
 *
 * That is a page cut that differs between the preview and the export: the
 * measure portal renders once per edit, long before a newly-chosen face has
 * been fetched, while the exporter renders its own sheet later with the face
 * already in hand. The two then carry section headings at different sizes,
 * which moves every line under them.
 *
 * A fake root stands in for the DOM: both passes start by asking it for their
 * own elements, so counting those calls says whether the refit ran without
 * needing a document to run it against.
 */
function fakeRoot() {
  const asked: string[] = []
  return {
    asked,
    querySelectorAll: (selector: string) => {
      asked.push(selector)
      return [] as unknown as NodeListOf<HTMLElement>
    },
  }
}

/** Which pass an ask belongs to, by the elements it names. */
const headingAsk = (selector: string) => selector.includes('rm-section-title')
const keywordAsk = (selector: string) => selector.includes('rm-kw')
const ranBothPasses = (asked: string[]) => asked.some(headingAsk) && asked.some(keywordAsk)

/** Let every pending microtask (and the promise chain behind the refit) run. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('refitWhenFontsReady', () => {
  it('waits for the faces before it re-measures, then runs BOTH fit passes', async () => {
    const root = fakeRoot()
    refitWhenFontsReady(root as unknown as HTMLElement, ['Lato', 'Chivo', 'Chivo'])
    // Not synchronously: the caller's own layout effect has just fitted
    // against whatever was loaded, and re-doing that immediately would
    // measure the same fallback face all over again.
    expect(root.asked).toEqual([])
    await settle()
    // Headings first, then keywords - the same order, and the same two
    // passes, the layout effect runs. Asserted by what each pass asks the
    // tree for rather than by a call count, which the heading pass's own
    // reset ask would otherwise pin.
    expect(ranBothPasses(root.asked)).toBe(true)
    expect(root.asked.findIndex(headingAsk)).toBeLessThan(root.asked.findIndex(keywordAsk))
  })

  it('a cancelled refit never touches the tree it was given', async () => {
    const root = fakeRoot()
    const cancel = refitWhenFontsReady(root as unknown as HTMLElement, ['Lato'])
    cancel()
    await settle()
    expect(root.asked).toEqual([])
  })

  it('takes no families as nothing to wait for, and still settles', async () => {
    const root = fakeRoot()
    refitWhenFontsReady(root as unknown as HTMLElement, [undefined, undefined])
    await settle()
    expect(ranBothPasses(root.asked)).toBe(true)
  })
})

/**
 * A heading the pass shrank under one design must go back to full size under
 * the next one, even when the next design has no fittable heading at all.
 *
 * The fit only ever applies to a title in a sidebar or a side gutter, and its
 * reset used to walk that same set - which is empty the moment the document
 * moves to a single-column design. The inline size stayed on the element.
 * Since the exporter mounts a fresh tree that never had one, the preview and
 * the PDF then measured two different headings: four of them on the
 * multi-page parity check, each four pixels shorter on the canvas than in the
 * PDF, which moved every line beneath them and the second page cut with them.
 */
describe('fitHeadingWords', () => {
  it('clears a size it wrote earlier, even where nothing is fittable now', () => {
    const stale = { style: { fontSize: '9.02059px' } } as unknown as HTMLElement
    const asked: string[] = []
    const root = {
      querySelectorAll: (selector: string) => {
        asked.push(selector)
        // The reset comes first and asks for a WIDER set than the fittable
        // one - every box this pass could have written to under any design.
        // The second ask is the fittable set, empty on a single column.
        const out = asked.length === 1 ? [stale] : []
        return out as unknown as NodeListOf<HTMLElement>
      },
    }

    fitHeadingWords(root as unknown as HTMLElement)

    expect(stale.style.fontSize).toBe('')
    expect(asked[0]).not.toContain('rm-col-aside')
    expect(asked[1]).toContain('rm-col-aside')
  })
})
