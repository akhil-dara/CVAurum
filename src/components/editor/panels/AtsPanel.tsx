import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, Target, FileText, PenLine, Sparkles, Crosshair } from 'lucide-react'
import type { ResumeDocument } from '@/types/document'
import { isPhoneLayout } from '@/lib/layoutMode'
import { ATS_CATEGORY_LABELS, analyzeResume, type AtsCategory, type AtsCheck, type AtsMeasurement, type CheckStatus } from '@/lib/ats'
import { fitSizesPt } from '@/lib/fitReadout'
import { visibleSectionKeys } from '@/lib/atsScope'
import { sectionHasContent } from '@/lib/sections'
import { analyzeWriting, type WritingSeverity } from '@/lib/writing'
import { AtsSimulator } from './AtsSimulator'
import { ContrastCard } from './ContrastCard'
import { SemanticMatchCard } from './SemanticMatch'
import { useResumeStore } from '@/store/useResumeStore'
import { useEditorStore } from '@/store/useEditorStore'
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

/* ------------------------------------------------------- jump to the fault
 * A check that says "3 bullets use a first-person pronoun" is a note; one that
 * puts the cursor in the offending bullet is a fix. `AtsCheck.where` carries
 * the section key the canvas draws under `data-section`, the entry index
 * inside it, and the bullet index inside that — these turn the three into a
 * DOM node.
 */

/** The VISIBLE canvas. The hidden print tree ResumePreview portals into
 *  <body> to measure the fit carries the same ids, so an unscoped query would
 *  hand back an off-screen node 100,000px to the left and scroll nothing. */
const CANVAS = '.canvas-bg'

/** The id the canvas drew this entry under, or undefined if there isn't one. */
function entryId(doc: ResumeDocument, where: NonNullable<AtsCheck['where']>): string | undefined {
  if (where.entry == null) return undefined
  if (where.section.startsWith('custom-')) {
    const sec = doc.content.custom.find((s) => s.id === where.section.slice('custom-'.length))
    return sec?.items[where.entry]?.id
  }
  const arr = (doc.content as unknown as Record<string, Array<{ id?: string }> | undefined>)[where.section]
  return arr?.[where.entry]?.id
}

/** A short outline that fades, so the eye lands where the scroll did. Inline
 *  styles rather than a class: this is the only thing in the app that needs it,
 *  and it must not depend on a stylesheet loading. */
function flash(el: HTMLElement) {
  const prev = { outline: el.style.outline, offset: el.style.outlineOffset, radius: el.style.borderRadius }
  el.style.outline = '2px solid hsl(var(--primary))'
  el.style.outlineOffset = '3px'
  el.style.borderRadius = el.style.borderRadius || '3px'
  setTimeout(() => {
    el.style.transition = 'outline-color 400ms ease'
    el.style.outlineColor = 'transparent'
    setTimeout(() => {
      el.style.outline = prev.outline
      el.style.outlineOffset = prev.offset
      el.style.borderRadius = prev.radius
      el.style.transition = ''
    }, 450)
  }, 1200)
}

/** Scroll the canvas to what a check is complaining about. False when the
 *  target is not on the page — a hidden section, or an entry the template
 *  does not draw — so the caller can leave the button off. */
function reveal(doc: ResumeDocument, where: NonNullable<AtsCheck['where']>): boolean {
  const canvas = document.querySelector<HTMLElement>(CANVAS)
  if (!canvas) return false
  const section = canvas.querySelector<HTMLElement>(`.rm-section[data-section="${CSS.escape(where.section)}"]`)
  let target: HTMLElement | null = section
  const id = entryId(doc, where)
  if (id) {
    const item = (section ?? canvas).querySelector<HTMLElement>(`[data-item-id="${CSS.escape(id)}"]`)
    if (item) {
      target = item
      // Bullet rows only exist on an editable canvas; on the exact-PDF preview
      // the entry itself is as close as this can get, which is close enough.
      const row = where.bullet == null ? null : item.querySelectorAll<HTMLElement>('.rm-bullet-row')[where.bullet]
      if (row) target = row
    }
  }
  if (!target) return false
  target.scrollIntoView({ block: 'center', behavior: 'smooth' })
  flash(target)
  // Put the caret in it where it is editable, so the fix can start on arrival.
  // preventScroll: the focus must not fight the smooth scroll above.
  target.querySelector<HTMLElement>('.rm-editable')?.focus({ preventScroll: true })
  return true
}

