import type { ResumeDocument } from '@/types/document'

/**
 * What picking — or dropping — a profile photo MEANS for the document.
 *
 * Three surfaces offer the choice (the form panel, the picture on the canvas,
 * the header's Style popover) and each one used to decide for itself what else
 * changed with the picture. That is how a photo could be set while the layout
 * was still told not to show one, and how clearing the picture left the
 * header asking for a photo that no longer existed. The rules live here, as
 * plain recipes over the document, so every door applies the same ones and a
 * test can read them.
 *
 * The identity mark is exactly one of none / monogram / photo, which is why
 * saving a picture also puts the monogram away.
 */
export function applyPickedPhoto(d: ResumeDocument, dataUrl: string): void {
  d.content.basics.image = dataUrl
  d.metadata.layout.showPhoto = true
  d.metadata.layout.monogram = false
}

/** Clear the picture AND stop the layout asking for one. */
export function clearPhoto(d: ResumeDocument): void {
  d.content.basics.image = ''
  d.metadata.layout.showPhoto = false
}
