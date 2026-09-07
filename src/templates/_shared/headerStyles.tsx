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
