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
 */
export function documentScript(doc: Pick<ResumeDocument, 'content' | 'metadata'>): { arabic: boolean; persian: boolean } {
  // resumeToAtsText reads only `content` and `metadata`; the rest of the
  // document (id, title, timestamps) never reaches the text.
  const text = resumeToAtsText({ ...doc, content: withoutAddresses(doc.content) } as ResumeDocument)
  const arabic = usesArabicScript(text)
  return { arabic, persian: arabic && PERSIAN_LETTERS.test(text) }
}
