import type { ResumeDocument } from '@/types/document'
import type { Metadata } from '@/types/metadata'
import { useResumeStore } from '@/store/useResumeStore'
import { cn } from '@/lib/utils'
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
                value={fit.minBody}
                min={7}
                max={12}
                step={0.5}
                unit="pt"
                onChange={(v) =>
                  update((md) => {
                    md.page.fit.minBody = v
                  })
                }
              />
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
        </>
      )}
    </div>
  )
}
