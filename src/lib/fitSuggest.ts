import type { ResumeDocument } from '@/types/document'
import type { FitResult } from './fitReadout'
import { LEGIBLE_BODY_PT, effectiveFloorPt, fitSizesPt } from './fitReadout'
import { moveSection, sectionHasContent, sectionLabel } from './sections'

/** A candidate document measured the way the preview measures the real one:
 *  the same search, the same paginator, the same rules. */
export type FitTrialFn = (candidate: ResumeDocument) => Promise<FitResult>

export interface Suggestion {
  id: string
  /** What the move is and what it measured: "Move Languages above Skills:
   *  2 pages, page 2 is 62% full". */
  label: string
  /** Applies the move to a document through the normal update path. */
  mutate: (doc: ResumeDocument) => void
}

/** The last page has "a lot of free space" below this fill: worth a few
 *  reorder trials (each one render and one search, on request only). */
const SPARSE = 0.6
/** A reorder must fill the last page by at least this much more to be worth
 *  offering when it does not save a page. */
const GAIN = 0.1
const MAX_OFFERS = 3
/** The lowest floor the rules allow (the slider's bottom). */
const FLOOR_MIN = 6
/** The smallest body a relax offer may propose: below this the page is
 *  not a résumé anyone wants (measured: a 7.25pt file offered 6pt). */
const RELAX_MIN_BODY = 8
/** The narrowest page margin a move may propose, in mm. */
const MIN_MARGIN = 10
/** Sections a résumé can most easily do without, in the order a move tries
 *  leaving them out. Leaving out hides the section; its content is kept. */
const EXPENDABLE = ['interests', 'references', 'volunteer', 'publications', 'languages', 'awards', 'certificates', 'projects']
/** Trials spent on leaving sections out, and offers made from them. */
const HIDE_TRIALS = 3
const HIDE_OFFERS = 2
/** At most this many sections left out together by the combined move. */
const COMBO_SECTIONS = 4

const pages = (n: number) => `${n} page${n === 1 ? '' : 's'}`
const pct = (x: number) => `${Math.round(x * 100)}%`
const pt = (x: number) => `${Math.round(x * 10) / 10}pt`
const outcome = (r: FitResult) =>
  r.pages === 1 ? `1 page, ${pct(r.lastPageFill)} full` : `${pages(r.pages)}, page ${r.pages} is ${pct(r.lastPageFill)} full`

function columnOf(doc: ResumeDocument, key: string): string[] | null {
  const l = doc.metadata.layout
  if (l.main.includes(key)) return l.main
  if (l.aside.includes(key)) return l.aside
  if (l.footer?.includes(key)) return l.footer
  return null
}

/** Measures a few concrete moves and returns the ones that come out better
 *  than the current fit, best first, at most three: pulling the résumé onto
 *  one page fewer (when the target allows it), and moving a section on a
 *  nearly empty last page one place up. Each candidate costs one trial; the
 *  caller runs this on request only. */
