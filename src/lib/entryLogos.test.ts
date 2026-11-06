/**
 * An entry can carry up to three logos (issue #8: one joint degree, two
 * universities' crests). The first stays in `logo`, so older files and
 * readers keep working; the second and third live in `logoExtras`.
 */
import { describe, it, expect } from 'vitest'
import {
  MAX_ENTRY_LOGOS,
  addEntryLogo,
  entryLogos,
  moveEntryLogo,
  moveLogoTo,
  logoButtonLabel,
  placeMenu,
  dropNonDataLogos,
  removeEntryLogo,
  sanitizeEntryLogos,
  type LogoEntry,
} from './entryLogos'
import { WorkSchema } from '@/types/resume'

const A = 'data:image/png;base64,AAAA'
const B = 'data:image/png;base64,BBBB'
const C = 'data:image/png;base64,CCCC'
const D = 'data:image/png;base64,DDDD'

describe('entryLogos', () => {
  it('reads the first logo, then the extras, at most three', () => {
    expect(MAX_ENTRY_LOGOS).toBe(3)
    expect(entryLogos({ logo: A, logoExtras: [B, C, D] })).toEqual([A, B, C])
  })

  it('skips an empty first logo', () => {
    expect(entryLogos({ logo: '', logoExtras: [B] })).toEqual([B])
  })

  it('never returns a remote image', () => {
    expect(entryLogos({ logo: 'https://x/y.png', logoExtras: [B] })).toEqual([B])
  })
})

describe('changing the logos', () => {
  it('removing the first promotes the next into `logo`', () => {
    const it: LogoEntry = { logo: A, logoExtras: [B] }
    removeEntryLogo(it, 0)
    expect(it.logo).toBe(B)
    expect(it.logoExtras).toBeUndefined()
  })

  it('adds into an empty entry, and not past three', () => {
    const empty: LogoEntry = {}
    addEntryLogo(empty, A)
    expect(empty.logo).toBe(A)
    const full: LogoEntry = { logo: A, logoExtras: [B, C] }
    addEntryLogo(full, D)
    expect(entryLogos(full)).toEqual([A, B, C])
  })

  it('moves a logo one place, and stops at the ends', () => {
    const it: LogoEntry = { logo: A, logoExtras: [B, C] }
    moveEntryLogo(it, 1, -1)
    expect(entryLogos(it)).toEqual([B, A, C])
    moveEntryLogo(it, 0, -1)
    expect(entryLogos(it)).toEqual([B, A, C])
  })
})

describe('the schema', () => {
  it('keeps extra logos on a work entry, and leaves them out when absent', () => {
    expect(WorkSchema.parse({ logoExtras: [B] }).logoExtras).toEqual([B])
    expect(WorkSchema.parse({}).logoExtras).toBeUndefined()
  })
})

describe('cleaning logos that arrive from outside', () => {
  it('runs every logo, extras included, through the cleaner, keeping three at most', async () => {
    const it: LogoEntry = { logo: A, logoExtras: [B, 'https://evil.example/x.png', C, D] }
    // The real cleaner re-encodes through a canvas; here it passes data URLs and rejects the rest.
    await sanitizeEntryLogos(it, async (s) => (s && s.startsWith('data:image/') ? s : ''))
    expect(entryLogos(it)).toEqual([A, B, C])
    expect([it.logo, ...(it.logoExtras ?? [])].some((s) => s?.startsWith('http'))).toBe(false)
  })

  it('a restored backup keeps only data URLs, in the extras too', () => {
    const it: LogoEntry = { logo: 'https://evil.example/a.png', logoExtras: [B, 'blob:stale', C] }
    dropNonDataLogos(it)
    expect(it.logo).toBe(B)
    expect(it.logoExtras).toEqual([C])
  })
})

describe('moveLogoTo (drag reorder in the panel)', () => {
  it('moves one logo to another slot, keeping the rest in order', () => {
    expect(moveLogoTo([A, B, C], 0, 2)).toEqual([B, C, A])
    expect(moveLogoTo([A, B, C], 2, 0)).toEqual([C, A, B])
    expect(moveLogoTo([A, B, C], 1, 1)).toEqual([A, B, C])
  })
  it('ignores a slot that is not there', () => {
    expect(moveLogoTo([A, B], 0, 5)).toEqual([A, B])
    expect(moveLogoTo([A, B], -1, 0)).toEqual([A, B])
  })
})

describe('logoButtonLabel', () => {
  it('names the logo by the entry it marks, and its place among several', () => {
    expect(logoButtonLabel('William & Mary', 2, 2)).toBe('Change or remove logo 2 of 2: William & Mary')
    expect(logoButtonLabel('Vertex Labs', 1, 1)).toBe('Change or remove logo: Vertex Labs')
    expect(logoButtonLabel(undefined, 1, 3)).toBe('Change or remove logo 1 of 3')
    expect(logoButtonLabel('  ', 1, 1)).toBe('Change or remove logo')
  })
})

describe('placeMenu (the canvas logo menu stays on screen)', () => {
  const view = { w: 1280, h: 800 }
  it('opens below the logo when it fits', () => {
    expect(placeMenu({ top: 100, bottom: 130, left: 300 }, { w: 224, h: 300 }, view)).toEqual({ top: 136, left: 300 })
  })
  it('opens above the logo when there is no room below', () => {
    expect(placeMenu({ top: 700, bottom: 730, left: 300 }, { w: 224, h: 300 }, view)).toEqual({ top: 394, left: 300 })
  })
  it('pins to the window when it fits neither way, and never runs off the right edge', () => {
    expect(placeMenu({ top: 200, bottom: 230, left: 1200 }, { w: 224, h: 700 }, { w: 1280, h: 720 })).toEqual({ top: 12, left: 1048 })
  })
})
