/**
 * Local persistence via IndexedDB (idb-keyval). Everything stays on the user's
 * machine — no server, no account, no telemetry. Each resume is stored under
 * `doc:<id>`; app settings under `settings`.
 */
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

export async function loadAllDocs(): Promise<ResumeDocument[]> {
  try {
    const allKeys = await keys(store)
    const docKeys = allKeys.filter((k) => typeof k === 'string' && (k as string).startsWith(DOC_PREFIX))
    const docs = await Promise.all(docKeys.map((k) => get<ResumeDocument>(k, store)))
    return docs
      .filter(Boolean)
      .map((d) => safeParseDoc(d as ResumeDocument))
      .filter((d): d is ResumeDocument => d !== null)
      .sort((a, b) => b.updatedAt - a.updatedAt)
  } catch (e) {
    console.error('Failed to load resumes', e)
    return []
  }
}

export async function loadDoc(id: string): Promise<ResumeDocument | null> {
  const raw = await get<ResumeDocument>(DOC_PREFIX + id, store)
  return raw ? safeParseDoc(raw) : null
}

export async function saveDoc(doc: ResumeDocument): Promise<void> {
  await set(DOC_PREFIX + doc.id, doc, store)
}

export async function deleteDoc(id: string): Promise<void> {
  await del(DOC_PREFIX + id, store)
}

/** Remove every stored resume (used by "restore backup → replace"). */
export async function clearAllDocs(): Promise<void> {
  const allKeys = await keys(store)
  await Promise.all(
    allKeys
      .filter((k): k is string => typeof k === 'string' && k.startsWith(DOC_PREFIX))
      .map((k) => del(k, store)),
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

/** Validate & coerce a stored doc; returns null if irreparably malformed. */
function safeParseDoc(doc: ResumeDocument): ResumeDocument | null {
  const res = ResumeDocumentSchema.safeParse(doc)
  if (res.success) return scrubRetiredAvatar(res.data)
  console.warn('Stored resume failed validation; attempting recovery', res.error)
  // Best-effort recovery: keep id/title/timestamps, re-default the rest.
  try {
    return ResumeDocumentSchema.parse({
      id: doc.id,
      title: doc.title ?? 'Recovered Resume',
      createdAt: doc.createdAt ?? Date.now(),
      updatedAt: doc.updatedAt ?? Date.now(),
      content: doc.content ?? {},
      metadata: doc.metadata ?? {},
    })
  } catch {
    return null
  }
}