export async function suggestFits(doc: ResumeDocument, trial: FitTrialFn, current: FitResult): Promise<Suggestion[]> {
  const offers: { s: Suggestion; pages: number; fill: number; body: number }[] = []
  const target = doc.metadata.page.fit.target

  // Pull up: one page fewer with the same rules. When the target is already
  // below the page count the search has tried that and fallen back.
  if (current.pages > 1 && target >= current.pages) {
    const n = (current.pages - 1) as 1 | 2 | 3
    const c = structuredClone(doc)
    c.metadata.page.fit.target = n
    const r = await trial(c)
    if (r.pages <= n) {
      const s = fitSizesPt(c.metadata, r.fit)
      offers.push({
        s: {
          id: `target-${n}`,
          label: `Fit ${pages(n)}: body ${pt(s.body)}, gaps ${pct(r.fit.space)}`,
          mutate: (d) => {
            d.metadata.page.fit.target = n
          },
        },
        pages: r.pages,
        fill: r.lastPageFill,
        body: s.body,
      })
    }
  }

  // Relax: the target was out of reach within the rules. Measure what body
  // size it needs with the floor let down to its lowest, and say so plainly;
  // lowering the floor stays the author's call. When even that needs a body
  // too small to offer, the next page count up is measured, and so on to one
  // page fewer than now: the owner's 3-page file with a 1-page target and an
  // 11pt floor needed 6pt for one page and was offered nothing, though two
  // pages were within reach at 9pt. The fewest pages at a readable size wins.
  const ownFloor = doc.metadata.page.fit.minBody
  if (current.pages > target && ownFloor != null && ownFloor > FLOOR_MIN) {
    for (let n = target; n < current.pages; n++) {
      const c = structuredClone(doc)
      c.metadata.page.fit.minBody = FLOOR_MIN
      c.metadata.page.fit.target = n as 1 | 2 | 3
      const r = await trial(c)
      const s = fitSizesPt(c.metadata, r.fit)
      if (r.pages > n || s.body < RELAX_MIN_BODY) continue
      // The floor the offer sets: the measured body, rounded down to the
      // slider's half-point step, so the same fit is reachable afterwards.
      // Only the floor moves - with the target left as the author set it, the
      // fit falls back to this page count by itself.
      const floor = Math.max(FLOOR_MIN, Math.floor(s.body * 2) / 2)
      // The label reports the document as it will be once applied, measured:
      // the rounded floor and the author's own target give a slightly
      // different fit from the probe above (9pt where the probe found 9.1).
      const applied = structuredClone(doc)
      applied.metadata.page.fit.minBody = floor
      const a = n === target ? r : await trial(applied)
      const aBody = n === target ? s.body : fitSizesPt(applied.metadata, a.fit).body
      if (a.pages > n) continue
      offers.push({
        s: {
          id: `floor-${floor}`,
          // Offered, since the page is the author's call, but never without
          // saying when the size is one the ATS check calls hard to read.
          label: `Fit ${pages(n)}: body ${pt(aBody)}, below your ${pt(ownFloor)} floor${aBody < LEGIBLE_BODY_PT ? ' — small for print' : ''}`,
          mutate: (d) => {
            d.metadata.page.fit.minBody = floor
          },
        },
        pages: a.pages,
        fill: a.lastPageFill,
        body: aBody,
      })
      break
    }
  }

  // Reorder: a section on a sparse last page moves one place up its column.
  if (current.pages > 1 && current.lastPageFill < SPARSE) {
    for (const key of current.lastPageSections ?? []) {
      const col = columnOf(doc, key)
      if (!col) continue
      const at = col.indexOf(key)
      if (at <= 0) continue
      const above = col[at - 1]
      const c = structuredClone(doc)
      moveSection(c.metadata.layout, key, -1)
      const r = await trial(c)
      const better = r.pages < current.pages || (r.pages === current.pages && r.lastPageFill >= current.lastPageFill + GAIN)
      if (!better) continue
      offers.push({
        s: {
          id: `move-${key}`,
          label: `Move ${sectionLabel(key, doc)} above ${sectionLabel(above, doc)}: ${outcome(r)}`,
          mutate: (d) => moveSection(d.metadata.layout, key, -1),
        },
        pages: r.pages,
        fill: r.lastPageFill,
        body: fitSizesPt(c.metadata, r.fit).body,
      })
    }
  }

  // Beyond type and spacing: when the target is out of reach, the two moves
  // that free the most room without touching a word - narrower margins, and
  // leaving out a section the résumé can most easily do without. Each is
  // measured, and offered only when it reaches the target by itself.
  if (current.pages > target) {
    const margin = doc.metadata.page.margin
    if (margin > MIN_MARGIN) {
      const m = Math.max(MIN_MARGIN, Math.round(margin * 0.7))
      const c = structuredClone(doc)
      c.metadata.page.margin = m
      const r = await trial(c)
      if (r.pages <= target) {
        const body = fitSizesPt(c.metadata, r.fit).body
        offers.push({
          s: {
            id: `margin-${m}`,
            label: `Narrower margins (${m} mm): fits ${pages(r.pages)}, text ${pt(body)}`,
            mutate: (d) => {
              d.metadata.page.margin = m
            },
          },
          pages: r.pages,
          fill: r.lastPageFill,
          body,
        })
      }
    }
    const l = doc.metadata.layout
    const placed = [...l.main, ...l.aside, ...(l.footer ?? [])]
    let tries = 0
    let found = 0
    for (const key of EXPENDABLE) {
      if (tries >= HIDE_TRIALS || found >= HIDE_OFFERS) break
      if (!placed.includes(key) || l.hidden.includes(key) || !sectionHasContent(key, doc.content)) continue
      tries++
      const c = structuredClone(doc)
      c.metadata.layout.hidden = [...l.hidden, key]
      const r = await trial(c)
      if (r.pages > target) continue
      found++
      const body = fitSizesPt(c.metadata, r.fit).body
      offers.push({
        s: {
          id: `hide-${key}`,
          label: `Leave out ${sectionLabel(key, doc)}: fits ${pages(r.pages)}, text ${pt(body)}`,
          mutate: (d) => {
            if (!d.metadata.layout.hidden.includes(key)) d.metadata.layout.hidden.push(key)
          },
        },
        pages: r.pages,
        fill: r.lastPageFill,
        body,
      })
    }
  }

  // Together: a résumé well over its target (1.8 pages asked for one) is
  // rarely brought in by one move. When none did, margins and the least
  // essential sections are taken in turn, cumulatively, and the first
  // combination that reaches the target is offered.
  if (current.pages > target && !offers.some((o) => o.pages <= target && /^(margin|hide)-/.test(o.s.id))) {
    const l = doc.metadata.layout
    const placed = [...l.main, ...l.aside, ...(l.footer ?? [])]
    const narrower = doc.metadata.page.margin > MIN_MARGIN ? Math.max(MIN_MARGIN, Math.round(doc.metadata.page.margin * 0.7)) : null
    const left: string[] = []
    for (const key of EXPENDABLE) {
      if (left.length >= COMBO_SECTIONS) break
      if (!placed.includes(key) || l.hidden.includes(key) || !sectionHasContent(key, doc.content)) continue
      left.push(key)
      const c = structuredClone(doc)
      if (narrower !== null) c.metadata.page.margin = narrower
      c.metadata.layout.hidden = [...l.hidden, ...left]
      const r = await trial(c)
      if (r.pages > target) continue
      const body = fitSizesPt(c.metadata, r.fit).body
      const keys = [...left]
      const names = keys.map((k) => sectionLabel(k, doc)).join(', ')
      offers.push({
        s: {
          id: `combo-${keys.join('-')}`,
          label: `${narrower !== null ? 'Narrower margins and leave out' : 'Leave out'} ${names}: fits ${pages(r.pages)}, text ${pt(body)}`,
          mutate: (d) => {
            if (narrower !== null) d.metadata.page.margin = narrower
            for (const k of keys) if (!d.metadata.layout.hidden.includes(k)) d.metadata.layout.hidden.push(k)
          },
        },
        pages: r.pages,
        fill: r.lastPageFill,
        body,
      })
      break
    }
  }

  // fewest pages first; among those, the move that keeps the text largest
  offers.sort((a, b) => a.pages - b.pages || b.body - a.body || b.fill - a.fill)
  return offers.slice(0, MAX_OFFERS).map((o) => o.s)
}

