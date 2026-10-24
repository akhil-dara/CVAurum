import { keepHyphenatedWordsWhole } from './hyphens'
import { substituteUnsupportedChars } from './charFallback'

/**
 * Put a print tree into the state the painter will actually draw, before
 * anything measures it.
 *
 * Two passes change how text WRAPS: characters no embedded font can draw are
 * substituted, and a hyphenated word is held on one line. The exporter has always run them on its own tree before
 * it paginates. The preview's measure portal never did, so the two trees
 * wrapped differently and the page breaks drawn on the canvas could fall in a
 * different place from the ones in the PDF - the single thing this codebase
 * promises they never do. Measured on the multi-page gate: a second cut 22.7px
 * apart between the two paths.
 *
 * Justified prose is NOT hyphenated any more (it was, by soft hyphens from
 * lib/hyphenate.ts). The editable canvas cannot carry soft hyphens - they would
 * go into the text being typed - so the PDF broke lines the canvas never
 * showed: "ac-quired" in the file, "acquired" whole on the page, a different
 * line count, and a keyword split in two for an ATS (2026-10-24). One rule
 * now holds on the canvas, the preview and the file alike: no hyphens, the
 * same breaks; `text-wrap: pretty` (artboard.css) evens the spacing instead.
 *
 * All three passes are idempotent, so this is safe to call before every
 * measurement; React re-renders the portal on a document change and the
 * mutations go with it, which is why it is re-applied rather than done once.
 */
export function preparePrintTree(root: Element | null | undefined): void {
  if (!root) return
  substituteUnsupportedChars(root)
  keepHyphenatedWordsWhole(root)
}
