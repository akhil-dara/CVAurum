/**
 * Local persistence via IndexedDB (idb-keyval). Everything stays on the user's
 * machine — no server, no account, no telemetry. Each resume is stored under
 * `doc:<id>`; app settings under `settings`.
 */
import { withProfileAddresses } from '@/lib/profileAddress'
import { createStore, get, set, del, keys } from 'idb-keyval'
import { ResumeDocumentSchema, type ResumeDocument } from '@/types/document'
import type { JobApplication } from '@/types/tracker'

const store = createStore('cvaurum-db', 'kv')

const DOC_PREFIX = 'doc:'
const SETTINGS_KEY = 'settings'
const TRACKER_KEY = 'jobTracker'

export interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  /** id of the most recently opened resume */
  lastOpened?: string
  /** whether the first-run welcome has been dismissed */
  onboarded: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  onboarded: false,
}

/** What the last library load found: how many résumés this browser holds,
 *  how many could be shown, and whether reading failed outright. The
 *  dashboard says so when they differ - a résumé that cannot be opened was
 *  once left out of the list without a word. */
export interface LoadReport {
  stored: number
  shown: number
  failed: boolean
}

let lastLoad: LoadReport = { stored: 0, shown: 0, failed: false }

export function getLoadReport(): LoadReport {
  return lastLoad
}

/** Every stored résumé exactly as it sits in this browser, read or not. */
export async function loadRawDocs(): Promise<unknown[]> {
  const allKeys = await keys(store)
  const docKeys = allKeys.filter((k) => typeof k === 'string' && (k as string).startsWith(DOC_PREFIX))
  return (await Promise.all(docKeys.map((k) => get(k, store)))).filter(Boolean)
}

export async function loadAllDocs(): Promise<ResumeDocument[]> {
  try {
    const raw = (await loadRawDocs()) as ResumeDocument[]
    const docs = raw
      .map((d) => parseStoredDoc(d))
      .filter((d): d is ResumeDocument => d !== null)
      .sort((a, b) => b.updatedAt - a.updatedAt)
    lastLoad = { stored: raw.length, shown: docs.length, failed: false }
    return docs
  } catch (e) {
    console.error('Failed to load resumes', e)
    lastLoad = { stored: 0, shown: 0, failed: true }
    return []
  }
}

export async function loadDoc(id: string): Promise<ResumeDocument | null> {
  const raw = await get<ResumeDocument>(DOC_PREFIX + id, store)
  return raw ? parseStoredDoc(raw) : null
}

/** Wide status including the pre-check default; the dashboard notice reads this. */
export type DurabilityStatus = 'unknown' | 'persisted' | 'denied' | 'unsupported'

let durabilityStatus: DurabilityStatus = 'unknown'
let durabilityPromise: Promise<'persisted' | 'denied' | 'unsupported'> | null = null

/**
 * Ask the browser to mark our storage durable (defeats routine eviction on
 * Chromium; Safari still caps non-installed sites at 7 days — see the
 * dashboard's Safari nudge, a separate mitigation). Checks `persisted()`
 * first (already granted needs no prompt), otherwise calls `persist()` and
 * reports the HONEST outcome instead of firing-and-forgetting it — a denial
 * means the browser may evict all site data under disk pressure, silently.
 * Memoized: concurrent/repeat callers share one in-flight (then resolved) promise.
 */
export function requestDurability(): Promise<'persisted' | 'denied' | 'unsupported'> {
  if (durabilityPromise) return durabilityPromise
  durabilityPromise = (async (): Promise<'persisted' | 'denied' | 'unsupported'> => {
    try {
      const storage = navigator.storage
      if (!storage || typeof storage.persisted !== 'function' || typeof storage.persist !== 'function') {
        durabilityStatus = 'unsupported'
        return 'unsupported'
      }
      if (await storage.persisted()) {
        durabilityStatus = 'persisted'
        return 'persisted'
      }
      durabilityStatus = (await storage.persist()) ? 'persisted' : 'denied'
      return durabilityStatus as 'persisted' | 'denied'
    } catch {
      durabilityStatus = 'unsupported'
      return 'unsupported'
    }
  })()
  return durabilityPromise
}

/** Last known durability outcome ('unknown' until `requestDurability` resolves at least once). */
export function getDurabilityStatus(): DurabilityStatus {
  return durabilityStatus
}

let durabilityRequested = false

export async function saveDoc(doc: ResumeDocument): Promise<void> {
  // Once per session, kick off the durability check (see requestDurability above).
  if (!durabilityRequested) {
    durabilityRequested = true
    void requestDurability()
  }
  await set(DOC_PREFIX + doc.id, doc, store)
}

export async function deleteDoc(id: string): Promise<void> {
  await del(DOC_PREFIX + id, store)
}

/** Remove every stored resume (used by "restore backup → replace"). */
export async function clearAllDocs(): Promise<void> {
  const allKeys = await keys(store)
  await Promise.all(
    allKeys.filter((k): k is string => typeof k === 'string' && k.startsWith(DOC_PREFIX)).map((k) => del(k, store))
  )
}

