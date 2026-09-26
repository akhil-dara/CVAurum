import { useMemo, useRef, useState } from 'react'
import { ArrowRight, FileUp, RotateCcw, ShieldCheck, Target } from 'lucide-react'
import { createDocument } from '@/data/defaults'
import { analyzeResume, type AtsCategory, ATS_CATEGORY_LABELS } from '@/lib/ats'
import type { ImportResult } from '@/lib/import'
import type { ResumeContent, ResumeDocument } from '@/types/document'
import { formatDate } from '@/lib/utils'
import { useResumeActions } from '@/components/dashboard/newResume'
import { AtsSimulator } from '@/components/editor/panels/AtsSimulator'
import { CheckGroups, Ring, scoreColor } from './AtsParts'

/**
 * The checker, on the checker's page: drop a PDF and get the report here.
 *
 * Someone who searched for an ATS checker came to check a résumé they already
 * have, not to start building one - so the report is the destination, and
 * the editor is an offer at the end of it. The file is read on this device
 * and nothing is saved unless they take that offer.
 *
 * The report is the editor's own analysis (src/lib/ats.ts) with the file
 * rules switched on: whether a parser can read the file at all, then what is
 * on the page, how it is written and how it is set.
 */

type Stage =
  | { kind: 'idle' }
  | { kind: 'reading'; note: string }
  | { kind: 'error'; note: string }
  | { kind: 'done'; fileName: string; result: ImportResult; doc: ResumeDocument }

export function AtsFileCheck() {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const [stage, setStage] = useState<Stage>({ kind: 'idle' })

  const take = async (file?: File) => {
    if (!file || stage.kind === 'reading') return
    if (!/pdf$/i.test(file.type) && !/\.pdf$/i.test(file.name)) {
      setStage({ kind: 'error', note: 'That is not a PDF. Export your résumé to PDF and drop that file here.' })
      return
    }
    setStage({ kind: 'reading', note: 'Reading your PDF on this device…' })
    try {
      const { importResumeFromPdf } = await import('@/lib/import')
      const result = await importResumeFromPdf(file, {
        onOcrProgress: ({ page, pages }) =>
          setStage({ kind: 'reading', note: `No text layer found — reading page ${page} of ${pages} with on-device OCR…` }),
      })
      if (result.meta.chars < 30) {
        setStage({
          kind: 'error',
          note: result.meta.ocrEngineFailed
            ? 'This PDF has no text, and the on-device text recognition could not start (offline, or blocked by the browser). Reload and try again.'
            : 'No text could be read from this PDF, even with OCR. A parser would see a blank page. Export the original document to PDF rather than scanning it.',
        })
        return
      }
      const name = result.content.basics.name?.trim()
      const doc = createDocument({ content: result.content, sample: true, fitted: false, title: name ? `${name} — Resume` : 'Imported résumé' })
      setStage({ kind: 'done', fileName: file.name, result, doc })
      requestAnimationFrame(() => document.getElementById('ats-report')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    } catch (e) {
      console.error(e)
      setStage({ kind: 'error', note: 'That PDF could not be opened. It may be damaged or password-protected.' })
    }
  }

  if (stage.kind === 'done') return <Report stage={stage} onReset={() => setStage({ kind: 'idle' })} />

  return (
    <div
      data-ats-drop
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        void take(e.dataTransfer.files?.[0])
      }}
      className={`mt-6 rounded-2xl border-2 border-dashed p-6 text-center transition sm:p-8 ${
        over ? 'border-primary bg-primary/5' : 'border-border bg-surface'
      }`}
    >
      <FileUp className="mx-auto h-8 w-8 text-primary" aria-hidden />
      <p className="mt-3 text-[15px] font-medium">Drop your résumé PDF here</p>
      <p className="mt-1 text-sm text-muted-foreground">
        You get the report on this page: what a parser reads, what it misses, and what to fix. Scanned PDFs work too.
      </p>
      <input ref={input} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => void take(e.target.files?.[0])} />
      <button type="button" className="btn-primary mt-4" disabled={stage.kind === 'reading'} onClick={() => input.current?.click()}>
        {stage.kind === 'reading' ? 'Reading…' : 'Choose a PDF'}
      </button>
      <p className="mt-3 text-sm" role="status" aria-live="polite">
        {stage.kind === 'reading' ? <span className="text-muted-foreground">{stage.note}</span> : null}
        {stage.kind === 'error' ? <span className="text-danger">{stage.note}</span> : null}
      </p>
      <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
        Nothing is uploaded: there is no server to send it to.
      </p>
    </div>
  )
}

