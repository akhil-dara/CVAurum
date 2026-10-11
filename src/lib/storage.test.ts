import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// requestDurability() memoizes its in-flight/resolved promise at MODULE scope, so
// each scenario below needs a fresh module instance — vi.resetModules() + a fresh
// dynamic import gets that. This never touches idb-keyval/indexedDB: createStore()
// is lazy (only opens a DB when a store function actually runs), and none of these
// tests call saveDoc/loadDoc, so the plain 'node' vitest environment is fine.

function setStorageManager(storage: unknown) {
  Object.defineProperty(globalThis, 'navigator', { value: { storage }, configurable: true })
}

describe('requestDurability / getDurabilityStatus', () => {
  const originalNavigator = globalThis.navigator

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', { value: originalNavigator, configurable: true })
  })

  it('defaults getDurabilityStatus to unknown before any check has run', async () => {
    setStorageManager({ persisted: vi.fn(), persist: vi.fn() })
    const { getDurabilityStatus } = await import('./storage')

    expect(getDurabilityStatus()).toBe('unknown')
  })

  it('reports persisted without prompting when already granted', async () => {
    const persisted = vi.fn().mockResolvedValue(true)
    const persist = vi.fn().mockResolvedValue(true)
    setStorageManager({ persisted, persist })
    const { requestDurability, getDurabilityStatus } = await import('./storage')

    const status = await requestDurability()

    expect(status).toBe('persisted')
    expect(getDurabilityStatus()).toBe('persisted')
    expect(persisted).toHaveBeenCalledTimes(1)
    expect(persist).not.toHaveBeenCalled()
  })

  it('prompts via persist() when not already granted and reports an honest grant', async () => {
    const persisted = vi.fn().mockResolvedValue(false)
    const persist = vi.fn().mockResolvedValue(true)
    setStorageManager({ persisted, persist })
    const { requestDurability } = await import('./storage')

    const status = await requestDurability()

    expect(status).toBe('persisted')
    expect(persist).toHaveBeenCalledTimes(1)
  })

  it('reports denied when the browser refuses the persist() prompt', async () => {
    const persisted = vi.fn().mockResolvedValue(false)
    const persist = vi.fn().mockResolvedValue(false)
    setStorageManager({ persisted, persist })
    const { requestDurability, getDurabilityStatus } = await import('./storage')

    const status = await requestDurability()

    expect(status).toBe('denied')
    expect(getDurabilityStatus()).toBe('denied')
  })

  it('reports unsupported when navigator.storage is missing', async () => {
    setStorageManager(undefined)
    const { requestDurability, getDurabilityStatus } = await import('./storage')

    const status = await requestDurability()

    expect(status).toBe('unsupported')
    expect(getDurabilityStatus()).toBe('unsupported')
  })

  it('reports unsupported (never throws) when persisted()/persist() reject', async () => {
    const persisted = vi.fn().mockRejectedValue(new Error('SecurityError'))
    const persist = vi.fn()
    setStorageManager({ persisted, persist })
    const { requestDurability } = await import('./storage')

    const status = await requestDurability()

    expect(status).toBe('unsupported')
  })

  it('memoizes: concurrent and repeat callers share one outcome without re-prompting', async () => {
    const persisted = vi.fn().mockResolvedValue(false)
    const persist = vi.fn().mockResolvedValue(false)
    setStorageManager({ persisted, persist })
    const { requestDurability } = await import('./storage')

    const [a, b] = await Promise.all([requestDurability(), requestDurability()])
    const c = await requestDurability()

    expect([a, b, c]).toEqual(['denied', 'denied', 'denied'])
    expect(persisted).toHaveBeenCalledTimes(1)
    expect(persist).toHaveBeenCalledTimes(1)
  })
})

describe('a stored résumé is never dropped for one bad field', () => {
  // A résumé that failed validation was "recovered" by parsing the very same
  // content and metadata again, which failed again; the dashboard then left it
  // out without a word while it sat in storage. One field a later version
  // cannot read must cost that field, never the document.
  const good = async () => {
    const { createDocument } = await import('@/data/defaults')
    const d = createDocument({ sample: true })
    return JSON.parse(JSON.stringify(d))
  }

  it('drops only a setting this version does not know', async () => {
    const { parseStoredDoc } = await import('./storage')
    const raw = await good()
    raw.metadata.layout.sectionSettings = { work: { headingStyle: 'a-style-from-the-future', showDates: false } }
    const doc = parseStoredDoc(raw)!
    expect(doc).not.toBeNull()
    expect(doc.content.basics.name).toBe(raw.content.basics.name)
    expect(doc.content.work.length).toBe(raw.content.work.length)
    expect(doc.metadata.layout.sectionSettings?.work?.headingStyle).toBeUndefined()
    expect(doc.metadata.layout.sectionSettings?.work?.showDates).toBe(false)
    expect(doc.metadata.template).toBe(raw.metadata.template)
  })

  it('keeps every other word when one entry carries a field it cannot read', async () => {
    const { parseStoredDoc } = await import('./storage')
    const raw = await good()
    raw.content.work[0].highlights = 42
    const doc = parseStoredDoc(raw)!
    expect(doc).not.toBeNull()
    expect(doc.content.work.length).toBe(raw.content.work.length)
    expect(doc.content.work[0].position).toBe(raw.content.work[0].position)
    expect(doc.content.work[1].highlights).toEqual(raw.content.work[1].highlights)
  })

  it('gives up only on something that is not a résumé at all', async () => {
    const { parseStoredDoc } = await import('./storage')
    expect(parseStoredDoc({ hello: 'world' } as never)).toBeNull()
  })
})
