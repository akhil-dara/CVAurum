/**
 * "Start on new page" pins (metadata.page.breaks), shared by every control
 * that offers one: the section style sheet, the entry hover cluster on the
 * canvas and the entry card in the panel. A pin names a section, or one entry
 * of it through the item's own stable id; a section pin and an entry pin in
 * the same section are two different pins. Both helpers work on the live
 * array inside an updateMetadata recipe, the way the layout movers do.
 */
import type { PageBreakPin } from '@/types/metadata'

const matches = (pin: PageBreakPin, section: string, itemId?: string) =>
  pin.section === section && (itemId ? pin.itemId === itemId : !pin.itemId)

export function hasPagePin(breaks: PageBreakPin[], section: string, itemId?: string): boolean {
  return breaks.some((b) => matches(b, section, itemId))
}

export function togglePagePin(breaks: PageBreakPin[], section: string, itemId?: string): void {
  const idx = breaks.findIndex((b) => matches(b, section, itemId))
  if (idx >= 0) breaks.splice(idx, 1)
  else breaks.push(itemId ? { section, itemId } : { section })
}