function ShowMe({ doc, where }: { doc: ResumeDocument; where: NonNullable<AtsCheck['where']> }) {
  const [gone, setGone] = useState(false)
  if (gone) return null
  return (
    <button
      type="button"
      className="btn-ghost btn-sm mt-1.5 h-7 gap-1 px-2 text-[11px]"
      onClick={() => {
        // On a phone the panel IS the screen; the canvas behind it is not laid
        // out until it closes, so the scroll has to wait for that frame.
        if (isPhoneLayout()) {
          useEditorStore.getState().setLeftOpen(false)
          setTimeout(() => reveal(doc, where), 140)
          return
        }
        if (!reveal(doc, where)) setGone(true)
      }}
    >
      <Crosshair className="h-3 w-3" />
      {where.bullet != null ? 'Show the bullet' : 'Show it'}
    </button>
  )
}

const WSEV_COLOR: Record<WritingSeverity, string> = {
  strong: 'text-success',
  suggestion: 'text-primary',
  warning: 'text-warning',
}

/** Toggle for the recruiter-skim saliency heat on the canvas. Lives here (not
 *  just the ⌘K palette) so phone users — who have no palette button — find it. */
function SkimCard() {
  const skimView = useEditorStore((s) => s.skimView)
  const setSkimView = useEditorStore((s) => s.setSkimView)
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border bg-surface p-2.5">
      <span className="mt-0.5 h-2 w-9 shrink-0 rounded-full" style={{ background: 'linear-gradient(90deg, rgba(245,158,11,0.35), rgba(220,38,38,0.65))' }} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium">Recruiter skim heat</p>
        <p className="text-xs leading-snug text-muted-foreground">
          See where a ~7-second first skim lands on your page — numbered 1→6 fixations. Deterministic (size · weight · position · structure), fully on-device.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={skimView}
        aria-label="Toggle recruiter skim heat"
        onClick={() => {
          setSkimView(!skimView)
          // phones: the panel covers the canvas — close it so the heat is visible
          if (!skimView && isPhoneLayout()) useEditorStore.getState().setLeftOpen(false)
        }}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${skimView ? 'bg-primary' : 'bg-muted-foreground/30'}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${skimView ? 'left-[18px]' : 'left-0.5'}`} />
      </button>
    </div>
  )
}

function WritingCard({ doc }: { doc: ResumeDocument }) {
  const report = useMemo(() => analyzeWriting(doc), [doc])
  const [openAll, setOpenAll] = useState(false)
  if (report.bulletCount === 0) return null
  // Focus the list on real problems — a bullet whose only note is the advisory
  // "add a metric" is covered by the ratio line, not worth its own row.
  const worthShowing = report.issues.filter((b) => b.issues.some((i) => i.kind !== 'no-metric') || b.issues.length >= 2)
  const shown = openAll ? worthShowing : worthShowing.slice(0, 4)
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <PenLine className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Writing strength</h3>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          <Sparkles className="h-3 w-3" /> on-device
        </span>
      </div>
      <div className="card flex items-center gap-4 p-4">
        <Ring value={report.score} label="writing" size={80} />
        <div className="flex-1 text-sm">
          <p className="font-medium">
            {report.score >= 85 ? 'Sharp — recruiter-ready' : report.score >= 65 ? 'Good — a few tweaks' : 'Punch it up'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {report.cleanCount}/{report.bulletCount} bullets clean
            {report.totals['no-metric'] ? ` · ${report.totals['no-metric']} missing a metric` : ''}
            {report.totals['weak-opener'] ? ` · ${report.totals['weak-opener']} weak opener${report.totals['weak-opener'] > 1 ? 's' : ''}` : ''}
          </p>
        </div>
      </div>
      {worthShowing.length === 0 ? (
        <p className="rounded-lg border border-success/30 bg-success/5 p-2.5 text-xs text-muted-foreground">
          Every bullet reads clean — strong action verbs, active voice, and concrete detail. Nice work.
        </p>
      ) : (
        <>
          <div className="space-y-2" data-testid="writing-issues">
            {shown.map((b, bi) => (
              <div key={bi} className="rounded-lg border border-border bg-surface p-2.5">
                <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {b.section} <span className="normal-case opacity-70">· {b.where}</span>
                </p>
                <p className="mb-1.5 line-clamp-2 text-xs italic text-foreground/80">&ldquo;{b.text}&rdquo;</p>
                <ul className="space-y-1">
                  {b.issues.map((i, ii) => (
                    <li key={ii} className="flex gap-1.5 text-xs">
                      <span className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${i.severity === 'warning' ? 'bg-warning' : 'bg-primary'}`} />
                      <span className="min-w-0">
                        <span className={WSEV_COLOR[i.severity]}>{i.message}</span>
                        {i.suggestion && <span className="text-muted-foreground"> Try: {i.suggestion}.</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {worthShowing.length > 4 && (
            <button className="btn-ghost btn-sm w-full" onClick={() => setOpenAll((o) => !o)}>
              {openAll ? 'Show fewer' : `Show all ${worthShowing.length} bullets with tips`}
            </button>
          )}
        </>
      )}
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

  // What the preview measured about the rendered document: how many pages it
  // really came to, and the body size Magic fit really settled on. Without
  // these the analysis estimates the page count from the word count, which
  // called a full one-page résumé two pages often enough to matter.
  const fitResult = useEditorStore((s) => s.fitResult)
  const measured = useMemo<AtsMeasurement>(
    () => (fitResult ? { pages: fitResult.pages, bodyPt: fitSizesPt(doc.metadata, fitResult.fit).body } : {}),
    [fitResult, doc.metadata]
  )
  const report = useMemo(() => analyzeResume(doc, measured), [doc, measured])

  // What this analysis is ABOUT, said out loud.
  //
  // Everything above reads the document the page draws, never the whole store
  // (see lib/atsScope). That is the right answer, but it is invisible: a
  // reader who hides a section and watches the score drop has no way to tell
  // whether the tool understood them. So the panel names its own scope - how
  // many sections it read, and how many it deliberately left out.
  const scope = useMemo(() => {
    const visible = visibleSectionKeys(doc)
    const excluded = doc.metadata.layout.hidden.filter((k) => sectionHasContent(k, doc.content))
    return { sections: visible.size, excluded: excluded.length }
  }, [doc])

  // `analyzeResume` already returns the checks worst-first, heaviest-first;
  // filter preserves that order, so each group opens on the row worth the
  // reader's next five minutes.
  const grouped = useMemo(
    () =>
      (Object.keys(ATS_CATEGORY_LABELS) as AtsCategory[])
        .map((category) => ({ category, checks: report.checks.filter((c) => c.category === category) }))
        .filter((g) => g.checks.length),
    [report.checks]
  )

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
            <span className="inline-flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" /> {report.wordCount} words ·{' '}
              {/* "~2 pages" was a guess from the word count. When the preview
                  has measured the real document there is nothing to hedge. */}
              {fitResult ? '' : '~'}
              {report.pages} page{report.pages > 1 ? 's' : ''}
            </span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{report.quantifiedCount}/{report.bulletCount} bullets quantified</p>
          <p className="mt-1 text-xs text-muted-foreground" data-ats-scope>
            Analysing {scope.sections} visible section{scope.sections === 1 ? '' : 's'}
            {scope.excluded > 0 && (
              <> · {scope.excluded} hidden section{scope.excluded === 1 ? '' : 's'} excluded</>
            )}
          </p>
        </div>
      </div>

      <AtsSimulator doc={doc} />

      <SkimCard />

      <ContrastCard />

      {/* checks, under the three questions they answer */}
      <div className="space-y-4">
        {grouped.map(({ category, checks }) => {
          const failed = checks.filter((c) => c.status !== 'pass').length
          // Each category carries its own score, so a reader can see WHICH of
          // the three jobs is going wrong without reading twenty-five rows.
          const catScore = report.categoryScores[category]
          return (
            <section key={category} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {ATS_CATEGORY_LABELS[category]}
                </h3>
                <span className="flex items-baseline gap-2 text-[11px] tabular-nums text-muted-foreground">
                  <span>
                    {checks.length - failed}/{checks.length}
                  </span>
                  <span className="font-semibold" style={{ color: scoreColor(catScore) }}>
                    {catScore}
                  </span>
                </span>
              </div>
              {checks.map((c) => {
                const Icon = STATUS_ICON[c.status]
                return (
                  <div key={c.id} className="flex gap-2.5 rounded-lg border border-border bg-surface p-2.5">
                    <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', STATUS_COLOR[c.status])} />
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium">{c.label}</p>
                      <p className="text-xs leading-snug text-muted-foreground">{c.detail}</p>
                      {c.status !== 'pass' && c.where && <ShowMe doc={doc} where={c.where} />}
                    </div>
                  </div>
                )
              })}
            </section>
          )
        })}
      </div>

      <WritingCard doc={doc} />

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

        {/* meaning-level match — strictly opt-in (downloads a local model).
            Sits right under the JD box so it's discoverable before pasting. */}
        <SemanticMatchCard doc={doc} jd={jdLocal} />

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
