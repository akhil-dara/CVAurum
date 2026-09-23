/**
 * Header composition options + their miniature visual mocks — shared by the
 * Design panel picker and the on-canvas header gear, so users always SEE what
 * each layout looks like before picking it.
 */

export const HEADER_STYLES: { label: string; value: string }[] = [
  { label: 'Auto', value: '' },
  { label: 'Classic', value: 'standard' },
  { label: 'Centered', value: 'centered' },
  { label: 'Split', value: 'split' },
  { label: 'Banner', value: 'banner' },
  { label: 'Compact', value: 'compact' },
  { label: 'Display', value: 'display' },
  { label: 'Block', value: 'block' },
  { label: 'Band', value: 'band' },
  { label: 'Stepped', value: 'stepped' },
]

/**
 * The art a header can carry behind its words (theme.artBand). Four abstract
 * bands and the way back to a plain header, offered wherever the header is
 * composed - the canvas gear and the Design panel both draw this list, so a
 * phone reaches every one of them.
 */
export const ART_BANDS: { label: string; value: string }[] = [
  { label: 'None', value: 'none' },
  { label: 'Navy gold', value: 'navy-gold' },
  { label: 'Terracotta', value: 'terracotta' },
  { label: 'Cobalt', value: 'cobalt' },
  { label: 'Emerald', value: 'emerald' },
]

/** Where a band's image lives (public/art/bands). */
export const artBandSrc = (band: string) => `/art/bands/${band}.webp`

/**
 * The darkest and the lightest ground each band can put under a word. The
 * wash a header lays over its art is derived from these: it has to be strong
 * enough that the words still read over EITHER extreme, so a near-black fold
 * and a gold vein are both accounted for (elementColors.ts veilAlpha).
 *
 * MEASURED off the images, not read off the palette note beside them. Three
 * of the four were written down by eye and three of the four were wrong at
 * the light end - navy-gold said #d9a441, luminance 0.44, where the picture
 * reaches 0.81 - so the wash derived from them was too weak and a sweep of
 * every style choice caught white words at 4.42-4.49:1 over the bands that
 * ship. The ground under a word is a local average, not a pixel: the contrast
 * gate takes the modal colour in a glyph's box at 200 dpi, so these are the
 * extremes of the image averaged in 8px blocks - about half a glyph's box, so
 * the answer stays on the safe side of anything a word can sit on.
 * _local/art-band-extremes.py prints exactly these lines; a new band belongs
 * here the day its image does, from that script and not from the eye.
 */
export const ART_BAND_GROUNDS: Record<string, string[]> = {
  // midnight navy, and the gold veining that runs through it
  'navy-gold': ['#01010e', '#f7e8bc'],
  // copper contour lines on a warm cream ground
  terracotta: ['#ce8d63', '#fefff0'],
  // ink black and chalk white blocks, the widest range of the four
  cobalt: ['#070706', '#f4f1ed'],
  // deep emerald folds on near-black
  emerald: ['#000400', '#065514'],
}

/**
 * Designs that draw an art band as a STRIP across the top of the page and
 * leave the header's words on the page below it, with no wash between
 * (templates.css .tpl-folio-noir .rm-art-band / .rm-art-veil). Under a
 * coloured header style their words stand on the page, not on an accent
 * wash, so the header's ink is derived against the page. Derived against the
 * wash those designs never paint, the name came out #424242 on the #0f1117
 * page, 1.88:1. Change one and change the other.
 */
export const ART_STRIP_TEMPLATES = new Set(['folio-noir'])

/**
 * A template that paints its OWN header ground restates its stops here, as a
 * mix of the accent with a named colour - exactly the color-mix the
 * stylesheet draws - so the ink the header's words take is derived against
 * the ground the header ACTUALLY paints rather than the raw accent.
 *
 * Two designs darken their banner from the accent until white reads on it
 * (templates.css .tpl-creative, .tpl-spotlight). An ink derived against the
 * raw accent is derived against a ground neither of them ever draws: on the
 * lighter of the two it flipped to a near-black that then measured 4.2:1 on
 * the stop the header does draw. Change one of these and change the other.
 */
