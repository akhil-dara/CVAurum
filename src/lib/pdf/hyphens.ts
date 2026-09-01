/**
 * Keeps a hyphenated word whole when a line wraps.
 *
 * CSS treats an existing hyphen as a break opportunity, so "SLA-compliant"
 * wraps as "SLA-" + "compliant" and "(PL-300)" as "(PL-" + "300)". Those two
 * halves land on different lines of the exported text, and an ATS searching
 * for the phrase finds neither — reported against a real certificate name,
 * "Microsoft Certified: Power BI Data Analyst Associate (PL-300)".
 *
 * No CSS property prevents it. Measured in Chromium, all of `hyphens: none`,
 * `word-break: keep-all`, `line-break: strict`, `text-wrap: pretty`,
 * `text-wrap: balance`, `overflow-wrap: normal` and `white-space: pre-wrap`
 * still split at the hyphen. The only lever is to mark the individual token
 * `white-space: nowrap`, which is what `keepHyphenatedWordsWhole` does to the
 * print DOM before anything measures it.
 *
 * This changes no characters: the wrapper is an inline span, so `textContent`,
 * the extracted PDF text and every gate's comparison are byte-identical. Only
 * the point at which the line wraps moves.
 */

/**
 * Longest token we are willing to make unbreakable.
 *
 * A token wider than its column would overflow rather than wrap, which is
 * worse than the split it prevents — so past this length the hyphen stays a
 * break opportunity. 24 characters comfortably covers real compounds
 * ("(PL-300)", "SLA-compliant", "Cross-Functional") while leaving long
 * hyphenated URLs and slugs breakable.
 */
export const MAX_UNBREAKABLE_TOKEN = 24

/** A hyphen with a word character on BOTH sides — a compound word, not the
 *  floating dash of a date range ("2018 - 2021"), which may break freely. */
const COMPOUND = /[A-Za-z0-9][-‐][A-Za-z0-9]/

/**
 * Ranges of `text` holding a hyphenated word that must not break.
 *
 * Punctuation travels with the token: "(PL-300)" is protected whole, because
 * that is the string a reader searches for.
 */
export function hyphenTokenRanges(text: string): Array<[number, number]> {
  const out: Array<[number, number]> = []
  const token = /\S+/g
  let m: RegExpExecArray | null
  while ((m = token.exec(text))) {
    const t = m[0]
    if (t.length > MAX_UNBREAKABLE_TOKEN) continue
    if (!COMPOUND.test(t)) continue
    out.push([m.index, m.index + t.length])
  }
  return out
}

/**
 * Wraps every hyphenated word under `root` in a `white-space: nowrap` span,
 * so a line break can never fall inside one.
 *
 * Runs on the print DOM only, before layout is measured. Skips text that is
 * already inside a nowrap span so it is safe to call more than once.
 */
export function keepHyphenatedWordsWhole(root: Element | DocumentFragment): void {
  const doc = root.ownerDocument
  if (!doc) return
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const targets: Text[] = []
  let node: Node | null
  while ((node = walker.nextNode())) {
    const t = node as Text
    if (!t.data || !COMPOUND.test(t.data)) continue
    if ((t.parentElement as HTMLElement | null)?.dataset?.cvaNowrap === '1') continue
    targets.push(t)
  }
  for (const text of targets) {
    const ranges = hyphenTokenRanges(text.data)
    if (!ranges.length) continue
    // Split back to front so earlier offsets stay valid.
    for (let i = ranges.length - 1; i >= 0; i--) {
      const [start, end] = ranges[i]
      const tail = text.splitText(start)
      tail.splitText(end - start)
      const span = doc.createElement('span')
      span.style.whiteSpace = 'nowrap'
      span.dataset.cvaNowrap = '1'
      tail.parentNode?.replaceChild(span, tail)
      span.appendChild(tail)
    }
  }
}

/**
 * The same policy for a rich-text HTML STRING, applied at render time.
 *
 * The preview's React trees cannot take the DOM pass above - splitting
 * React-managed text nodes corrupts the next reconciliation - but rich text
 * renders through dangerouslySetInnerHTML, where React never looks inside.
 * Processing the string BEFORE it becomes __html gives the preview the same
 * wraps the exporter's DOM pass produces, so a hyphenated word at a line
 * boundary can no longer wrap differently on canvas than in the PDF
 * (gate-caught: 'high-scale' at the end of a summary line, double template).
 * The exporter's own pass then finds data-cva-nowrap already set and skips.
 *
 * Runs AFTER sanitizeHtml - the sanitizer strips style and data attributes,
 * so wrapping first would be undone.
 */
export function noBreakCompoundsHtml(html: string): string {
  if (!html || !COMPOUND.test(html)) return html
  const tpl = document.createElement('template')
  tpl.innerHTML = html
  keepHyphenatedWordsWhole(tpl.content as unknown as Element)
  return tpl.innerHTML
}
