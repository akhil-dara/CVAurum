/**
 * Unit conversions for the direct PDF renderer.
 *
 * The résumé is laid out by the browser in CSS pixels (1/96 in); PDF user space
 * is points (1/72 in). The DOM's y axis grows downward from the top-left, PDF's
 * grows upward from the bottom-left, so every y needs flipping.
 */

/** CSS px are 1/96in; PDF points are 1/72in. */
export const PT_PER_PX = 72 / 96

export const pxToPt = (px: number): number => px * PT_PER_PX

/** DOM y grows downward, PDF y grows upward. */
export const flipY = (yDomPt: number, pageHeightPt: number): number => pageHeightPt - yDomPt