export async function loadSettings(): Promise<AppSettings> {
  const raw = await get<Partial<AppSettings>>(SETTINGS_KEY, store)
  if (!raw) return { ...DEFAULT_SETTINGS }
  // Drop any legacy fields (e.g. the removed `ai` block) so they don't linger.
  const rest = { ...raw }
  delete (rest as Record<string, unknown>).ai
  return { ...DEFAULT_SETTINGS, ...rest }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await set(SETTINGS_KEY, settings, store)
}

export async function loadTracker(): Promise<JobApplication[]> {
  return (await get<JobApplication[]>(TRACKER_KEY, store)) ?? []
}

export async function saveTracker(apps: JobApplication[]): Promise<void> {
  await set(TRACKER_KEY, apps, store)
}

/** Retired sample avatars. Docs created from older sample content still carry
 *  them, and in a PDF they read as a "no dp" placeholder — strip them on load
 *  so nothing placeholder-looking can ever print. */
const RETIRED_AVATAR =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='240'%20height='240'%3E%3Cdefs%3E%3ClinearGradient%20id='g'%20x1='0'%20y1='0'%20x2='1'%20y2='1'%3E%3Cstop%20offset='0'%20stop-color='%23cbd5e1'/%3E%3Cstop%20offset='1'%20stop-color='%2364748b'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect%20width='240'%20height='240'%20fill='url(%23g)'/%3E%3Ccircle%20cx='120'%20cy='94'%20r='40'%20fill='%23f1f5f9'/%3E%3Cpath%20d='M50%20208c0-39%2031-62%2070-62s70%2023%2070%2062z'%20fill='%23f1f5f9'/%3E%3C/svg%3E"

const RETIRED_AVATAR_AM =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='240'%20height='240'%3E%3Cdefs%3E%3ClinearGradient%20id='g'%20x1='0'%20y1='0'%20x2='1'%20y2='1'%3E%3Cstop%20offset='0'%20stop-color='%232a3142'/%3E%3Cstop%20offset='1'%20stop-color='%2312151d'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect%20width='240'%20height='240'%20fill='url(%23g)'/%3E%3Ccircle%20cx='120'%20cy='120'%20r='84'%20fill='none'%20stroke='%23d4982f'%20stroke-opacity='0.55'%20stroke-width='2.5'/%3E%3Ctext%20x='120'%20y='149'%20font-family='Georgia,serif'%20font-size='80'%20fill='%23f5efe2'%20text-anchor='middle'%3EAM%3C/text%3E%3C/svg%3E"

export const RETIRED_AVATARS = [RETIRED_AVATAR, RETIRED_AVATAR_AM]

function scrubRetiredAvatar(doc: ResumeDocument): ResumeDocument {
  if (doc.content?.basics?.image && RETIRED_AVATARS.includes(doc.content.basics.image)) doc.content.basics.image = ''
  return doc
}

/** Removes the value at `path` from `root`: an object key, or an array item. */
function dropAt(root: unknown, path: PropertyKey[]): boolean {
  if (!path.length) return false
  let node = root as Record<PropertyKey, unknown> | unknown[]
  for (const key of path.slice(0, -1)) {
    const next = (node as Record<PropertyKey, unknown>)?.[key as never]
    if (next === null || typeof next !== 'object') return false
    node = next as Record<PropertyKey, unknown>
  }
  const last = path[path.length - 1]
  if (Array.isArray(node)) {
    if (typeof last !== 'number' || last >= node.length) return false
    node.splice(last, 1)
  } else {
    if (!(last in node)) return false
    delete (node as Record<PropertyKey, unknown>)[last]
  }
  return true
}

/**
 * Validate & coerce a stored doc; null only for something that is not a
 * résumé at all.
 *
 * A stored résumé must never vanish for one value this version cannot read
 * (a setting a later or earlier version wrote, an entry field of the wrong
 * shape). The old recovery parsed the very same content and metadata a
 * second time, failed again, and the dashboard left the résumé out without a
 * word while it sat in storage. Now each value the schema rejects is removed
 * - its default takes its place - and the parse is tried again; a value
 * whose removal is not enough (a required field) takes its parent with it,
 * one level at a time. Everything else the author wrote is kept.
 */
export function parseStoredDoc(doc: ResumeDocument): ResumeDocument | null {
  const first = ResumeDocumentSchema.safeParse(doc)
  if (first.success) return finish(first.data)
  if (!doc || typeof doc !== 'object' || typeof (doc as { id?: unknown }).id !== 'string') return null
  console.warn('Stored resume failed validation; repairing it field by field', first.error.issues)
  const work = structuredClone(doc) as unknown as Record<string, unknown>
  work.content ??= {}
  work.metadata ??= {}
  const tried = new Set<string>()
  for (let round = 0; round < 200; round++) {
    const res = ResumeDocumentSchema.safeParse(work)
    if (res.success) return finish(res.data)
    let changed = false
    for (const issue of res.error.issues) {
      let path = [...issue.path]
      // a value already removed that still fails was required: drop its parent
      while (path.length && tried.has(JSON.stringify(path))) path = path.slice(0, -1)
      if (path.length < 2) continue // never the document's own id, content or metadata
      tried.add(JSON.stringify(path))
      if (dropAt(work, path)) changed = true
    }
    if (!changed) break
  }
  return null
}

function finish(doc: ResumeDocument): ResumeDocument {
  // Profiles saved with their address in the username field link again.
  withProfileAddresses(doc.content)
  return scrubRetiredAvatar(doc)
}
