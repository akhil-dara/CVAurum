/**
 * The live contrast check.
 *
 * ONE colour on a resume is corrected automatically: an accent set as words
 * is derived into an ink that reads, because an accent is chosen to be a
 * colour and not a word (elementColors.ts darkenToContrast). Every other
 * colour on the page is the author's own - the body ink, the muted ink, a
 * band's ink, the five element colours, a sidebar - and a builder that
 * quietly moved those would be deciding what somebody's resume looks like.
 *
 * So the product TELLS them: this pair measures 3.1 to 1 where it needs 4.5,
 * here is the nearest colour that passes, change it or do not.
 *
 *   const report = checkArtboardContrast(document.querySelector('.rm-root'))
 *   report.findings[0].setting.label   // 'Muted text'
 *   report.findings[0].suggestion      // { color: '#5a6270', measured: 4.52 }
 *
 * A picture behind a header has to be read before it can be measured, so a
 * caller that wants those pairs too awaits `checkArtboardContrastAsync` once
 * and then calls the synchronous form on every keystroke.
 */
export { auditContrast, assess, groupBySetting, probes, type AuditOptions, type Probe } from './audit'
/** One row of the report: every finding one setting is answerable for. */
export type ContrastGroup = ReturnType<typeof import('./audit').groupBySetting>[number]
export { snapshotArtboard, warmPictures, setPictureGrounds } from './snapshot'
export * from './types'
export { parseColor, toHex, luminance, ratio, over, mixRgba, quantise, type Rgba } from './color'
export { isLargeText, requiredRatio, ptFromPx, drawnPt, fails, RATIO_SLACK, type Box } from './geometry'
export { compositeGrounds, paperOf, type PaintLayer, type GroundCandidate } from './ground'
export { nameInk, nameGround, roleOf, sectionKeyOf, ALL_VARS, TRACKED_VARS, type InkRole } from './settings'
export { matchPaints, paintWith, solveAmount, straight, isTransformed, type PaintPath } from './transform'
export { solveValue, worstOn, clears, capReason, type InkTarget, type SolveResult } from './solve'

import { auditContrast, type AuditOptions } from './audit'
import { snapshotArtboard, warmPictures } from './snapshot'
import type { ContrastReport } from './types'

/** Measure the artboard as it stands. Cheap enough to run on a keystroke,
 *  once any picture behind a header has been read. */
export function checkArtboardContrast(root: Element | null | undefined, opts: AuditOptions = {}): ContrastReport {
  if (!root) return { paper: '#ffffff', checked: 0, findings: [], unmeasured: [] }
  return auditContrast(snapshotArtboard(root), opts)
}

/** The same, having first read the pixels of every picture the page paints
 *  behind words. Await this once per document. */
export async function checkArtboardContrastAsync(
  root: Element | null | undefined,
  opts: AuditOptions = {}
): Promise<ContrastReport> {
  if (!root) return { paper: '#ffffff', checked: 0, findings: [], unmeasured: [] }
  await warmPictures(root)
  return auditContrast(snapshotArtboard(root), opts)
}
