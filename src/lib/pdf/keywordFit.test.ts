import { describe, expect, it } from 'vitest'
import { refitWhenFontsReady } from './keywordFit'

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
    // passes, the layout effect runs.
    expect(root.asked.length).toBe(2)
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
    expect(root.asked.length).toBe(2)
  })
})
