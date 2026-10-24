import LASTMOD from '@/data/lastmod.json'

/**
 * The date a page's own sources last changed (src/data/lastmod.json), as the
 * `dateModified` its structured data carries: the same date the sitemap gives
 * the page, never the day of the build. Nothing for a page with no record.
 * Its own module so seoPages and seoLibrary can both read it without
 * importing each other.
 */
const MAP = LASTMOD as Record<string, { lastmod?: string }>

export function pageDates(url: string): { dateModified?: string } {
  const d = MAP[new URL(url).pathname]?.lastmod
  return d ? { dateModified: d } : {}
}
