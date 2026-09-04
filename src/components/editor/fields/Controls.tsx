import { useState } from 'react'
import { cn } from '@/lib/utils'
import { commitTyped } from '@/lib/designRanges'

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
  // The typed box owns its text while it has focus, and commits nothing until
  // the value is finished: focus leaving, or Enter saying so. Committing per
  // keystroke reflowed the whole document on the "1" of "1.5" and the "2" of
  // "25" - every prefix of the number the author was typing was a document of
  // its own. The slider beside it still applies live: dragging it IS the
  // finished value at every step. (commitTyped clamps and rejects.)
  const [draft, setDraft] = useState<string | null>(null)
  const commit = () => {
    if (draft === null) return
    const v = commitTyped(draft, min, max)
    setDraft(null)
    if (v !== null) onChange(v)
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
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              // Enter commits through the blur handler, so there is one path
              // in and out of the draft however the author finishes.
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

/** A labelled native select for a list too long for a Segmented row. A
 *  stored value the list does not know is shown as its own option rather
 *  than silently snapping to the first one. */
export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  const known = options.some((o) => o.value === value)
  return (
    <div>
      <label className="label">{label}</label>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value as T)} aria-label={label}>
        {!known && <option value={value}>{value}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function ColorField({
  label,
  value,
  fallback,
  onChange,
  onClear,
}: {
  label: string
  value: string | undefined
  /** What the page draws while nothing is set: the swatch shows it and the
   *  box reads Auto. */
  fallback?: string
  onChange: (v: string) => void
  /** Puts the colour back on Auto (unset). The button shows only while a
   *  value is set, so a field that is always set never grows one. */
  onClear?: () => void
}) {
  const shown = value || fallback || ''
  return (
    <div className="flex items-center justify-between gap-2">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="flex items-center gap-1.5">
        {onClear && value ? (
          <button
            type="button"
            onClick={onClear}
            title="Back to Auto"
            className="h-7 rounded border border-input bg-surface px-1.5 text-[11px] text-muted-foreground transition hover:text-foreground"
          >
            Auto
          </button>
        ) : null}
        <input
          value={value ?? ''}
          placeholder={onClear ? 'Auto' : undefined}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} hex`}
          className="h-7 w-20 rounded border border-input bg-surface px-2 text-xs tabular-nums"
        />
        <label className="relative h-7 w-7 overflow-hidden rounded border border-input" style={{ background: shown }}>
          <input
            type="color"
            value={normalizeHex(shown)}
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
