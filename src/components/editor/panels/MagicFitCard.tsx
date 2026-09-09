import { useEffect, useRef, useState } from 'react'
import type { ResumeDocument } from '@/types/document'
import type { Metadata } from '@/types/metadata'
import { useResumeStore } from '@/store/useResumeStore'
import { useEditorStore } from '@/store/useEditorStore'
import { cn } from '@/lib/utils'
import { suggestFits } from '@/lib/fitSuggest'
import { effectiveFloorPt } from '@/lib/fitReadout'
import type { Suggestion } from '@/lib/fitSuggest'
import { Slider, Toggle, Segmented } from '../fields/Controls'
import { FitReadout } from './FitReadout'

type FitTarget = Metadata['page']['fit']['target']
type FitPriority = Metadata['page']['fit']['priority']
type LockKey = 'name' | 'headline' | 'contacts' | 'sectionGap'

const LOCKS: { key: LockKey; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'headline', label: 'Headline' },
  { key: 'contacts', label: 'Contacts' },
  { key: 'sectionGap', label: 'Section gap' },
]

/** The Page group's Magic fit card: the switch with its readout, the page
 *  target, and under a disclosure the rules the fit works inside (the body
 *  floor, what gives first, the sizes it must leave alone). Works with its
 *  defaults and one switch; the rules stay folded until wanted. */
export function MagicFitCard({ doc }: { doc: ResumeDocument }) {
  const update = useResumeStore((s) => s.updateMetadata)
  const page = doc.metadata.page
  const fit = page.fit
  const on = page.autoFit
  return (
    <div className="space-y-3" data-testid="magic-fit">
      <Toggle
        label="Magic fit"
        checked={on}
        onChange={(v) =>
          update((md) => {
            md.page.autoFit = v
          })
        }
      />
      <FitReadout doc={doc} />
      {on && (
        <>
          <div>
            <label className="label">Pages</label>
            <Segmented<`${FitTarget}`>
              value={`${fit.target}`}
              options={[
                { value: '1', label: '1' },
                { value: '2', label: '2' },
                { value: '3', label: '3' },
              ]}
              onChange={(v) =>
                update((md) => {
                  md.page.fit.target = Number(v) as FitTarget
                })
              }
            />
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
              Sizes type and spacing to reach this many pages inside your rules, and says what it did. Margins,
              alignment and fonts stay yours.
            </p>
          </div>
          <details className="space-y-3">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground">Fit rules</summary>
            <div className="mt-3 space-y-3">
              <Slider
                label="Body size never below"
                value={fit.minBody ?? Math.max(6, Math.round(effectiveFloorPt(doc.metadata) * 2) / 2)}
                min={6}
                max={12}
                step={0.5}
                unit="pt"
                onChange={(v) =>
                  update((md) => {
                    md.page.fit.minBody = v
                  })
                }
              />
              <p className="-mt-1 flex items-center justify-between gap-2 text-[11px] leading-snug text-muted-foreground">
                <span>
                  {fit.minBody == null
                    ? `Not set: on this body size the fit stops at ${Math.round(effectiveFloorPt(doc.metadata) * 10) / 10}pt.`
                    : 'Set by you: the fit never goes below it.'}
                </span>
                {fit.minBody != null && (
                  <button
                    type="button"
                    className="shrink-0 underline decoration-dotted underline-offset-2 hover:text-foreground"
                    onClick={() =>
                      update((md) => {
                        md.page.fit.minBody = null
                      })
                    }
                  >
                    Unset
                  </button>
                )}
              </p>
              <div>
                <label className="label">Shrink first</label>
                <Segmented<FitPriority>
                  value={fit.priority}
                  options={[
                    { value: 'spacing', label: 'Spacing' },
                    { value: 'both', label: 'Both' },
                    { value: 'type', label: 'Type' },
                  ]}
                  onChange={(v) =>
                    update((md) => {
                      md.page.fit.priority = v
                    })
                  }
                />
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                  What gives when the page is over: the gaps, the type, or both together.
                </p>
              </div>
              <div>
                <label className="label">Keep as set</label>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Keep as set">
                  {LOCKS.map((l) => {
                    const locked = fit.lock[l.key]
                    return (
                      <button
                        key={l.key}
                        type="button"
                        aria-pressed={locked}
                        className={cn(
                          'chip cursor-pointer transition-colors coarse:min-h-9 coarse:px-3',
                          locked && 'border-primary bg-primary/10 text-primary',
                        )}
                        onClick={() =>
                          update((md) => {
                            md.page.fit.lock[l.key] = !locked
                          })
                        }
                      >
                        {l.label}
                      </button>
                    )
                  })}
                </div>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                  A kept size stays exactly what its slider says; the fit works around it.
                </p>
              </div>
            </div>
          </details>
          <Suggest doc={doc} />
        </>
      )}
    </div>
  )
}

/** "Suggest" measures a few concrete moves (one page fewer, a small section
 *  moved up) with the preview's own trial and lists the ones that come out
 *  better, one Apply each; applied through the normal update path, so undo
 *  works. Runs on request only, never on keystrokes. */
function Suggest({ doc }: { doc: ResumeDocument }) {
  const updateDoc = useResumeStore((s) => s.updateDoc)
  const trial = useEditorStore((s) => s.fitTrial)
  const result = useEditorStore((s) => s.fitResult)
  const [state, setState] = useState<{ phase: 'idle' } | { phase: 'working' } | { phase: 'done'; offers: Suggestion[] }>({
    phase: 'idle',
  })
  const run = useRef<() => void>(() => undefined)
  run.current = async () => {
    if (!trial || !result || state.phase === 'working') return
    setState({ phase: 'working' })
    try {
      const offers = await suggestFits(doc, trial, result)
      setState({ phase: 'done', offers })
    } catch {
      setState({ phase: 'done', offers: [] })
    }
  }
  // The command palette's "Magic fit: suggest" lands here.
  useEffect(() => {
    const on = () => run.current()
    window.addEventListener('cvaurum:magic-fit-suggest', on)
    return () => window.removeEventListener('cvaurum:magic-fit-suggest', on)
  }, [])
  // A changed document makes the offers stale: back to the button.
  useEffect(() => {
    setState((s) => (s.phase === 'done' ? { phase: 'idle' } : s))
  }, [doc])
  const busy = state.phase === 'working'
  return (
    <div className="space-y-2" data-testid="fit-suggest">
      <button
        type="button"
        className="btn-secondary btn-sm w-full"
        disabled={busy || !trial || !result}
        aria-busy={busy}
        onClick={() => run.current()}
      >
        {busy ? 'Measuring moves…' : 'Suggest'}
      </button>
      {state.phase === 'done' && state.offers.length === 0 && (
        <p className="text-[11px] leading-snug text-muted-foreground">Nothing better within your rules.</p>
      )}
      {state.phase === 'done' &&
        state.offers.map((o) => (
          <div
            key={o.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-border px-2.5 py-1.5"
            data-testid="fit-offer"
          >
            <span className="text-xs leading-snug text-foreground">{o.label}</span>
            <button type="button" className="btn-outline btn-sm shrink-0" onClick={() => updateDoc((d) => o.mutate(d))}>
              Apply
            </button>
          </div>
        ))}
    </div>
  )
}
