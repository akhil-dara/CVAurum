/**
 * Semantic JD match (opt-in) — the meaning-level companion to keyword matching.
 * A small sentence-embedding model (MiniLM) checks whether each requirement in
 * the job description is actually EXPRESSED somewhere in the résumé, even when
 * the words differ ("built CI pipelines" ≈ "automated build & deploy").
 *
 * Strictly optional: the ~34 MB engine (self-hosted, never a third-party CDN)
 * downloads only after an explicit click, is cached for offline reuse, and can
 * be switched off anytime. All inference happens in a worker on this device.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Brain, RefreshCw, X, AlertTriangle, CheckCircle2, CircleDashed } from 'lucide-react'
import type { ResumeDocument } from '@/types/document'
import {
  analyzeSemanticMatch,
  isSemanticEnabled,
  setSemanticEnabled,
  onSemanticProgress,
  disposeSemantic,
  type SemanticReport,
  type SemanticItem,
} from '@/lib/semantic'

type Phase = 'off' | 'idle' | 'working' | 'ready' | 'error'

function scoreColor(n: number) {
  if (n >= 75) return 'hsl(var(--success))'
  if (n >= 50) return 'hsl(var(--warning))'
  return 'hsl(var(--danger))'
}

function ItemRow({ it }: { it: SemanticItem }) {
  const icon =
    it.bucket === 'gap' ? (
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" />
    ) : it.bucket === 'partial' ? (
      <CircleDashed className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
    ) : (
      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
    )
  return (
    <div className="flex gap-2 rounded-lg border border-border bg-surface p-2">
      {icon}
      <div className="min-w-0">
        <p className="text-xs leading-snug">{it.jd}</p>
        <p className="mt-0.5 truncate text-[11px] leading-snug text-muted-foreground" title={it.best}>
          closest in your résumé ({Math.round(it.sim * 100)}%): {it.best}
        </p>
      </div>
    </div>
  )
}

export function SemanticMatchCard({ doc, jd }: { doc: ResumeDocument; jd: string }) {
  const [phase, setPhase] = useState<Phase>(() => (isSemanticEnabled() ? 'idle' : 'off'))
  const [progress, setProgress] = useState<{ file?: string; pct?: number } | null>(null)
  const [report, setReport] = useState<SemanticReport | null>(null)
  const [error, setError] = useState('')
  const runId = useRef(0)
  // The résumé at the time of the last run — a "Re-check" refreshes against edits.
  const docRef = useRef(doc)
  docRef.current = doc

  useEffect(() => onSemanticProgress((p) => {
    if (typeof p.progress === 'number' && p.file) setProgress({ file: p.file.split('/').pop(), pct: Math.round(p.progress) })
  }), [])

  const run = useCallback(async () => {
    const my = ++runId.current
    setPhase('working')
    setError('')
    try {
      const r = await analyzeSemanticMatch(docRef.current, jd)
      if (my !== runId.current) return
      setReport(r)
      setPhase(r ? 'ready' : 'idle')
    } catch (e) {
      if (my !== runId.current) return
      setError(e instanceof Error ? e.message : 'Semantic engine failed')
      setPhase('error')
    }
  }, [jd])

  // Auto-run when enabled and the JD changes (debounced). Résumé edits are
  // re-checked on demand — recomputing per keystroke would burn CPU for nothing.
  useEffect(() => {
    if (phase === 'off' || jd.trim().length < 40) return
    const t = setTimeout(run, 700)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jd, phase === 'off'])

  if (jd.trim().length < 40) return null

  if (phase === 'off') {
    return (
      <div className="card space-y-2 p-4">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold">Semantic match <span className="font-normal text-muted-foreground">(optional)</span></h4>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Goes beyond keywords: a small on-device language model checks whether each JD requirement is actually <em>expressed</em> in your résumé — even when the wording differs.
        </p>
        <button className="btn-primary btn-sm w-full" onClick={() => { setSemanticEnabled(true); setPhase('idle') }}>
          Enable — one-time ~34&nbsp;MB download
        </button>
        <p className="text-[11px] leading-snug text-muted-foreground">
          Self-hosted &amp; private: the model is served from this site, runs only in your browser, and works offline after the first load. Turn it off anytime.
        </p>
      </div>
    )
  }

  return (
    <div className="card space-y-2.5 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold">Semantic match</h4>
        </div>
        <div className="flex items-center gap-1">
          <button className="btn-icon h-6 w-6" onClick={run} title="Re-check against your latest edits" aria-label="Re-check semantic match">
            <RefreshCw className={`h-3.5 w-3.5 ${phase === 'working' ? 'animate-spin' : ''}`} />
          </button>
          <button
            className="btn-icon h-6 w-6"
            onClick={() => { setSemanticEnabled(false); disposeSemantic(); setPhase('off'); setReport(null) }}
            title="Turn semantic matching off"
            aria-label="Turn semantic matching off"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {phase === 'working' && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">
            {progress ? `Loading the on-device model — ${progress.file} ${progress.pct}%` : 'Reading your résumé and the JD…'}
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress?.pct ?? 30}%` }} />
          </div>
        </div>
      )}

      {phase === 'error' && (
        <p className="text-xs leading-snug text-danger">{error}</p>
      )}

      {phase === 'ready' && report && (
        <>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold tabular-nums" style={{ color: scoreColor(report.score) }}>{report.score}</span>
            <p className="text-xs leading-snug text-muted-foreground">
              of the JD&apos;s meaning is covered — {report.strong} covered · {report.partial} partial · {report.gaps} gap{report.gaps === 1 ? '' : 's'} across {report.items.length} requirements.
            </p>
          </div>

          {report.items.filter((i) => i.bucket !== 'strong').length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Weakest coverage first — address truthfully, or accept the gap:</p>
              {report.items.filter((i) => i.bucket !== 'strong').slice(0, 8).map((it, i) => (
                <ItemRow key={i} it={it} />
              ))}
            </div>
          )}

          {report.strong > 0 && (
            <details>
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                {report.strong} well-covered requirement{report.strong === 1 ? '' : 's'}
              </summary>
              <div className="mt-1.5 space-y-1.5">
                {report.items.filter((i) => i.bucket === 'strong').map((it, i) => (
                  <ItemRow key={i} it={it} />
                ))}
              </div>
            </details>
          )}

          <p className="text-[11px] leading-snug text-muted-foreground">
            Computed on your device — nothing was uploaded. Meaning-level guidance, not a guarantee of any system&apos;s ranking.
          </p>
        </>
      )}
    </div>
  )
}
