import type { ResumeDocument } from '@/types/document'
import { usesArabicScript } from '@/data/fonts'
import { resumeToAtsText } from '@/lib/atsText'

/** The letters Persian adds to the Arabic alphabet: pe, che, zhe, gaf. Any one
 *  of them says the text is Persian rather than Arabic. */
const PERSIAN_LETTERS = /[پچژگ]/

/** A copy of the content with every address emptied. An address is where a
 *  link points, not words the author wrote for the reader, so an Arabic path
 *  in a URL must not decide the script of the page. A label the author typed
 *  for that link is kept and still counts. */
function withoutAddresses<T>(value: T): T {
  if (Array.isArray(value)) return value.map(withoutAddresses) as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = k === 'url' ? '' : withoutAddresses(v)
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
 * emptied before that, so a URL alone never makes a resume Arabic either.
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
