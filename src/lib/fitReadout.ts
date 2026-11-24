/**
 * What Magic fit did, in numbers a person can read.
 *
 * The fit used to be silent: a toggle, a scale nobody saw, and a page that
 * had changed size without saying by how much. `fitRulesOf` turns the
 * document's rules into the search's input; `fitSizesPt` turns the search's
 * answer back into the sizes on the page (the same arithmetic the renderer
 * uses in useVars, so the sentence and the page agree); `formatFitReadout`
 * writes the sentence.
 */
import type { FitRules, FitVector } from './fitOnePage'
import type { Metadata } from '@/types/metadata'
import { fitLineHeight, typeFloor } from './fitOnePage'
import { translate, type Locale } from '@/i18n/core'

/** The result the preview records after every fit and pagination. */
export interface FitResult {
  fit: FitVector
  pages: number
  /** The last page's content height over its usable height, 0..1+. */
  lastPageFill: number
  /** The keys of the sections that begin on the last page (empty on one page). */
  lastPageSections?: string[]
}

/** Auto's own floor: 9pt, or 6% below the size set when that is larger, and
 *  never above the size set - a floor the app chose never raises text. */
export const AUTO_TYPE_MIN_PT = 9
export const AUTO_MAX_SHRINK = 0.94
export const AUTO_SPACE_MIN = 0.8
/** The floor for a page count on a new resume when the author set none. */
export const PAGES_APP_FLOOR_PT = 8.5
export function autoFloorPt(setPt: number): number {
  return Math.min(setPt, Math.max(AUTO_TYPE_MIN_PT, Math.round(setPt * AUTO_MAX_SHRINK * 100) / 100))
}

/**
 * The document's rules as the fit search reads them - the ONE place the
 * preview, the exporter and the trials all read, so they agree by
 * construction. A saved resume (mode 'pages', floor 'author' or none) maps
 * exactly as it always did.
 */
export function fitRulesOf(metadata: Metadata): FitRules {
  const f = metadata.page.fit
  const set = metadata.typography.fontSize
  const auto = f.mode === 'auto'
  const author = f.minBodyBy === 'author' && f.minBody != null
  const appFloor = auto ? autoFloorPt(set) : f.minBodyBy === 'app' ? Math.min(set, PAGES_APP_FLOOR_PT) : null
  return {
    target: f.target,
    minBody: author ? f.minBody : (appFloor ?? f.minBody),
    fontSize: set,
    priority: f.priority,
    auto,
    grow: auto || f.minBodyBy === 'app' ? false : undefined,
    spaceMin: auto ? AUTO_SPACE_MIN : undefined,
    keptPages: f.keptPages,
    pinned: metadata.page.breaks.length > 0,
  }
}

/** The body size the fit will not go below on this document, in points:
 *  the author's floor when set, else the search's own (0.66 of the body). */
export function effectiveFloorPt(metadata: Metadata): number {
  return typeFloor(fitRulesOf(metadata)) * metadata.typography.fontSize
}

