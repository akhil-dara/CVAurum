import { useEffect } from 'react'

/**
 * Set the document title for the lifetime of a route/component. Dependency-free
 * (no react-helmet). The static index.html <title> stays the canonical/landing
 * title for crawlers and link unfurlers (which don't run JS); this just updates
 * the tab title as the user moves between routes.
 */
export function useTitle(title: string) {
  useEffect(() => {
    const prev = document.title
    document.title = title
    return () => {
      document.title = prev
    }
  }, [title])
}
