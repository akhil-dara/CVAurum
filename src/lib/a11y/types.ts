/**
 * What the checker measures, and what it says afterwards.
 *
 * The snapshot types are a page flattened into plain data: one call to the
 * DOM (snapshot.ts), and everything after it is arithmetic over these
 * structures. That is what lets the whole audit run in a test with no
 * browser - and it is the only way the two things every earlier attempt
 * missed, a list marker and a decorative numeral, can be held to a test at
 * all, because neither is a text node a test could write.
 */
import type { Box } from './geometry'

/** The handful of computed properties a contrast measurement needs. */
export interface StyleSnapshot {
  color: string
  backgroundColor: string
  backgroundImage: string
  /** `text` when the background paints the GLYPHS rather than the paper. */
  backgroundClip: string
  opacity: number
  display: string
  visibility: string
  fontSizePx: number
  fontWeight: number
  position: string
  zIndex: string
  /** A pseudo-element's own `content`, unquoted; absent on an element. */
  content?: string
  /**
   * How much smaller than its own font size this run's LOWERCASE letters are
   * actually drawn, when the design sets it in small capitals; 0 when it does
   * not. None of the bundled faces ships a real small-capitals feature, so
   * the browser draws each lowercase letter as its capital at a reduced size,
   * and the exporter does the same (pdf/text.ts smallCapsScaleFor).
   *
   * It matters here because the threshold is a SIZE: a name set at 24pt in
   * small capitals draws its lowercase letters at 17.2pt, which is small text
   * needing 4.5:1 rather than large text needing 3:1 - and measuring the
   * computed 24pt let a gold name through at 3.62:1 that the file faulted.
   */
  smallCapsScale?: number
}

/** A picture painted behind words: the art band, or a `url()` background. */
export interface ImageSnapshot {
  src: string
  /** The extremes of the picture's own pixels, sampled from it. Absent when
   *  nothing could read them - then the ground is honestly unknown, and the
   *  checker says so rather than guessing. */
  grounds?: string[]
  /**
   * The same picture read CELL BY CELL, so the ground under a run of words
   * can be the pixels under THOSE WORDS.
   *
   * A picture's extremes end to end are not a ground anything stands on: a
   * name on the dark left of a band was measured against the gold on its
   * right and faulted at 2.02:1 where the file measured 5.68:1. That is the
   * safe direction, but a false alarm on a shipped band is still a false
   * alarm, and a checker nobody believes is a checker nobody reads.
   */
  cells?: {
    cols: number
    rows: number
    /** The picture's own pixel size, for mapping the box onto it. */
    natural: { w: number; h: number }
    /** The darkest and lightest colour in each cell, row-major. A cell with
     *  no opaque pixels is an empty list. */
    grounds: string[][]
    /**
     * The commonest colours in each cell, row-major: each a bin of nearby
     * colours (`key`), its mean colour and how many pixels fell in it.
     *
     * The ground under a run of words is what those words MOSTLY stand on -
     * the modal colour of their box, which is the rule the file-side checker
     * applies. A textured picture's percentiles are not that: on a navy band
     * with a grain, a quarter of the pixels under a name are lighter flecks,
     * and a ground taken at the three-quarter mark measured 3.9:1 where the
     * file measured 5.68:1 against the flat navy the words actually sit on.
     */
    modes?: PictureMode[][]
  }
  /** `object-fit`, or `background-size`: how the picture is fitted into the
   *  box it paints into. */
  fit?: string
  /** `object-position`, or `background-position`. */
  position?: string
}

/** One of a picture cell's commonest colours. */
export interface PictureMode {
  key: number
  hex: string
  n: number
}

export interface NodeSnapshot {
  tag: string
  classes: string[]
  ariaHidden: boolean
  /** `data-deco="1"`: text the exporter draws as OUTLINES. It carries no
   *  text span in the file, so no file-side checker can see it - and a
   *  reader reads it all the same. */
  deco: boolean
  /** This element's own words, its child elements' words excluded. */
  text: string
  box: Box
  style: StyleSnapshot
  /** The list marker this element draws, when it draws one. */
  marker?: StyleSnapshot
  before?: StyleSnapshot
  after?: StyleSnapshot
  image?: ImageSnapshot
  children: NodeSnapshot[]
}

/** The root of a snapshot: the artboard, plus the settings it resolved. */
export interface ArtboardSnapshot {
  root: NodeSnapshot
  /** Every `--rm-*` custom property resolved on the artboard root, which is
   *  where a painted colour is traced back to the setting that made it. */
  vars: Record<string, string>
  /** The design's id, from the template class, when there is one. */
  template?: string
}

export type ProbeKind = 'text' | 'marker' | 'decorative' | 'pseudo'

/**
 * Who chose the colour.
 *
 *   author   the normal case. A colour the person set - the body ink, the
 *            muted ink, a band's ink, one of the five element colours, a
 *            sidebar. Reported, and offered a colour that would pass. Never
 *            changed: a builder that quietly moved these would be deciding
 *            what somebody's resume looks like.
 *   derived  a colour the PRODUCT computes so that it reads (the accent as
 *            ink, the ink on a band, on a chip, on the strip at the foot).
 *            One of these failing is not a choice to report to the author -
 *            it is a defect in the derivation, and the finding says so.
 */
