import { useEffect, useRef, useState } from 'react'
import type { ResumeDocument } from '@/types/document'
import type { Metadata } from '@/types/metadata'
import { useResumeStore } from '@/store/useResumeStore'
import { useEditorStore } from '@/store/useEditorStore'
import { cn } from '@/lib/utils'
import { explainShort, suggestFits } from '@/lib/fitSuggest'
import { effectiveFloorPt } from '@/lib/fitReadout'
import type { Suggestion } from '@/lib/fitSuggest'
import { Slider, Toggle, Segmented } from '../fields/Controls'
import { FitReadout } from './FitReadout'
import { useT } from '@/i18n'
import { T } from '@/i18n/T'

type FitTarget = Metadata['page']['fit']['target']
type FitPriority = Metadata['page']['fit']['priority']
type LockKey = 'name' | 'headline' | 'contacts' | 'sectionGap' | 'leading'

const LOCKS: { key: LockKey; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'headline', label: 'Headline' },
  { key: 'contacts', label: 'Contacts' },
  { key: 'sectionGap', label: 'Section gap' },
  { key: 'leading', label: 'Line height' },
]

/** The Page group's Magic fit card: the switch with its readout, the page
 *  target, and under a disclosure the rules the fit works inside (the body
 *  floor, what gives first, the sizes it must leave alone). Works with its
 *  defaults and one switch; the rules stay folded until wanted. */
export function MagicFitCard({ doc }: { doc: ResumeDocument }) {
  const t = useT()
  const update = useResumeStore((s) => s.updateMetadata)
  const page = doc.metadata.page
  const fit = page.fit
  const on = page.autoFit
  const rootRef = useRef<HTMLDivElement>(null)
  const [rulesOpen, setRulesOpen] = useState(false)
  // The chip over the page and the palette bring the author here.
  useEffect(() => {
    const open = () => {
      setRulesOpen(true)
      setTimeout(() => rootRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 30)
    }
    window.addEventListener('cvaurum:open-magic-fit', open)
    return () => window.removeEventListener('cvaurum:open-magic-fit', open)
  }, [])
  return (
    <div className="space-y-3 scroll-mt-3" data-testid="magic-fit" ref={rootRef}>
      <Toggle
        label="Magic fit"
        checked={on}
        onChange={(v) =>
          update((md) => {
            md.page.autoFit = v
          })
        }
      />
      <p className="-mt-1 text-[11px] leading-snug text-muted-foreground">
        {t(on ? 'fit.onNote' : 'fit.offNote')}
      </p>
      <FitReadout doc={doc} />
      {!on && <OffOffer />}
      {on && (
        <>
          <div>
            <label className="label"><T>{'Pages'}</T></label>
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
              {t('fit.pagesNote')}
            </p>
          </div>
          <Suggest doc={doc} />
          <details className="space-y-3" open={rulesOpen} onToggle={(e) => setRulesOpen((e.currentTarget as HTMLDetailsElement).open)}>
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground"><T>{'Fit rules'}</T></summary>
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
                    ? t('fit.floorAuto', { pt: `${Math.round(effectiveFloorPt(doc.metadata) * 10) / 10}pt` })
                    : t('fit.floorSet')}
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
                    {t('fit.unset')}
                  </button>
                )}
              </p>
              <div>
                <label className="label"><T>{'Shrink first'}</T></label>
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
                  {t('fit.priorityNote')}
                </p>
              </div>
              <div>
                <label className="label"><T>{'Keep as set'}</T></label>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('fit.keepSet')}>
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
                  {t('fit.keepNote')}
                </p>
              </div>
            </div>
          </details>
        </>
      )}
    </div>
  )
}

/** With the fit off, the one offer the preview may have measured: a few
 *  spilled lines fitting back a page sooner at 9pt or more. */
