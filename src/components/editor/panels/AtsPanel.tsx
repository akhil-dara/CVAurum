import { useEffect, useMemo, useRef, useState } from 'react'
import { Target, FileText, PenLine, Sparkles, Crosshair } from 'lucide-react'
import type { ResumeDocument } from '@/types/document'
import { isPhoneLayout } from '@/lib/layoutMode'
import { analyzeResume, type AtsCheck, type AtsMeasurement } from '@/lib/ats'
import { CheckGroups, Ring } from '@/components/ats/AtsParts'
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
import { T } from '@/i18n/T'
import { useLocale, useT } from '@/i18n'
import { fill } from '@/i18n/fill'

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
  const t = useT()
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
      {where.bullet != null ? t('ats.showBullet') : t('ats.showIt')}
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
  const t = useT()
  const skimView = useEditorStore((s) => s.skimView)
  const setSkimView = useEditorStore((s) => s.setSkimView)
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border bg-surface p-2.5">
      <span className="mt-0.5 h-2 w-9 shrink-0 rounded-full" style={{ background: 'linear-gradient(90deg, rgba(245,158,11,0.35), rgba(220,38,38,0.65))' }} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium"><T>{"Recruiter skim heat"}</T></p>
        <p className="text-xs leading-snug text-muted-foreground">{t('ats.skimBody')}</p>
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
  const t = useT()
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
        <h3 className="text-sm font-semibold"><T>{"Writing strength"}</T></h3>
        <span className="ms-auto inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          <Sparkles className="h-3 w-3" /> {t('ats.onDevice')}
        </span>
      </div>
      <div className="card flex items-center gap-4 p-4">
        <Ring value={report.score} label={t('ats.writingLabel')} size={80} />
        <div className="flex-1 text-sm">
          <p className="font-medium">
            {report.score >= 85 ? t('ats.sharp') : report.score >= 65 ? t('ats.good') : t('ats.punch')}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {fill(t('ats.bulletsClean'), { clean: report.cleanCount, total: report.bulletCount })}
            {report.totals['no-metric'] ? ` · ${fill(t('ats.missingMetric'), { n: report.totals['no-metric'] })}` : ''}
            {report.totals['weak-opener']
              ? ` · ${fill(t('ats.weakOpeners'), { n: report.totals['weak-opener'] })}`
              : ''}
          </p>
        </div>
      </div>
      {worthShowing.length === 0 ? (
        <p className="rounded-lg border border-success/30 bg-success/5 p-2.5 text-xs text-muted-foreground">
          {t('ats.allClean')}
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
                        {i.suggestion && (
                          <span className="text-muted-foreground"> {fill(t('ats.try'), { s: i.suggestion })}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {worthShowing.length > 4 && (
            <button className="btn-ghost btn-sm w-full" onClick={() => setOpenAll((o) => !o)}>
              {openAll ? t('ats.showFewer') : fill(t('ats.showAll'), { n: worthShowing.length })}
            </button>
          )}
        </>
      )}
    </div>
  )
}

export function AtsPanel({ doc }: { doc: ResumeDocument }) {
  const t = useT()
  const locale = useLocale()
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
  // called a full one-page resume two pages often enough to matter.
  const fitResult = useEditorStore((s) => s.fitResult)
  const measured = useMemo<AtsMeasurement>(
    () => (fitResult ? { pages: fitResult.pages, bodyPt: fitSizesPt(doc.metadata, fitResult.fit).body } : {}),
    [fitResult, doc.metadata]
  )
  const report = useMemo(() => analyzeResume(doc, measured, locale), [doc, measured, locale])

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

  return (
    <div className="space-y-5">
      {/* score header */}
      <div className="card flex items-center gap-4 p-4">
        <Ring value={report.score} label={t('ats.scoreLabel')} />
        <div className="flex-1 text-sm">
          <p className="font-medium">
            {report.score >= 80 ? t('ats.bandStrong') : report.score >= 60 ? t('ats.bandGood') : t('ats.bandNeedsWork')}
          </p>
          <p className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" />{' '}
              {/* "~2 pages" was a guess from the word count. When the preview
                  has measured the real document there is nothing to hedge. */}
              {fill(t('ats.wordsPages'), {
                words: report.wordCount,
                pages: `${fitResult ? '' : '~'}${report.pages === 1 ? t('ats.pageOne') : fill(t('ats.pageMany'), { n: report.pages })}`,
              })}
            </span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {fill(t('ats.quantified'), { done: report.quantifiedCount, total: report.bulletCount })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground" data-ats-scope>
            {scope.sections === 1 ? t('ats.analysingOne') : fill(t('ats.analysing'), { n: scope.sections })}
            {scope.excluded > 0 && (
              <>
                {' · '}
                {scope.excluded === 1 ? t('ats.excludedOne') : fill(t('ats.excluded'), { n: scope.excluded })}
              </>
            )}
          </p>
        </div>
      </div>

      <AtsSimulator doc={doc} />

      <SkimCard />

      <ContrastCard />

      {/* checks, under the questions they answer */}
      <CheckGroups report={report} extra={(c) => (c.where ? <ShowMe doc={doc} where={c.where} /> : null)} />

      <WritingCard doc={doc} />

      {/* JD tailoring */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold"><T>{"Tailor to a job"}</T></h3>
        </div>
        <p className="text-xs text-muted-foreground">
          {t('ats.jdPaste')}
        </p>
        <textarea
          className="textarea min-h-[120px] text-xs"
          placeholder={t('ats.jdPlaceholder')}
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
              <Ring value={report.jd.matchRate} label={t('ats.jdLabel')} size={80} />
              <div className="text-sm">
                <p className="font-medium">
                  {fill(t('ats.jdMatched'), { matched: report.jd.matched.length, total: report.jd.keywords.length })}
                </p>
                <p className="mt-1 text-xs text-muted-foreground"><T>{"Found in your resume vs. extracted from the job post."}</T></p>
              </div>
            </div>

            {report.jd.missing.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground"><T>{"Missing keywords"}</T></p>
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
                <p className="mb-1.5 text-xs font-medium text-muted-foreground"><T>{"Matched"}</T></p>
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
