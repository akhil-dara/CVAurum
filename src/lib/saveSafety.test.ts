import { describe, expect, it } from 'vitest'
import { saveAtRisk, offerBackupAfterExport, hasWorkToLose } from './saveSafety'
import { createDocument } from '@/data/defaults'

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

describe('whether there is anything to lose', () => {
  // A brand-new blank résumé met its author with a warning to back it up -
  // before a word was typed, the first thing the editor said was alarm.
  it('stays quiet about a backup while nothing has been written', () => {
    expect(saveAtRisk('denied', 0, NOW, false)).toBe(false)
  })
  it('is nothing, on a blank résumé alone in the library', () => {
    expect(hasWorkToLose(createDocument({}).content, 1)).toBe(false)
  })
  it('is something, once a name is typed', () => {
    const c = createDocument({}).content
    c.basics.name = 'Asha Rao'
    expect(hasWorkToLose(c, 1)).toBe(true)
  })
  it('is something, once any section holds an entry', () => {
    const c = createDocument({}).content
    c.work = [{ id: 'w', name: 'Northwind', position: '', startDate: '', endDate: '', highlights: [] } as never]
    expect(hasWorkToLose(c, 1)).toBe(true)
  })
  it('is something, when other résumés live in this browser', () => {
    expect(hasWorkToLose(createDocument({}).content, 3)).toBe(true)
  })
})

describe('the backup offered after an export', () => {
  it('is offered once, to someone who has never backed up', () => {
    expect(offerBackupAfterExport({ lastBackup: 0, offered: false })).toBe(true)
    expect(offerBackupAfterExport({ lastBackup: 0, offered: true })).toBe(false)
    expect(offerBackupAfterExport({ lastBackup: NOW, offered: false })).toBe(false)
  })
})