export interface FitSizesPt {
  body: number
  /** The line height the page is drawn at, as a multiple of the body. Not a
   *  point size like its neighbours - it is the number the slider shows. */
  leading: number
  heading: number
  name: number
  sectionGap: number
  entryGap: number
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/**
 * The body size below which a printed resume stops being comfortable to read.
 *
 * The same number the analysis panel fails a document on, named once so the
 * two cannot drift: a fit that quietly produced a size the app's own report
 * calls a fail was the product contradicting itself.
 */
export const LEGIBLE_BODY_PT = 8.5

/** A multiple like a line height: as few decimals as say it. */
const num = (n: number) => String(Math.round(n * 100) / 100)

/** The sizes the page is drawn at under `fit`, in points. Mirrors useVars. */
export function fitSizesPt(metadata: Metadata, fit: FitVector): FitSizesPt {
  const t = metadata.typography
  const lock = metadata.page.fit.lock
  const body = t.fontSize * fit.type
  const nameBase = lock.name ? t.fontSize : body
  return {
    body,
    leading: fitLineHeight(t.lineHeight, fit.space, lock.leading),
    heading: body * t.sectionTitleScale,
    name: nameBase * (t.nameScale ?? 1.55 + clamp(t.headingScale, 1, 2.6) * 0.62),
    sectionGap: metadata.layout.sectionGap * (lock.sectionGap ? 1 : fit.space),
    entryGap: metadata.layout.itemGap * fit.space,
  }
}

const pt = (n: number) => `${(Math.round(n * 10) / 10).toString()}pt`
const pct = (n: number) => `${Math.round(n * 100)}%`

/** "1 page" / "3 pages", in the language the panel is reading. */
const pagesWord = (locale: Locale, n: number) =>
  n === 1 ? translate(locale, 'fit.pageOne') : translate(locale, 'fit.pagesMany', { n })

/** The line everyone reads, in a job seeker's words: does it fit, and was
 *  the text made smaller. `formatFitReadout` keeps the exact sizes, one tap
 *  away under Details. */
export function formatFitSummary(
  metadata: Metadata,
  result: FitResult | null,
  locale: Locale = 'en'
): string {
  const on = metadata.page.autoFit
  if (!result) return translate(locale, on ? 'fit.summaryMeasuring' : 'fit.summaryOff')
  const pages = pagesWord(locale, result.pages)
  const setPt = metadata.typography.fontSize
  if (!on) return translate(locale, 'fit.summaryOffAt', { pages, pt: pt(setPt) })
  const body = fitSizesPt(metadata, result.fit).body
  const target = metadata.page.fit.target
  if (result.pages > target)
    return translate(locale, 'fit.summaryCant', {
      target: pagesWord(locale, target),
      pages,
      body: pt(body),
    })
  if (body < setPt - 0.05)
    return translate(locale, 'fit.summarySmaller', { pages, body: pt(body), set: pt(setPt) })
  return translate(locale, 'fit.summaryAt', { pages, set: pt(setPt) })
}

/** One sentence: what the fit did, and how the pages came out. */
export function formatFitReadout(
  metadata: Metadata,
  result: FitResult | null,
  locale: Locale = 'en'
): string {
  const on = metadata.page.autoFit
  if (!result) return translate(locale, on ? 'fit.summaryMeasuring' : 'fit.summaryOff')
  const pages = pagesWord(locale, result.pages)
  const fill =
    result.pages === 1
      ? translate(locale, 'fit.fillOne', { pct: pct(result.lastPageFill) })
      : translate(locale, 'fit.fillPage', { n: result.pages, pct: pct(result.lastPageFill) })
  if (!on) return translate(locale, 'fit.offReadout', { pages, fill })
  const s = fitSizesPt(metadata, result.fit)
  const moved = Math.abs(result.fit.type - 1) > 0.0005 || Math.abs(result.fit.space - 1) > 0.0005
  const head = translate(locale, moved ? 'fit.headFitted' : 'fit.headAsSet')
  const target = metadata.page.fit.target
  const short =
    result.pages > target
      ? translate(locale, target === 1 ? 'fit.outOfReachOne' : 'fit.outOfReachMany', {
          target: pagesWord(locale, target),
        })
      : ''
  const setLead = metadata.typography.lineHeight
  const lead =
    Math.abs(s.leading - setLead) > 0.005
      ? translate(locale, 'fit.leadFrom', { lead: num(s.leading), set: num(setLead) })
      : ''
  // The fit will go down to two thirds of the body as set when the author has
  // not named a floor, which on a 10pt body is 6.6pt - a size the app's own
  // analysis calls a fail. It is a legal answer to "one page", but the person
  // reading the readout is the one who has to decide whether to spend a second
  // page instead, and they cannot decide what they are not told.
  const cramped =
    s.body < LEGIBLE_BODY_PT ? translate(locale, 'fit.cramped', { body: pt(s.body) }) : ''
  return translate(locale, 'fit.readoutLine', {
    head,
    body: pt(s.body),
    lead,
    heading: pt(s.heading),
    name: pt(s.name),
    gap: pt(s.sectionGap),
    entryGap: pt(s.entryGap),
    pages,
    fill,
    short,
    cramped,
  })
}

/**
 * How the chip over the page words a text size the fit shrank. "Slightly
 * smaller" was said of every shrink, 10.5pt printed at 7.6pt included
 * (2026-10-24): the words now scale with the shrink, and a size below what
 * prints legibly is called small and flagged.
 */
export function shrinkWords(body: number, set: number, locale: Locale = 'en'): { words: string; warn: boolean } {
  if (body < LEGIBLE_BODY_PT) return { words: translate(locale, 'fit.smallText'), warn: true }
  if (body < set * 0.9) return { words: translate(locale, 'fit.smaller'), warn: false }
  return { words: translate(locale, 'fit.slightlySmaller'), warn: false }
}
