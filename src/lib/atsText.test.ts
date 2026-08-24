import { describe, expect, it } from 'vitest'
import { atsSectionOrder } from './atsText'

describe('atsSectionOrder', () => {
  // The exporter emits the main column ahead of the sidebar in the text layer
  // whichever side the sidebar is drawn on, so this view must do the same.
  // It previously put a LEFT sidebar first, on the grounds that it comes first
  // in the DOM, and showed people a worse parse order than their own PDF has.
  it('reads the main column before the sidebar in a two-column resume', () => {
    expect(atsSectionOrder(['work', 'education'], ['skills'], true)).toEqual(['work', 'education', 'skills'])
  })

  it('ignores the sidebar entirely when the layout is single-column', () => {
    expect(atsSectionOrder(['work'], ['skills'], false)).toEqual(['work'])
  })
})
