/**
 * When an entry brings up its empty optional fields (a role overview, an
 * award's summary) on the canvas.
 *
 * It did so on any focus inside the entry, so the first click on a bullet
 * opened the empty overview line ABOVE the bullet: the line under the cursor
 * slid 20px down mid-click, and a double-click or a drag selected the wrong
 * words (measured on every design). An entry is now engaged only by focus on
 * a field that sits above all of its empty optional fields - revealing them
 * then moves nothing above the caret - and once engaged it stays open while
 * focus moves within it, so going on to a bullet does not pull the bullets
 * back up under the click. The canvas CSS reveals on [data-engaged].
 */
const ENTRY = '.rm-item, .rm-mini'
const EMPTY_OPTIONAL = '.rm-editable[data-optional]:empty'

function engageable(entry: Element, target: Element): boolean {
  for (const opt of entry.querySelectorAll(EMPTY_OPTIONAL)) {
    // the target comes after this field in the page: revealing it moves the target
    if (opt.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING) return false
  }
  return true
}

export function watchOptionalReveal(root: HTMLElement): () => void {
  const release = (keep: Element | null) => {
    for (const e of root.querySelectorAll('[data-engaged]')) if (e !== keep) e.removeAttribute('data-engaged')
  }
  const onIn = (ev: FocusEvent) => {
    const target = ev.target as Element
    const entry = target.closest?.(ENTRY) ?? null
    release(entry)
    if (entry && !entry.hasAttribute('data-engaged') && engageable(entry, target)) entry.setAttribute('data-engaged', '')
  }
  const onOut = (ev: FocusEvent) => {
    // to somewhere outside the canvas (or nowhere): nothing stays open
    const next = ev.relatedTarget as Node | null
    if (!next || !root.contains(next)) release(null)
  }
  root.addEventListener('focusin', onIn)
  root.addEventListener('focusout', onOut)
  return () => {
    root.removeEventListener('focusin', onIn)
    root.removeEventListener('focusout', onOut)
  }
}
