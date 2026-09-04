import { useState } from 'react'
import { cn } from '@/lib/utils'

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
  format,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (v: number) => void
  /** Readout formatter; the typed box shows the bare number and borrows
   *  whatever this appends after the digits as its unit. */
  format?: (v: number) => string
}) {
  // The typed box owns its text while it has focus: a half-typed "1" on the
  // way to 12 must not snap to the minimum mid-keystroke. A value already in
  // range applies as it is typed; anything else is clamped when focus leaves.
  const [draft, setDraft] = useState<string | null>(null)
  const commit = (raw: string, clamp: boolean) => {
    const v = parseFloat(raw)
    if (!Number.isFinite(v)) return
    if (v >= min && v <= max) onChange(v)
    else if (clamp) onChange(Math.min(max, Math.max(min, v)))
  }
  const suffix = unit || (format ? format(value).replace(/^[-+\d.,]+/, '') : '')
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        <span className="flex items-center gap-1 text-xs tabular-nums text-foreground">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={draft ?? String(Number(value.toFixed(4)))}
            onChange={(e) => {
              setDraft(e.target.value)
              commit(e.target.value, false)
            }}
            onBlur={() => {
              if (draft !== null) commit(draft, true)
              setDraft(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
            }}
            aria-label={label}
            className="h-6 w-16 rounded border border-input bg-surface px-1.5 text-right text-xs tabular-nums text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {suffix && <span className="text-muted-foreground">{suffix}</span>}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="range-input w-full"
      />
    </div>
  )
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2">
      <span className="text-sm text-foreground">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn('relative h-5 w-9 shrink-0 rounded-full transition-colors', checked ? 'bg-primary' : 'bg-input')}
      >
        <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', checked ? 'left-[18px]' : 'left-0.5')} />
      </button>
    </label>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  wrap = false,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  /** Let a long option list flow onto a second line instead of clipping
   *  at the panel's edge (a row of seven text buttons lost its last one). */
  wrap?: boolean
}) {
  return (
    <div className={`segmented w-full${wrap ? ' flex-wrap' : ''}`}>
      {options.map((o) => (
        <button
          key={o.value}
          className={wrap ? 'grow basis-[22%]' : 'flex-1'}
          data-active={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-20 rounded border border-input bg-surface px-2 text-xs tabular-nums"
        />
        <label className="relative h-7 w-7 overflow-hidden rounded border border-input" style={{ background: value }}>
          <input
            type="color"
            value={normalizeHex(value)}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label={label}
          />
        </label>
      </div>
    </div>
  )
}

function normalizeHex(v: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v : '#000000'
}

export function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </section>
  )
}
