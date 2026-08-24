/**
 * Splits one keyword into the pieces a line may break between.
 *
 * A keyword too wide for its column has to wrap somewhere, and CSS will take
 * any space it finds - including the ones around a lone connector. Measured on
 * a real export at a 22% sidebar, "Data Extraction & Transformation" arrived
 * as three lines with "&" alone on the middle one: a line carrying no word at
 * all, which is noise to anything reading the text and looks broken to a
 * person.
 *
 * Pieces join with single spaces and reproduce `term + separator` exactly. A
 * piece containing a space is one the renderer must keep unbreakable; a
 * single-word piece needs nothing.
 */

/** A token that means nothing alone: an ampersand, a slash, a plus. Two
 *  characters at most, and no letters or digits. */
function isConnector(token: string): boolean {
  return token.length <= 2 && !/[A-Za-z0-9]/.test(token)
}

export function keywordChunks(term: string, separator: string): string[] {
  const words = term.split(/\s+/).filter(Boolean)
  if (!words.length) return [separator.trim()].filter(Boolean)

  // The last word carries the separator: a term too wide to keep whole must
  // still never leave its separator opening the next line.
  const pieces: string[] = []
  let current = words[words.length - 1] + separator
  for (let i = words.length - 2; i >= 0; i--) {
    if (isConnector(words[i])) {
      current = `${words[i]} ${current}`
      continue
    }
    pieces.unshift(current)
    current = words[i]
  }
  pieces.unshift(current)

  // Fold away any piece carrying no word at all - a term ending in a connector
  // produces one ("& ." from "trailing &"), and that is the very line this
  // exists to prevent, one level down.
  for (let i = pieces.length - 1; i > 0; i--) {
    if (!/[A-Za-z0-9]/.test(pieces[i])) {
      pieces[i - 1] = `${pieces[i - 1]} ${pieces[i]}`
      pieces.splice(i, 1)
    }
  }
  return pieces
}
