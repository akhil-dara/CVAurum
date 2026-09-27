/**
 * A profile's address, typed the way people type addresses.
 *
 * The side panel's "Goes to" stored anything that did not begin with
 * http(s):// as the profile's USERNAME, and a username is shown, never linked.
 * So "linkedin.com/in/priya" - how most people write a web address - printed
 * with no link in the PDF, and the ATS tab asked to trim an address that was
 * already short (usability test, 2026-09-26). An address-shaped value is now
 * stored as the address, exactly as typed; `safeHref` and the PDF's
 * `linkTarget` already put https:// in front of a bare domain wherever a link
 * is made. Saved résumés carrying the old shape are moved on load.
 */

/** A domain with a real top-level part, optionally a path, and no spaces. */
const ADDRESS = /^(?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:[/:?#]\S*)?$/i

export function looksLikeAddress(s: string): boolean {
  return ADDRESS.test((s || '').trim())
}

/** What the "Goes to" field stores for what was typed into it. */
export function profileFromTyped(typed: string): { url: string; username: string } {
  return looksLikeAddress(typed) ? { url: typed.trim(), username: '' } : { url: '', username: typed }
}

type WithProfiles = { basics: { profiles?: Array<{ url?: string; username?: string }> } }

/** Moves an address a résumé stored as a username into its address. */
export function withProfileAddresses<T extends WithProfiles>(content: T): T {
  for (const p of content.basics.profiles ?? []) {
    if (!(p.url || '').trim() && looksLikeAddress(p.username || '')) {
      p.url = (p.username || '').trim()
      p.username = ''
    }
  }
  return content
}
