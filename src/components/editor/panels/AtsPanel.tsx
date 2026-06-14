import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, Target, FileText } from 'lucide-react'
import type { ResumeDocument } from '@/types/document'
import { analyzeResume, type CheckStatus } from '@/lib/ats'
import { useResumeStore } from '@/store/useResumeStore'
import { cn } from '@/lib/utils'

const STATUS_ICON = { pass: CheckCircle2, warn: AlertTriangle, fail: XCircle }
const STATUS_COLOR: Record<CheckStatus, string> = {
  pass: 'text-success',
  warn: 'text-warning',
  fail: 'text-danger',
}

function scoreColor(n: number) {
  if (n >= 80) return 'hsl(var(--success))'
  if (n >= 60) return 'hsl(var(--warning))'
  return 'hsl(var(--danger))'
}

function Ring({ value, label, size = 92 }: { value: number; label?: string; size?: number }) {
  const r = (size - 10) / 2
  const circ = 2 * Math.PI * r
  const off = circ * (1 - value / 100)
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
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
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold tabular-nums" style={{ color: scoreColor(value) }}>
          {value}
        </span>
        {label && <span className="text-[10px] text-muted-foreground">{label}</span>}
      </div>
    </div>
  )
}

export function AtsPanel({ doc }: { doc: ResumeDocument }) {
  const setJd = useResumeStore((s) => s.setJobDescription)
  const [jdLocal, setJdLocal] = useState(doc.jobDescription ?? '')

  // Debounced commit of JD text so the preview/store don't churn per keystroke.
  useEffect(() => {
    const id = setTimeout(() => {
      if (jdLocal !== (doc.jobDescription ?? '')) setJd(jdLocal)
    }, 450)
    return () => clearTimeout(id)
  }, [jdLocal, doc.jobDescription, setJd])

  // Flush any pending JD edit on unmount (tab switch / editor close) so the last
  // keystrokes aren't lost when the 450ms timer is cancelled.
  const jdRef = useRef(jdLocal)
  jdRef.current = jdLocal
  useEffect(
    () => () => {
      const committed = useResumeStore.getState().doc?.jobDescription ?? ''
      if (jdRef.current !== committed) useResumeStore.getState().setJobDescription(jdRef.current)
    },
    []
  )

  const report = useMemo(() => analyzeResume(doc), [doc])

  return (
    <div className="space-y-5">
      {/* score header */}
      <div className="card flex items-center gap-4 p-4">
        <Ring value={report.score} label="ATS score" />
        <div className="flex-1 text-sm">
          <p className="font-medium">
            {report.score >= 80 ? 'Strong — ATS-ready' : report.score >= 60 ? 'Good, a few fixes' : 'Needs work'}
          </p>
          <p className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {report.wordCount} words · ~{report.pages} page{report.pages > 1 ? 's' : ''}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{report.quantifiedCount}/{report.bulletCount} bullets quantified</p>
        </div>
      </div>

      {/* checks */}
      <div className="space-y-1.5">
        {report.checks.map((c) => {
          const Icon = STATUS_ICON[c.status]
          return (
            <div key={c.id} className="flex gap-2.5 rounded-lg border border-border bg-surface p-2.5">
              <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', STATUS_COLOR[c.status])} />
              <div className="min-w-0">
                <p className="text-[13px] font-medium">{c.label}</p>
                <p className="text-xs leading-snug text-muted-foreground">{c.detail}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* JD tailoring */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Tailor to a job</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Paste a job description to see which keywords you’re matching — and which to add (where truthful).
        </p>
        <textarea
          className="textarea min-h-[120px] text-xs"
          placeholder="Paste the job description here…"
          value={jdLocal}
          onChange={(e) => setJdLocal(e.target.value)}
          onBlur={() => { if (jdLocal !== (doc.jobDescription ?? '')) setJd(jdLocal) }}
        />

        {report.jd && report.jd.keywords.length > 0 && (
          <div className="space-y-3">
            <div className="card flex items-center gap-4 p-4">
              <Ring value={report.jd.matchRate} label="JD match" size={80} />
              <div className="text-sm">
                <p className="font-medium">{report.jd.matched.length}/{report.jd.keywords.length} keywords matched</p>
                <p className="mt-1 text-xs text-muted-foreground">Found in your resume vs. extracted from the job post.</p>
              </div>
            </div>

            {report.jd.missing.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Missing keywords</p>
                <div className="flex flex-wrap gap-1.5">
                  {report.jd.missing.map((k) => (
                    <span key={k} className="chip border-warning/40 bg-warning/10 text-[11px] text-warning">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {report.jd.matched.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Matched</p>
                <div className="flex flex-wrap gap-1.5">
                  {report.jd.matched.map((k) => (
                    <span key={k} className="chip border-success/40 bg-success/10 text-[11px] text-success">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
