// The right-to-left blocks, in one place for every module that asks whether
// text can hold a right-to-left letter.

/**
 * A regular-expression character-class body (no brackets) for the BMP
 * right-to-left blocks: Hebrew, Arabic, Syriac, Thaana, NKo, Samaritan,
 * Mandaic, Arabic Extended, and the Hebrew and Arabic presentation forms. It
 * ends at U+FEFC, the last Arabic presentation form: U+FEFF is the byte-order
 * mark and must never count.
 */
export const RTL_BLOCK_CLASS = '\\u0590-\\u08FF\\uFB1D-\\uFDFF\\uFE70-\\uFEFC'

/**
 * The same kind of class body for Arabic script alone: Arabic, Arabic
 * Supplement, Arabic Extended-A and the Arabic presentation forms A and B.
 * It too ends at U+FEFC, never the byte-order mark.
 */
export const ARABIC_SCRIPT_CLASS = '\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFC'
