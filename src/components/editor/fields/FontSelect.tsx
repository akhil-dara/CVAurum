import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Check, Search } from 'lucide-react'
import { FONTS, FONTS_BY_CATEGORY, ensureFont, fontStack, type FontCategory } from '@/data/fonts'
import { cn } from '@/lib/utils'

const CATEGORY_LABELS: Record<FontCategory, string> = {
  sans: 'Sans-serif',
  serif: 'Serif',
  mono: 'Monospace',
  display: 'Display',
  handwriting: 'Handwriting',
}
const ORDER: FontCategory[] = ['sans', 'serif', 'display', 'mono', 'handwriting']

export function FontSelect({
  label,
  value,
  onChange,
  allowInherit,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  allowInherit?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')

  // Preload visible fonts so the previews render in-face.
  useEffect(() => {
    if (open) FONTS.forEach((f) => ensureFont(f.name))
  }, [open])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return ORDER.map((cat) => ({
      cat,
      fonts: FONTS_BY_CATEGORY[cat].filter((f) => !needle || f.name.toLowerCase().includes(needle)),
    })).filter((g) => g.fonts.length)
  }, [q])

  return (
    <div className="relative">
      <label className="label">{label}</label>
      <button type="button" className="input flex items-center justify-between" onClick={() => setOpen((o) => !o)}>
        <span style={{ fontFamily: value ? fontStack(value) : undefined }} className="truncate">
          {value || (allowInherit ? 'Same as body' : 'Select font')}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="card absolute z-20 mt-1 max-h-80 w-full overflow-hidden p-0 shadow-float">
            <div className="flex items-center gap-2 border-b border-border px-2.5 py-1.5">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search fonts…"
                className="flex-1 bg-transparent py-1 text-sm outline-none"
              />
            </div>
            <div className="max-h-64 overflow-auto p-1">
              {allowInherit && (
                <Option name="" label="Same as body" value={value} onPick={onChange} setOpen={setOpen} />
              )}
              {filtered.map((g) => (
                <div key={g.cat}>
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {CATEGORY_LABELS[g.cat]}
                  </div>
                  {g.fonts.map((f) => (
                    <Option key={f.name} name={f.name} value={value} onPick={onChange} setOpen={setOpen} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Option({
  name,
  label,
  value,
  onPick,
  setOpen,
}: {
  name: string
  label?: string
  value: string
  onPick: (v: string) => void
  setOpen: (v: boolean) => void
}) {
  const active = value === name
  return (
    <button
      type="button"
      className={cn('flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-muted', active && 'bg-primary/10')}
      style={{ fontFamily: name ? fontStack(name) : undefined }}
      onClick={() => {
        onPick(name)
        setOpen(false)
      }}
    >
      <span className="truncate text-sm">{label ?? name}</span>
      {active && <Check className="h-4 w-4 text-primary" />}
    </button>
  )
}
