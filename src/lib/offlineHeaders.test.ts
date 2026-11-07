import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Offline depends on the host's headers as much as on the service worker.
 *
 * The worker answers a page from its precache by looking the page up with the
 * browser's own request, which carries `Accept: text/html,...`. A copy stored
 * with `Vary: Accept` only matches a request with the SAME Accept it was
 * fetched with, so the lookup misses, the worker goes to the network, and
 * offline the page fails outright: /, /templates and /examples did exactly
 * that (measured on the live site, 2026-11-07) while /app, sent without the
 * header, opened. Workbox's generated worker has no option to ignore Vary on
 * its precache, so the header must not be sent on any page it precaches.
 */
describe('host headers that offline depends on', () => {
  const headers = fs.readFileSync(path.resolve(__dirname, '../../public/_headers'), 'utf8')
  const live = headers
    .split(/\r?\n/)
    .filter((l) => !l.trim().startsWith('#'))
    .join('\n')

  it('sends no Vary on any page, so a precached page matches a navigation', () => {
    expect(live).not.toMatch(/^\s+Vary\s*:/im)
  })
})