/** With the fit off, the last page is "a few lines" below this fill: worth
 *  measuring whether the résumé fits a page fewer at a readable size. */
const SPILL = 0.35
/** The smallest text an unasked "fit on fewer pages" may propose. */
const OFFER_MIN_BODY = 9

/**
 * The one offer made while Magic fit is OFF: a résumé whose last page holds a
 * few spilled lines, told it fits a page fewer and at what size - and only
 * when that size is 9pt or more, so the offer never trades a page for text
 * too small to read. Taking it turns the fit on at that target with a 9pt
 * floor; nothing changes until then (2026-09-26: the fit used to be on for
 * everyone and shrink as far as a page demanded).
 */
export async function suggestFitOn(doc: ResumeDocument, trial: FitTrialFn, current: FitResult): Promise<Suggestion | null> {
  if (doc.metadata.page.autoFit || current.pages < 2 || current.lastPageFill >= SPILL) return null
  const n = Math.min(3, current.pages - 1) as 1 | 2 | 3
  const floor = Math.max(OFFER_MIN_BODY, doc.metadata.page.fit.minBody ?? OFFER_MIN_BODY)
  const c = structuredClone(doc)
  c.metadata.page.autoFit = true
  c.metadata.page.fit.target = n
  c.metadata.page.fit.minBody = floor
  const r = await trial(c)
  const body = fitSizesPt(c.metadata, r.fit).body
  if (r.pages > n || body < OFFER_MIN_BODY - 0.05) return null
  return {
    id: `fit-on-${n}`,
    label: `Fit on ${pages(n)}: text ${pt(body)}`,
    mutate: (d) => {
      d.metadata.page.autoFit = true
      d.metadata.page.fit.target = n
      d.metadata.page.fit.minBody = floor
    },
  }
}

/**
 * Why the page target is out of reach, measured: the body size the target
 * would need with the floor let down to its lowest (null when even that
 * cannot reach it), beside the floor that stopped the fit. The card says it
 * in words instead of "Nothing better within your rules" - a dead end a
 * two-page résumé asked for one page used to meet (2026-10-24).
 */
export async function explainShort(
  doc: ResumeDocument,
  trial: FitTrialFn,
  current: FitResult
): Promise<{ pages: number; body: number | null; floor: number } | null> {
  const target = doc.metadata.page.fit.target
  if (current.pages <= target) return null
  const floor = doc.metadata.page.fit.minBody ?? Math.round(effectiveFloorPt(doc.metadata) * 10) / 10
  const c = structuredClone(doc)
  c.metadata.page.fit.minBody = FLOOR_MIN
  const r = await trial(c)
  const body = r.pages <= target ? Math.round(fitSizesPt(c.metadata, r.fit).body * 10) / 10 : null
  return { pages: target, body, floor }
}