export const HEADER_GROUNDS: Record<string, { with: string; amount: number }[]> = {
  // the accent with four hundredths of black, fading into a darkened cyan
  creative: [
    { with: '#000000', amount: 0.96 },
    { with: '#168b9d', amount: 0.55 },
  ],
  // the accent itself, fading into a pink mixed halfway out of it
  spotlight: [
    { with: '#ec4899', amount: 1 },
    { with: '#ec4899', amount: 0.55 },
  ],
}

/**
 * And the same for a STEPPED header whose treads a template prints outright.
 *
 * The renderer grades the second and third treads out of the accent
 * (Artboard.tsx STEP_2_LIGHTEN / STEP_3_LIGHTEN) and derives each tread's ink
 * against the shade it made. A template that prints its own two shades
 * instead leaves that derivation talking about a ground the header never
 * draws: one design's treads are two fixed greens, and an ink derived against
 * a LIGHTENED accent - which on a pale accent is nearly white, and on a dark
 * one nearly black - landed on dark green at 1.98:1. Restated here, the
 * shades the renderer writes and the shades the stylesheet draws are the same
 * two colours, and every ink that stands on them is derived against them.
 *
 * Change one of these and change the matching --rm-step-2 / --rm-step-3 in
 * templates.css.
 */
export const STEP_GROUNDS: Record<string, { step2: string; step3: string }> = {
  // the two greens .tpl-terrace prints on its stepped header
  terrace: { step2: '#1c5a44', step3: '#2a7a5c' },
}

/** The swatch of a band: the art itself, so the choice is what it shows. */
export function ArtMini({ kind }: { kind: string }) {
  if (!kind || kind === 'none')
    return <span className="h-full w-full rounded-[3px] border border-dashed border-muted-foreground/60" />
  return (
    <span
      className="h-full w-full rounded-[3px] bg-cover bg-center"
      style={{ backgroundImage: `url(${artBandSrc(kind)})` }}
    />
  )
}

/**
 * The row of band swatches. One component, drawn by the canvas header gear
 * and by the Design panel alike, so the choice a phone reaches is the same
 * choice the canvas offers - there is no editable canvas on a phone.
 */
