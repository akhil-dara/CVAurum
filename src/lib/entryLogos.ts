/**
 * The logos one entry shows (issue #8).
 *
 * A degree can belong to more than one institution - the St Andrews and
 * William & Mary joint degree bears both crests - and a role can sit inside a
 * joint venture. An entry shows up to three logos, side by side. The first
 * stays in `logo`, where every older file, older app and JSON Resume reader
 * already looks; the second and third live in `logoExtras`. Every read and
 * write goes through here, so the order, the cap and the promotion on
 * removal are decided once.
 */

export const MAX_ENTRY_LOGOS = 3

export type LogoEntry = { logo?: string; logoExtras?: string[] }

/** An image made on this device - a data or blob URL - never a remote one. */
export const isLocalImg = (s?: string) => !!s && /^(data:image\/|blob:)/i.test(s)

/** The entry's logos in the order shown: `logo`, then `logoExtras`. */
export function entryLogos(it: LogoEntry): string[] {
  return [it.logo, ...(it.logoExtras ?? [])].filter(isLocalImg).slice(0, MAX_ENTRY_LOGOS) as string[]
}

/** Store `logos` on the entry: the first in `logo`, the rest in `logoExtras`,
 *  local images only and three at most. A key with nothing to hold is
 *  deleted, so a one-logo entry is stored exactly as it always was. */
export function setEntryLogos(it: LogoEntry, logos: string[]): void {
  const kept = logos.filter(isLocalImg).slice(0, MAX_ENTRY_LOGOS)
  if (kept[0]) it.logo = kept[0]
  else delete it.logo
  if (kept.length > 1) it.logoExtras = kept.slice(1)
  else delete it.logoExtras
}

export function addEntryLogo(it: LogoEntry, src: string): void {
  const logos = entryLogos(it)
  if (logos.length >= MAX_ENTRY_LOGOS) return
  setEntryLogos(it, [...logos, src])
}

export function replaceEntryLogo(it: LogoEntry, index: number, src: string): void {
  const logos = entryLogos(it)
  if (index < 0 || index >= logos.length) return
  logos[index] = src
  setEntryLogos(it, logos)
}

/** Removing the first promotes the next into `logo`. */
export function removeEntryLogo(it: LogoEntry, index: number): void {
  setEntryLogos(
    it,
    entryLogos(it).filter((_, i) => i !== index)
  )
}

/** One place left or right; a move past either end does nothing. */
export function moveEntryLogo(it: LogoEntry, index: number, dir: -1 | 1): void {
  const logos = entryLogos(it)
  const to = index + dir
  if (index < 0 || index >= logos.length || to < 0 || to >= logos.length) return
  ;[logos[index], logos[to]] = [logos[to], logos[index]]
  setEntryLogos(it, logos)
}
