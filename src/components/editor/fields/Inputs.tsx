import { useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Labeled({ label, hint, children, className }: { label?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      {children}
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  type = 'text',
}: {
  label?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hint?: string
  type?: string
}) {
  return (
    <Labeled label={label} hint={hint}>
      <input className="input" type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </Labeled>
  )
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <Labeled label={label}>
      <textarea className="textarea" rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </Labeled>
  )
}

/** Month-ish date. Accepts "YYYY-MM"/"YYYY"/free text; empty end = Present. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const NOW_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 75 }, (_, i) => NOW_YEAR + 2 - i)

function parseYM(v: string): { y: string; m: string } {
  const match = (v || '').trim().match(/^(\d{4})(?:-(\d{1,2}))?/)
  if (!match) return { y: '', m: '' }
  return { y: match[1], m: match[2] ? String(parseInt(match[2], 10)) : '' }
}
const isPresent = (v: string) => /^present$/i.test((v || '').trim())

/** Month + year picker. Stores "YYYY-MM" (or "YYYY"); end dates can be "Present". */
export function DateField({
  label,
  value,
  onChange,
  allowPresent,
  singleWith,
}: {
  label?: string
  value: string
  onChange: (v: string) => void
  allowPresent?: boolean
  /** When given (the entry's START date), offers a "single date" toggle that
   *  collapses the range by storing end === start (issue #7). */
  singleWith?: string
}) {
  const [pickMode, setPickMode] = useState(false)
  const single = singleWith != null && !!singleWith.trim() && singleWith.trim() === (value || '').trim()
  const present = !!allowPresent && !single && !pickMode && (!value.trim() || isPresent(value))
  const { y, m } = parseYM(value)

  const setYM = (year: string, month: string) => {
    setPickMode(true)
    if (!year) return onChange('')
    onChange(month ? `${year}-${month.padStart(2, '0')}` : year)
  }

  return (
    <Labeled label={label}>
      {/* month/year always get half the field each — the Present checkbox lives
          on its own line so narrow cells can never crush the selects */}
      <div className={`grid grid-cols-2 gap-1.5${single ? ' hidden' : ''}`}>
        <select
          className="input h-9 min-w-0 px-2 disabled:opacity-50"
          value={present ? '' : m}
          disabled={present}
          onChange={(e) => setYM(y, e.target.value)}
          aria-label={`${label ?? 'Date'} month`}
        >
          <option value="">Month</option>
          {MONTHS.map((name, i) => (
            <option key={name} value={String(i + 1)}>
              {name}
            </option>
          ))}
        </select>
        <select
          className="input h-9 min-w-0 px-2 disabled:opacity-50"
          value={present ? '' : y}
          disabled={present}
          onChange={(e) => setYM(e.target.value, m)}
          aria-label={`${label ?? 'Date'} year`}
        >
          <option value="">Year</option>
          {YEARS.map((yy) => (
            <option key={yy} value={String(yy)}>
              {yy}
            </option>
          ))}
        </select>
      </div>
      {singleWith != null && (
        <label className="mt-1.5 flex w-fit cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 accent-primary"
            checked={single}
            onChange={(e) => {
              setPickMode(true)
              // end === start collapses the range to one date everywhere
              onChange(e.target.checked ? singleWith.trim() || String(NOW_YEAR) : '')
            }}
          />
          Single date (no range)
        </label>
      )}
      {allowPresent && !single && (
        <label className="mt-1.5 flex w-fit cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 accent-primary"
            checked={present}
            onChange={(e) => {
              if (e.target.checked) {
                setPickMode(false)
                onChange('') // empty end date renders as "Present" and stays JSON-Resume clean
              } else {
                setPickMode(true)
                onChange('')
              }
            }}
          />
          Currently here (Present)
        </label>
      )}
    </Labeled>
  )
}

/** Chip / tag input bound to a string[] */
export function TagInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label?: string
  value: string[]
  onChange: (v: string[]) => void
  placeholder?: string
}) {
  const [draft, setDraft] = useState('')
  const commit = (raw: string) => {
    const parts = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (!parts.length) return
    const next = [...value]
    for (const p of parts) if (!next.includes(p)) next.push(p)
    onChange(next)
    setDraft('')
  }
  return (
    <Labeled label={label}>
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-surface p-1.5 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40">
        {value.map((t, i) => (
          <span key={`${t}-${i}`} className="chip gap-1 bg-primary/10 text-primary">
            {t}
            {/* Reorder lives in the panel too. The canvas grip is a desktop
                affordance - a phone shows the panel, where until now the order
                could not be changed at all. Buttons rather than drag, exactly
                like entry reordering: reachable by tap and by keyboard. */}
            <button
              type="button"
              className="disabled:opacity-25"
              disabled={i === 0}
              onClick={() => {
                const next = [...value]
                ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
                onChange(next)
              }}
              aria-label={`Move ${t} earlier`}
            >
              <ChevronLeft className="h-3 w-3" />
            </button>
            <button
              type="button"
              className="disabled:opacity-25"
              disabled={i === value.length - 1}
              onClick={() => {
                const next = [...value]
                ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
                onChange(next)
              }}
              aria-label={`Move ${t} later`}
            >
              <ChevronRight className="h-3 w-3" />
            </button>
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label={`Remove ${t}`}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          className="min-w-[80px] flex-1 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-muted-foreground/70"
          value={draft}
          placeholder={value.length ? '' : (placeholder ?? 'Type and press Enter')}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              commit(draft)
            } else if (e.key === 'Backspace' && !draft && value.length) {
              onChange(value.slice(0, -1))
            }
          }}
          onBlur={() => draft && commit(draft)}
        />
      </div>
    </Labeled>
  )
}

export function RatingField({
  label,
  value = 0,
  onChange,
  max = 5,
}: {
  label?: string
  value?: number
  onChange: (v: number) => void
  max?: number
}) {
  return (
    <Labeled label={label}>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: max }).map((_, i) => {
          const filled = i < value
          return (
            <button
              key={i}
              type="button"
              onClick={() => onChange(i + 1 === value ? 0 : i + 1)}
              className={cn('h-4 w-4 rounded-full border transition-colors', filled ? 'border-primary bg-primary' : 'border-input bg-transparent hover:border-primary')}
              aria-label={`Set rating ${i + 1}`}
            />
          )
        })}
        {value ? <span className="ml-1 text-xs text-muted-foreground">{value}/{max}</span> : null}
      </div>
    </Labeled>
  )
}

export function Row({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>
}
