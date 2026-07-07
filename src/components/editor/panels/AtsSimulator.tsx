/**
 * Per-ATS parse simulator — the marquee panel. Shows how five real applicant-
 * tracking systems (Workday, Greenhouse, Lever, Taleo, iCIMS) each read the
 * résumé, with a per-system parse score, the profile it would extract, and the
 * specific structural risks. Fully on-device and deterministic.
 */
import { useMemo, useState } from 'react'
import { ScanSearch, Check, AlertTriangle, XCircle, CircleCheck, Sparkles } from 'lucide-react'
import type { ResumeDocument } from '@/types/document'
import { simulateAts, worstAtsScore, type Severity } from '@/lib/atsSimulate'

const VERDICT_RING: Record<string, string> = {
  clean: 'hsl(var(--success))',
  minor: 'hsl(var(--warning))',
  risk: 'hsl(var(--danger))',
}
const SEV_ICON = { ok: CircleCheck, minor: AlertTriangle, risk: XCircle }
const SEV_COLOR: Record<Severity, string> = { ok: 'text-success', minor: 'text-warning', risk: 'text-danger' }

function Field({ ok, warn, label }: { ok: boolean; warn?: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] ${
        !ok ? 'bg-danger/10 text-danger' : warn ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
      }`}
    >
      {ok ? <Check className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {label}
    </span>
  )
}

export function AtsSimulator({ doc }: { doc: ResumeDocument }) {
  const reports = useMemo(() => simulateAts(doc), [doc])
  const worst = worstAtsScore(reports)
  // Default to the weakest system — it's the one that gates you.
  const worstId = useMemo(() => reports.reduce((a, b) => (b.score < a.score ? b : a), reports[0]).id, [reports])
  const [sel, setSel] = useState(worstId)
  const active = reports.find((r) => r.id === sel) ?? reports[0]

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ScanSearch className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">How 5 systems parse this</h3>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          <Sparkles className="h-3 w-3" /> on-device
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        A deterministic simulation of how major ATS platforms read your résumé. The weakest one gates you — it currently scores{' '}
        <span className="font-semibold" style={{ color: worst >= 85 ? VERDICT_RING.clean : worst >= 65 ? VERDICT_RING.minor : VERDICT_RING.risk }}>{worst}</span>.
      </p>

      {/* system selector */}
      <div className="grid grid-cols-5 gap-1.5">
        {reports.map((r) => {
          const on = r.id === sel
          return (
            <button
              key={r.id}
              onClick={() => setSel(r.id)}
              className={`flex flex-col items-center gap-1 rounded-lg border px-1 py-2 transition ${on ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
              title={`${r.name} — parse score ${r.score}`}
            >
              <span className="text-[11px] font-semibold leading-none">{r.name}</span>
              <span className="text-sm font-bold tabular-nums" style={{ color: VERDICT_RING[r.verdict] }}>{r.score}</span>
            </button>
          )
        })}
      </div>

      {/* active system detail */}
      <div className="card space-y-3 p-3.5">
        <p className="text-xs text-muted-foreground">{active.blurb}</p>

        {/* extracted profile */}
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Profile it extracts</p>
          <div className="flex flex-wrap gap-1">
            <Field ok={active.extracted.name} label="Name" />
            <Field ok={active.extracted.title} label="Title" />
            <Field ok={active.extracted.email} label="Email" />
            <Field ok={active.extracted.phone} label="Phone" />
            <Field ok={active.extracted.location} label="Location" />
            <Field ok={active.extracted.roles > 0} warn={active.extracted.rolesScrambled} label={`${active.extracted.roles} role${active.extracted.roles === 1 ? '' : 's'}${active.extracted.rolesScrambled ? ' (order risk)' : ''}`} />
            <Field ok={active.extracted.skills > 0} warn={active.extracted.skillsLost > 0} label={`${active.extracted.skills} skill${active.extracted.skills === 1 ? '' : 's'}${active.extracted.skillsLost ? ` (${active.extracted.skillsLost} lost)` : ''}`} />
          </div>
        </div>

        {/* findings */}
        <div className="space-y-1.5">
          {active.findings.map((f, i) => {
            const Icon = SEV_ICON[f.severity]
            return (
              <div key={i} className="flex gap-2">
                <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${SEV_COLOR[f.severity]}`} />
                <div className="min-w-0">
                  <p className="text-xs font-medium">{f.title}</p>
                  <p className="text-[11px] leading-snug text-muted-foreground">{f.detail}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <p className="text-[10px] leading-snug text-muted-foreground">
        Honest approximations for guidance — not a claim about any vendor's current internals. Verify the extracted text in “What an ATS sees”.
      </p>
    </div>
  )
}
