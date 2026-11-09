/**
 * A shared link carries no images: they would make it long and are the one
 * part of a resume that is not text. Extra logos count as images too.
 */
import { describe, it, expect } from 'vitest'
import { hasImages, stripImages } from './share'
import { createDocument } from '@/data/defaults'

const B = 'data:image/png;base64,BBBB'

describe('images in a shared link', () => {
  it('sees a logo that sits only among the extras', () => {
    const doc = createDocument({ sample: true })
    doc.content.basics.image = ''
    for (const list of [doc.content.work, doc.content.education, doc.content.volunteer]) for (const it of list) it.logo = ''
    expect(hasImages(doc)).toBe(false)
    doc.content.education[0].logoExtras = [B]
    expect(hasImages(doc)).toBe(true)
  })

  it('strips the extras as it strips the first logo', () => {
    const doc = createDocument({ sample: true })
    doc.content.work[0].logoExtras = [B]
    const out = stripImages(doc)
    expect(out.content.work[0].logoExtras ?? []).toEqual([])
    expect(hasImages(out)).toBe(false)
  })
})
