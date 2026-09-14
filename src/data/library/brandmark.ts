/**
 * A mark for an invented employer.
 *
 * Not a lettered tile: a wall of those reads as a spreadsheet. Each mark is a
 * small geometric device — the sort of thing a real identity would use — drawn
 * from a set of eight shapes and a palette, picked by a hash of the company's
 * name, so a company always carries the same mark wherever it appears.
 *
 * They are inline SVG data URIs, which is what the document schema accepts
 * for a per-entry logo, so nothing is fetched and nothing external is needed.
 *
 * REAL COMPANY LOGOS: the entry schema takes any data URI, so a real mark can
 * be dropped in per entry (`work[].logo`) by whoever runs the site. None ship
 * here on purpose. This repository is public and MIT-licensed, so a logo file
 * committed to it is redistributed by every fork and every clone, and another
 * company's trademark is not ours to license onward. Keeping the shipped set
 * invented also keeps the samples honest: nobody in them worked anywhere real.
 */

function hash(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Muted, printable, and distinct from one another at 24px. */
const PALETTE: [string, string][] = [
  ['#1f3a5f', '#7aa2c8'],
  ['#2c4a3e', '#8bc0a4'],
  ['#5a2f4a', '#c79ab4'],
  ['#6b3a1f', '#d3a077'],
  ['#333a52', '#9aa3c4'],
  ['#1f4f4a', '#79bfb4'],
  ['#4a3b1f', '#c4ad72'],
  ['#45213a', '#b98cae'],
]

/** Eight devices: enough that a page of twelve never repeats a silhouette. */
function device(kind: number, dark: string, light: string): string {
  switch (kind % 8) {
    case 0: // stacked chevrons
      return `<path d="M14 34l18-12 18 12-6 0-12-8-12 8z" fill="${light}"/><path d="M14 44l18-12 18 12-6 0-12-8-12 8z" fill="${dark}"/>`
    case 1: // concentric arc
      return `<path d="M16 44a16 16 0 0 1 32 0h-7a9 9 0 0 0-18 0z" fill="${dark}"/><circle cx="32" cy="44" r="4" fill="${light}"/>`
    case 2: // split square
      return `<rect x="16" y="16" width="32" height="32" rx="7" fill="${dark}"/><path d="M16 32h32v9a7 7 0 0 1-7 7H23a7 7 0 0 1-7-7z" fill="${light}"/>`
    case 3: // orbit
      return `<circle cx="32" cy="32" r="15" fill="none" stroke="${dark}" stroke-width="5"/><circle cx="32" cy="17" r="5" fill="${light}"/>`
    case 4: // three bars
      return `<rect x="16" y="18" width="10" height="28" rx="4" fill="${dark}"/><rect x="27" y="26" width="10" height="20" rx="4" fill="${light}"/><rect x="38" y="14" width="10" height="32" rx="4" fill="${dark}"/>`
    case 5: // diamond
      return `<path d="M32 14l18 18-18 18-18-18z" fill="${dark}"/><path d="M32 24l8 8-8 8-8-8z" fill="${light}"/>`
    case 6: // arrow through a ring
      return `<circle cx="32" cy="32" r="16" fill="${light}"/><path d="M24 40l16-16m0 0h-9m9 0v9" stroke="${dark}" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
    default: // leaf / wave
      return `<path d="M16 46c0-17 13-28 32-28 0 17-13 28-32 28z" fill="${dark}"/><path d="M22 42c4-10 12-16 22-18" stroke="${light}" stroke-width="3" fill="none" stroke-linecap="round"/>`
  }
}

/**
 * The mark for `company`, as an SVG data URI. Square, so it sits in the
 * document's existing per-entry logo slot without any layout change.
 */
export function brandmark(company: string): string {
  const h = hash(company)
  const [dark, light] = PALETTE[h % PALETTE.length]
  const kind = (h >> 5) % 8
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">` +
    `<rect width="64" height="64" rx="14" fill="#ffffff"/>` +
    `<rect width="64" height="64" rx="14" fill="${dark}" opacity="0.08"/>` +
    device(kind, dark, light) +
    `</svg>`
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}
