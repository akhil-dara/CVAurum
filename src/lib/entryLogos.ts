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

/** Every logo an imported file or a received link brings, through `clean`
 *  (io.ts sanitizeImportedImage: local data URLs only, re-encoded), then
 *  stored with the usual cap. The extras are attacker-controllable exactly
 *  as the first logo is. */
export async function sanitizeEntryLogos(it: LogoEntry, clean: (s?: string) => Promise<string>): Promise<void> {
  const kept: string[] = []
  for (const s of [it.logo, ...(it.logoExtras ?? [])]) {
    if (!s) continue
    const c = await clean(s)
    if (c) kept.push(c)
  }
  setEntryLogos(it, kept)
}

/** A restored backup is never re-encoded, so it keeps data URLs only: a
 *  remote one would fire a request on render, and a blob URL from another
 *  session points at nothing. */
export function dropNonDataLogos(it: LogoEntry): void {
  setEntryLogos(
    it,
    [it.logo, ...(it.logoExtras ?? [])].filter((s): s is string => !!s && /^data:image\//i.test(s))
  )
}

/** The list with the logo at `from` moved to `to` (the panel's drag reorder). */
export function moveLogoTo(list: readonly string[], from: number, to: number): string[] {
  const next = list.slice()
  if (from < 0 || from >= next.length || to < 0 || to >= next.length || from === to) return next
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

/** A canvas logo button's accessible name: which logo, and whose. */
export function logoButtonLabel(who: string | undefined, n: number, of: number): string {
  const which = of > 1 ? `logo ${n} of ${of}` : 'logo'
  const name = (who ?? '').trim()
  return `Change or remove ${which}${name ? `: ${name}` : ''}`
}

/** Where a popover menu opens beside its anchor so it stays in the window:
 *  below if it fits, else above, else as low as the window allows. */
export function placeMenu(
  anchor: { top: number; bottom: number; left: number },
  menu: { w: number; h: number },
  view: { w: number; h: number },
  gap = 6,
  pad = 8
): { top: number; left: number } {
  const below = anchor.bottom + gap
  const above = anchor.top - gap - menu.h
  const top = below + menu.h <= view.h - pad ? below : above >= pad ? above : Math.max(pad, view.h - menu.h - pad)
  const left = Math.max(pad, Math.min(anchor.left, view.w - menu.w - pad))
  return { top, left }
}
