/**
 * Hyphenates English prose ourselves, deterministically, by inserting SOFT
 * HYPHENS into the text before anything lays it out.
 *
 * WHY WE DO IT RATHER THAN ASK THE ENGINE. Justification without hyphenation
 * makes a page worse, not better: one long word left over stretches every
 * space on its line. Measured off the rasters of a real typeset resume and of
 * ours, as mean inter-word gap over full-measure lines in multiples of the
 * line's glyph height:
 *
 *   typeset reference    32 lines   gap 0.429h  sd 0.080   max/min 2.62
 *   ours, ragged         20 lines   gap 0.323h  sd 0.053   max/min 2.66
 *   ours, justified      20 lines   gap 0.340h  sd 0.075   max/min 3.40
 *
 * And CSS cannot fix it. Measured in the engine that renders our exports: a
 * 90px column of long words lays out IDENTICALLY under `hyphens: auto` and
 * `hyphens: manual` - 96px, six lines, byte for byte the same - because that
 * engine ships no hyphenation dictionary, so the property does nothing. The
 * same column with soft hyphens inserted by hand came back 48px. They DO
 * break. That is the whole finding, and it is why this file exists.
 *
 * WHAT IT IS. Liang's pattern method (1983) over the published English
 * pattern set - see hyphenPatterns.ts for the data, its provenance and its
 * licence. Same algorithm and same data a typesetting engine uses, which is
 * the honest reason to expect the same breaks. No dictionary, no network, no
 * engine-dependent behaviour: the preview, the export and the gates run this
 * code and get the same answer on any browser, which is the parity that
 * asking the engine could never give us.
 *
 * WHAT IT DELIBERATELY LEAVES ALONE. A name, a heading, a job title, a URL,
 * an email, a skill keyword and a date are never hyphenated - `isHyphenatable`
 * refuses anything that is not pure letters, and the DOM pass only enters
 * elements the stylesheet actually justifies, which is main-column prose and
 * nothing else (artboard.css, "how the running text is set"). It also never
 * touches a word that already contains a hyphen: pdf/hyphens.ts holds those
 * whole on one line on purpose, so "SLA-compliant" and "(PL-300)" cannot be
 * torn in half, and adding a break inside one would undo that.
 *
 * WHAT THE EXPORT DOES WITH THE BREAKS is pdf/text.ts's job: the hyphen the
 * engine draws at a break is not a character of the text node, so the painter
 * draws it as a vector artifact and carries the word's tail into the text
 * layer at the end of the same line. A reader copying the PDF gets
 * "Experienced", never "Experi-" and "enced".
 */
import { EN_PATTERNS, EN_EXCEPTIONS } from './hyphenPatterns'

/** U+00AD. Zero width until a line breaks at it, when the engine draws a
 *  hyphen. It is a real character of the text node, which is exactly why the
 *  painter has to strip it (pdf/text.ts) before anything is drawn or copied. */
export const SOFT_HYPHEN = '­'

/**
 * The published English convention, and the pattern file's own
 * `hyphenmins: typesetting: left 2, right 3`: at least two letters stay
 * before the break and at least three go after it. "de-livered" is a break;
 * "d-elivered" and "delivere-d" are not words, they are litter.
 */
export const LEFT_MIN = 2
export const RIGHT_MIN = 3

/**
 * Shortest word we will break at all.
 *
 * LEFT_MIN + RIGHT_MIN already forbids anything under five letters, so this
 * is not the binding constraint at 5 - it is the dial to turn if a page ever
 * reads as a ladder of hyphens. Measured on the sample corpus at 5: see the
 * hyphen-per-page counts in hyphenate.test.ts.
 */
export const MIN_WORD_LENGTH = 5

/** Pattern letters -> the weight at each inter-letter gap, one more entry
 *  than there are letters (a weight can sit before the first letter and after
 *  the last). Built once, lazily: 4938 patterns is ~3ms of parsing that a
 *  document with no justified prose should never pay. */
let patternMap: Map<string, Int8Array> | null = null
let exceptionMap: Map<string, number[]> | null = null
let longestPattern = 0

function buildTables(): void {
  if (patternMap) return
  const map = new Map<string, Int8Array>()
  for (const raw of EN_PATTERNS.split(' ')) {
    if (!raw) continue
    let letters = ''
    // One pass: letters accumulate, a digit is the weight of the gap in front
    // of the letter that follows it.
    const weights: number[] = [0]
    for (let i = 0; i < raw.length; i++) {
      const c = raw[i]
      if (c >= '0' && c <= '9') {
        weights[weights.length - 1] = c.charCodeAt(0) - 48
      } else {
        letters += c
        weights.push(0)
      }
    }
    map.set(letters, Int8Array.from(weights))
    if (letters.length > longestPattern) longestPattern = letters.length
  }
  patternMap = map

  const exc = new Map<string, number[]>()
  for (const spelled of EN_EXCEPTIONS.split(' ')) {
    if (!spelled) continue
    const points: number[] = []
    let letters = 0
    for (const c of spelled) {
      if (c === '-') points.push(letters)
      else letters++
    }
    exc.set(spelled.replace(/-/g, ''), points)
  }
  exceptionMap = exc
}

