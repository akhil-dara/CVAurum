import DOMPurify from 'dompurify'

/**
 * Sanitize rich-text HTML produced by the TipTap editor before rendering it in
 * templates. We allow only a small set of semantic, ATS-safe inline/block tags.
 */
const ALLOWED_TAGS = ['p', 'br', 'div', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'a', 'span']
const ALLOWED_ATTR = ['href', 'target', 'rel', 'class']

export function sanitizeHtml(html: string): string {
  if (!html) return ''
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  })
}

// Force external links to be safe.
if (typeof window !== 'undefined') {
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank')
      node.setAttribute('rel', 'noopener noreferrer nofollow')
    }
  })
}
