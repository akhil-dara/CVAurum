/**
 * A portrait for an invented person.
 *
 * The library needed faces: a wall of sample résumés carrying nothing but
 * lettered tiles reads as a spreadsheet, not as people. Photographs were not
 * an option — a photograph of a real person cannot be used without their say,
 * and a photorealistic invented face is both uncanny at thumbnail size and
 * impossible to guarantee is not somebody's likeness. So these are drawn:
 * flat vector portraits, built from a small set of features, chosen by a hash
 * of the person's name so the same name always gets the same face.
 *
 * Every portrait is an inline SVG data URI. Nothing is fetched, nothing is
 * stored, and the whole set costs the page a few hundred bytes each.
 */

/** Deterministic, order-independent-of-platform string hash. */
function hash(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** A tasteful spread rather than a cartoon one: these read as portraits at
 *  32px on a card and at 96px on a résumé. */
const SKIN = ['#f3d3bd', '#e8c39e', '#d9a97e', '#c68a5e', '#a86c46', '#8a5433', '#6b3f27']
const HAIR = ['#2b2118', '#3f2d20', '#5a3a24', '#7a5230', '#111014', '#4a4a52', '#6e6a63']
const CLOTHES = ['#2f3e56', '#3b4a5f', '#405a4a', '#5a4058', '#7a4a3a', '#33485c', '#4a4a6a']
const BACKDROP = ['#e8eef6', '#eef0e9', '#f4ece6', '#eae9f2', '#e7f0ef', '#f2ece2']

/** Hair shapes, drawn over the head. Index picked from the seed. */
function hairPath(kind: number, colour: string): string {
  switch (kind % 6) {
    case 0: // short crop
      return `<path d="M18 30c0-9 6-15 14-15s14 6 14 15c0-4-4-7-14-7s-14 3-14 7z" fill="${colour}"/>`
    case 1: // side part
      return `<path d="M18 31c0-10 6-16 14-16 6 0 10 3 12 8-4-2-9-1-13 2-4 3-9 3-13 6z" fill="${colour}"/>`
    case 2: // long, past the shoulders
      return `<path d="M17 32c0-11 7-17 15-17s15 6 15 17v16c0-8-3-12-5-13 1-6-2-11-10-11s-11 5-10 11c-2 1-5 5-5 13z" fill="${colour}"/>`
    case 3: // bun
      return `<circle cx="32" cy="12" r="5" fill="${colour}"/><path d="M18 31c0-10 6-16 14-16s14 6 14 16c0-5-5-8-14-8s-14 3-14 8z" fill="${colour}"/>`
    case 4: // curls
      return `<path d="M18 31c0-10 6-16 14-16s14 6 14 16c0-4-3-6-6-5 1-4-3-6-8-6s-9 2-8 6c-3-1-6 1-6 5z" fill="${colour}"/><circle cx="21" cy="27" r="4" fill="${colour}"/><circle cx="43" cy="27" r="4" fill="${colour}"/>`
    default: // receding / close shave
      return `<path d="M20 30c1-8 6-13 12-13s11 5 12 13c-2-5-6-7-12-7s-10 2-12 7z" fill="${colour}"/>`
  }
}

/**
 * A flat portrait for `name`, as an SVG data URI, sized for a résumé's photo
 * slot. The same name always produces the same face.
 */
export function portrait(name: string): string {
  const h = hash(name)
  // Unsigned shifts throughout. `>>` first coerces to a SIGNED 32-bit integer,
  // so every hash above 2^31 - about half of them - shifted to a negative
  // number, `% length` stayed negative, the lookup returned undefined, and the
  // SVG fell back to black: a black disc with a floating face, hair and
  // shoulders swallowed whole. Six of the first twenty-four names in the
  // library were drawn that way.
  const skin = SKIN[h % SKIN.length]
  const hair = HAIR[(h >>> 3) % HAIR.length]
  const shirt = CLOTHES[(h >>> 6) % CLOTHES.length]
  const back = BACKDROP[(h >>> 9) % BACKDROP.length]
  const kind = (h >>> 12) % 6
  const glasses = ((h >>> 15) & 7) < 2
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">` +
    `<rect width="64" height="64" fill="${back}"/>` +
    // shoulders
    `<path d="M8 64c0-12 10-19 24-19s24 7 24 19z" fill="${shirt}"/>` +
    // collar
    `<path d="M26 46l6 7 6-7-6-3z" fill="${back}" opacity="0.55"/>` +
    // neck
    `<path d="M27 38h10v9c0 2-10 2-10 0z" fill="${skin}"/>` +
    // head
    `<ellipse cx="32" cy="30" rx="13" ry="15" fill="${skin}"/>` +
    // ears
    `<circle cx="19" cy="31" r="2.6" fill="${skin}"/><circle cx="45" cy="31" r="2.6" fill="${skin}"/>` +
    hairPath(kind, hair) +
    // eyes
    `<circle cx="27" cy="31" r="1.5" fill="#2a2320"/><circle cx="37" cy="31" r="1.5" fill="#2a2320"/>` +
    // mouth
    `<path d="M28.5 37.5c1.6 1.6 5.4 1.6 7 0" stroke="#2a2320" stroke-width="1.3" fill="none" stroke-linecap="round"/>` +
    (glasses
      ? `<g stroke="#33353a" stroke-width="1.2" fill="none"><circle cx="27" cy="31" r="4.2"/><circle cx="37" cy="31" r="4.2"/><path d="M31.2 31h1.6"/></g>`
      : '') +
    `</svg>`
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}
