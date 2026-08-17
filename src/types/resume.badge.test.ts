/**
 * Per-entry badge override (inline-reorder spec, Task B): `badge?: boolean`
 * tri-state on work/education/volunteer items — absent follows the section's
 * showBadges setting, true/false overrides it per entry.
 */
import { describe, it, expect } from 'vitest'
import { WorkSchema, EducationSchema, VolunteerSchema } from './resume'
import { entryBadgeOn } from '@/lib/sections'

describe('badge field roundtrip', () => {
  it('keeps an explicit false through parse', () => {
    expect(WorkSchema.parse({ id: 'a', badge: false }).badge).toBe(false)
    expect(EducationSchema.parse({ id: 'a', badge: false }).badge).toBe(false)
    expect(VolunteerSchema.parse({ id: 'a', badge: false }).badge).toBe(false)
  })

  it('stays absent when not set', () => {
    expect(WorkSchema.parse({ id: 'a' }).badge).toBeUndefined()
  })
})

describe('entryBadgeOn resolution', () => {
  it('follows the section setting when the item has no override', () => {
    expect(entryBadgeOn({}, { showBadges: true })).toBe(true)
    expect(entryBadgeOn({}, { showBadges: false })).toBe(false)
    expect(entryBadgeOn({}, {})).toBe(false) // showBadges is opt-in
    expect(entryBadgeOn({}, undefined)).toBe(false)
  })

  it('item override wins in both directions', () => {
    expect(entryBadgeOn({ badge: true }, { showBadges: false })).toBe(true)
    expect(entryBadgeOn({ badge: true }, undefined)).toBe(true)
    expect(entryBadgeOn({ badge: false }, { showBadges: true })).toBe(false)
  })
})