const verdict = (n: number) =>
  n >= 85 ? 'Ready to send' : n >= 70 ? 'Good, with a few fixes' : n >= 50 ? 'Needs work before you send it' : 'A parser will struggle with this file'

function Report({ stage, onReset }: { stage: Extract<Stage, { kind: 'done' }>; onReset: () => void }) {
  const { openImported } = useResumeActions()
  const [jd, setJd] = useState('')
  const [opening, setOpening] = useState(false)
  const file = stage.result.meta.file
  const report = useMemo(
    () => analyzeResume({ ...stage.doc, jobDescription: jd }, { file }),
    [stage.doc, jd, file]
  )
  const categories = (Object.keys(ATS_CATEGORY_LABELS) as AtsCategory[]).filter((k) => report.checks.some((c) => c.category === k))
  const issues = report.checks.filter((c) => c.status !== 'pass').length

  const openEditor = async () => {
    setOpening(true)
    try {
      await openImported({ ...stage.doc, jobDescription: jd }, { openAts: true, ocr: stage.result.meta.ocrPages.length > 0 })
    } finally {
      setOpening(false)
    }
  }

  return (
    <div id="ats-report" className="mt-6 scroll-mt-20 space-y-6" aria-live="polite">
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Ring value={report.score} label="ATS score" size={108} />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold">{verdict(report.score)}</p>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {stage.fileName} · {report.pages} page{report.pages === 1 ? '' : 's'} · {report.wordCount} words
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {issues === 0 ? 'Every check passed.' : `${issues} thing${issues === 1 ? '' : 's'} to look at, worst first below.`} The same file always gets the same score.
            </p>
          </div>
        </div>
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {categories.map((k) => (
            <li key={k} className="rounded-lg border border-border px-3 py-2">
              <p className="text-[11px] leading-tight text-muted-foreground">{ATS_CATEGORY_LABELS[k]}</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums" style={{ color: scoreColor(report.categoryScores[k]) }}>
                {report.categoryScores[k]}
              </p>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={() => void openEditor()} disabled={opening}>
            Fix it in the editor <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
          <button type="button" className="btn-ghost" onClick={onReset}>
            <RotateCcw className="h-4 w-4" aria-hidden /> Check another PDF
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Nothing has been saved. The editor opens this résumé with every fault below marked, in any of the designs.
        </p>
      </div>

      <Extracted content={stage.doc.content} sections={stage.result.meta.sections} />

      <CheckGroups report={report} foldPassed />

      <AtsSimulator doc={stage.doc} />

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6" aria-labelledby="jd-match">
        <h3 id="jd-match" className="flex items-center gap-2 text-base font-semibold">
          <Target className="h-4 w-4 text-primary" aria-hidden /> Match it to a job
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">Paste the job description to see which of its keywords the résumé has, and which it lacks.</p>
        <label className="sr-only" htmlFor="jd-text">
          Job description
        </label>
        <textarea id="jd-text" className="textarea mt-3 min-h-[120px] text-sm" placeholder="Paste the job description here…" value={jd} onChange={(e) => setJd(e.target.value)} />
        {report.jd && report.jd.keywords.length > 0 && (
          <div className="mt-4 flex flex-col gap-4 sm:flex-row">
            <Ring value={report.jd.matchRate} label="match" size={84} />
            <div className="min-w-0 space-y-3 text-sm">
              <p className="font-medium">
                {report.jd.matched.length} of {report.jd.keywords.length} keywords found
              </p>
              {report.jd.missing.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs text-muted-foreground">Missing — add them where they are true of you</p>
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
                  <p className="mb-1.5 text-xs text-muted-foreground">Found</p>
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
          </div>
        )}
      </section>

      {file?.text ? (
        <details className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <summary className="cursor-pointer text-base font-semibold">The text as it was read</summary>
          <p className="mt-2 text-sm text-muted-foreground">
            Every word this reader recovered from the file, in the order it recovered them. Anything on your page that is missing here is invisible to a parser.
          </p>
          <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs leading-relaxed">{file.text}</pre>
        </details>
      ) : null}
    </div>
  )
}

/**
 * What a parser pulled out of the file, field by field. The fields it could
 * NOT find are the most useful line on the page: they are what an
 * application form would have left blank.
 */
function Extracted({ content: c, sections }: { content: ResumeContent; sections: string[] }) {
  const range = (a?: string, b?: string) => [formatDate(a), b ? formatDate(b) : a ? 'Present' : ''].filter(Boolean).join(' – ')
  const links = [c.basics.url, ...(c.basics.profiles ?? []).map((p) => p.url || p.username)].filter(Boolean)
  const location = [c.basics.location?.city, c.basics.location?.region, c.basics.location?.countryCode].filter(Boolean).join(', ')
  const skills = c.skills.flatMap((s) => (s.keywords?.length ? s.keywords : [s.name])).filter(Boolean)
  const row = (label: string, value: string | undefined) => (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] sm:grid-cols-[7rem_minmax(0,1fr)] gap-3 py-1.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={value ? 'break-words' : 'font-medium text-danger'}>{value || 'Not found'}</dd>
    </div>
  )
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6" aria-labelledby="extracted">
      <h3 id="extracted" className="text-base font-semibold">
        What a parser pulled out
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">The fields an application form would fill from this file. “Not found” is a field it would leave blank.</p>
      <dl className="mt-3 divide-y divide-border text-sm">
        {row('Name', c.basics.name)}
        {row('Email', c.basics.email)}
        {row('Phone', c.basics.phone)}
        {row('Location', location)}
        {row('Links', links.join(' · '))}
        <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] sm:grid-cols-[7rem_minmax(0,1fr)] gap-3 py-1.5">
          <dt className="text-muted-foreground">Experience</dt>
          <dd>
            {c.work.length ? (
              <ul className="space-y-1">
                {c.work.slice(0, 8).map((w, i) => (
                  <li key={w.id ?? i} className="break-words">
                    <span className="font-medium">{w.position || 'Untitled role'}</span>
                    {w.name ? ` · ${w.name}` : ''}
                    <span className="text-muted-foreground">{range(w.startDate, w.endDate) ? ` · ${range(w.startDate, w.endDate)}` : ' · no dates found'}</span>
                  </li>
                ))}
                {c.work.length > 8 ? <li className="text-muted-foreground">and {c.work.length - 8} more</li> : null}
              </ul>
            ) : (
              <span className="font-medium text-danger">No roles found</span>
            )}
          </dd>
        </div>
        <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] sm:grid-cols-[7rem_minmax(0,1fr)] gap-3 py-1.5">
          <dt className="text-muted-foreground">Education</dt>
          <dd>
            {c.education.length ? (
              <ul className="space-y-1">
                {c.education.map((e, i) => (
                  <li key={e.id ?? i} className="break-words">
                    <span className="font-medium">{[e.studyType, e.area].filter(Boolean).join(', ') || 'Course'}</span>
                    {e.institution ? ` · ${e.institution}` : ''}
                  </li>
                ))}
              </ul>
            ) : (
              <span className="font-medium text-danger">Not found</span>
            )}
          </dd>
        </div>
        {row('Skills', skills.length ? `${skills.length} — ${skills.slice(0, 14).join(', ')}${skills.length > 14 ? '…' : ''}` : '')}
        {row('Sections', sections.join(', '))}
      </dl>
    </section>
  )
}
