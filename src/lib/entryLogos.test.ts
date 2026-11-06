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
