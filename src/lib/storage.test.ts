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
