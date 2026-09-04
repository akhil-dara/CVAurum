import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * The route table is asserted by READING router.tsx rather than importing it.
 * createBrowserRouter builds its history from `document.defaultView` the
 * moment the module is evaluated, and these tests run in the node
 * environment (vitest.config.ts) with no DOM to build one from - importing
 * the module would throw before a single expectation ran. The same
 * read-the-source shape the CSS cross-checks use (elementColors.test.ts).
 */
const here = path.dirname(fileURLToPath(import.meta.url))
const routerSrc = fs.readFileSync(path.join(here, 'router.tsx'), 'utf8')

describe('the public template gallery is routed', () => {
  it('registers /templates', () => {
    expect(routerSrc).toMatch(/\{ path: '\/templates', element: s\(<TemplatesPage \/>\) \}/)
  })

  it('code-splits it like its neighbours, so the homepage does not carry 52 templates', () => {
    expect(routerSrc).toMatch(/const TemplatesPage = lazyRoute\(\(\) => import\('@\/routes\/Templates'\)/)
  })

  it('points at a page that exists and exports Templates', () => {
    const page = fs.readFileSync(path.join(here, '..', 'routes', 'Templates.tsx'), 'utf8')
    expect(page).toMatch(/export function Templates\(/)
  })
})

/**
 * Two things the gallery has to do on mount that nothing on the page shows, so
 * they are asserted from the source the same way the route table is.
 */
describe('the gallery is a page that can be landed on and indexed', () => {
  const page = fs.readFileSync(path.join(here, '..', 'routes', 'Templates.tsx'), 'utf8')

  it('claims its own URL - index.html names the home page on every route', () => {
    expect(page).toMatch(/useCanonical\(/)
    expect(page).toContain("'https://cvaurum.com/templates'")
  })

  it('starts at the top, so a click from mid-landing does not open mid-grid', () => {
    expect(page).toMatch(/window\.scrollTo\(0, 0\)/)
  })
})
