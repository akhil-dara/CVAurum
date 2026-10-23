/**
 * How the command palette orders what it offers.
 *
 * It ranked every command by one loose letter-by-letter score, so "fit" listed
 * the Magic fit command and then fonts and templates whose names merely hold
 * f, i and t in order. Now a match at the start of a word comes first, then a
 * match anywhere in the words, and the loose letter-by-letter match is kept
 * only when nothing matches outright (typos and abbreviations: "dwnld").
 * Before anything is typed it offers what was used last and then the actions
 * people come to it for, instead of the first rows of a list.
 */
export interface Rankable {
  id: string
  label: string
  hint?: string
}

/** What the palette offers before anything is typed, after the recent ones. */
export const TOP_ACTIONS = ['export-pdf', 'export-menu', 'undo', 'redo', 'panel-design', 'panel-templates', 'magic-fit-suggest', 'share']

/** Subsequence score: smaller is better; null = no match. */
function loose(q: string, t: string): number | null {
  let qi = 0
  let score = 0
  let last = -1
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      score += last >= 0 ? (ti - last - 1) * 4 : ti
      last = ti
      qi++
    }
  }
  return qi === q.length ? score : null
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, (m) => `\\${m}`)

/** Tier and position of an outright match, or null. 0 = a word starts with
 *  the query, 1 = the query sits inside the label, 2 = inside the hint. */
function outright(q: string, c: Rankable): number | null {
  const label = c.label.toLowerCase()
  const at = label.search(new RegExp(`(^|[\\s:/(·-])${escapeRe(q)}`))
  if (at >= 0) return at
  const inside = label.indexOf(q)
  if (inside >= 0) return 1000 + inside
  const hint = (c.hint ?? '').toLowerCase().indexOf(q)
  if (hint >= 0) return 2000 + hint
  return null
}

export function rankCommands<T extends Rankable>(cmds: T[], query: string, recent: string[], limit = 12): T[] {
  const q = query.trim().toLowerCase()
  if (!q) {
    const byId = new Map(cmds.map((c) => [c.id, c]))
    const order = [...recent, ...TOP_ACTIONS].filter((id, i, all) => all.indexOf(id) === i)
    const head = order.map((id) => byId.get(id)).filter((c): c is T => !!c)
    return head.slice(0, limit)
  }
  const direct = cmds
    .map((c) => ({ c, s: outright(q, c) }))
    .filter((x): x is { c: T; s: number } => x.s !== null)
    .sort((a, b) => a.s - b.s)
  if (direct.length) return direct.slice(0, limit).map((x) => x.c)
  const compact = q.replace(/\s+/g, '')
  return cmds
    .map((c) => ({ c, s: loose(compact, (c.label + ' ' + (c.hint ?? '')).toLowerCase()) }))
    .filter((x): x is { c: T; s: number } => x.s !== null)
    .sort((a, b) => a.s - b.s)
    .slice(0, limit)
    .map((x) => x.c)
}

/** A shortcut as this keyboard writes it. */
export function shortcutLabel(shortcut: string, mac: boolean): string {
  if (!mac) return shortcut
  const keys = shortcut.split('+')
  const key = keys.pop() ?? ''
  const mods = keys.map((k) => (k === 'Ctrl' ? '⌘' : k === 'Shift' ? '⇧' : k === 'Alt' ? '⌥' : k))
  // the platform's own order: ⌥ ⇧ ⌘, then the key
  const ordered = ['⌥', '⇧', '⌘'].filter((m) => mods.includes(m))
  return ordered.join('') + key
}

export function isMac(): boolean {
  if (typeof navigator === 'undefined') return false
  const p = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.platform ?? ''
  return /mac|iphone|ipad/i.test(p)
}
