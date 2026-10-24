/**
 * Links written inside guide prose as `[label](/path)`.
 *
 * A guide's paragraphs were plain strings, so a sentence that pointed at an
 * example or a design could only name its address in brackets - read by
 * nobody, followed by no crawler, and no anchor text to say where it went
 * (2026-10-24). Only a path on this site, or this project's own repository,
 * is a link; anything else stays the text it was, so nothing in a guide can
 * send a reader somewhere unvetted or run a script.
 */
export type LinkPart = string | { label: string; href: string }

// a path on this site, or this project's own source repository - nothing else
const LINK = /\[([^\]\n]+)\]\((\/[a-z0-9/#?=&-]*|https:\/\/github\.com\/akhil-dara\/[A-Za-z0-9/_.-]*)\)/gi

/** True for the one kind of address outside the site a guide may link to. */
export const isExternal = (href: string): boolean => href.startsWith('https://')

export function linkParts(text: string): LinkPart[] {
  const out: LinkPart[] = []
  let at = 0
  for (const m of text.matchAll(LINK)) {
    if (m.index! > at) out.push(text.slice(at, m.index))
    out.push({ label: m[1], href: m[2] })
    at = m.index! + m[0].length
  }
  if (at < text.length) out.push(text.slice(at))
  return out
}

/** Escaped HTML, the links as anchors. */
export function linkHtml(text: string, esc: (s: string) => string): string {
  return linkParts(text)
    .map((p) =>
      typeof p === 'string'
        ? esc(p)
        : `<a href="${p.href}"${isExternal(p.href) ? ' rel="noopener"' : ''}>${esc(p.label)}</a>`
    )
    .join('')
}

/** Markdown with every site link made absolute on `site`. */
export function linkMarkdown(text: string, site: string): string {
  return linkParts(text)
    .map((p) => (typeof p === 'string' ? p : `[${p.label}](${isExternal(p.href) ? '' : site}${p.href})`))
    .join('')
}
