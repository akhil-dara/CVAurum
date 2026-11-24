import type { Metadata } from '@/types/metadata'
import { ARABIC_FAMILY, type FontDef } from '@/data/fonts'

/** What src/lib/script.ts `documentScript` reads off the page. */
export interface PageScript {
  arabic: boolean
  persian: boolean
}

/**
 * Can this face draw Arabic script?
 *
 * Nothing in the font data records which scripts a face draws: FONTS has no
 * such field, and public/fonts-pdf/index.json maps family|weight to a file and
 * nothing else. What is known is that the Arabic family is the ONLY bundled
 * face with a single Arabic letter (src/data/fonts.ts ARABIC_FAMILY), so the
 * rule is that one name. A second Arabic face would be added here.
 */
export function coversArabic(family: string): boolean {
  return family === ARABIC_FAMILY
}

/**
 * Sets a document up to read right to left, the one tap the editor offers a
 * resume written in Persian or Arabic: the page mirrors, the dates are spelled
 * in the page's language (the Persian calendar for Persian), and every face
 * that cannot draw Arabic script becomes the Arabic family. A face that can is
 * left alone, and so is an empty heading or name face, which already follows
 * the body. An open range ends in the page language's word for Present.
 * Turning the switch on by hand is the same call; turning it off sets only
 * the direction back.
 */
export function applyRtlSetup(metadata: Metadata, script: PageScript): void {
  metadata.layout.rtl = true
  metadata.dates.language = script.persian ? 'fa' : 'ar'
  // The open range's last word, spelled in the page language too, but only
  // while it is still the English default: a word the author typed stays.
  if (metadata.dates.present.trim() === 'Present') metadata.dates.present = script.persian ? 'اکنون' : 'حتى الآن'
  const t = metadata.typography
  if (!coversArabic(t.fontFamily)) t.fontFamily = ARABIC_FAMILY
  if (t.headingFamily && !coversArabic(t.headingFamily)) t.headingFamily = ARABIC_FAMILY
  if (t.nameFamily && !coversArabic(t.nameFamily)) t.nameFamily = ARABIC_FAMILY
}

/** Every metadata field `applyRtlSetup` may change, as they stand. Keep this
 *  in step with applyRtlSetup: a field the setup changes and the snapshot
 *  misses is one Undo cannot put back (the word for Present once was). */
export interface RtlSetupSnapshot {
  rtl: boolean
  language: string
  present: string
  fontFamily: string
  headingFamily: string
  nameFamily: string
}

export function rtlSetupSnapshot(metadata: Metadata): RtlSetupSnapshot {
  const t = metadata.typography
  return {
    rtl: metadata.layout.rtl,
    language: metadata.dates.language,
    present: metadata.dates.present,
    fontFamily: t.fontFamily,
    headingFamily: t.headingFamily,
    nameFamily: t.nameFamily,
  }
}

/** The Undo of the offer's setup: every field it touched goes back, and the
 *  offer is marked declined - left open, the card would ask again at once. */
export function undoRtlSetup(metadata: Metadata, before: RtlSetupSnapshot): void {
  metadata.layout.rtl = before.rtl
  metadata.dates.language = before.language
  metadata.dates.present = before.present
  metadata.typography.fontFamily = before.fontFamily
  metadata.typography.headingFamily = before.headingFamily
  metadata.typography.nameFamily = before.nameFamily
  metadata.layout.rtlOfferDismissed = true
}

/** Turning right to left off by hand (the switch, the palette): only the
 *  direction goes back - the faces and dates stay the author's - and the
 *  offer is marked declined, or it would ask again at once. */
export function turnRtlOff(metadata: Metadata): void {
  metadata.layout.rtl = false
  metadata.layout.rtlOfferDismissed = true
}

/** The fonts a picker offers: every face, except that the Arabic face is
 *  offered only to a page with Arabic-script letters, or where it is already
 *  one of the chosen faces (so the picker can still show what is set). The
 *  same rule as the right-to-left switch. */
export function offeredFonts<T extends Pick<FontDef, 'name'>>(fonts: readonly T[], arabicPage: boolean, chosen: readonly string[]): T[] {
  if (arabicPage || chosen.some((c) => coversArabic(c))) return [...fonts]
  return fonts.filter((f) => !coversArabic(f.name))
}

/** The offer shows for a page in Arabic script that is not mirrored and whose
 *  author has not said "Not now" to it. */
export function rtlOfferShown(metadata: Metadata, script: PageScript): boolean {
  return script.arabic && !metadata.layout.rtl && !metadata.layout.rtlOfferDismissed
}