function OffOffer() {
  const t = useT()
  const updateDoc = useResumeStore((s) => s.updateDoc)
  const offer = useEditorStore((s) => s.fitOffers.find((o) => o.id.startsWith('fit-on-')))
  if (!offer) return null
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1.5" data-testid="fit-offer">
      <span className="text-xs leading-snug text-foreground">{offer.label}</span>
      <button type="button" className="btn-primary btn-sm shrink-0" onClick={() => updateDoc((d) => offer.mutate(d))}>
        {t('fit.apply')}
      </button>
    </div>
  )
}

/** The moves Magic fit measured for this document (ResumePreview measures
 *  them after a fit that fell short or left a sparse last page), one Apply
 *  each; applied through the normal update path, so undo works. "Check
 *  again" measures on request. */
function Suggest({ doc }: { doc: ResumeDocument }) {
  const t = useT()
  const updateDoc = useResumeStore((s) => s.updateDoc)
  const trial = useEditorStore((s) => s.fitTrial)
  const result = useEditorStore((s) => s.fitResult)
  const offers = useEditorStore((s) => s.fitOffers)
  const busy = useEditorStore((s) => s.fitSuggesting)
  const setFitOffers = useEditorStore((s) => s.setFitOffers)
  const setFitSuggesting = useEditorStore((s) => s.setFitSuggesting)
  const shortWhy = useEditorStore((s) => s.fitShort)
  const setFitShort = useEditorStore((s) => s.setFitShort)
  const [checked, setChecked] = useState(false)
  const run = useRef<() => void>(() => undefined)
  run.current = async () => {
    if (!trial || !result || busy) return
    setFitSuggesting(true)
    try {
      setFitOffers(await suggestFits(doc, trial, result))
      setFitShort(await explainShort(doc, trial, result))
    } catch {
      setFitOffers([])
    } finally {
      setFitSuggesting(false)
      setChecked(true)
    }
  }
  // The command palette's "Magic fit: suggest" lands here.
  useEffect(() => {
    const on = () => run.current()
    window.addEventListener('cvaurum:magic-fit-suggest', on)
    return () => window.removeEventListener('cvaurum:magic-fit-suggest', on)
  }, [])
  useEffect(() => {
    setChecked(false)
  }, [doc])
  const short = result && result.pages > doc.metadata.page.fit.target
  const pt = (x: number) => `${Math.round(x * 10) / 10}pt`
  const pagesWord = (n: number) => (n === 1 ? t('fit.pageOne') : t('fit.pagesMany', { n }))
  return (
    <div className="space-y-2" data-testid="fit-suggest">
      {/* Why, before what to do about it: "won't fit" alone, then "Nothing
          better within your rules", was a dead end (2026-10-24). */}
      {short && shortWhy && (
        <p className="rounded-lg bg-amber-500/10 px-2.5 py-2 text-xs leading-snug text-foreground" data-testid="fit-why">
          {shortWhy.body != null
            ? t('fit.shortBody', {
                pages: pagesWord(shortWhy.pages),
                body: pt(shortWhy.body),
                floor: pt(shortWhy.floor),
              })
            : t('fit.shortAny', { pages: pagesWord(shortWhy.pages) })}{' '}
          {offers.length ? t('fit.theseGetThere') : t('fit.shortenInstead')}
        </p>
      )}
      {offers.map((o) => (
        <div
          key={o.id}
          className="flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1.5"
          data-testid="fit-offer"
        >
          <span className="text-xs leading-snug text-foreground">{o.label}</span>
          <button type="button" className="btn-primary btn-sm shrink-0" onClick={() => updateDoc((d) => o.mutate(d))}>
            {t('fit.apply')}
          </button>
        </div>
      ))}
      {busy && <p className="text-[11px] leading-snug text-muted-foreground">{t('fit.measuringMoves')}</p>}
      {!busy && offers.length === 0 && checked && !short && (
        <p className="text-[11px] leading-snug text-muted-foreground">{t('fit.nothingBetter')}</p>
      )}
      <button type="button" className="btn-secondary btn-sm w-full" disabled={busy || !trial || !result} onClick={() => run.current()}>
        {offers.length ? t('fit.checkAgain') : t('fit.suggestMoves')}
      </button>
    </div>
  )
}
