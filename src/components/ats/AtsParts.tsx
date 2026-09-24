import { useState, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { ATS_CATEGORY_LABELS, type AtsCategory, type AtsCheck, type AtsReport, type CheckStatus } from '@/lib/ats'
import { cn } from '@/lib/utils'

/**
 * The pieces of an ATS report that look the same wherever a report is read:
 * in the editor's panel, about the résumé on the canvas, and on the checker
 * page, about a PDF someone dropped there.
 */

const STATUS_ICON = { pass: CheckCircle2, warn: AlertTriangle, fail: XCircle }
const STATUS_COLOR: Record<CheckStatus, string> = {
  pass: 'text-success',
  warn: 'text-warning',
  fail: 'text-danger',
}
const STATUS_WORD: Record<CheckStatus, string> = { pass: 'Passed', warn: 'Worth fixing', fail: 'Needs fixing' }

export function scoreColor(n: number) {
  if (n >= 80) return 'hsl(var(--success))'
  if (n >= 60) return 'hsl(var(--warning))'
  return 'hsl(var(--danger))'
}

export function Ring({ value, label, size = 92 }: { value: number; label?: string; size?: number }) {
  const r = (size - 10) / 2
  const circ = 2 * Math.PI * r
  const off = circ * (1 - value / 100)
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${label ?? 'Score'}: ${value} out of 100`}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={7} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={scoreColor(value)}
          strokeWidth={7}
          strokeDasharray={circ}
          strokeDashoffset={off}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden>
        <span className="text-xl font-bold tabular-nums" style={{ color: scoreColor(value) }}>
          {value}
        </span>
        {label && <span className="text-[10px] text-muted-foreground">{label}</span>}
      </div>
    </div>
  )
}

/**
 * The checks under the questions they answer, each with its own score.
 * `extra` renders beneath a check that did not pass (the editor's "Show it").
 * `foldPassed` shows only what needs doing and folds each group's passes
 * into one line that opens them: on a report read once, twenty green rows
 * bury the four that matter.
 */
export function CheckGroups({ report, extra, foldPassed = false }: { report: AtsReport; extra?: (c: AtsCheck) => ReactNode; foldPassed?: boolean }) {
  const [open, setOpen] = useState<Record<string, boolean>>({})
  // `analyzeResume` returns the checks worst-first, heaviest-first; filter
  // keeps that order, so each group opens on the row worth fixing first.
  const grouped = (Object.keys(ATS_CATEGORY_LABELS) as AtsCategory[])
    .map((category) => ({ category, checks: report.checks.filter((c) => c.category === category) }))
    .filter((g) => g.checks.length)
  return (
    <div className="space-y-4">
      {grouped.map(({ category, checks }) => {
        const failed = checks.filter((c) => c.status !== 'pass').length
        const catScore = report.categoryScores[category]
        return (
          <section key={category} className="space-y-1.5" aria-label={ATS_CATEGORY_LABELS[category]}>
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{ATS_CATEGORY_LABELS[category]}</h3>
              <span className="flex items-baseline gap-2 text-[11px] tabular-nums text-muted-foreground">
                <span>
                  {checks.length - failed}/{checks.length}
                </span>
                <span className="font-semibold" style={{ color: scoreColor(catScore) }}>
                  {catScore}
                </span>
              </span>
            </div>
            {checks.filter((c) => !foldPassed || open[category] || c.status !== 'pass').map((c) => {
              const Icon = STATUS_ICON[c.status]
              return (
                <div key={c.id} className="flex gap-2.5 rounded-lg border border-border bg-surface p-2.5">
                  <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', STATUS_COLOR[c.status])} aria-label={STATUS_WORD[c.status]} />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium">{c.label}</p>
                    <p className="text-xs leading-snug text-muted-foreground">{c.detail}</p>
                    {c.status !== 'pass' && extra?.(c)}
                  </div>
                </div>
              )
            })}
            {foldPassed && checks.length - failed > 0 ? (
              <button
                type="button"
                className="w-full rounded-lg border border-dashed border-border px-2.5 py-2 text-left text-xs text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
                aria-expanded={!!open[category]}
                onClick={() => setOpen((o) => ({ ...o, [category]: !o[category] }))}
              >
                <CheckCircle2 className="mr-1.5 inline h-3.5 w-3.5 align-[-2px] text-success" aria-hidden />
                {open[category] ? 'Hide the passed checks' : `${checks.length - failed} passed — show them`}
              </button>
            ) : null}
          </section>
        )
      })}
    </div>
  )
}
