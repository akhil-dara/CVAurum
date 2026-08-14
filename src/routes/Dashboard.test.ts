import { describe, expect, it } from 'vitest'
import { computeStorageNotice } from './Dashboard'

const DAY = 24 * 60 * 60 * 1000
const NOW = Date.parse('2026-08-15T00:00:00.000Z')
const noDismissal = { durability: 0, backup: 0 }

describe('computeStorageNotice', () => {
  it('shows nothing for a brand-new (empty) library', () => {
    const notice = computeStorageNotice({
      durability: 'unknown',
      library: [],
      lastBackup: 0,
      dismissedAt: noDismissal,
      now: NOW,
    })
    expect(notice).toBeNull()
  })

  it('restores old toast coverage: a single settled resume with no backup gets the staleness notice', () => {
    const notice = computeStorageNotice({
      durability: 'persisted',
      library: [{ createdAt: NOW - 3 * DAY }],
      lastBackup: 0,
      dismissedAt: noDismissal,
      now: NOW,
    })
    expect(notice).toBe('backup')
  })

  it('does not nag a fresh library: 3 resumes created moments ago (within the 2-day settling grace)', () => {
    const notice = computeStorageNotice({
      durability: 'persisted',
      library: [{ createdAt: NOW }, { createdAt: NOW - DAY }, { createdAt: NOW - DAY / 2 }],
      lastBackup: 0,
      dismissedAt: noDismissal,
      now: NOW,
    })
    expect(notice).toBeNull()
  })

  it('does not nag once a backup exists within the last 14 days', () => {
    const notice = computeStorageNotice({
      durability: 'persisted',
      library: [{ createdAt: NOW - 10 * DAY }],
      lastBackup: NOW - 3 * DAY,
      dismissedAt: noDismissal,
      now: NOW,
    })
    expect(notice).toBeNull()
  })

  it('nags again once the last backup is older than 14 days', () => {
    const notice = computeStorageNotice({
      durability: 'persisted',
      library: [{ createdAt: NOW - 30 * DAY }],
      lastBackup: NOW - 15 * DAY,
      dismissedAt: noDismissal,
      now: NOW,
    })
    expect(notice).toBe('backup')
  })

  it('suppresses the backup notice while its dismissal is within the 14-day snooze', () => {
    const notice = computeStorageNotice({
      durability: 'persisted',
      library: [{ createdAt: NOW - 10 * DAY }],
      lastBackup: 0,
      dismissedAt: { durability: 0, backup: NOW - 5 * DAY },
      now: NOW,
    })
    expect(notice).toBeNull()
  })

  it('re-shows the backup notice once its dismissal snooze has expired', () => {
    const notice = computeStorageNotice({
      durability: 'persisted',
      library: [{ createdAt: NOW - 10 * DAY }],
      lastBackup: 0,
      dismissedAt: { durability: 0, backup: NOW - 15 * DAY },
      now: NOW,
    })
    expect(notice).toBe('backup')
  })

  it('durability-denied wins over an otherwise-stale backup (one notice at a time)', () => {
    const notice = computeStorageNotice({
      durability: 'denied',
      library: [{ createdAt: NOW - 30 * DAY }],
      lastBackup: 0,
      dismissedAt: noDismissal,
      now: NOW,
    })
    expect(notice).toBe('durability')
  })

  it('falls through to the backup notice once durability-denied is dismissed within its own snooze', () => {
    const notice = computeStorageNotice({
      durability: 'denied',
      library: [{ createdAt: NOW - 30 * DAY }],
      lastBackup: 0,
      dismissedAt: { durability: NOW - 5 * DAY, backup: 0 },
      now: NOW,
    })
    expect(notice).toBe('backup')
  })
})
