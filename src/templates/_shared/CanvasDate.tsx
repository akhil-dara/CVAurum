import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { ResumeContent } from '@/types/document'
import { formatDate, formatDateRange, isSingleDate } from '@/lib/utils'
import type { DateRangeOptions } from '@/lib/utils'
import type { EditFn } from './Editable'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const NOW_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 75 }, (_, i) => NOW_YEAR + 2 - i)

function parseYM(v: string): { y: string; m: string } {
  const match = (v || '').trim().match(/^(\d{4})(?:-(\d{1,2}))?/)
  if (!match) return { y: '', m: '' }
  return { y: match[1], m: match[2] ? String(parseInt(match[2], 10)) : '' }
}
const isPresent = (v: string) => /^present$/i.test((v || '').trim())

/** Sortable month index from a "YYYY" / "YYYY-MM" string (null if no year). */
function ymValue(v: string): number | null {
  const { y, m } = parseYM(v)
  if (!y) return null
  return parseInt(y, 10) * 12 + (m ? parseInt(m, 10) - 1 : 0)
}

/**
 * A fresh, distinct END value to land in when leaving Present mode (the user
 * unticks "Present"). Must never equal `start` — end === start is the
 * definition of single-date mode (isSingleDate, in lib/utils), and reusing
 * `start` as-is would silently re-collapse the range and hide the END fields
 * the user just asked to edit, trapping them right back where they started.
 *
 * Granularity follows `start`: a "YYYY-MM" start produces a "YYYY-MM" end
 * (start advanced by one month, or the current year-month, whichever is
 * later); a year-only "YYYY" start produces a year-only end (start + 1 year,
 * or the current year, whichever is later — start + 1 year is always > start,
 * so that half of the comparison only matters for picking a "nicer" number
 * when start is far in the past). An empty start has no granularity to
 * match, so it falls back to the current year-month.
 */
export function nextRangeEnd(start: string, now: Date = new Date()): string {
  const nowY = now.getFullYear()
  const nowM = now.getMonth() + 1
  const nowYM = `${nowY}-${String(nowM).padStart(2, '0')}`

  const { y, m } = parseYM(start)
  if (!y) return nowYM

  if (m) {
    const startVal = parseInt(y, 10) * 12 + (parseInt(m, 10) - 1)
    const nowVal = nowY * 12 + (nowM - 1)
    const chosen = Math.max(startVal + 1, nowVal)
    const cy = Math.floor(chosen / 12)
    const cm = (chosen % 12) + 1
    return `${cy}-${String(cm).padStart(2, '0')}`
  }

  return String(Math.max(parseInt(y, 10) + 1, nowY))
}

/** Two dropdowns (month + year) that read/write a "YYYY-MM" / "YYYY" string. */
function MonthYear({ value, onChange, present }: { value: string; onChange: (v: string) => void; present?: boolean }) {
  const { y, m } = parseYM(value)
  const set = (year: string, month: string) => {
    if (!year) return onChange('')
    onChange(month ? `${year}-${month.padStart(2, '0')}` : year)
  }
  return (
    <div className="flex gap-1.5">
      <select className="h-8 flex-1 rounded-md border border-input bg-surface px-1.5 text-sm disabled:opacity-50" value={present ? '' : m} disabled={present} onChange={(e) => set(y, e.target.value)}>
        <option value="">Month</option>
        {MONTHS.map((name, i) => (
          <option key={name} value={String(i + 1)}>
            {name}
          </option>
        ))}
      </select>
      <select className="h-8 flex-1 rounded-md border border-input bg-surface px-1.5 text-sm disabled:opacity-50" value={present ? '' : y} disabled={present} onChange={(e) => set(e.target.value, m)}>
        <option value="">Year</option>
        {YEARS.map((yy) => (
          <option key={yy} value={String(yy)}>
            {yy}
          </option>
        ))}
      </select>
    </div>
  )
}

/**
 * Click-to-edit date on the resume canvas. Shows the formatted date (or a hint)
 * and opens a month/year picker popover — so dates are editable right where you
 * work, not just in the form panel.
 */
export function CanvasDate({
  edit,
  range,
  start,
  end,
  applyStart,
  applyEnd,
  dateOpts,
}: {
  edit: EditFn
  range?: boolean
  start: string
  end?: string
  applyStart: (c: ResumeContent, v: string) => void
  applyEnd?: (c: ResumeContent, v: string) => void
  /** How the range reads here - the section's time span, when it asked for
   *  one - so the label while editing is the text the print render sets. */
  dateOpts?: DateRangeOptions
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const present = !!range && !(end || '').trim()
  // A single date (one year / one month) is stored as end === start, so it
  // renders once everywhere and stays valid JSON Resume.
  const single = !!range && isSingleDate(start, end)
  const endBeforeStart = (() => {
    if (!range || present || single) return false
    const a = ymValue(start)
    const b = ymValue(end || '')
    return a != null && b != null && b < a
  })()

  // A range with NO dates at all must invite ("Add dates"), not claim "Present"
  // (formatDateRange treats an empty end as Present, which is wrong when the
  // start is empty too — that's a brand-new, untouched entry).
  const label = range ? (start.trim() || (end || '').trim() ? formatDateRange(start, end, dateOpts) : 'Add dates') : formatDate(start) || 'Add date'

  const openAt = (e: React.MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setPos({ top: r.bottom + 6, left: Math.max(8, Math.min(r.left, window.innerWidth - 248)) })
    setOpen(true)
  }

  return (
    <>
      <button type="button" className="rm-date-edit no-print" contentEditable={false} onMouseDown={(e) => e.preventDefault()} onClick={openAt} title="Edit date">
        {label}
      </button>
      {open &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
            <div className="fixed z-[61] w-60 rounded-xl border border-border bg-surface p-3 text-foreground shadow-float" style={{ top: pos.top, left: pos.left }}>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {range ? (single ? 'Date' : 'Start') : 'Date'}
              </div>
              <MonthYear
                value={start}
                onChange={(v) =>
                  edit((c) => {
                    applyStart(c, v)
                    // keep a single-date entry collapsed as the start moves
                    if (single && applyEnd) applyEnd(c, v)
                  })
                }
              />
              {range && applyEnd && (
                <>
                  {/* One-off entries (a single year) — issue #7. Stored as
                      end === start so every renderer shows just one date. */}
                  <label className="mt-2.5 flex w-fit cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 accent-primary"
                      checked={single}
                      onChange={(e) => edit((c) => applyEnd(c, e.target.checked ? start || `${NOW_YEAR}` : ''))}
                    />
                    Single date (no range)
                  </label>
                  {!single && (
                    <>
                      <div className="mb-1 mt-3 flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">End</span>
                        <label className="flex cursor-pointer items-center gap-1 text-xs text-muted-foreground">
                          <input type="checkbox" className="h-3.5 w-3.5 accent-primary" checked={present} onChange={(e) => edit((c) => applyEnd(c, e.target.checked ? '' : nextRangeEnd(start)))} />
                          Present
                        </label>
                      </div>
                      <MonthYear value={end || ''} present={present} onChange={(v) => edit((c) => applyEnd(c, v))} />
                      {endBeforeStart && (
                        <p className="mt-1.5 text-[11px] font-medium text-danger">End date is before the start date.</p>
                      )}
                    </>
                  )}
                </>
              )}
              <div className="mt-3 flex justify-end">
                <button className="btn-primary btn-sm" onClick={() => setOpen(false)}>
                  Done
                </button>
              </div>
            </div>
          </>,
          document.body,
        )}
    </>
  )
}
