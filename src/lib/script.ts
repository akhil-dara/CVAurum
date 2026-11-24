import type { ResumeDocument } from '@/types/document'
import { usesArabicScript } from '@/data/fonts'
import { resumeToAtsText } from '@/lib/atsText'

/** The letters Persian adds to the Arabic alphabet: pe, che, zhe, gaf. Any one
 *  of them says the text is Persian rather than Arabic. */
const PERSIAN_LETTERS = /[پچژگ]/

/** What every address reads as here: Latin, so it never adds a letter. */
const ADDRESS_STAND_IN = 'https://x'

/** A copy of the content with every address swapped for a Latin stand-in. An
 *  address is where a link points, not words the author wrote for the reader,
 *  so an Arabic path in a URL must not decide the script of the page. It is
 *  replaced rather than emptied because whether a link HAS an address decides
 *  what the page prints beside it - a credential's verify word, a profile with
 *  no handle - and those words are the author's and must still count. An empty
 *  address stays empty for the same reason. */
function withoutAddresses<T>(value: T): T {
  if (Array.isArray(value)) return value.map(withoutAddresses) as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      out[k] = k === 'url' ? (typeof v === 'string' && v.trim() ? ADDRESS_STAND_IN : v) : withoutAddresses(v)
    }
    return out as T
  }
  return value
}

/** The answer for a page with no Arabic-script character anywhere. */
const NO_SCRIPT: Readonly<PageScript> = Object.freeze({ arabic: false, persian: false })

interface PageScript {
  arabic: boolean
  persian: boolean
}

/** Does any string anywhere in `value` hold an Arabic-script character? A
 *  walk that stops at the first one. It reads everything - hidden sections,
 *  addresses, key-less arrays - so it over-detects, and it only ever decides
 *  the NEGATIVE: a page with none of these characters cannot show one. */
function holdsArabicScript(value: unknown): boolean {
  if (typeof value === 'string') return usesArabicScript(value)
  if (Array.isArray(value)) return value.some(holdsArabicScript)
  if (value && typeof value === 'object') return Object.values(value).some(holdsArabicScript)
  return false
}

/** Do the page's dates come out in Arabic script? Persian and Arabic month
 *  names are GENERATED from the date language, so they sit in no stored
 *  string and the scan above cannot see them: a resume typed entirely in
 *  Latin letters but dated in Persian still shows Arabic-script words. Such a
 *  page takes the full reading below, which decides by what it really prints
 *  (a resume with no dates on it is still neither). */
function writesArabicDates(metadata: ResumeDocument['metadata']): boolean {
  const language = metadata.dates?.language
  return language === 'fa' || language === 'ar'
}

/** The visible-text answer, per content object and then per metadata object.
 *  The store clones the whole document on every edit (useResumeStore), so a
 *  new edit is a new key and the editor's several callers in one render share
 *  one computation. A caller that mutates a document in place after asking
 *  would read a stale answer; nothing does. */
const cache = new WeakMap<object, WeakMap<object, PageScript>>()

/**
 * Which script the page is written in, read from the text the page shows.
 *
 * The text is the one the ATS view reads (resumeToAtsText), so the same rules
 * decide what counts as shown: a hidden section, an empty one, or a project
 * address the link style takes off the page never reaches it. Addresses are
 * swapped for a Latin stand-in before that, so a URL alone never makes a
 * resume Arabic either.
 *
 * It used to read JSON.stringify(content), which saw hidden sections, URLs and
 * every key name - and a byte-order mark, which the old character class
 * counted as an Arabic presentation form.
 *
 * Every edit asks, for every user, so it is cheap where it matters: a document
 * with no Arabic-script character in its content or metadata (every Latin
 * resume) answers "neither" from a plain scan, without building the text; and
 * an answer is kept per content and metadata object.
 */
export function documentScript(doc: Pick<ResumeDocument, 'content' | 'metadata'>): PageScript {
  if (!writesArabicDates(doc.metadata) && !holdsArabicScript(doc.content) && !holdsArabicScript(doc.metadata)) return { ...NO_SCRIPT }
  let byMetadata = cache.get(doc.content)
  const hit = byMetadata?.get(doc.metadata)
  if (hit) return { ...hit }
  // resumeToAtsText reads only `content` and `metadata`; the rest of the
  // document (id, title, timestamps) never reaches the text.
  const text = resumeToAtsText({ ...doc, content: withoutAddresses(doc.content) } as ResumeDocument)
  const arabic = usesArabicScript(text)
  const script = { arabic, persian: arabic && PERSIAN_LETTERS.test(text) }
  if (!byMetadata) cache.set(doc.content, (byMetadata = new WeakMap()))
  byMetadata.set(doc.metadata, script)
  return { ...script }
}

/** The words the page draws as decoration only, which the ATS text (and so
 *  documentScript) never reads: the line above the name (layout.kicker), the
 *  page foot's label, and the numbers band's typed labels and values. */
function decorativeWords(metadata: ResumeDocument['metadata']): string {
  const l = metadata.layout
  return [l.kicker?.left, l.kicker?.right, l.pageFootLabel, ...(l.statTiles ?? []).flatMap((t) => [t.label, t.value])]
    .filter(Boolean)
    .join(' ')
}

/**
 * Which script the page DRAWS: documentScript, plus the decorative words
 * (`decorativeWords`). The export installs bidi by this, and waits for the
 * Arabic face by it (documentFaces): a Persian page-foot label on an English
 * resume is painted in Vazirmatn and has to be shaped right to left, though no
 * parser reads it and the editor never offers that page a mirrored layout
 * (RtlOffer still asks documentScript).
 */
export function drawnScript(doc: Pick<ResumeDocument, 'content' | 'metadata'>): PageScript {
  const shown = documentScript(doc)
  if (shown.arabic) return shown
  const words = decorativeWords(doc.metadata)
  if (!usesArabicScript(words)) return shown
  return { arabic: true, persian: PERSIAN_LETTERS.test(words) }
}