export function ArtBandRow({ value, onPick }: { value: string; onPick: (band: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Art behind the header">
      {ART_BANDS.map((a) => {
        const on = (value || 'none') === a.value
        return (
          <button
            key={a.value}
            type="button"
            role="radio"
            aria-checked={on}
            title={a.label}
            onClick={() => onPick(a.value)}
            className={`flex w-[64px] flex-col items-center gap-1 rounded-lg border p-1.5 transition ${on ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-border bg-surface hover:border-primary/50'}`}
          >
            <span className="flex h-8 w-full items-center justify-center overflow-hidden rounded-[3px] border border-border/70 bg-white p-1">
              <ArtMini kind={a.value} />
            </span>
            <span className={`text-[9px] font-medium leading-none ${on ? 'text-primary' : 'text-muted-foreground'}`}>
              {a.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** Tiny visual mock of each header composition. */
export function HeaderMini({ kind }: { kind: string }) {
  const bar = 'rounded-[1px] bg-slate-600'
  const line = 'rounded-[1px] bg-slate-300'
  switch (kind) {
    case 'standard':
      return (
        <span className="flex w-full flex-col gap-[3px]">
          <span className={`h-[4px] w-1/2 ${bar}`} />
          <span className={`h-[2px] w-2/3 ${line}`} />
          <span className={`h-[2px] w-full ${line}`} />
        </span>
      )
    case 'centered':
      return (
        <span className="flex w-full flex-col items-center gap-[3px]">
          <span className={`h-[4px] w-1/2 ${bar}`} />
          <span className={`h-[2px] w-2/3 ${line}`} />
          <span className={`h-[2px] w-4/5 ${line}`} />
        </span>
      )
    case 'split':
      return (
        <span className="flex w-full items-start justify-between gap-1">
          <span className="flex w-1/2 flex-col gap-[3px]">
            <span className={`h-[4px] w-full ${bar}`} />
            <span className={`h-[2px] w-3/4 ${line}`} />
          </span>
          <span className="flex w-1/3 flex-col items-end gap-[2px]">
            <span className={`h-[2px] w-full ${line}`} />
            <span className={`h-[2px] w-4/5 ${line}`} />
            <span className={`h-[2px] w-full ${line}`} />
          </span>
        </span>
      )
    case 'banner':
      return (
        <span className="flex w-full flex-col gap-[3px]">
          <span className="flex w-full flex-col gap-[2px] rounded-[2px] bg-primary p-[3px]">
            <span className="h-[3px] w-1/2 rounded-[1px] bg-white/90" />
            <span className="h-[2px] w-2/3 rounded-[1px] bg-white/60" />
          </span>
          <span className={`h-[2px] w-full ${line}`} />
        </span>
      )
    case 'compact':
      return (
        <span className="flex w-full items-center gap-[4px]">
          <span className={`h-[4px] w-1/3 ${bar}`} />
          <span className={`h-[2px] flex-1 ${line}`} />
        </span>
      )
    // The three Signature compositions (2026-09-06): a display masthead
    // with its dateline ruled above and below, a colour block holding a
    // giant name, and a gradient band with the stats tiles under it.
    case 'display':
      return (
        <span className="flex w-full flex-col items-center gap-[2px]">
          <span className={`h-[6px] w-3/4 ${bar}`} />
          <span className={`h-[2px] w-1/3 ${line}`} />
          <span className="flex w-full justify-center border-b border-t-2 border-slate-600 py-[2px]">
            <span className={`h-[2px] w-2/3 ${line}`} />
          </span>
        </span>
      )
    case 'block':
      return (
        <span className="flex w-full flex-col gap-[2px] rounded-[2px] bg-primary p-[3px]">
          <span className="h-[7px] w-full rounded-[1px] bg-white/90" />
          <span className="flex w-full flex-col items-end gap-[2px]">
            <span className="h-[2px] w-1/2 rounded-[1px] bg-white/60" />
            <span className="h-[2px] w-2/5 rounded-[1px] bg-white/60" />
          </span>
        </span>
      )
    case 'band':
      return (
        <span className="flex w-full flex-col gap-[2px]">
          <span className="flex w-full flex-col gap-[2px] rounded-[2px] bg-gradient-to-r from-primary to-primary/50 p-[3px]">
            <span className="h-[3px] w-1/2 rounded-[1px] bg-white/90" />
            <span className="h-[2px] w-1/3 rounded-[1px] bg-white/60" />
          </span>
          <span className="flex w-full gap-[2px]">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="h-[5px] flex-1 rounded-[1px] border border-slate-300" />
            ))}
          </span>
        </span>
      )
    // Three graded shades of the accent, one line of the header in each.
    case 'stepped':
      return (
        <span className="flex w-full flex-col overflow-hidden rounded-[2px]">
          <span className="flex bg-primary px-[3px] py-[2px]">
            <span className="h-[4px] w-1/2 rounded-[1px] bg-white/90" />
          </span>
          <span className="flex bg-primary/70 px-[3px] py-[2px]">
            <span className="h-[2px] w-1/3 rounded-[1px] bg-white/80" />
          </span>
          <span className="flex bg-primary/45 px-[3px] py-[2px]">
            <span className="h-[2px] w-3/4 rounded-[1px] bg-white/80" />
          </span>
        </span>
      )
    default:
      return <span className="h-[10px] w-6 rounded-[3px] border border-dashed border-muted-foreground/60" />
  }
}
