import { useEffect } from 'react'

/**
 * Point the head's URL tags at the route being viewed, for the lifetime of a
 * component.
 *
 * The host serves the same index.html for every route (SPA fallback), and that
 * file hard-codes the home page in its canonical link, its og:url and both
 * hreflang alternates. A crawler that renders the app on any other route would
 * therefore be told the page it just fetched is a duplicate of "/" and fold it
 * away - which would quietly undo listing that route in the sitemap. Rewriting
 * the tags here is enough, because a crawler that runs the app runs this too.
 *
 * Only a route that is meant to be indexed should call this (see robots.txt);
 * the originals go back on unmount so "/" keeps its own head.
 */
export function useCanonical(url: string) {
  useEffect(() => {
    // [selector, attribute] for every tag in index.html that names the URL.
    const targets: [string, string][] = [
      ['link[rel="canonical"]', 'href'],
      ['meta[property="og:url"]', 'content'],
      ['link[rel="alternate"][hreflang="en"]', 'href'],
      ['link[rel="alternate"][hreflang="x-default"]', 'href'],
    ]
    const saved = targets.map(([selector, attr]) => {
      const el = document.head.querySelector(selector)
      return [el, attr, el?.getAttribute(attr) ?? null] as const
    })
    for (const [el, attr] of saved) el?.setAttribute(attr, url)
    return () => {
      for (const [el, attr, prev] of saved) if (el && prev !== null) el.setAttribute(attr, prev)
    }
  }, [url])
}
