import { useEffect } from 'react'
import { useTitle } from '@/lib/useTitle'
import { useCanonical } from '@/lib/useCanonical'

export interface SeoTags {
  /** The <title>, and what og:title / twitter:title say. */
  title: string
  /** The meta description, and what og:description / twitter:description say. */
  description: string
  /** ABSOLUTE URL of the link-preview image. Omit to keep the site's default. */
  image?: string
  /** ABSOLUTE URL of this page — canonical, og:url and both hreflang alternates. */
  url: string
}

/**
 * Point the whole head at the route being viewed, for the lifetime of a
 * component.
 *
 * index.html hard-codes the home page's head, and the host serves that same
 * file for every route — so a crawler that renders /templates/<id> is handed
 * the landing page's title, description and link preview unless something puts
 * the route's own back. `useTitle` already owned the tab title and
 * `useCanonical` already owned the URL tags; this adds the description and the
 * two preview blocks (Open Graph, Twitter) and restores every original on
 * unmount, so leaving an indexed route hands "/" its own head back intact.
 *
 * Nothing is created that index.html does not already ship: a tag missing from
 * the head is skipped rather than invented, which keeps the static file the one
 * place the set of tags is decided.
 */
export function useSeo({ title, description, image, url }: SeoTags) {
  useTitle(title)
  useCanonical(url)
  useEffect(() => {
    // [selector, new content] for every tag this route speaks for.
    const targets: [string, string][] = [
      ['meta[name="description"]', description],
      ['meta[property="og:title"]', title],
      ['meta[property="og:description"]', description],
      ['meta[name="twitter:title"]', title],
      ['meta[name="twitter:description"]', description],
    ]
    if (image) {
      targets.push(
        ['meta[property="og:image"]', image],
        ['meta[property="og:image:secure_url"]', image],
        ['meta[name="twitter:image"]', image]
      )
    }
    const saved = targets.map(([selector, value]) => {
      const el = document.head.querySelector(selector)
      const prev = el?.getAttribute('content') ?? null
      el?.setAttribute('content', value)
      return [el, prev] as const
    })
    return () => {
      for (const [el, prev] of saved) if (el && prev !== null) el.setAttribute('content', prev)
    }
  }, [title, description, image])
}
