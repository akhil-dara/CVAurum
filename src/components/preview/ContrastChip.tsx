import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useEditorStore } from '@/store/useEditorStore'
import { CHIP } from './FitChip'

/** Opens the Design panel at the text-contrast card, from anywhere. */
export function openContrast() {
  const ed = useEditorStore.getState()
  ed.setLeftTab('design')
  ed.setLeftOpen(true)
  setTimeout(() => window.dispatchEvent(new Event('cvaurum:open-contrast')), 80)
}

/**
 * The page's WCAG contrast result, on the page: a pill beside Magic fit's
 * that says either that every run of text meets AA or how many do not, and
 * opens the card with the fixes on a tap. The card alone sat at the top of a
 * long panel, where an author who never opened Design never learned the page
 * had a problem.
 */
export function ContrastChip() {
  const contrast = useEditorStore((s) => s.contrast)
  if (!contrast) return null
  const n = contrast.report.findings.length
  const ok = n === 0
  return (
    <button
      type="button"
      data-testid="contrast-chip"
      onClick={openContrast}
      title={ok ? 'Every line has enough contrast to read (meets WCAG AA)' : 'Some text is too faint against its background. Open the fixes.'}
      className={CHIP}
    >
      {ok ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" aria-hidden />
      ) : (
        <AlertTriangle className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" aria-hidden />
      )}
      <span className="whitespace-nowrap">
        {ok ? 'Easy to read' : `${n} line${n === 1 ? '' : 's'} hard to read`}
      </span>
    </button>
  )
}
