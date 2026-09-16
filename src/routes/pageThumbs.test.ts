import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { LIBRARY } from '@/data/library'
import { TEMPLATES } from '@/templates/registry'
import { sampleThumbImage, sampleThumbHeight, samplePageImageHeight } from '@/lib/seoLibrary'
import { pageThumb, pageThumbHeight, pageImageHeight } from './Templates'
import { PAGE_THUMB_WIDTH } from '@/data/pageThumbs'

/**
 * The file a grid card actually downloads.
 *
 * A scroll to the bottom of /examples moved 11.07 MB of pictures when the cards
 * pointed at the 1200px lossless page images (production build, 2026-09-15) —
 * the files that exist for the lightbox, the per-example page and image search,
 * shown in a 172px card. The twin is the same picture at 520px, lossy, and
 * these are the three things that can go wrong with it and never be noticed:
 * a missing file (the card falls back to the grey sketch, silently), a thumb
 * built at the wrong width (bytes no screen can show), and one that quietly
 * grows past the size that made it worth having.
 */
describe('the grid twin of every page picture', () => {
  const pub = path.resolve(__dirname, '../../public')

  /**
   * The declared pixel width of a WebP file, read out of its own header —
   * so the assertion is about the file on disk, not about the script that
   * claims to have written it. Three container shapes are possible and sharp
   * picks between them by content: a plain lossy frame (VP8), a lossless one
   * (VP8L), and the extended container (VP8X) that wraps either when there is
   * alpha or metadata to carry.
   */
  function webpWidth(file: string): number {
    const b = fs.readFileSync(file)
    expect(b.toString('ascii', 0, 4), file).toBe('RIFF')
    expect(b.toString('ascii', 8, 12), file).toBe('WEBP')
    const fourcc = b.toString('ascii', 12, 16)
    if (fourcc === 'VP8X') return (b[24] | (b[25] << 8) | (b[26] << 16)) + 1
    if (fourcc === 'VP8L') {
      // 0x2f signature, then 14 bits of (width - 1), little-endian bitstream.
      expect(b[20], file).toBe(0x2f)
      return ((b[21] | (b[22] << 8)) & 0x3fff) + 1
    }
    expect(fourcc, file).toBe('VP8 ')
    // 3-byte frame tag, 3-byte sync code (9d 01 2a), then 14 bits of width.
    expect([b[23], b[24], b[25]], file).toEqual([0x9d, 0x01, 0x2a])
    return (b[26] | (b[27] << 8)) & 0x3fff
  }

  const thumbs = [
    ...LIBRARY.map((s) => ({ what: `examples/${s.slug}`, src: sampleThumbImage(s.slug) })),
    ...TEMPLATES.map((t) => ({ what: `templates/${t.id}`, src: pageThumb(t) })),
  ]

  it('is shipped for every example and every design', () => {
    expect(thumbs).toHaveLength(LIBRARY.length + TEMPLATES.length)
    const missing = thumbs.filter((t) => !fs.existsSync(path.join(pub, t.src))).map((t) => t.what)
    expect(missing).toEqual([])
  })

  it(`is ${PAGE_THUMB_WIDTH} pixels wide — the widest a card is ever painted`, () => {
    const wrong = thumbs
      .map((t) => ({ what: t.what, w: webpWidth(path.join(pub, t.src)) }))
      .filter((t) => t.w !== PAGE_THUMB_WIDTH)
    expect(wrong).toEqual([])
  })

  it('stays under 60 KB, which is what makes it worth having', () => {
    const over = thumbs
      .map((t) => ({ what: t.what, kb: fs.statSync(path.join(pub, t.src)).size / 1024 }))
      .filter((t) => t.kb > 60)
      .map((t) => `${t.what} (${t.kb.toFixed(1)} KB)`)
    expect(over).toEqual([])
  })

  it('declares the shape of the file it actually is, not of its 1200px twin', () => {
    for (const s of LIBRARY) {
      expect(sampleThumbHeight(s.slug), s.slug).toBe(Math.round((samplePageImageHeight(s.slug) * PAGE_THUMB_WIDTH) / 1200))
    }
    for (const t of TEMPLATES) {
      expect(pageThumbHeight(t), t.id).toBe(Math.round((pageImageHeight(t) * PAGE_THUMB_WIDTH) / 1200))
    }
  })

  it('lives beside the picture it was made from', () => {
    for (const s of LIBRARY.slice(0, 5)) expect(sampleThumbImage(s.slug)).toBe(`/img/examples/thumb/${s.slug}.webp`)
    for (const t of TEMPLATES.slice(0, 5)) expect(pageThumb(t)).toBe(`/img/templates/thumb/${t.id}.webp`)
  })
})
