/**
 * What the page's words measure against what they stand on, and what to do
 * about any that fall short.
 *
 * The report comes from the preview (ResumePreview's contrast effect), which
 * measures the print tree the export is painted from once the fit settles.
 * This card only reads it: one row per setting, because a person fixes a
 * setting, not a run of words - and every suggestion on a row has already
 * been solved against every ground that setting paints on, so "Use" on a row
 * finishes the job it names.
 *
 * Nothing here moves a colour on its own. The accent is the one colour the
 * product corrects (an accent is chosen as a colour, not as a word); every
 * other colour is the author's, so the card says what the pair comes to and
 * offers the nearest value that reads, and the choice stays theirs.
 */
import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Contrast } from 'lucide-react'
import type { ContrastGroup } from '@/lib/a11y'
import { useEditorStore } from '@/store/useEditorStore'
import { useResumeStore } from '@/store/useResumeStore'

const ratio = (n: number) => `${n.toFixed(2)}:1`

/** A setting the card can write: a single colour on the theme. */
function themeKey(path: string | undefined): string | null {
  const m = /^theme\.([A-Za-z]+)$/.exec(path ?? '')
  return m ? m[1] : null
}

/**
 * The live note for one colour control, or nothing when the words it paints
 * all read. `as` says which side of the pair the control sets: the ink, or
 * the ground the ink stands on.
 */
export function useContrastNote(path: string, as: 'ink' | 'ground' = 'ink'): string | undefined {
  const report = useEditorStore((s) => s.contrast?.report)
  if (!report) return undefined
  const hits = report.findings.filter((f) => (as === 'ink' ? f.setting.path : f.ground.path) === path)
  if (!hits.length) return undefined
  // The pair furthest under ITS OWN bar: a large name at 2.8 against 3:1 is
  // closer to reading than body text at 2.6 against 4.5.
  const worst = hits.reduce((a, b) => (b.measured / b.required < a.measured / a.required ? b : a))
  const runs = `${hits.length} run${hits.length === 1 ? '' : 's'} of text`
  return as === 'ink'
    ? `${runs} in this colour measure ${ratio(worst.measured)}. Needs ${ratio(worst.required)}.`
    : `${runs} on this colour measure ${ratio(worst.measured)}. Needs ${ratio(worst.required)}.`
}

function Row({ g }: { g: ContrastGroup }) {
  const update = useResumeStore((s) => s.updateMetadata)
  const key = g.origin === 'author' ? themeKey(g.setting.path) : null
  const fix = key && g.suggestion ? g.suggestion : undefined
  const apply = () => {
    if (!key || !fix) return
    update((md) => {
      ;(md.theme as Record<string, unknown>)[key] = fix.color
    })
  }
  return (
    <li className="rounded-lg border border-border bg-surface p-2.5" data-contrast-row={g.setting.path ?? g.setting.label}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[13px] font-medium">
          {g.setting.label}
          <span className="block text-[11px] font-normal text-muted-foreground">Design › {g.setting.group}</span>
        </p>
        <span className="shrink-0 text-[11px] tabular-nums text-amber-700 dark:text-amber-400">
          {ratio(g.worst)} / {ratio(g.required)}
        </span>
      </div>
      <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
        {g.count} run{g.count === 1 ? '' : 's'} of text, e.g.{' '}
        {g.samples.map((s, i) => (
          <span key={i}>
            {i > 0 && ', '}“{s}”
          </span>
        ))}
      </p>
      {fix ? (
        <div className="mt-2 flex items-center gap-2">
          <span
            aria-hidden
            className="h-5 w-5 shrink-0 rounded border border-border"
            style={{ background: fix.color }}
          />
          <button type="button" className="btn-secondary btn-xs" onClick={apply}>
            Use {fix.color}
          </button>
          <span className="text-[11px] text-muted-foreground">
            {ratio(fix.measured)} · fixes {fix.fixes === g.count ? 'all' : fix.fixes}
          </span>
        </div>
      ) : g.origin === 'derived' ? (
        <p className="mt-1.5 text-xs leading-snug text-muted-foreground">
          The design derives this colour itself, so no setting changes it.
        </p>
      ) : g.unfixable ? (
        <p className="mt-1.5 text-xs leading-snug text-muted-foreground">{g.unfixable.reason}</p>
      ) : null}
    </li>
  )
}

export function ContrastCard() {
  const contrast = useEditorStore((s) => s.contrast)
  // The chip over the page asks for this card by name; landing near it on a
  // long panel is not finding it, so it is scrolled to and flashed.
  const ref = useRef<HTMLElement>(null)
  const [flash, setFlash] = useState(false)
  useEffect(() => {
    const onOpen = () => {
      ref.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
      setFlash(true)
      setTimeout(() => setFlash(false), 1600)
    }
    window.addEventListener('cvaurum:open-contrast', onOpen)
    return () => window.removeEventListener('cvaurum:open-contrast', onOpen)
  }, [])
  if (!contrast) return null
  const { report, groups } = contrast
  const unread = report.unmeasured.length
  return (
    <section
      ref={ref}
      className={`space-y-2 rounded-xl transition-shadow ${flash ? 'ring-2 ring-primary ring-offset-4 ring-offset-background' : ''}`}
      aria-label="Text contrast"
      data-contrast-card
    >
      <div className="flex items-center gap-2">
        {groups.length ? (
          <Contrast className="h-4 w-4 text-amber-700 dark:text-amber-400" aria-hidden />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-500" aria-hidden />
        )}
        <h3 className="text-sm font-semibold">Text contrast</h3>
      </div>
      <p className="text-xs leading-snug text-muted-foreground">
        {groups.length
          ? `${report.findings.length} of ${report.checked} runs of text fall under the WCAG AA contrast bar.`
          : `All ${report.checked} runs of text meet the WCAG AA contrast bar.`}
        {unread > 0 && ` ${unread} stand on a ground that could not be read.`}
      </p>
      {groups.length > 0 && (
        <ul className="space-y-1.5">
          {groups.map((g) => (
            <Row key={`${g.setting.path ?? g.setting.label}|${g.origin}`} g={g} />
          ))}
        </ul>
      )}
    </section>
  )
}
