import { describe, it, expect } from 'vitest'
import { createDocument } from '@/data/defaults'
import { applyPickedPhoto, clearPhoto } from '@/lib/photoDoc'

const PIC = 'data:image/jpeg;base64,AAAA'

describe('what picking a photo means for the document', () => {
  it('shows the picture that was just chosen', () => {
    const d = createDocument({ sample: true })
    d.content.basics.image = ''
    d.metadata.layout.showPhoto = false
    applyPickedPhoto(d, PIC)
    expect(d.content.basics.image).toBe(PIC)
    // Someone who just picked a picture means to see it: a photo saved with
    // the layout still told not to show one is a silent no-op.
    expect(d.metadata.layout.showPhoto).toBe(true)
  })

  it('puts the monogram away — the identity mark is one thing, not two', () => {
    const d = createDocument({ sample: true })
    d.metadata.layout.monogram = true
    d.metadata.layout.showPhoto = false
    applyPickedPhoto(d, PIC)
    expect(d.metadata.layout.monogram).toBe(false)
    expect(d.metadata.layout.showPhoto).toBe(true)
  })

  it('replaces the picture that was there without disturbing anything else', () => {
    const d = createDocument({ sample: true })
    d.content.basics.image = 'data:image/png;base64,OLD'
    d.metadata.layout.showPhoto = true
    d.metadata.layout.photoShape = 'square'
    d.content.basics.name = 'Rhea Kulkarni'
    applyPickedPhoto(d, PIC)
    expect(d.content.basics.image).toBe(PIC)
    expect(d.metadata.layout.photoShape).toBe('square')
    expect(d.content.basics.name).toBe('Rhea Kulkarni')
  })

  it('removing clears the picture AND stops the layout asking for one', () => {
    const d = createDocument({ sample: true })
    applyPickedPhoto(d, PIC)
    clearPhoto(d)
    expect(d.content.basics.image).toBe('')
    // The header used to be left asking for a photo that no longer existed,
    // which renders as nothing at all with no way to tell why.
    expect(d.metadata.layout.showPhoto).toBe(false)
  })

  it('removing a photo does not switch the monogram on behind your back', () => {
    const d = createDocument({ sample: true })
    d.metadata.layout.monogram = false
    applyPickedPhoto(d, PIC)
    clearPhoto(d)
    expect(d.metadata.layout.monogram).toBe(false)
  })
})