export type FindingOrigin = 'author' | 'derived'

/** A setting, named the way the Design panel and the section gear name it. */
export interface SettingRef {
  /** Where the control lives: 'Accent color', 'Element colors', 'Section'. */
  group: string
  /** The control's own label: 'Body text', 'Sidebar text', 'Rings'. */
  label: string
  /** The metadata field behind it, for a caller that wants to act. */
  path?: string
  /** The custom property the page painted it through, when there was one. */
  cssVar?: string
  /** The section key, for a per-section style. */
  section?: string
}

/**
 * What the page did to a setting's value on the way to the ink, and what
 * that ink stands on.
 *
 * A setting is rarely painted as it stands: a separator is drawn at 45% of
 * the muted colour, a date in a band at 85% of the band's ink, a sub-line as
 * a mix of two settings. The trace is what makes a suggestion true - every
 * candidate colour is painted through it before it is measured - and it is
 * also what lets a report say WHY a pair cannot be fixed from the setting.
 */
export interface PaintTrace {
  /** The setting's own value, as it is stored. Absent when the ink could not
   *  be traced to any setting on the artboard. */
  value?: string
  /** How much of that value survives into the ink: 1 painted as it stands,
   *  0.45 where a rule mixes it to 45% of itself. */
  amount: number
  /** The alpha the ink is painted at. */
  alpha: number
  /** The colour the rest of a mix came from, when there is one. */
  partner?: string
  /** Every ground this run of words stands on - not only the worst of them. */
  grounds: GroundTrace[]
}

/** One of the colours a run of words stands on. */
export interface GroundTrace {
  color: string
  /**
   * Set when the ground is itself a wash of the SAME setting: a card is 4%
   * of the body ink over the page, a dark design's chip is 6% of it. Darken
   * the setting and the ground moves with it, so a colour solved against the
   * ground AS IT STANDS falls short the moment the page repaints - which is
   * how twenty-two findings survived their own fix.
   *
   * `amount` is how much of the setting is in the ground and `partner` is
   * what the rest of it is, whether the page painted that as an alpha over
   * the colour behind or as a mix with it: the two are the same arithmetic.
   */
  tint?: { amount: number; partner: string }
}

export interface ContrastFinding {
  /** Stable across keystrokes for the same cause, so a list does not jump. */
  id: string
  kind: ProbeKind
  /** A short sample of the words, so the author can find them. */
  sample: string
  /** A readable path down to the element. */
  where: string
  /** The ink ACTUALLY painted - its own alpha resolved against the ground. */
  foreground: string
  /** The ground ACTUALLY behind it - every layer composited, the real
   *  stretch of a fade under these words, the real pixels of a picture. */
  background: string
  groundKind: 'flat' | 'gradient' | 'image' | 'unknown'
  /** The ink's own alpha before it was resolved (1 when it was opaque). */
  alpha: number
  pt: number
  weight: number
  large: boolean
  required: number
  measured: number
  origin: FindingOrigin
  /** The setting that produced the INK. */
  setting: SettingRef
  /** The setting that produced the GROUND. */
  ground: SettingRef
  /** Other settings resolving to the same colour, when the page cannot say
   *  which of them painted this word. */
  alsoMatches?: SettingRef[]
  /** True when the setting named is not certain: two controls could answer
   *  for this ink, the ink is a mix of two of them, the design paints its
   *  own colour where an element colour nobody has set would override it,
   *  or nothing on the artboard resolves to it at all and the role has had
   *  to guess. A guess carries no suggestion - a colour written into a
   *  control that did not paint the words moves nothing - and `noFix` says
   *  so instead. */
  uncertain?: boolean
  /** How the page turned the setting's value into this ink, and everything
   *  the ink stands on here. A colour solved for the painted ink and written
   *  into a setting that is painted at 45% of itself changes nothing, so
   *  this is what a suggestion has to be solved through. */
  paint: PaintTrace
  /**
   * The value to write into the SETTING so that this pair reads - solved
   * through the transform above, and against every ground the setting's ink
   * lands on anywhere in the document - the words that fail, and the words
   * that read today and must go on reading - so applying it finishes the
   * job and breaks nothing. It is only ever offered when it measures at or
   * above `required` on every one of those grounds.
   * `measured` is what these words then measure at their worst; `fixes` is
   * how many findings the one change clears.
   *
   * Absent where nothing can be offered: a ground this checker could not
   * read, a derived pair, or a setting the page caps (then `noFix` says so).
   */
  suggestion?: { color: string; measured: number; fixes: number }
  /** Set when no value of the setting can make the pair read: why, and the
   *  best ratio any value reaches. Offering a colour anyway would send the
   *  author round a loop. */
  noFix?: { reason: string; best: number }
  /** Set only on a derived pair: what has gone wrong, in words. */
  bug?: string
}

/** Something on the page whose ground could not be read at all. Reported
 *  rather than passed over: a checker that silently skips what it cannot
 *  measure is a checker that reports zero failures on a page full of them. */
export interface Unmeasured {
  where: string
  sample: string
  reason: string
}

export interface ContrastReport {
  /** The page's own paper, composited onto white. */
  paper: string
  /** How many runs of words were measured. */
  checked: number
  findings: ContrastFinding[]
  unmeasured: Unmeasured[]
  template?: string
}
