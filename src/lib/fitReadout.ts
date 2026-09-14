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

/** The result the preview records after every fit and pagination. */
export interface FitResult {
  fit: FitVector
  pages: number
  /** The last page's content height over its usable height, 0..1+. */
  lastPageFill: number
  /** The keys of the sections that begin on the last page (empty on one page). */
  lastPageSections?: string[]
}

export function fitRulesOf(metadata: Metadata): FitRules {
  const f = metadata.page.fit
  return { target: f.target, minBody: f.minBody, fontSize: metadata.typography.fontSize, priority: f.priority }
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
 * The body size below which a printed résumé stops being comfortable to read.
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

/** One sentence: what the fit did, and how the pages came out. */
export function formatFitReadout(metadata: Metadata, result: FitResult | null): string {
  const on = metadata.page.autoFit
  if (!result) return on ? 'Measuring…' : 'Off'
  const pages = `${result.pages} page${result.pages === 1 ? '' : 's'}`
  const fill =
    result.pages === 1 ? `${pct(result.lastPageFill)} full` : `page ${result.pages} is ${pct(result.lastPageFill)} full`
  if (!on) return `Off · ${pages}, ${fill}`
  const s = fitSizesPt(metadata, result.fit)
  const moved = Math.abs(result.fit.type - 1) > 0.0005 || Math.abs(result.fit.space - 1) > 0.0005
  const head = moved ? 'Fitted' : 'As set'
  const t = metadata.page.fit.target
  const short = result.pages > t ? ` · ${t} page${t === 1 ? ' is' : 's are'} out of reach within your rules` : ''
  const setLead = metadata.typography.lineHeight
  const lead = Math.abs(s.leading - setLead) > 0.005 ? `, leading ${num(s.leading)} from ${num(setLead)}` : ''
  // The fit will go down to two thirds of the body as set when the author has
  // not named a floor, which on a 10pt body is 6.6pt - a size the app's own
  // analysis calls a fail. It is a legal answer to "one page", but the person
  // reading the readout is the one who has to decide whether to spend a second
  // page instead, and they cannot decide what they are not told.
  const cramped = s.body < LEGIBLE_BODY_PT ? ` · ${pt(s.body)} is below what prints legibly — a page more would keep it readable` : ''
  return `${head}: body ${pt(s.body)}${lead}, headings ${pt(s.heading)}, name ${pt(s.name)}, gaps ${pt(s.sectionGap)} / ${pt(s.entryGap)} · ${pages}, ${fill}${short}${cramped}`
}