/** Only pure ASCII letters. Everything else - a URL, an email, a version
 *  number, a skill keyword like "CI/CD", a date, an already-hyphenated
 *  compound, a word with an accent the ASCII patterns have no opinion about -
 *  is refused rather than guessed at. */
export function isHyphenatable(word: string): boolean {
  if (word.length < MIN_WORD_LENGTH) return false
  return /^[A-Za-z]+$/.test(word)
}

/**
 * Where `word` may break, as the LENGTHS OF THE PREFIXES that may end a line.
 * `[2, 6]` for "hyphenation" means "hy-phen-ation". Empty when the word must
 * not break, which includes every word `isHyphenatable` refuses.
 *
 * Case-insensitive (the patterns are lowercase) and offset-preserving: the
 * numbers index the ORIGINAL string, so a caller can splice into it directly.
 */
export function hyphenationPoints(word: string): number[] {
  if (!isHyphenatable(word)) return []
  buildTables()
  const lower = word.toLowerCase()
  const n = lower.length

  const fromException = exceptionMap!.get(lower)
  if (fromException) return fromException.filter((p) => p >= LEFT_MIN && n - p >= RIGHT_MIN)

  // '.' is the word-boundary character the patterns use; `points[m]` is the
  // weight of the gap immediately BEFORE chars[m].
  const chars = '.' + lower + '.'
  const points = new Int8Array(chars.length + 1)
  for (let i = 0; i < chars.length; i++) {
    const maxLen = Math.min(longestPattern, chars.length - i)
    for (let len = 1; len <= maxLen; len++) {
      const value = patternMap!.get(chars.slice(i, i + len))
      if (!value) continue
      for (let k = 0; k < value.length; k++) {
        if (value[k] > points[i + k]) points[i + k] = value[k]
      }
    }
  }

  // A break after letter t (0-based) is the gap before chars[t + 2]; odd wins.
  const out: number[] = []
  for (let t = LEFT_MIN - 1; t <= n - RIGHT_MIN - 1; t++) {
    if (points[t + 2] & 1) out.push(t + 1)
  }
  return out
}

/**
 * Word -> the same word with its soft hyphens in.
 *
 * The fit loop re-measures the tree several times per document change and the
 * DOM pass re-runs each time, over the same few hundred words; the same
 * vocabulary also repeats heavily inside one resume. Measured on the longest
 * example in the sample library (86 prose strings, ~1500 words): 2.3ms for a
 * cold pass, 1.6ms for a second one, 0.4ms once memoized. Bounded so a very
 * long document cannot grow it without limit - past the cap it is cleared
 * whole, which costs one cold pass rather than a scan.
 */
const wordCache = new Map<string, string>()
const WORD_CACHE_MAX = 5000

/** `word` with a soft hyphen at every admissible break. Returns the word
 *  unchanged when there is none. */
export function softHyphenateWord(word: string): string {
  const memo = wordCache.get(word)
  if (memo !== undefined) return memo
  const result = computeSoftHyphenateWord(word)
  if (wordCache.size >= WORD_CACHE_MAX) wordCache.clear()
  wordCache.set(word, result)
  return result
}

function computeSoftHyphenateWord(word: string): string {
  const points = hyphenationPoints(word)
  if (!points.length) return word
  let out = ''
  let prev = 0
  for (const p of points) {
    out += word.slice(prev, p) + SOFT_HYPHEN
    prev = p
  }
  return out + word.slice(prev)
}

/** Every soft hyphen removed. The inverse of the insertion, and the thing the
 *  painter and every text comparison runs first so a soft hyphen can never be
 *  drawn, copied, searched or diffed. */
export function stripSoftHyphens(text: string): string {
  return text.indexOf(SOFT_HYPHEN) < 0 ? text : text.split(SOFT_HYPHEN).join('')
}

/** A token's letters, ignoring the punctuation travelling with it: "delivered,"
 *  hyphenates, and so does "(delivered)". Returns null when what is left is
 *  not a word we will break. */
function coreOf(token: string): { start: number; end: number } | null {
  let start = 0
  let end = token.length
  while (start < end && !/[A-Za-z]/.test(token[start])) start++
  while (end > start && !/[A-Za-z]/.test(token[end - 1])) end--
  if (end - start < MIN_WORD_LENGTH) return null
  return { start, end }
}

