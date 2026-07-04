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
]

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
    default:
      return <span className="h-[10px] w-6 rounded-[3px] border border-dashed border-muted-foreground/60" />
  }
}
