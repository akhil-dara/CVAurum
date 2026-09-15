import { keepHyphenatedWordsWhole } from './hyphens'
import { substituteUnsupportedChars } from './charFallback'
import { softHyphenateProse } from '@/lib/hyphenate'

/**
 * Put a print tree into the state the painter will actually draw, before
 * anything measures it.
 *
 * Three passes change how text WRAPS: characters no embedded font can draw are
 * substituted, a hyphenated word is held on one line, and justified prose is
 * given the soft hyphens it needs to break long words instead of stretching a
 * line's word spaces. The exporter has always run them on its own tree before
 * it paginates. The preview's measure portal never did, so the two trees
 * wrapped differently and the page breaks drawn on the canvas could fall in a
 * different place from the ones in the PDF - the single thing this codebase
 * promises they never do. Measured on the multi-page gate: a second cut 22.7px
 * apart between the two paths.
 *
 * ORDER MATTERS between the last two. `keepHyphenatedWordsWhole` wraps
 * "SLA-compliant" in a nowrap span so a line cannot break inside it;
 * `softHyphenateProse` refuses to enter that span, and refuses any word
 * carrying a hyphen of its own, so the two agree about which words may break
 * and where. Reversing them would let a soft hyphen land inside a token the
 * other pass is about to declare unbreakable.
 *
 * All three passes are idempotent, so this is safe to call before every
 * measurement; React re-renders the portal on a document change and the
 * mutations go with it, which is why it is re-applied rather than done once.
 */
export function preparePrintTree(root: Element | null | undefined): void {
  if (!root) return
  substituteUnsupportedChars(root)
  keepHyphenatedWordsWhole(root)
  softHyphenateProse(root)
}
