/**
 * Full backup & restore. Bundles EVERY resume plus app settings and the job
 * tracker into a single portable file so a user can move their whole library to
 * another browser/machine — instead of exporting resumes one by one. Restore is
 * defensive: invalid entries are skipped, never the whole import.
 */
import { uid, downloadBlob } from '@/lib/utils'
import { ResumeDocumentSchema, type ResumeDocument } from '@/types/document'
import type { AppSettings } from '@/lib/storage'
import {
  loadAllDocs,
  saveDoc,
  clearAllDocs,
  loadSettings,
  saveSettings,
  loadTracker,
  saveTracker,
} from '@/lib/storage'
import type { JobApplication } from '@/types/tracker'

const APP = 'cvaurum'
const KIND = 'full-backup'
const SCHEMA_VERSION = 1

interface FullBackup {
  app: string
  kind: string
  schemaVersion: number
  exportedAt: string
  resumes: ResumeDocument[]
  settings?: AppSettings
  tracker?: JobApplication[]
}

/** Download a single file containing all resumes + settings + tracker. */
export async function exportFullBackup(): Promise<number> {
  const [resumes, settings, tracker] = await Promise.all([loadAllDocs(), loadSettings(), loadTracker()])
  const backup: FullBackup = {
    app: APP,
    kind: KIND,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    resumes,
    settings,
    tracker,
  }
  const stamp = new Date().toISOString().slice(0, 10)
  downloadBlob(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }), `cvaurum-backup-${stamp}.json`)
  return resumes.length
}

export interface RestoreResult {
  resumes: number
  tracker: number
  settings: boolean
}

/**
 * Restore from a backup file. `merge` (default) keeps existing resumes and adds
 * the backup's (re-id'ing any collisions so nothing is overwritten); `replace`
 * clears the library first.
 */
export async function importFullBackup(file: File, mode: 'merge' | 'replace' = 'merge'): Promise<RestoreResult> {
  const text = await file.text()
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON.')
  }
  const obj = (raw ?? {}) as Record<string, unknown>
  if (obj.app !== APP || obj.kind !== KIND) {
    throw new Error('That is not a CVAurum backup file. Use “Export backup” to create one.')
  }
  if (typeof obj.schemaVersion === 'number' && obj.schemaVersion > SCHEMA_VERSION) {
    throw new Error('This backup was created by a newer version of CVAurum.')
  }

  const resumes: ResumeDocument[] = (Array.isArray(obj.resumes) ? obj.resumes : [])
    .map((r) => ResumeDocumentSchema.safeParse(r))
    .filter((r) => r.success)
    .map((r) => (r as { data: ResumeDocument }).data)

  if (mode === 'replace') await clearAllDocs()
  const existing = new Set((await loadAllDocs()).map((d) => d.id))
  let importedResumes = 0
  for (const doc of resumes) {
    let d = doc
    if (mode === 'merge' && existing.has(d.id)) {
      d = { ...d, id: uid('res'), title: `${d.title} (imported)`, updatedAt: Date.now() }
    }
    // Drop any non-local (remote) photo src so a crafted backup can't trigger
    // external image requests on render — this path never re-encodes images.
    if (d.content.basics.image && !/^data:image\//i.test(d.content.basics.image)) {
      d.content.basics.image = ''
    }
    await saveDoc(d)
    existing.add(d.id)
    importedResumes++
  }

  let settingsRestored = false
  if (obj.settings && typeof obj.settings === 'object') {
    await saveSettings({ ...(await loadSettings()), ...(obj.settings as Partial<AppSettings>) })
    settingsRestored = true
  }

  let importedTracker = 0
  if (Array.isArray(obj.tracker)) {
    const incoming = (obj.tracker as JobApplication[]).filter((a) => a && typeof a === 'object' && 'id' in a)
    if (mode === 'replace') {
      await saveTracker(incoming)
      importedTracker = incoming.length
    } else {
      const cur = await loadTracker()
      const ids = new Set(cur.map((a) => a.id))
      const add = incoming.filter((a) => !ids.has(a.id))
      await saveTracker([...cur, ...add])
      importedTracker = add.length
    }
  }

  return { resumes: importedResumes, tracker: importedTracker, settings: settingsRestored }
}
