/**
 * The rule /prompts is held to, guarded in the route's own source.
 *
 * The page shows one prompt at a time. The cheap way to build that is to
 * render only the open panel — and that would quietly break the thing this
 * page has always promised: that what a crawler is served, what the Markdown
 * twin says and what a person can read are ONE text. Six prompts that exist
 * only after a click are six prompts an assistant quoting the page cannot
 * see. So every panel is rendered and the closed ones are `hidden`.
 *
 * The suite runs in `environment: 'node'` with no DOM, so this reads the
 * source the way src/templates/_shared/hookOrder.test.ts does. It is a
 * coarse guard, and a coarse guard that fails loudly beats a defect that only
 * shows up in a crawl three weeks later.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { PROMPTS } from '@/lib/seoPages'

const SRC = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), 'Prompts.tsx'),
  'utf8'
)

describe('the prompts page', () => {
  it('renders every prompt and hides the closed ones rather than dropping them', () => {
    // The panel is always in the tree; `hidden` is what closes it.
    expect(SRC).toContain('hidden={!open}')
    expect(SRC).toContain('{prompt.prompt}')
    // A conditional panel would look like `{open && (` around the body.
    expect(SRC).not.toMatch(/\{\s*open\s*&&\s*\(/)
  })

  it('opens one at a time, and opens the one a fragment link names', () => {
    // One id, not a set: pressing a second title closes the first.
    expect(SRC).toMatch(/useState<string>\(''\)/)
    expect(SRC).toContain('window.location.hash')
    // Every prompt is reachable by its own fragment, from the Markdown twin
    // and from the crawler's index.
    expect(SRC).toContain('id={prompt.id}')
  })

  it('gives the copy and paste controls a finger-sized box', () => {
    // 44px is the floor; the old page's copy buttons measured 83x32 and the
    // paste button 171x32. Measured after the change at 375x812: Copy
    // 309x44, "Paste the answer" 137x44, "Open it as a résumé" 309x44, and
    // each title row at least 56px tall.
    expect(SRC).toContain('min-h-[56px]')
    expect((SRC.match(/h-11 w-full/g) ?? []).length).toBeGreaterThanOrEqual(2)
    expect(SRC).toContain('min-h-[44px]')
  })

  it('keeps the prose off the first screen and the titles on it', () => {
    // Six titles is the page's index now, so the old on-page index is gone.
    expect(SRC).not.toContain('On this page')
    // …and so is the three-step strip that explained the loop the lead
    // sentence now states in one line.
    expect(SRC).not.toContain('Copy a prompt</')
    expect(PROMPTS.length).toBeGreaterThanOrEqual(5)
  })
})
