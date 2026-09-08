/** The lines a pasted list carries, one per bullet: split on line breaks
 *  and on a bullet glyph set off by spaces, each stripped of a leading
 *  list marker or numbering and of surrounding whitespace, blanks dropped.
 *  A hyphen inside a line and a year at its start are left alone: only a
 *  marker FOLLOWED BY a space, or a short number followed by `.`/`)`, is
 *  a marker. */
const MARKER = /^(?:[•·▪◦\-–—*>]|\(?\d{1,2}[.)]|[a-zA-Z][.)])\s+/
export function splitPastedLines(text: string): string[] {
  return text
    .split(/\r\n|\r|\n/)
    .flatMap((line) => line.split(/\s[•▪]\s/))
    .map((line) => line.trim().replace(MARKER, '').trim())
    .filter(Boolean)
}
