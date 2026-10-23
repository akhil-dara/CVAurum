import { describe, expect, it } from 'vitest'
import { saveAtRisk, offerBackupAfterExport } from './saveSafety'

/**
 * The editor said "Saved" and nothing else, while the only copy of a résumé
 * lives in this browser - and a browser that has not granted durable storage
 * can clear it (a real incident wiped a phone's library). The editor now says
 * where it saved, and says so loudly only when the work is actually at risk.
 */
const DAY = 24 * 60 * 60 * 1000
const NOW = Date.parse('2026-10-23T12:00:00Z')

describe('when a saved résumé is at risk', () => {
  it('is not, when the browser keeps the storage', () => {
    expect(saveAtRisk('persisted', 0, NOW)).toBe(false)
  })
  it('is, when the browser may clear it and there is no recent backup', () => {
    expect(saveAtRisk('denied', 0, NOW)).toBe(true)
    expect(saveAtRisk('denied', NOW - 20 * DAY, NOW)).toBe(true)
  })
  it('is not, right after a backup', () => {
    expect(saveAtRisk('denied', NOW - 2 * DAY, NOW)).toBe(false)
  })
  it('says nothing until the browser has answered', () => {
    expect(saveAtRisk('unknown', 0, NOW)).toBe(false)
  })
})

describe('the backup offered after an export', () => {
  it('is offered once, to someone who has never backed up', () => {
    expect(offerBackupAfterExport({ lastBackup: 0, offered: false })).toBe(true)
    expect(offerBackupAfterExport({ lastBackup: 0, offered: true })).toBe(false)
    expect(offerBackupAfterExport({ lastBackup: NOW, offered: false })).toBe(false)
  })
})