/**
 * `text` with soft hyphens inserted in every word that may take them.
 *
 * `skipLastWord` is the published convention against leaving a hyphenated
 * fragment alone on a paragraph's last line: the surest way to prevent it is
 * to refuse to break the paragraph's final word, which is what the caller asks
 * for on the last text node of a block. It is an approximation - the last line
 * can still open with the tail of an earlier word - but it is the part of the
 * rule that can be honoured without owning the line breaker.
 *
 * Idempotent: any soft hyphens already present are stripped first, so the DOM
 * pass below is safe to re-run on a tree it has already visited (React
 * re-renders the measure portal on every document change, and prepareTree
 * re-applies its passes on every measurement).
 */
export function softHyphenateText(text: string, skipLastWord = false): string {
  const src = stripSoftHyphens(text)
  if (!/[A-Za-z]{5}/.test(src)) return src
  // Split KEEPING the separators, so whitespace is reproduced exactly.
  const parts = src.split(/(\s+)/)
  let lastWordIndex = -1
  if (skipLastWord) {
    for (let i = parts.length - 1; i >= 0; i--) {
      if (parts[i] && /[A-Za-z]/.test(parts[i])) {
        lastWordIndex = i
        break
      }
    }
  }
  for (let i = 0; i < parts.length; i++) {
    const token = parts[i]
    if (!token || i === lastWordIndex || /\s/.test(token[0])) continue
    // A word that already carries a hyphen is held whole on one line by
    // pdf/hyphens.ts so a keyword cannot be torn across two; a break we added
    // inside it would tear it anyway.
    if (token.includes('-') || token.includes('‐')) continue
    const core = coreOf(token)
    if (!core) continue
    const word = token.slice(core.start, core.end)
    if (!isHyphenatable(word)) continue
    const hyphenated = softHyphenateWord(word)
    if (hyphenated !== word) parts[i] = token.slice(0, core.start) + hyphenated + token.slice(core.end)
  }
  return parts.join('')
}

/** Elements whose text is never prose, whatever the stylesheet says about its
 *  alignment: a link's words are an address, and a keyword chip is a token an
 *  ATS matches whole. `[data-cva-nowrap]` is pdf/hyphens.ts's own wrapper. */
const NEVER =
  'a, code, kbd, samp, time, .rm-kw, .rm-kw-tail, .rm-chip, .rm-tag, .rm-named-link, .rm-skill-group-name, [data-cva-nowrap]'

/**
 * Inserts soft hyphens into every justified main-column paragraph under
 * `root`, and nowhere else.
 *
 * "Justified main-column prose" is not guessed from class names: it is read
 * off the COMPUTED `text-align`, which artboard.css grants to exactly four
 * selectors (an entry summary, a bullet, a rich block and its paragraphs, all
 * inside `.rm-col-main`) and to nothing in the sidebar, no heading, no name,
 * no date and no contact line. A document set ragged has no justified element
 * anywhere, so this pass finds nothing to do and costs one style read per
 * paragraph.
 *
 * A contenteditable subtree is skipped outright. On the editing canvas the
 * author's own text nodes ARE the model's backing store, and a soft hyphen
 * pushed into one would be read back out on the next edit and saved into the
 * document. The export tree, the measure portal and the exact-PDF canvas are
 * not editable, which is where this runs.
 */
export function softHyphenateProse(root: Element | DocumentFragment | null | undefined): void {
  if (!root) return
  const doc = (root as Element).ownerDocument
  if (!doc || typeof getComputedStyle !== 'function') return

  // Nearest block-level ancestor -> the accepted text nodes inside it, in
  // order, so the LAST word of a paragraph can be left alone (see
  // softHyphenateText's `skipLastWord`).
  const blocks = new Map<Element, Text[]>()
  const justified = new Map<Element, boolean>()
  const isJustified = (el: Element): boolean => {
    let hit = justified.get(el)
    if (hit === undefined) {
      hit = getComputedStyle(el).textAlign === 'justify'
      justified.set(el, hit)
    }
    return hit
  }

  const walker = doc.createTreeWalker(root as Node, NodeFilter.SHOW_TEXT)
  let node: Node | null
  while ((node = walker.nextNode())) {
    const t = node as Text
    if (!t.data || !/[A-Za-z]{5}/.test(t.data)) continue
    const el = t.parentElement
    if (!el) continue
    if (!el.closest('.rm-col-main')) continue
    if (el.closest(NEVER)) continue
    if ((el as HTMLElement).isContentEditable || el.closest('[contenteditable="true"]')) continue
    if (!isJustified(el)) continue
    // The paragraph this text belongs to, for the last-word rule. An inline
    // <strong> inside a sentence is not a paragraph.
    let block: Element = el
    while (block.parentElement && !/block|list-item|flex|grid/.test(getComputedStyle(block).display)) {
      block = block.parentElement
    }
    const list = blocks.get(block)
    if (list) list.push(t)
    else blocks.set(block, [t])
  }

  for (const nodes of blocks.values()) {
    for (let i = 0; i < nodes.length; i++) {
      const t = nodes[i]
      const next = softHyphenateText(t.data, i === nodes.length - 1)
      if (next !== t.data) t.data = next
    }
  }
}
